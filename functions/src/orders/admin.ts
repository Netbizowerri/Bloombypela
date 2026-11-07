/**
 * Order operations callables.
 *
 * - updateOrderStatus: staff/admin. Transitions order status, appends
 *   statusHistory, writes auditLog. Triggers status-update email.
 * - refundOrder: admin only. Stripe refunds API with idempotency key.
 *   Writes auditLog. Idempotent per refund idempotency key.
 * - getDashboardStats: staff only. Today's orders, upcoming delivery dates
 *   with counts, 7/30 day revenue, low-stock list.
 * - exportOrdersCSV: staff only. CSV of orders (escaped) or delivery list by
 *   date and area.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/logger';
import Stripe from 'stripe';
import { adminDb } from '../lib/admin';
import { ALLOWED_ORIGINS } from '../lib/config';
import { fromZodError, invalidArgument, notFound, internal } from '../lib/errors';
import { requireRole } from '../lib/auth';
import { checkRateLimit } from '../lib/rateLimit';
import { STRIPE_SECRET_KEY, stripeClient } from '../lib/stripe';
import {
  sendStatusUpdate,
} from '../email/index';
import type { OrderRecord, OrderStatus } from '../lib/types';

const ORDER_STATUS_LIMIT = { maxRequests: 30, windowMs: 60_000 };
const REFUND_LIMIT = { maxRequests: 10, windowMs: 60_000 };
const DASHBOARD_LIMIT = { maxRequests: 60, windowMs: 60_000 };
const CSV_LIMIT = { maxRequests: 20, windowMs: 60_000 };

const LOW_STOCK_THRESHOLD = 5;

type OrderStatusTransition = Record<OrderStatus, OrderStatus[]>;

/**
 * Allowed status transitions. An order moves forward through the lifecycle.
 * Cancellations and refunds are terminal-ish branches.
 */
const ALLOWED_TRANSITIONS: OrderStatusTransition = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'collected', 'cancelled'],
  out_for_delivery: ['delivered', 'collected', 'cancelled'],
  delivered: [], // terminal
  collected: [], // terminal
  cancelled: [], // terminal
  refunded: [], // terminal
  partially_refunded: [], // terminal
};

function isAllowedTransition(from: OrderStatus | null, to: OrderStatus): boolean {
  if (from === null) return to === 'confirmed';
  const allowed = ALLOWED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

export { isAllowedTransition };

const UpdateOrderStatusInput = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  status: z.enum([
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'collected',
    'cancelled',
  ]),
  note: z.string().trim().max(500).optional().nullable(),
});

/**
 * updateOrderStatus: transition an order's status.
 * Staff or admin. Appends statusHistory and writes auditLog.
 */
export const updateOrderStatus = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const { uid, email } = requireRole(request, ['staff', 'admin']);
    const ip = request.rawRequest.ip ?? 'unknown';
    if (
      !checkRateLimit(
        `updateOrderStatus:${ip}`,
        ORDER_STATUS_LIMIT.maxRequests,
        ORDER_STATUS_LIMIT.windowMs,
      )
    ) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    const parsed = UpdateOrderStatusInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const { orderNumber, status, note } = parsed.data;
    const db = adminDb();

    return db.runTransaction(async (tx) => {
      const orderRef = db.collection('orders').doc(orderNumber);
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw notFound(`Order ${orderNumber} not found.`);

      const order = snap.data() as OrderRecord;
      const from = order.status as OrderStatus;

      if (!isAllowedTransition(from, status)) {
        throw invalidArgument(
          `Cannot transition order ${orderNumber} from ${from} to ${status}.`,
        );
      }

      const now = Timestamp.now();
      // Firestore rejects undefined array elements, so omit an absent note.
      const historyEntry = note ? { status, at: now, note } : { status, at: now };

      tx.update(orderRef, {
        status,
        updatedAt: now,
        statusHistory: FieldValue.arrayUnion(historyEntry),
        internalNote: note ?? order.internalNote ?? null,
      });

      await tx.create(db.collection('auditLog').doc(), {
        action: 'update_order_status',
        entityType: 'order',
        entityId: orderNumber,
        uid: uid,
        email: email,
        metadata: { from, to: status, note: note ?? null },
        createdAt: FieldValue.serverTimestamp(),
      });

      // Send status update email (idempotent via emailLog).
      try {
        await sendStatusUpdate(db, { ...order, status } as OrderRecord);
      } catch (error) {
        logger.error('status update email failed', {
          orderNumber,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }

      return { ok: true, orderNumber, status };
    });
  },
);

const RefundOrderInput = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  amountPence: z.number().int().positive(),
  reason: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().trim().min(1).max(120),
});

/**
 * refundOrder: refund an order via Stripe. Admin only.
 * Idempotent per idempotencyKey. Writes auditLog.
 */
export const refundOrder = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin']);
    const ip = request.rawRequest.ip ?? 'unknown';
    logger.info('order refund by', { uid: identity.uid, email: identity.email });
    if (
      !checkRateLimit(
        `refundOrder:${ip}`,
        REFUND_LIMIT.maxRequests,
        REFUND_LIMIT.windowMs,
      )
    ) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    const parsed = RefundOrderInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const { orderNumber, amountPence, reason, idempotencyKey } = parsed.data;
    const db = adminDb();

    return db.runTransaction(async (tx) => {
      const orderRef = db.collection('orders').doc(orderNumber);
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw notFound(`Order ${orderNumber} not found.`);

      const order = snap.data() as OrderRecord;

      // Refund amount cannot exceed paid total.
      const remaining = order.totalPence - order.refundedPence;
      if (amountPence > remaining) {
        throw invalidArgument(
          `Refund amount ${amountPence}p exceeds unrefunded total ${remaining}p for order ${orderNumber}.`,
        );
      }

      if (!order.stripePaymentIntentId) {
        throw invalidArgument(`Order ${orderNumber} has no Stripe payment intent to refund.`);
      }

      const client = stripeClient(STRIPE_SECRET_KEY.value());

      // Idempotent Stripe refund.
      let refund: Stripe.Refund;
      try {
        refund = await client.refunds.create(
          {
            payment_intent: order.stripePaymentIntentId,
            amount: amountPence,
            reason: reason ? ('other' as const) : undefined,
            metadata: {
              orderNumber,
              reason: reason ?? 'admin_refund',
            },
          },
          { idempotencyKey },
        );
      } catch (error) {
        logger.error('stripe refund failed', {
          orderNumber,
          amountPence,
          idempotencyKey,
          reason: error instanceof Error ? error.message : 'unknown',
        });
        throw internal('Stripe refund failed. Please try again.');
      }

      const newRefundedPence = order.refundedPence + amountPence;
      const isFull = newRefundedPence >= order.totalPence;
      const paymentStatus = isFull ? 'refunded' : 'partially_refunded';
      const orderStatus = isFull ? 'refunded' : 'partially_refunded';

      tx.update(orderRef, {
        paymentStatus,
        status: orderStatus,
        refundedPence: newRefundedPence,
        updatedAt: Timestamp.now(),
        statusHistory: FieldValue.arrayUnion({
          status: orderStatus,
          at: Timestamp.now(),
          note: `Refund ${moneyCore(amountPence)}: ${reason ?? 'admin refund'}`,
        }),
      });

      await tx.create(db.collection('auditLog').doc(), {
        action: 'refund_order',
        entityType: 'order',
        entityId: orderNumber,
        uid: identity.uid,
        email: identity.email,
        metadata: {
          amountPence,
          refundId: refund.id,
          reason: reason ?? null,
          newRefundedPence,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        orderNumber,
        refundId: refund.id,
        refundedPence: newRefundedPence,
        paymentStatus,
      };
    });
  },
);

const GetDashboardStatsInput = z.object({
  asOfDate: z.string().trim().max(10).optional().nullable(),
});

/**
 * getDashboardStats: staff only.
 * Today's orders, upcoming delivery dates with counts, 7/30 day revenue,
 * low-stock list (variants below threshold).
 */
export const getDashboardStats = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    requireRole(request, ['staff', 'admin']);
    const ip = request.rawRequest.ip ?? 'unknown';
    if (
      !checkRateLimit(
        `getDashboardStats:${ip}`,
        DASHBOARD_LIMIT.maxRequests,
        DASHBOARD_LIMIT.windowMs,
      )
    ) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    const parsed = GetDashboardStatsInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const db = adminDb();
    const asOf = parsed.data.asOfDate
      ? new Date(`${parsed.data.asOfDate}T00:00:00Z`)
      : new Date();
    const asOfLondon = new Date(
      asOf.toLocaleString('en-US', { timeZone: 'Europe/London' }),
    );
    const todayStr = asOfLondon.toISOString().slice(0, 10);

    // Orders created today (London date).
    const todayStart = new Date(`${todayStr}T00:00:00Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59Z`);
    const todaySnap = await db
      .collection('orders')
      .where('createdAt', '>=', Timestamp.fromDate(todayStart))
      .where('createdAt', '<=', Timestamp.fromDate(todayEnd))
      .get();

    let todayRevenue = 0;
    let todayOrderCount = 0;
    const todayOrders: Array<{
      orderNumber: string;
      customer: string;
      area: string;
      totalPence: number;
      status: string;
    }> = [];
    todaySnap.forEach((doc) => {
      const o = doc.data() as OrderRecord;
      todayRevenue += o.totalPence;
      todayOrderCount += 1;
      todayOrders.push({
        orderNumber: o.orderNumber,
        customer: o.contact.name,
        area: o.fulfilment.areaName ?? '',
        totalPence: o.totalPence,
        status: o.status,
      });
    });

    // Revenue last 7 and 30 days (London).
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(asOfLondon.getTime() - 7 * dayMs);
    const thirtyDaysAgo = new Date(asOfLondon.getTime() - 30 * dayMs);
    const allSnap = await db.collection('orders').get();

    let revenue7d = 0;
    let revenue30d = 0;
    allSnap.forEach((doc) => {
      const o = doc.data() as OrderRecord;
      const created = toFirestoreDate(o.createdAt);
      if (!created) return;
      const createdLondon = new Date(
        created.toLocaleString('en-US', { timeZone: 'Europe/London' }),
      );
      if (createdLondon >= sevenDaysAgo) revenue7d += o.totalPence;
      if (createdLondon >= thirtyDaysAgo) revenue30d += o.totalPence;
    });

    // Upcoming delivery dates with counts (delivery orders, not cancelled/refunded).
    const dateCounts = new Map<string, { count: number; areaCounts: Map<string, number> }>();
    allSnap.forEach((doc) => {
      const o = doc.data() as OrderRecord;
      if (
        o.status === 'cancelled' ||
        o.status === 'refunded' ||
        o.status === 'partially_refunded'
      )
        return;
      if (o.fulfilment.method !== 'delivery' || !o.fulfilment.deliveryDate) return;
      const d = o.fulfilment.deliveryDate;
      if (!dateCounts.has(d)) dateCounts.set(d, { count: 0, areaCounts: new Map() });
      const entry = dateCounts.get(d)!;
      entry.count += 1;
      const area = o.fulfilment.areaName ?? 'Unknown';
      entry.areaCounts.set(area, (entry.areaCounts.get(area) ?? 0) + 1);
    });
    const upcomingDates = Array.from(dateCounts.entries())
      .map(([date, entry]) => ({
        date,
        count: entry.count,
        areas: Array.from(entry.areaCounts.entries()).map(([area, count]) => ({
          area,
          count,
        })),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Low stock: variants below threshold.
    const productsSnap = await db.collection('products').get();
    const lowStock: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      stock: number;
      threshold: number;
    }> = [];
    productsSnap.forEach((doc) => {
      const product = doc.data() as {
        id: string;
        name: string;
        variants: Array<{ id: string; name: string; stock: number }>;
      };
      for (const variant of product.variants ?? []) {
        if (variant.stock <= LOW_STOCK_THRESHOLD) {
          lowStock.push({
            productId: product.id,
            productName: product.name,
            variantId: variant.id,
            variantName: variant.name,
            stock: variant.stock,
            threshold: LOW_STOCK_THRESHOLD,
          });
        }
      }
    });
    lowStock.sort((a, b) => a.stock - b.stock);

    return {
      ok: true,
      today: {
        orderCount: todayOrderCount,
        revenuePence: todayRevenue,
        orders: todayOrders,
      },
      revenue7dPence: revenue7d,
      revenue30dPence: revenue30d,
      upcomingDeliveryDates: upcomingDates,
      lowStock,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      generatedAt: Timestamp.now().toDate().toISOString(),
    };
  },
);

const ExportOrdersCSVInput = z.object({
  fromDate: z.string().trim().max(10).optional().nullable(),
  toDate: z.string().trim().max(10).optional().nullable(),
  status: z.string().trim().max(40).optional().nullable(),
  area: z.string().trim().max(100).optional().nullable(),
  deliveryDate: z.string().trim().max(10).optional().nullable(),
  kind: z.enum(['orders', 'delivery']).default('orders'),
});

/**
 * exportOrdersCSV: staff only. Returns CSV text for orders or a delivery list.
 * Fields are RFC 4180 escaped (commas, quotes, newlines). Formula injection
 * characters (= + - @) are prefixed with a tab to neutralise them.
 */
export const exportOrdersCSV = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    requireRole(request, ['staff', 'admin']);
    const ip = request.rawRequest.ip ?? 'unknown';
    if (
      !checkRateLimit(
        `exportOrdersCSV:${ip}`,
        CSV_LIMIT.maxRequests,
        CSV_LIMIT.windowMs,
      )
    ) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    const parsed = ExportOrdersCSVInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const { fromDate, toDate, status, area, deliveryDate, kind } = parsed.data;
    const db = adminDb();

    let query = db.collection('orders') as FirebaseFirestore.Query;
    if (status) query = query.where('status', '==', status);
    if (deliveryDate) query = query.where('fulfilment.deliveryDate', '==', deliveryDate);
    if (area) query = query.where('fulfilment.areaName', '==', area);

    const snap = await query.get();
    const rows: OrderRecord[] = [];
    snap.forEach((doc) => {
      const o = doc.data() as OrderRecord;
      if (fromDate || toDate) {
        const created = toFirestoreDate(o.createdAt);
        if (!created) return;
        const d = created.toISOString().slice(0, 10);
        if (fromDate && d < fromDate) return;
        if (toDate && d > toDate) return;
      }
      rows.push(o);
    });

    if (kind === 'delivery') {
      return { csv: buildDeliveryCSV(rows), filename: `delivery-${deliveryDate ?? 'all'}.csv` };
    }
    return { csv: buildOrdersCSV(rows), filename: `orders-${fromDate ?? 'all'}-to-${toDate ?? 'all'}.csv` };
  },
);

function moneyCore(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function toFirestoreDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const toDate = (value as { toDate?: () => Date }).toDate;
  return typeof toDate === 'function' ? toDate.call(value) : null;
}

/** RFC 4180 CSV field escaping + formula-injection neutralisation. */
export function csvField(value: string | number): string {
  const s = String(value ?? '');
  // Neutralise formula injection: prefix = + - @ with a tab.
  if (/^[=+\-@]/.test(s)) {
    return `"\t${s.replace(/"/g, '""')}"`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildOrdersCSV(orders: OrderRecord[]): string {
  const header = [
    'Order Number',
    'Customer',
    'Email',
    'Phone',
    'Status',
    'Payment Status',
    'Fulfilment',
    'Area',
    'Delivery Date',
    'Subtotal (pence)',
    'Delivery Fee (pence)',
    'Discount (pence)',
    'Total (pence)',
    'Refunded (pence)',
    'Notes',
    'Created At',
  ].map(csvField).join(',');

  const lines = orders.map((o) => {
    const created = toFirestoreDate(o.createdAt)?.toISOString() ?? '';
    return [
      o.orderNumber,
      o.contact.name,
      o.contact.email,
      o.contact.phone,
      o.status,
      o.paymentStatus,
      o.fulfilment.method,
      o.fulfilment.areaName ?? '',
      o.fulfilment.deliveryDate ?? '',
      o.subtotalPence,
      o.deliveryFeePence,
      o.discountPence,
      o.totalPence,
      o.refundedPence,
      o.notes,
      created,
    ].map(csvField).join(',');
  });

  return [header, ...lines].join('\n');
}

function buildDeliveryCSV(orders: OrderRecord[]): string {
  const header = [
    'Delivery Date',
    'Order Number',
    'Customer',
    'Phone',
    'Postcode',
    'Area',
    'Items Summary',
    'Total (pence)',
    'Status',
  ].map(csvField).join(',');

  const lines = orders.map((o) => {
    const itemsSummary = o.items
      .map((i) => `${i.quantity}× ${i.name}`)
      .join('; ')
      .slice(0, 200);
    return [
      o.fulfilment.deliveryDate ?? '',
      o.orderNumber,
      o.contact.name,
      o.contact.phone,
      o.fulfilment.address?.postcode ?? '',
      o.fulfilment.areaName ?? '',
      itemsSummary,
      o.totalPence,
      o.status,
    ].map(csvField).join(',');
  });

  return [header, ...lines].join('\n');
}
