/**
 * Reservations, stock holds and order fulfilment.
 *
 * Invariants enforced here:
 * - A reservation is the only place stock and juice capacity are held before payment.
 * - Stock is decremented and capacity is converted to reserved only when the
 *   signature-verified Stripe webhook confirms payment.
 * - Every mutation runs in a Firestore transaction, so concurrent checkouts
 *   cannot oversell the same variant or delivery date.
 *
 * Money is integer pence (GBP).
 */

import { DateTime } from 'luxon';
import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Product } from '../lib/types';
import type { CartQuote, PricedLine } from './quoteService';

export const RESERVATION_TTL_MINUTES = 15;
export const FREE_DELIVERY_LABEL = 'Delivery';

export interface ReservationItem {
  productId: string;
  variantId: string;
  quantity: number;
  name: string;
  variantName: string;
  sku: string;
  productType: 'snack' | 'juice';
  unitPricePence: number;
  lineTotalPence: number;
}

export interface ReservationContact {
  name: string;
  email: string;
  emailLower: string;
  phone: string;
}

export interface ReservationAddress {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
}

export interface ReservationFulfilment {
  method: 'delivery' | 'collection';
  address: ReservationAddress | null;
  areaName: string | null;
  deliveryDate: string | null;
  collectionDetails: string | null;
}

export type ReservationStatus =
  | 'pending'
  | 'completed'
  | 'expired'
  | 'released'
  | 'payment_unfulfilled';

export interface ReservationRecord {
  id: string;
  userId: string | null;
  contact: ReservationContact;
  items: ReservationItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  fulfilment: ReservationFulfilment;
  notes: string;
  promotionId: string | null;
  promoCode: string | null;
  hasJuices: boolean;
  juiceBottles: number;
  status: ReservationStatus;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  /** Coupon created for the discount, deleted if the checkout is abandoned. */
  stripeCouponId?: string | null;
  /** Set when a delayed payment method has completed but not settled. */
  awaitingPaymentAt?: Timestamp | null;
  orderId: string | null;
  completedAt: Timestamp | null;
  releasedAt: Timestamp | null;
}

export interface ReservationDetails {
  userId: string | null;
  contact: { name: string; email: string; phone: string };
  address: ReservationAddress | null;
  notes: string;
}

export interface OrderRecord {
  orderNumber: string;
  reservationId: string;
  userId: string | null;
  contact: ReservationContact;
  items: ReservationItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  fulfilment: ReservationFulfilment;
  notes: string;
  status: 'confirmed' | 'refunded' | 'partially_refunded';
  paymentStatus: 'paid' | 'refunded' | 'partially_refunded';
  refundedPence: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  promotionId: string | null;
  promoCode: string | null;
  /** True once a full refund has returned the promotion redemption. */
  promotionRestored?: boolean;
  statusHistory: Array<{ status: string; at: Timestamp; note?: string }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface StockHoldDoc {
  productId: string;
  variants: Record<string, number>;
  updatedAt?: Timestamp;
}

interface RequiredQuantities {
  byProduct: Map<string, Map<string, number>>;
}

type VariantStock = Array<{ id: string; stock: number; [key: string]: unknown }>;

function fail(message: string): never {
  throw new HttpsError('failed-precondition', message);
}

function quantitiesFor(items: ReservationItem[]): RequiredQuantities {
  const byProduct = new Map<string, Map<string, number>>();
  for (const item of items) {
    const variants = byProduct.get(item.productId) ?? new Map<string, number>();
    variants.set(item.variantId, (variants.get(item.variantId) ?? 0) + item.quantity);
    byProduct.set(item.productId, variants);
  }
  return { byProduct };
}

function productIdsOf(items: ReservationItem[]): string[] {
  return [...new Set(items.map((item) => item.productId))];
}

async function readDocs(
  tx: Transaction,
  refs: DocumentReference[],
): Promise<DocumentSnapshot[]> {
  return Promise.all(refs.map((ref) => tx.get(ref)));
}

/** Decrements a variant hold, never below zero. */
function decrementHold(
  existing: Record<string, number>,
  variantId: string,
  quantity: number,
): Record<string, number> {
  const next = { ...existing };
  const value = Math.max(0, (next[variantId] ?? 0) - quantity);
  if (value === 0) {
    delete next[variantId];
  } else {
    next[variantId] = value;
  }
  return next;
}

/**
 * Creates a pending reservation and holds stock/capacity transactionally.
 *
 * Re-reads products so a price or stock change between quote and reservation
 * aborts checkout instead of charging a stale price.
 */
export async function createReservation(
  db: Firestore,
  quote: CartQuote,
  details: ReservationDetails,
  now: DateTime = DateTime.now(),
): Promise<ReservationRecord> {
  if (quote.warnings.length > 0) {
    fail(
      `Some items are no longer available: ${quote.warnings.join('; ')}. Please refresh your basket.`,
    );
  }

  const reservationRef = db.collection('reservations').doc();
  const createdAt = Timestamp.fromDate(now.toJSDate());
  const expiresAt = Timestamp.fromDate(
    now.plus({ minutes: RESERVATION_TTL_MINUTES }).toJSDate(),
  );
  const items: ReservationItem[] = quote.lines.map(toReservationItem);
  const required = quantitiesFor(items);
  const productIds = productIdsOf(items);

  const record: ReservationRecord = {
    id: reservationRef.id,
    userId: details.userId,
    contact: {
      name: details.contact.name,
      email: details.contact.email,
      emailLower: details.contact.email.trim().toLowerCase(),
      phone: details.contact.phone,
    },
    items,
    subtotalPence: quote.subtotalPence,
    deliveryFeePence: quote.deliveryFeePence,
    discountPence: quote.discountPence,
    totalPence: quote.totalPence,
    fulfilment: {
      method: quote.fulfilment,
      address: details.address,
      areaName: quote.areaName,
      deliveryDate: quote.deliveryDate,
      collectionDetails: quote.collectionDetails,
    },
    notes: details.notes,
    promotionId: quote.promotionId,
    promoCode: quote.promoCode,
    hasJuices: quote.hasJuices,
    juiceBottles: quote.juiceBottles,
    status: 'pending',
    expiresAt,
    createdAt,
    updatedAt: createdAt,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    stripeCouponId: null,
    orderId: null,
    completedAt: null,
    releasedAt: null,
  };

  await db.runTransaction(async (tx) => {
    const productRefs = productIds.map((id) => db.collection('products').doc(id));
    const holdRefs = productIds.map((id) => db.collection('stockHolds').doc(id));
    const capacityRef =
      quote.hasJuices && quote.deliveryDate
        ? db.collection('dateCapacity').doc(quote.deliveryDate)
        : null;

    const productSnaps = await readDocs(tx, productRefs);
    const holdSnaps = await readDocs(tx, holdRefs);
    const capacitySnap = capacityRef ? await tx.get(capacityRef) : null;

    productSnaps.forEach((snap, index) => {
      const productId = productIds[index];
      if (!snap.exists) {
        fail('A product in your basket is no longer available. Please refresh.');
      }
      const product = snap.data() as Product;
      const requiredVariants = required.byProduct.get(productId);
      const holds = (holdSnaps[index].data() as StockHoldDoc | undefined)?.variants ?? {};

      for (const line of items.filter((item) => item.productId === productId)) {
        const variant = (product.variants ?? []).find(
          (candidate) => candidate.id === line.variantId,
        );
        if (!variant) {
          fail(`${product.name} is no longer available. Please refresh your basket.`);
        }
        if (variant.pricePence !== line.unitPricePence) {
          fail('Prices changed while you were checking out. Please review your basket.');
        }
      }

      for (const [variantId, quantity] of requiredVariants ?? new Map()) {
        const variant = (product.variants ?? []).find(
          (candidate) => candidate.id === variantId,
        );
        if (!variant) {
          fail(`${product.name} is no longer available. Please refresh your basket.`);
        }
        const available = variant.stock - (holds[variantId] ?? 0);
        if (available < quantity) {
          fail(
            `${product.name}: only ${Math.max(0, available)} left in stock. Please adjust your basket.`,
          );
        }
      }
    });

    if (capacityRef && capacitySnap?.exists && quote.juiceBottles > 0) {
      const data = capacitySnap.data() as {
        juiceCapacity?: number;
        juiceReserved?: number;
        juiceHeld?: number;
        closed?: boolean;
      };
      const capacity = Number(data.juiceCapacity ?? 0);
      const reserved = Number(data.juiceReserved ?? 0);
      const held = Number(data.juiceHeld ?? 0);
      const remaining = capacity - reserved - held;
      if (data.closed || remaining < quote.juiceBottles) {
        fail('The selected delivery date no longer has enough juice capacity.');
      }
    }

    // All reads are complete: apply writes.
    holdSnaps.forEach((snap, index) => {
      const productId = productIds[index];
      const requiredVariants = required.byProduct.get(productId);
      if (!requiredVariants) return;

      const existing = (snap.data() as StockHoldDoc | undefined)?.variants ?? {};
      const next = { ...existing };
      for (const [variantId, quantity] of requiredVariants) {
        next[variantId] = (next[variantId] ?? 0) + quantity;
      }
      tx.set(
        holdRefs[index],
        { productId, variants: next, updatedAt: createdAt } satisfies StockHoldDoc,
        { merge: false },
      );
    });

    if (capacityRef && capacitySnap?.exists && quote.juiceBottles > 0) {
      tx.update(capacityRef, { juiceHeld: FieldValue.increment(quote.juiceBottles) });
    }

    tx.set(reservationRef, record);
  });

  return record;
}

function toReservationItem(line: PricedLine): ReservationItem {
  return {
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    name: line.name,
    variantName: line.variantName,
    sku: line.sku,
    productType: line.productType,
    unitPricePence: line.unitPricePence,
    lineTotalPence: line.lineTotalPence,
  };
}

/** Releases all holds attached to a pending reservation. */
async function releaseReservationTx(
  tx: Transaction,
  db: Firestore,
  reservation: ReservationRecord,
  status: 'expired' | 'released',
  now: Timestamp,
): Promise<void> {
  const productIds = productIdsOf(reservation.items);
  const holdRefs = productIds.map((id) => db.collection('stockHolds').doc(id));
  const holdSnaps = await readDocs(tx, holdRefs);
  const required = quantitiesFor(reservation.items);

  const capacityRef =
    reservation.hasJuices && reservation.fulfilment.deliveryDate
      ? db.collection('dateCapacity').doc(reservation.fulfilment.deliveryDate)
      : null;
  const capacitySnap = capacityRef ? await tx.get(capacityRef) : null;

  holdSnaps.forEach((snap, index) => {
    const productId = productIds[index];
    const requiredVariants = required.byProduct.get(productId);
    if (!requiredVariants) return;

    let next = (snap.data() as StockHoldDoc | undefined)?.variants ?? {};
    for (const [variantId, quantity] of requiredVariants) {
      next = decrementHold(next, variantId, quantity);
    }
    tx.set(
      holdRefs[index],
      { productId, variants: next, updatedAt: now } satisfies StockHoldDoc,
      { merge: false },
    );
  });

  if (capacityRef && capacitySnap?.exists && reservation.juiceBottles > 0) {
    const data = capacitySnap.data() as { juiceHeld?: number };
    const held = Number(data.juiceHeld ?? 0);
    tx.update(capacityRef, {
      juiceHeld: Math.max(0, held - reservation.juiceBottles),
    });
  }

  tx.update(db.collection('reservations').doc(reservation.id), {
    status,
    releasedAt: now,
    updatedAt: now,
  });
}

/**
 * Releases a single pending reservation. Safe to call repeatedly.
 * Returns the reservation id when a release happened, otherwise null.
 */
export async function releaseReservation(
  db: Firestore,
  reservationId: string,
  status: 'expired' | 'released' = 'released',
): Promise<string | null> {
  return db.runTransaction(async (tx) => {
    const ref = db.collection('reservations').doc(reservationId);
    const snap = await tx.get(ref);
    if (!snap.exists) return null;

    const reservation = { ...(snap.data() as ReservationRecord), id: snap.id };
    if (reservation.status !== 'pending') return null;

    await releaseReservationTx(tx, db, reservation, status, Timestamp.now());
    return reservation.id;
  });
}

export interface FulfilmentInput {
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
}

export type FulfilmentOutcome =
  | 'order_created'
  | 'already_completed'
  | 'reservation_missing'
  | 'payment_unfulfilled';

/**
 * Converts a paid reservation into an order inside the caller's transaction.
 * Never called outside the Stripe webhook.
 */
async function fulfilReservationTx(
  tx: Transaction,
  db: Firestore,
  reservation: ReservationRecord,
  input: FulfilmentInput,
  now: Timestamp,
): Promise<{ outcome: FulfilmentOutcome; orderId: string | null }> {
  if (reservation.status === 'completed' && reservation.orderId) {
    return { outcome: 'already_completed', orderId: reservation.orderId };
  }

  const orderRef = db.collection('orders').doc(reservation.id);
  const existingOrder = await tx.get(orderRef);
  if (existingOrder.exists) {
    return { outcome: 'already_completed', orderId: orderRef.id };
  }

  const isPending = reservation.status === 'pending';
  const productIds = productIdsOf(reservation.items);
  const required = quantitiesFor(reservation.items);

  const productRefs = productIds.map((id) => db.collection('products').doc(id));
  const holdRefs = productIds.map((id) => db.collection('stockHolds').doc(id));
  const capacityRef =
    reservation.hasJuices && reservation.fulfilment.deliveryDate
      ? db.collection('dateCapacity').doc(reservation.fulfilment.deliveryDate)
      : null;
  const promotionRef = reservation.promotionId
    ? db.collection('promotions').doc(reservation.promotionId)
    : null;
  const counterRef = db.collection('counters').doc('orders');

  const productSnaps = await readDocs(tx, productRefs);
  const holdSnaps = await readDocs(tx, holdRefs);
  const capacitySnap = capacityRef ? await tx.get(capacityRef) : null;
  const promotionSnap = promotionRef ? await tx.get(promotionRef) : null;
  const counterSnap = await tx.get(counterRef);

  // Validate all stock before any write.
  try {
    productSnaps.forEach((snap, index) => {
      const productId = productIds[index];
      if (!snap.exists) fail('A product is no longer available.');
      const product = snap.data() as Product;
      const holds = (holdSnaps[index].data() as StockHoldDoc | undefined)?.variants ?? {};

      for (const [variantId, quantity] of required.byProduct.get(productId) ?? new Map()) {
        const variant = (product.variants ?? []).find(
          (candidate) => candidate.id === variantId,
        );
        if (!variant) fail('A product variant is no longer available.');

        // For a pending reservation our own hold is part of `holds`, so only
        // other reservations' holds should reduce what we can take.
        const otherHolds = isPending
          ? Math.max(0, (holds[variantId] ?? 0) - quantity)
          : holds[variantId] ?? 0;
        const available = variant.stock - otherHolds;
        if (available < quantity) {
          fail('Stock is no longer available for a paid order.');
        }
      }
    });

    if (capacityRef && capacitySnap?.exists && reservation.juiceBottles > 0) {
      const data = capacitySnap.data() as {
        juiceCapacity?: number;
        juiceReserved?: number;
        juiceHeld?: number;
      };
      const capacity = Number(data.juiceCapacity ?? 0);
      const reserved = Number(data.juiceReserved ?? 0);
      const held = Number(data.juiceHeld ?? 0);
      const remainingForThisReservation = isPending
        ? capacity - reserved - held + reservation.juiceBottles
        : capacity - reserved - held;
      if (remainingForThisReservation < reservation.juiceBottles) {
        fail('Delivery capacity is no longer available for a paid order.');
      }
    }
  } catch (error) {
    tx.update(db.collection('reservations').doc(reservation.id), {
      status: 'payment_unfulfilled',
      stripeSessionId: input.stripeSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      updatedAt: now,
    });
    return { outcome: 'payment_unfulfilled', orderId: null };
  }

  // Decrement stock.
  productSnaps.forEach((snap, index) => {
    const productId = productIds[index];
    const product = snap.data() as Product;
    const requiredVariants = required.byProduct.get(productId);
    if (!requiredVariants) return;

    const variants: VariantStock = (product.variants ?? []).map((variant) => ({
      ...variant,
      stock: requiredVariants.has(variant.id)
        ? Math.max(0, variant.stock - (requiredVariants.get(variant.id) ?? 0))
        : variant.stock,
    }));

    tx.update(productRefs[index], { variants });
  });

  // Release the reservation's own holds (pending only).
  if (isPending) {
    holdSnaps.forEach((snap, index) => {
      const productId = productIds[index];
      const requiredVariants = required.byProduct.get(productId);
      if (!requiredVariants) return;

      let next = (snap.data() as StockHoldDoc | undefined)?.variants ?? {};
      for (const [variantId, quantity] of requiredVariants) {
        next = decrementHold(next, variantId, quantity);
      }
      tx.set(
        holdRefs[index],
        { productId, variants: next, updatedAt: now } satisfies StockHoldDoc,
        { merge: false },
      );
    });
  }

  // Convert held juice capacity into reserved capacity.
  if (capacityRef && capacitySnap?.exists && reservation.juiceBottles > 0) {
    const data = capacitySnap.data() as { juiceReserved?: number; juiceHeld?: number };
    const reserved = Number(data.juiceReserved ?? 0);
    const held = Number(data.juiceHeld ?? 0);
    tx.update(capacityRef, {
      juiceReserved: reserved + reservation.juiceBottles,
      juiceHeld: isPending
        ? Math.max(0, held - reservation.juiceBottles)
        : held,
    });
  }

  if (promotionRef && promotionSnap?.exists) {
    const data = promotionSnap.data() as { usedCount?: number };
    tx.update(promotionRef, { usedCount: Number(data.usedCount ?? 0) + 1 });
  }

  const nextCounter = Number((counterSnap.data() as { value?: number } | undefined)?.value ?? 0) + 1;
  const orderNumber = `BBP-${String(nextCounter).padStart(6, '0')}`;
  tx.set(counterRef, { value: nextCounter }, { merge: true });

  const order: OrderRecord = {
    orderNumber,
    reservationId: reservation.id,
    userId: reservation.userId,
    contact: reservation.contact,
    items: reservation.items,
    subtotalPence: reservation.subtotalPence,
    deliveryFeePence: reservation.deliveryFeePence,
    discountPence: reservation.discountPence,
    totalPence: reservation.totalPence,
    fulfilment: reservation.fulfilment,
    notes: reservation.notes,
    status: 'confirmed',
    paymentStatus: 'paid',
    refundedPence: 0,
    stripeSessionId: input.stripeSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    promotionId: reservation.promotionId,
    promoCode: reservation.promoCode,
    promotionRestored: false,
    statusHistory: [
      { status: 'confirmed', at: now, note: 'Payment confirmed by Stripe' },
    ],
    createdAt: now,
    updatedAt: now,
  };

  tx.set(orderRef, order);
  tx.update(db.collection('reservations').doc(reservation.id), {
    status: 'completed',
    stripeSessionId: input.stripeSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    orderId: orderRef.id,
    completedAt: now,
    updatedAt: now,
  });

  return { outcome: 'order_created', orderId: orderRef.id };
}

// ---------------------------------------------------------------------
// Webhook event processing
// ---------------------------------------------------------------------

export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export interface EventResult {
  duplicate: boolean;
  outcome: string;
  /** Set when a released reservation had an unused Stripe coupon to delete. */
  couponId?: string;
}

function sessionMetadata(session: Record<string, unknown>): Record<string, string> {
  const metadata = session.metadata;
  if (metadata && typeof metadata === 'object') {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
      if (typeof value === 'string') result[key] = value;
    }
    return result;
  }
  return {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function paymentIntentIdFrom(session: Record<string, unknown>): string | null {
  const paymentIntent = session.payment_intent;
  if (typeof paymentIntent === 'string') return paymentIntent;
  if (paymentIntent && typeof paymentIntent === 'object') {
    return stringValue((paymentIntent as Record<string, unknown>).id);
  }
  return null;
}

/**
 * `payment_status` is the source of truth for whether money has cleared.
 * Delayed methods (bank debits, some wallets) complete the session while it is
 * still `unpaid`, so the value is required before an order is written.
 */
function sessionPaymentStatus(session: Record<string, unknown>): string {
  return stringValue(session.payment_status) ?? 'unpaid';
}

/** Reservation id from metadata, falling back to the stored Stripe session id. */
async function findReservationId(
  tx: Transaction,
  db: Firestore,
  session: Record<string, unknown>,
): Promise<string | null> {
  const metadata = sessionMetadata(session);
  if (metadata.reservationId) return metadata.reservationId;

  const sessionId = stringValue(session.id);
  if (!sessionId) return null;

  const matches = await tx.get(
    db.collection('reservations').where('stripeSessionId', '==', sessionId).limit(1),
  );
  return matches.empty ? null : matches.docs[0].id;
}

/**
 * Turns a paid Checkout Session into an order. Only reached after Stripe has
 * reported `payment_status: 'paid'` for this session.
 */
async function handlePaidSession(
  tx: Transaction,
  db: Firestore,
  session: Record<string, unknown>,
  now: Timestamp,
): Promise<string> {
  const reservationId = await findReservationId(tx, db, session);
  if (!reservationId) return 'missing_reservation_metadata';

  const reservationSnap = await tx.get(db.collection('reservations').doc(reservationId));
  if (!reservationSnap.exists) return 'reservation_missing';

  const reservation = {
    ...(reservationSnap.data() as ReservationRecord),
    id: reservationSnap.id,
  };

  const result = await fulfilReservationTx(
    tx,
    db,
    reservation,
    {
      stripeSessionId: stringValue(session.id) ?? '',
      stripePaymentIntentId: paymentIntentIdFrom(session),
    },
    now,
  );
  return result.outcome;
}

/**
 * Releases the hold for a session whose delayed payment failed. Nothing was
 * captured, so no order is created and the customer can try again.
 */
async function handleFailedSession(
  tx: Transaction,
  db: Firestore,
  session: Record<string, unknown>,
  now: Timestamp,
): Promise<{ outcome: string; couponId: string | null }> {
  const reservationId = await findReservationId(tx, db, session);
  if (!reservationId) return { outcome: 'reservation_missing', couponId: null };

  const reservationSnap = await tx.get(db.collection('reservations').doc(reservationId));
  if (!reservationSnap.exists) return { outcome: 'reservation_missing', couponId: null };

  const reservation = {
    ...(reservationSnap.data() as ReservationRecord),
    id: reservationSnap.id,
  };

  if (reservation.status !== 'pending') {
    return { outcome: `reservation_${reservation.status}`, couponId: null };
  }

  await releaseReservationTx(tx, db, reservation, 'released', now);
  return { outcome: 'reservation_released', couponId: reservation.stripeCouponId ?? null };
}

/**
 * Processes a Stripe event exactly once.
 *
 * The `stripeEvents/{event.id}` document and every order/stock mutation are
 * written in the same transaction, so a replayed event cannot duplicate an
 * order or decrement stock twice.
 */
export async function processStripeEvent(
  db: Firestore,
  event: StripeEventLike,
  now: Timestamp = Timestamp.now(),
): Promise<EventResult> {
  return db.runTransaction(async (tx) => {
    const eventRef = db.collection('stripeEvents').doc(event.id);
    const eventSnap = await tx.get(eventRef);
    if (eventSnap.exists) {
      return { duplicate: true, outcome: 'duplicate' };
    }

    let outcome = 'ignored';
    let releasedCouponId: string | null = null;

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      if (sessionPaymentStatus(session) !== 'paid') {
        // The session finished but the money has not cleared. Keep the 15
        // minute hold and wait for checkout.session.async_payment_succeeded
        // (or ...async_payment_failed) instead of creating an unpaid order.
        outcome = 'awaiting_payment';
      } else {
        outcome = await handlePaidSession(tx, db, session, now);
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const failed = await handleFailedSession(tx, db, event.data.object, now);
      outcome = failed.outcome;
      releasedCouponId = failed.couponId;
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const reservationId = await findReservationId(tx, db, session);

      if (!reservationId) {
        outcome = 'reservation_missing';
      } else {
        const reservationSnap = await tx.get(
          db.collection('reservations').doc(reservationId),
        );
        if (!reservationSnap.exists) {
          outcome = 'reservation_missing';
        } else {
          const reservation = {
            ...(reservationSnap.data() as ReservationRecord),
            id: reservationSnap.id,
          };
          if (reservation.status === 'pending') {
            await releaseReservationTx(tx, db, reservation, 'expired', now);
            outcome = 'reservation_released';
            releasedCouponId = reservation.stripeCouponId ?? null;
          } else {
            outcome = `reservation_${reservation.status}`;
          }
        }
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const paymentIntentId = paymentIntentIdFrom(charge);

      if (!paymentIntentId) {
        outcome = 'missing_payment_intent';
      } else {
        const matches = await tx.get(
          db
            .collection('orders')
            .where('stripePaymentIntentId', '==', paymentIntentId)
            .limit(1),
        );

        if (matches.empty) {
          outcome = 'order_not_found';
        } else {
          const orderDoc = matches.docs[0];
          const order = orderDoc.data() as OrderRecord;
          const refundedPence = Number(charge.amount_refunded ?? 0);
          const fullyRefunded = charge.refunded === true;
          const status = fullyRefunded ? 'refunded' : 'partially_refunded';

          const update: Record<string, unknown> = {
            paymentStatus: status,
            status,
            refundedPence,
            updatedAt: now,
            statusHistory: FieldValue.arrayUnion({
              status,
              at: now,
              note: fullyRefunded ? 'Payment refunded in full' : 'Payment partially refunded',
            }),
          };

          // A fully refunded order should not consume a limited promotion.
          // The flag makes this a one-time correction per order.
          const promotionRef =
            fullyRefunded && order.promotionId && order.promotionRestored !== true
              ? db.collection('promotions').doc(order.promotionId)
              : null;

          if (promotionRef) {
            const promotionSnap = await tx.get(promotionRef);
            if (promotionSnap.exists) {
              const used = Number(
                (promotionSnap.data() as { usedCount?: number }).usedCount ?? 0,
              );
              tx.update(promotionRef, { usedCount: Math.max(0, used - 1) });
            }
            update.promotionRestored = true;
          }

          tx.update(orderDoc.ref, update);
          outcome = status;
        }
      }
    }

    tx.set(eventRef, {
      id: event.id,
      type: event.type,
      outcome,
      processedAt: now,
    });

    const result: EventResult = { duplicate: false, outcome };
    if (releasedCouponId) result.couponId = releasedCouponId;
    return result;
  });
}

/**
 * Releases every pending reservation whose expiry has passed.
 * Returns the number of reservations released.
 */
export async function releaseExpiredReservations(
  db: Firestore,
  now: DateTime = DateTime.now(),
  limit = 100,
): Promise<number> {
  const snap = await db
    .collection('reservations')
    .where('status', '==', 'pending')
    .where('expiresAt', '<=', Timestamp.fromDate(now.toJSDate()))
    .limit(limit)
    .get();

  let released = 0;
  for (const doc of snap.docs) {
    const releasedId = await releaseReservation(db, doc.id, 'expired');
    if (releasedId) released += 1;
  }
  return released;
}
