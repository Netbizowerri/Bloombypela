/**
 * Public order lookups.
 *
 * - `getOrderBySession` powers the success page. It looks the order up by the
 *   Stripe Checkout Session id, never by anything in the query string. The
 *   success page cannot confirm an order; it can only read what the verified
 *   webhook already wrote.
 * - `lookupGuestOrder` lets a guest find their order with the order number and
 *   the email used at checkout. Both wrong-number and wrong-email return the
 *   same generic error so the endpoint cannot be used to enumerate orders.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { adminDb } from '../lib/admin';
import { ALLOWED_ORIGINS } from '../lib/config';
import { fromZodError, notFound } from '../lib/errors';
import { checkRateLimit } from '../lib/rateLimit';
import type { OrderRecord } from '../checkout/reservationService';

const SESSION_LOOKUP_LIMIT = { maxRequests: 120, windowMs: 60_000 };
const GUEST_LOOKUP_LIMIT = { maxRequests: 10, windowMs: 60_000 };

const GENERIC_LOOKUP_ERROR =
  'We could not find an order with that order number and email address.';

const GetOrderBySessionInput = z.object({
  sessionId: z.string().trim().min(10).max(200),
});

const LookupGuestOrderInput = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(254),
});

export interface PublicOrderItem {
  name: string;
  variantName: string;
  quantity: number;
  unitPricePence: number;
  lineTotalPence: number;
}

export interface PublicOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  items: PublicOrderItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  fulfilment: {
    method: 'delivery' | 'collection';
    deliveryDate: string | null;
    areaName: string | null;
  };
  notes: string;
  createdAt: string | null;
}

function toPublicOrder(order: OrderRecord): PublicOrder {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: (order.items ?? []).map((item) => ({
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPricePence: item.unitPricePence,
      lineTotalPence: item.lineTotalPence,
    })),
    subtotalPence: order.subtotalPence,
    deliveryFeePence: order.deliveryFeePence,
    discountPence: order.discountPence,
    totalPence: order.totalPence,
    fulfilment: {
      method: order.fulfilment.method,
      deliveryDate: order.fulfilment.deliveryDate,
      areaName: order.fulfilment.areaName,
    },
    notes: order.notes,
    createdAt: order.createdAt ? order.createdAt.toDate().toISOString() : null,
  };
}

/**
 * Hash then compare: timingSafeEqual requires equal-length buffers, and
 * hashing also hides the email length.
 */
function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export const getOrderBySession = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  const ip = request.rawRequest.ip ?? 'unknown';
  if (
    !checkRateLimit(
      `getOrderBySession:${ip}`,
      SESSION_LOOKUP_LIMIT.maxRequests,
      SESSION_LOOKUP_LIMIT.windowMs,
    )
  ) {
    throw new HttpsError('resource-exhausted', 'Too many requests. Please slow down.');
  }

  const parsed = GetOrderBySessionInput.safeParse(request.data ?? {});
  if (!parsed.success) throw fromZodError(parsed.error);

  const db = adminDb();
  const { sessionId } = parsed.data;

  const orders = await db
    .collection('orders')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (!orders.empty) {
    const doc = orders.docs[0];
    return {
      state: 'confirmed' as const,
      order: toPublicOrder({ ...(doc.data() as OrderRecord) }),
    };
  }

  // Payment may still be settling: the webhook has not written the order yet.
  const reservations = await db
    .collection('reservations')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (!reservations.empty) {
    const data = reservations.docs[0].data() as { status?: string };
    return {
      state: data.status === 'payment_unfulfilled' ? ('unfulfilled' as const) : ('pending' as const),
      order: null,
    };
  }

  return { state: 'not_found' as const, order: null };
});

export const lookupGuestOrder = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  const ip = request.rawRequest.ip ?? 'unknown';
  if (
    !checkRateLimit(
      `lookupGuestOrder:${ip}`,
      GUEST_LOOKUP_LIMIT.maxRequests,
      GUEST_LOOKUP_LIMIT.windowMs,
    )
  ) {
    throw new HttpsError('resource-exhausted', 'Too many lookups. Please try again later.');
  }

  const parsed = LookupGuestOrderInput.safeParse(request.data ?? {});
  if (!parsed.success) throw fromZodError(parsed.error);

  const db = adminDb();
  const orderNumber = parsed.data.orderNumber.trim().toUpperCase();
  const email = parsed.data.email.trim().toLowerCase();

  const snap = await db
    .collection('orders')
    .where('orderNumber', '==', orderNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    // Same error as a wrong email, and the same amount of work.
    throw notFound(GENERIC_LOOKUP_ERROR);
  }

  const doc = snap.docs[0];
  const order = doc.data() as OrderRecord;
  const storedEmail = order.contact?.emailLower ?? order.contact?.email?.toLowerCase() ?? '';

  if (!safeEqual(email, storedEmail)) {
    throw notFound(GENERIC_LOOKUP_ERROR);
  }

  return { order: toPublicOrder(order) };
});
