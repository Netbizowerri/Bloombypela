/**
 * Client-side orders API.
 *
 * Order reads come straight from Firestore (orders are readable by the owning
 * customer and by staff/admin). Order writes used to go through Cloud
 * Functions; the Spark plan cannot run them, so status changes and refund
 * bookkeeping are done here in a transaction. `firestore.rules` limits those
 * writes to the exact fields listed below, so a client can never change a
 * total or a line item.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  arrayUnion,
  Timestamp,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { db } from './firebase';
import { auditEntryFields } from './audit';
import { requireAdminDb } from './firestoreWrite';
import {
  buildDeliveryCsv,
  buildOrdersCsv,
  computeDashboardStats,
  exportFilename,
  filterOrdersForExport,
  type CsvExportFilters,
} from './ordersReport';
import type { OrderRecord, OrderStatus } from '../types/orders';

const COLLECTIONS = {
  orders: 'orders',
  products: 'products',
  auditLog: 'auditLog',
} as const;

/** Mirrors the transitions the `updateOrderStatus` callable enforced. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'collected', 'cancelled'],
  out_for_delivery: ['delivered', 'collected', 'cancelled'],
  delivered: [],
  collected: [],
  cancelled: [],
  refunded: [],
  partially_refunded: [],
};

export function isAllowedTransition(from: OrderStatus | null, to: OrderStatus): boolean {
  if (from === null) return to === 'confirmed';
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

function docToOrder(snap: DocumentData): OrderRecord {
  const data = snap.data();
  return {
    orderNumber: String(data.orderNumber ?? ''),
    reservationId: String(data.reservationId ?? ''),
    userId: data.userId ?? null,
    contact: {
      name: String(data.contact?.name ?? ''),
      email: String(data.contact?.email ?? ''),
      emailLower: String(data.contact?.emailLower ?? ''),
      phone: String(data.contact?.phone ?? ''),
    },
    items: Array.isArray(data.items)
      ? data.items.map((item: unknown) => {
          const it = item as Record<string, unknown>;
          return {
            productId: String(it.productId ?? ''),
            variantId: String(it.variantId ?? ''),
            quantity: Number(it.quantity ?? 0),
            name: String(it.name ?? ''),
            variantName: String(it.variantName ?? ''),
            sku: String(it.sku ?? ''),
            productType: (it.productType as 'snack' | 'juice') ?? 'snack',
            unitPricePence: Number(it.unitPricePence ?? 0),
            lineTotalPence: Number(it.lineTotalPence ?? 0),
          };
        })
      : [],
    subtotalPence: Number(data.subtotalPence ?? 0),
    deliveryFeePence: Number(data.deliveryFeePence ?? 0),
    discountPence: Number(data.discountPence ?? 0),
    totalPence: Number(data.totalPence ?? 0),
    fulfilment: {
      method: (data.fulfilment?.method as 'delivery' | 'collection') ?? 'delivery',
      address: data.fulfilment?.address
        ? {
            line1: String(data.fulfilment.address.line1 ?? ''),
            line2: data.fulfilment.address.line2 ?? null,
            city: String(data.fulfilment.address.city ?? ''),
            postcode: String(data.fulfilment.address.postcode ?? ''),
          }
        : null,
      areaName: data.fulfilment?.areaName ?? null,
      deliveryDate: data.fulfilment?.deliveryDate ?? null,
      collectionDetails: data.fulfilment?.collectionDetails ?? undefined,
    },
    notes: String(data.notes ?? ''),
    status: (data.status as OrderRecord['status']) ?? 'confirmed',
    paymentStatus: (data.paymentStatus as OrderRecord['paymentStatus']) ?? 'paid',
    refundedPence: Number(data.refundedPence ?? 0),
    stripeSessionId: data.stripeSessionId ?? null,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    promotionId: data.promotionId ?? null,
    promoCode: data.promoCode ?? null,
    internalNote: data.internalNote ?? undefined,
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory.map((h: unknown) => {
          const hh = h as Record<string, unknown>;
          return {
            status: String(hh.status ?? ''),
            at: hh.at ?? null,
            note: hh.note ?? undefined,
          };
        })
      : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export type UpdateOrderStatusInput = {
  orderNumber: string;
  status: OrderStatus;
  note?: string | null;
};

/**
 * Moves an order through its lifecycle, appending `statusHistory` and an
 * audit entry in the same transaction. Rules allow staff/admin to change only
 * `status`, `statusHistory`, `internalNote` and `updatedAt`.
 */
async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const database = requireAdminDb();
  const { orderNumber, status } = input;
  const note = input.note?.trim() ? input.note.trim() : null;

  const result = await runTransaction(database, async (tx) => {
    const ref = doc(database, COLLECTIONS.orders, orderNumber);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Order ${orderNumber} not found.`);

    const order = snap.data() as OrderRecord;
    const from = (order.status ?? null) as OrderStatus | null;

    if (!isAllowedTransition(from, status)) {
      throw new Error(
        `Cannot move order ${orderNumber} from ${from ?? 'unknown'} to ${status}.`,
      );
    }

    const now = Timestamp.now();
    const historyEntry = note ? { status, at: now, note } : { status, at: now };

    tx.update(ref, {
      status,
      updatedAt: now,
      statusHistory: arrayUnion(historyEntry),
      internalNote: note ?? order.internalNote ?? null,
    });

    tx.set(
      doc(collection(database, COLLECTIONS.auditLog)),
      auditEntryFields('update_order_status', 'order', orderNumber, {
        from,
        to: status,
        note,
      }),
    );

    return { ok: true as const, orderNumber, status };
  });

  return { data: result };
}

export type RecordManualRefundInput = {
  orderNumber: string;
  amountPence: number;
  reason?: string | null;
  /** Optional Stripe refund id so the dashboard entry can be reconciled. */
  stripeRefundId?: string | null;
};

/**
 * Records a refund that was already issued in the Stripe dashboard.
 *
 * A real Stripe refund needs `STRIPE_SECRET_KEY`, which must never reach the
 * browser, and Cloud Functions cannot run on the Spark plan. So the admin
 * issues the refund in Stripe and this call records the outcome on the order.
 * Rules allow admin only, and only the refund fields.
 */
async function recordManualRefund(input: RecordManualRefundInput) {
  const database = requireAdminDb();
  const { orderNumber, amountPence } = input;
  const reason = input.reason?.trim() ? input.reason.trim() : null;
  const stripeRefundId = input.stripeRefundId?.trim() ? input.stripeRefundId.trim() : null;

  if (!Number.isInteger(amountPence) || amountPence <= 0) {
    throw new Error('Enter a refund amount in whole pence, greater than zero.');
  }

  const result = await runTransaction(database, async (tx) => {
    const ref = doc(database, COLLECTIONS.orders, orderNumber);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Order ${orderNumber} not found.`);

    const order = snap.data() as OrderRecord;
    const alreadyRefunded = Number(order.refundedPence ?? 0);
    const remaining = Number(order.totalPence ?? 0) - alreadyRefunded;

    if (amountPence > remaining) {
      throw new Error(
        `That is more than the £${(remaining / 100).toFixed(2)} still unrefunded on ${orderNumber}.`,
      );
    }

    const refundedPence = alreadyRefunded + amountPence;
    const paymentStatus: OrderRecord['paymentStatus'] =
      refundedPence >= Number(order.totalPence ?? 0) ? 'refunded' : 'partially_refunded';
    const now = Timestamp.now();

    tx.update(ref, {
      refundedPence,
      paymentStatus,
      updatedAt: now,
      statusHistory: arrayUnion({
        status: order.status,
        at: now,
        note: `Refund £${(amountPence / 100).toFixed(2)} recorded: ${reason ?? 'admin refund'}`,
      }),
    });

    tx.set(
      doc(collection(database, COLLECTIONS.auditLog)),
      auditEntryFields('record_refund', 'order', orderNumber, {
        amountPence,
        refundedPence,
        paymentStatus,
        stripeRefundId,
        reason,
      }),
    );

    return { ok: true as const, orderNumber, refundedPence, paymentStatus };
  });

  return { data: result };
}

/**
 * Dashboard figures. Both collections are readable by staff, so the counts are
 * aggregated in the browser instead of on a server.
 */
async function getDashboardStats(_input: { asOfDate?: string | null } = {}) {
  const database = requireAdminDb();
  const productSnap = await getDocs(collection(database, COLLECTIONS.products));
  const products = productSnap.docs.map((snap) => {
    const data = snap.data() as { id?: string; name?: string; variants?: unknown };
    return {
      id: typeof data.id === 'string' && data.id ? data.id : snap.id,
      name: typeof data.name === 'string' ? data.name : '',
      variants: Array.isArray(data.variants)
        ? (data.variants as Array<{ id: string; name: string; stock?: number }>)
        : [],
    };
  });

  const orders = await ordersRepository.listAllOrders();
  // `asOfDate` existed for tests on the callable; the dashboard always uses now.
  return { data: computeDashboardStats(orders, products) };
}

async function exportOrdersCSV(filters: CsvExportFilters & { kind?: 'orders' | 'delivery' }) {
  const orders = await ordersRepository.listAllOrders();
  const rows = filterOrdersForExport(orders, filters);
  const csv = filters.kind === 'delivery' ? buildDeliveryCsv(rows) : buildOrdersCsv(rows);
  return { data: { csv, filename: exportFilename(filters) } };
}

export const ordersApi = {
  updateOrderStatus,
  recordManualRefund,
  getDashboardStats,
  exportOrdersCSV,
};

export const ordersRepository = {
  async listOrdersByUser(userId: string | null, email: string | null): Promise<OrderRecord[]> {
    if (!db) throw new Error('Firestore not initialized');
    const emailLower = email ? email.toLowerCase() : '';
    const q = query(
      collection(db, COLLECTIONS.orders),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    const all = snap.docs.map(docToOrder);
    return all.filter(
      (o) =>
        (userId && o.userId === userId) ||
        (emailLower && o.contact.emailLower === emailLower),
    );
  },

  async getOrder(orderNumber: string): Promise<OrderRecord | null> {
    if (!db) throw new Error('Firestore not initialized');
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.orders), where('orderNumber', '==', orderNumber)),
    );
    if (snap.empty) return null;
    return docToOrder(snap.docs[0]);
  },

  async listAllOrders(): Promise<OrderRecord[]> {
    if (!db) throw new Error('Firestore not initialized');
    const q = query(collection(db, COLLECTIONS.orders), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(docToOrder);
  },

  async listAuditLog(maxResults = 100): Promise<Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    uid: string;
    email: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: unknown;
  }>> {
    if (!db) throw new Error('Firestore not initialized');
    const q = query(
      collection(db, COLLECTIONS.auditLog),
      orderBy('createdAt', 'desc'),
      limit(maxResults),
    );
    const snap = await getDocs(q);
    return snap.docs.map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        action: String(data.action ?? ''),
        entityType: String(data.entityType ?? ''),
        entityId: String(data.entityId ?? ''),
        uid: String(data.uid ?? ''),
        email: data.email ?? null,
        metadata: data.metadata ?? null,
        createdAt: data.createdAt ?? null,
      };
    });
  },
};

// Re-exported so pages can import the type without reaching into lib/ordersReport.
export type { DashboardStats } from './ordersReport';
