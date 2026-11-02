/**
 * Client-side orders API.
 *
 * Order reads come straight from Firestore (orders are readable by the
 * owning customer and by staff/admin). Order writes go through Cloud
 * Functions callables which also write auditLog.
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { db } from './firebase';
import { callable } from './functions';
import type { OrderRecord } from '../types/orders';

const COLLECTIONS = {
  orders: 'orders',
} as const;

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

const updateOrderStatusFn = callable<
  { orderNumber: string; status: OrderRecord['status']; note?: string | null },
  { ok: boolean; orderNumber: string; status: OrderRecord['status'] }
>('updateOrderStatus');

const refundOrderFn = callable<
  {
    orderNumber: string;
    amountPence: number;
    reason?: string | null;
    idempotencyKey: string;
  },
  {
    ok: boolean;
    orderNumber: string;
    refundId: string;
    refundedPence: number;
    paymentStatus: OrderRecord['paymentStatus'];
  }
>('refundOrder');

const getDashboardStatsFn = callable<
  { asOfDate?: string | null },
  {
    ok: boolean;
    today: {
      orderCount: number;
      revenuePence: number;
      orders: Array<{
        orderNumber: string;
        customer: string;
        area: string;
        totalPence: number;
        status: string;
      }>;
    };
    revenue7dPence: number;
    revenue30dPence: number;
    upcomingDeliveryDates: Array<{
      date: string;
      count: number;
      areas: Array<{ area: string; count: number }>;
    }>;
    lowStock: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      stock: number;
      threshold: number;
    }>;
    lowStockThreshold: number;
    generatedAt: string;
  }
>('getDashboardStats');

const exportOrdersCSVFn = callable<
  {
    fromDate?: string | null;
    toDate?: string | null;
    status?: string | null;
    area?: string | null;
    deliveryDate?: string | null;
    kind?: 'orders' | 'delivery';
  },
  { csv: string; filename: string }
>('exportOrdersCSV');

export const ordersApi = {
  updateOrderStatus: (data: Parameters<typeof updateOrderStatusFn>[0]) =>
    updateOrderStatusFn(data),
  refundOrder: (data: Parameters<typeof refundOrderFn>[0]) => refundOrderFn(data),
  getDashboardStats: (data: Parameters<typeof getDashboardStatsFn>[0]) =>
    getDashboardStatsFn(data),
  exportOrdersCSV: (data: Parameters<typeof exportOrdersCSVFn>[0]) =>
    exportOrdersCSVFn(data),
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
      collection(db, 'auditLog'),
      orderBy('createdAt', 'desc'),
      limit(maxResults),
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
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
