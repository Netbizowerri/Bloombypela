/**
 * Checkout, reservation, webhook and refund flow tests.
 *
 * Runs against the Firestore emulator (`npm run test:rules`).
 * Stripe itself is mocked: we feed `processStripeEvent` the same event payloads
 * Stripe would deliver, which is exactly what the webhook does after signature
 * verification.
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { computeCartQuote, type CartQuote } from '../src/checkout/quoteService';
import {
  createReservation,
  processStripeEvent,
  releaseExpiredReservations,
  type ReservationRecord,
  type StripeEventLike,
} from '../src/checkout/reservationService';
import { expireReservations } from '../src/reservations/releaseExpired';
import type Stripe from 'stripe';

const PROJECT_ID = 'bloom-by-pela-checkout-test';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

if (getApps().length === 0) {
  initializeApp({ projectId: PROJECT_ID });
}

const db: Firestore = getFirestore();

const SNACK_ID = 'snack-plantain';
const SNACK_VARIANT = 'v-150g';
const JUICE_ID = 'juice-green';
const JUICE_VARIANT = 'v-500ml';
const JUICE_PRICE = 550;

/** Calendar date for juice delivery: a real schedule weekday inside 8 weeks. */
const JUICE_DATE = DateTime.utc().plus({ days: 14 }).toFormat('yyyy-MM-dd');
const JUICE_WEEKDAY = DateTime.fromISO(JUICE_DATE, { zone: 'utc' }).weekday;

async function clearFirestore(): Promise<void> {
  const url = `http://${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Could not clear Firestore emulator: ${response.status}`);
  }
}

async function seedBaseData(snackStock = 10): Promise<void> {
  await db
    .collection('products')
    .doc(SNACK_ID)
    .set({
      name: 'Plantain Chips',
      slug: 'plantain-chips',
      type: 'snack',
      category: 'snacks',
      description: 'Crispy plantain chips',
      ingredients: ['plantain', 'sea salt'],
      allergens: [],
      status: 'active',
      images: [],
      variants: [
        {
          id: SNACK_VARIANT,
          name: '150g',
          pricePence: 350,
          sku: 'SNK-PLA-150',
          stock: snackStock,
          isDefault: true,
        },
      ],
    });

  await db
    .collection('products')
    .doc(JUICE_ID)
    .set({
      name: 'Green Glow',
      slug: 'green-glow',
      type: 'juice',
      category: 'juices',
      description: 'Cold pressed green juice',
      ingredients: ['cucumber', 'apple', 'spinach'],
      allergens: ['celery'],
      status: 'active',
      images: [],
      variants: [
        {
          id: JUICE_VARIANT,
          name: '500ml',
          pricePence: JUICE_PRICE,
          sku: 'JCE-GRN-500',
          stock: 40,
          isDefault: true,
        },
      ],
    });

  await db.collection('deliveryAreas').doc('ne1').set({
    outwardCode: 'NE1',
    areaName: 'Newcastle City Centre',
    feePence: 250,
    minimumOrderPence: 500,
    isActive: true,
  });

  await db.collection('publicSettings').doc('settings').set({
    freeDeliveryThresholdPence: 3000,
    snackFlatFeePence: 250,
    collectionEnabled: true,
    collectionDetails: 'Collect from our shop',
  });

  await db.collection('deliverySchedule').doc('thursday').set({
    weekday: JUICE_WEEKDAY,
    cutoffTime: '12:00',
    leadDays: 0,
    isActive: true,
  });

  await db.collection('dateCapacity').doc(JUICE_DATE).set({
    date: JUICE_DATE,
    juiceCapacity: 5,
    juiceReserved: 0,
    closed: false,
  });
}

const snackQuote = () =>
  computeCartQuote(db, {
    items: [{ productId: SNACK_ID, variantId: SNACK_VARIANT, quantity: 2 }],
    postcode: 'NE1 4ST',
    fulfilment: 'delivery',
    deliveryDate: null,
    promoCode: null,
  });

const juiceQuote = () =>
  computeCartQuote(db, {
    items: [{ productId: JUICE_ID, variantId: JUICE_VARIANT, quantity: 2 }],
    postcode: 'NE1 4ST',
    fulfilment: 'delivery',
    deliveryDate: JUICE_DATE,
    promoCode: null,
  });

const CONTACT = {
  userId: null,
  contact: { name: 'Ada Lovelace', email: 'Ada@Example.com', phone: '07700900123' },
  address: { line1: '1 Grainger Street', line2: null, city: 'Newcastle', postcode: 'NE1 4ST' },
  notes: '',
};

async function reserve(quote: CartQuote): Promise<ReservationRecord> {
  return createReservation(db, quote, CONTACT, DateTime.utc());
}

function completedEvent(
  reservationId: string,
  eventId = 'evt_checkout_completed_1',
  sessionId = 'cs_test_1',
  paymentIntentId = 'pi_test_1',
): StripeEventLike {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        payment_intent: paymentIntentId,
        payment_status: 'paid',
        metadata: { reservationId, userId: 'guest' },
      },
    },
  };
}

function asyncSucceededEvent(
  reservationId: string,
  eventId = 'evt_async_succeeded_1',
  sessionId = 'cs_test_async_1',
  paymentIntentId = 'pi_test_async_1',
): StripeEventLike {
  return {
    id: eventId,
    type: 'checkout.session.async_payment_succeeded',
    data: {
      object: {
        id: sessionId,
        payment_intent: paymentIntentId,
        payment_status: 'paid',
        metadata: { reservationId, userId: 'guest' },
      },
    },
  };
}

function asyncFailedEvent(
  reservationId: string,
  eventId = 'evt_async_failed_1',
  sessionId = 'cs_test_async_1',
): StripeEventLike {
  return {
    id: eventId,
    type: 'checkout.session.async_payment_failed',
    data: {
      object: {
        id: sessionId,
        payment_status: 'unpaid',
        metadata: { reservationId, userId: 'guest' },
      },
    },
  };
}

async function readDoc(path: string) {
  return db.doc(path).get();
}

beforeEach(async () => {
  await clearFirestore();
  await seedBaseData();
});

afterAll(async () => {
  await clearFirestore();
});

describe('server-authoritative pricing', () => {
  it('ignores any price sent by the client', async () => {
    const tampered = {
      items: [
        // The extra price fields are exactly what a malicious client would send.
        { productId: SNACK_ID, variantId: SNACK_VARIANT, quantity: 2, pricePence: 1, unitPricePence: 1 },
      ],
      postcode: 'NE1 4ST',
      fulfilment: 'delivery' as const,
      deliveryDate: null,
      promoCode: null,
    };

    const quote = await computeCartQuote(db, tampered);

    expect(quote.lines[0].unitPricePence).toBe(350);
    expect(quote.lines[0].lineTotalPence).toBe(700);
    expect(quote.subtotalPence).toBe(700);
    expect(quote.totalPence).toBe(950); // 700 + 250 delivery
  });
});

describe('checkout.session.completed', () => {
  it('creates exactly one order and decrements stock once when replayed', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);

    const holdBefore = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(holdBefore.data()?.variants?.[SNACK_VARIANT]).toBe(2);

    const first = await processStripeEvent(db, completedEvent(reservation.id));
    expect(first).toEqual({ duplicate: false, outcome: 'order_created' });

    // Stripe replays the same event id (network retry / manual replay).
    const second = await processStripeEvent(db, completedEvent(reservation.id));
    expect(second).toEqual({ duplicate: true, outcome: 'duplicate' });

    const orders = await db.collection('orders').get();
    expect(orders.size).toBe(1);

    const order = orders.docs[0].data();
    expect(order.orderNumber).toBe('BBP-000001');
    expect(order.status).toBe('confirmed');
    expect(order.paymentStatus).toBe('paid');
    expect(order.totalPence).toBe(quote.totalPence);
    expect(order.stripeSessionId).toBe('cs_test_1');
    expect(order.stripePaymentIntentId).toBe('pi_test_1');
    expect(order.statusHistory).toHaveLength(1);

    const product = await readDoc(`products/${SNACK_ID}`);
    const variant = (product.data()?.variants as Array<{ id: string; stock: number }>).find(
      (candidate) => candidate.id === SNACK_VARIANT,
    );
    expect(variant?.stock).toBe(8);

    const holdAfter = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(holdAfter.data()?.variants?.[SNACK_VARIANT]).toBeUndefined();

    const reservationAfter = await readDoc(`reservations/${reservation.id}`);
    expect(reservationAfter.data()?.status).toBe('completed');
    expect(reservationAfter.data()?.orderId).toBe(reservation.id);

    const counter = await readDoc('counters/orders');
    expect(counter.data()?.value).toBe(1);

    const events = await db.collection('stripeEvents').get();
    expect(events.size).toBe(1);
  });

  it('converts held juice capacity into reserved capacity for the delivery date', async () => {
    const quote = await juiceQuote();
    const reservation = await reserve(quote);

    const held = await readDoc(`dateCapacity/${JUICE_DATE}`);
    expect(held.data()?.juiceHeld).toBe(2);
    expect(held.data()?.juiceReserved).toBe(0);

    await processStripeEvent(db, completedEvent(reservation.id));

    const capacity = await readDoc(`dateCapacity/${JUICE_DATE}`);
    expect(capacity.data()?.juiceHeld).toBe(0);
    expect(capacity.data()?.juiceReserved).toBe(2);
  });

  it('does not oversell when a late payment arrives after the hold was released', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);

    // Another customer buys all remaining stock before this payment lands.
    await db.collection('products').doc(SNACK_ID).update({
      variants: [
        {
          id: SNACK_VARIANT,
          name: '150g',
          pricePence: 350,
          sku: 'SNK-PLA-150',
          stock: 0,
          isDefault: true,
        },
      ],
    });
    await releaseExpiredReservations(db, DateTime.utc(), 100);

    const result = await processStripeEvent(db, completedEvent(reservation.id, 'evt_late_payment'));
    expect(result.outcome).toBe('payment_unfulfilled');

    expect((await db.collection('orders').get()).size).toBe(0);
    const after = await readDoc(`reservations/${reservation.id}`);
    expect(after.data()?.status).toBe('payment_unfulfilled');
  });
});

describe('delayed payment methods', () => {
  it('holds the reservation when the session completes unpaid', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);

    const result = await processStripeEvent(db, {
      id: 'evt_completed_unpaid',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_delayed',
          payment_intent: 'pi_test_delayed',
          payment_status: 'unpaid',
          metadata: { reservationId: reservation.id, userId: 'guest' },
        },
      },
    });

    expect(result).toEqual({ duplicate: false, outcome: 'awaiting_payment' });

    // No order, no stock movement, and the hold stays in place.
    expect((await db.collection('orders').get()).size).toBe(0);
    const product = await readDoc(`products/${SNACK_ID}`);
    const variant = (product.data()?.variants as Array<{ id: string; stock: number }>).find(
      (candidate) => candidate.id === SNACK_VARIANT,
    );
    expect(variant?.stock).toBe(10);

    const hold = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(hold.data()?.variants?.[SNACK_VARIANT]).toBe(2);

    const after = await readDoc(`reservations/${reservation.id}`);
    expect(after.data()?.status).toBe('pending');
  });

  it('creates the order when the delayed payment succeeds', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);

    await processStripeEvent(db, {
      id: 'evt_completed_unpaid_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_delayed_2',
          payment_intent: 'pi_test_delayed_2',
          payment_status: 'unpaid',
          metadata: { reservationId: reservation.id, userId: 'guest' },
        },
      },
    });

    const result = await processStripeEvent(
      db,
      asyncSucceededEvent(reservation.id, 'evt_async_ok', 'cs_test_delayed_2', 'pi_test_delayed_2'),
    );
    expect(result).toEqual({ duplicate: false, outcome: 'order_created' });

    const orders = await db.collection('orders').get();
    expect(orders.size).toBe(1);
    expect(orders.docs[0].data().paymentStatus).toBe('paid');

    const product = await readDoc(`products/${SNACK_ID}`);
    const variant = (product.data()?.variants as Array<{ id: string; stock: number }>).find(
      (candidate) => candidate.id === SNACK_VARIANT,
    );
    expect(variant?.stock).toBe(8);

    const after = await readDoc(`reservations/${reservation.id}`);
    expect(after.data()?.status).toBe('completed');
  });

  it('releases the hold when the delayed payment fails', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);

    const result = await processStripeEvent(
      db,
      asyncFailedEvent(reservation.id, 'evt_async_failed', 'cs_test_delayed_3'),
    );
    expect(result).toEqual({ duplicate: false, outcome: 'reservation_released' });

    expect((await db.collection('orders').get()).size).toBe(0);

    const hold = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(hold.data()?.variants?.[SNACK_VARIANT]).toBeUndefined();

    const after = await readDoc(`reservations/${reservation.id}`);
    expect(after.data()?.status).toBe('released');
    expect(after.data()?.releasedAt).toBeTruthy();
  });
});

describe('reservation expiry', () => {
  it('releases stock and juice capacity for expired reservations', async () => {
    const snack = await snackQuote();
    const juice = await juiceQuote();
    const snackReservation = await reserve(snack);
    const juiceReservation = await reserve(juice);

    const released = await releaseExpiredReservations(db, DateTime.utc().plus({ minutes: 16 }));
    expect(released).toBe(2);

    const snackHold = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(snackHold.data()?.variants?.[SNACK_VARIANT]).toBeUndefined();

    const capacity = await readDoc(`dateCapacity/${JUICE_DATE}`);
    expect(capacity.data()?.juiceHeld).toBe(0);
    expect(capacity.data()?.juiceReserved).toBe(0);

    const snackAfter = await readDoc(`reservations/${snackReservation.id}`);
    const juiceAfter = await readDoc(`reservations/${juiceReservation.id}`);
    expect(snackAfter.data()?.status).toBe('expired');
    expect(juiceAfter.data()?.status).toBe('expired');

    // Stock itself is only decremented by the paid webhook.
    const product = await readDoc(`products/${SNACK_ID}`);
    const variant = (product.data()?.variants as Array<{ id: string; stock: number }>).find(
      (candidate) => candidate.id === SNACK_VARIANT,
    );
    expect(variant?.stock).toBe(10);
  });

  it('does not release a reservation whose Stripe session is already complete', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);
    await db.collection('reservations').doc(reservation.id).update({
      stripeSessionId: 'cs_test_open',
    });

    const calls: string[] = [];
    const fakeStripe = {
      checkout: {
        sessions: {
          retrieve: async () => {
            calls.push('retrieve');
            return { id: 'cs_test_open', status: 'complete' };
          },
          expire: async () => {
            calls.push('expire');
            return { id: 'cs_test_open', status: 'expired' };
          },
        },
      },
    } as unknown as Pick<Stripe, 'checkout'>;

    const summary = await expireReservations(
      db,
      fakeStripe,
      DateTime.utc().plus({ minutes: 16 }),
      100,
    );

    expect(summary.skippedPaid).toBe(1);
    expect(summary.released).toBe(0);
    expect(calls).not.toContain('expire');

    const after = await readDoc(`reservations/${reservation.id}`);
    expect(after.data()?.status).toBe('pending');
  });

  it('closes an open Stripe session before releasing the hold', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);
    await db.collection('reservations').doc(reservation.id).update({
      stripeSessionId: 'cs_test_open_2',
    });

    const calls: string[] = [];
    const fakeStripe = {
      checkout: {
        sessions: {
          retrieve: async () => {
            calls.push('retrieve');
            return { id: 'cs_test_open_2', status: 'open' };
          },
          expire: async () => {
            calls.push('expire');
            return { id: 'cs_test_open_2', status: 'expired' };
          },
        },
      },
    } as unknown as Pick<Stripe, 'checkout'>;

    const summary = await expireReservations(
      db,
      fakeStripe,
      DateTime.utc().plus({ minutes: 16 }),
      100,
    );

    expect(summary.released).toBe(1);
    expect(calls).toEqual(['retrieve', 'expire']);

    const hold = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(hold.data()?.variants?.[SNACK_VARIANT]).toBeUndefined();
  });
});

describe('stock guards', () => {
  it('rejects an over-stock checkout before any Stripe session is created', async () => {
    await clearFirestore();
    await seedBaseData(1);

    const quote = await computeCartQuote(db, {
      items: [
        { productId: JUICE_ID, variantId: JUICE_VARIANT, quantity: 1 },
        { productId: SNACK_ID, variantId: SNACK_VARIANT, quantity: 2 },
      ],
      postcode: 'NE1 4ST',
      fulfilment: 'delivery',
      deliveryDate: JUICE_DATE,
      promoCode: null,
    });

    // The quote reports the shortage instead of pricing it.
    expect(quote.warnings.length).toBe(1);
    expect(quote.lines).toHaveLength(1);

    await expect(reserve(quote)).rejects.toMatchObject({ code: 'failed-precondition' });

    const reservations = await db.collection('reservations').get();
    expect(reservations.size).toBe(0);

    const hold = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(hold.exists).toBe(false);
  });

  it('counts existing holds against available stock', async () => {
    await clearFirestore();
    await seedBaseData(3);

    const first = await snackQuote();
    const reservation = await reserve(first);
    expect(reservation.status).toBe('pending');

    // 3 in stock, 2 now held: a second basket of 2 must be rejected.
    await expect(reserve(first)).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

describe('charge.refunded', () => {
  it('marks the order partially refunded, then fully refunded', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);
    await processStripeEvent(db, completedEvent(reservation.id));

    const partial: StripeEventLike = {
      id: 'evt_refund_partial',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_1',
          payment_intent: 'pi_test_1',
          amount_refunded: 400,
          refunded: false,
        },
      },
    };

    const partialResult = await processStripeEvent(db, partial);
    expect(partialResult.outcome).toBe('partially_refunded');

    let order = (await db.collection('orders').get()).docs[0].data();
    expect(order.status).toBe('partially_refunded');
    expect(order.paymentStatus).toBe('partially_refunded');
    expect(order.refundedPence).toBe(400);

    const full: StripeEventLike = {
      id: 'evt_refund_full',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_1',
          payment_intent: 'pi_test_1',
          amount_refunded: quote.totalPence,
          refunded: true,
        },
      },
    };

    const fullResult = await processStripeEvent(db, full);
    expect(fullResult.outcome).toBe('refunded');

    order = (await db.collection('orders').get()).docs[0].data();
    expect(order.status).toBe('refunded');
    expect(order.paymentStatus).toBe('refunded');
    expect(order.refundedPence).toBe(quote.totalPence);
    expect(order.statusHistory).toHaveLength(3);
  });

  it('ignores refunds for unknown payment intents', async () => {
    const result = await processStripeEvent(db, {
      id: 'evt_refund_unknown',
      type: 'charge.refunded',
      data: { object: { id: 'ch_x', payment_intent: 'pi_unknown', amount_refunded: 100 } },
    });

    expect(result.outcome).toBe('order_not_found');
  });
});

describe('checkout.session.expired', () => {
  it('releases the reservation hold', async () => {
    const quote = await snackQuote();
    const reservation = await reserve(quote);

    const result = await processStripeEvent(db, {
      id: 'evt_session_expired',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_expired',
          metadata: { reservationId: reservation.id },
        },
      },
    });

    expect(result.outcome).toBe('reservation_released');

    const hold = await readDoc(`stockHolds/${SNACK_ID}`);
    expect(hold.data()?.variants?.[SNACK_VARIANT]).toBeUndefined();

    const after = await readDoc(`reservations/${reservation.id}`);
    expect(after.data()?.status).toBe('expired');
    expect(after.data()?.releasedAt).toBeTruthy();
  });
});

describe('reservation record', () => {
  it('snapshots server prices and expires 15 minutes after creation', async () => {
    const quote = await snackQuote();
    const before = DateTime.utc();
    const reservation = await reserve(quote);

    expect(reservation.totalPence).toBe(950);
    expect(reservation.items[0].unitPricePence).toBe(350);
    expect(reservation.contact.emailLower).toBe('ada@example.com');
    expect(reservation.status).toBe('pending');

    const storedSnap = await readDoc(`reservations/${reservation.id}`);
    const stored = storedSnap.data() as { expiresAt: Timestamp; createdAt: Timestamp } | undefined;
    if (!stored) throw new Error('reservation was not written');

    const ttlMinutes = (stored.expiresAt.toMillis() - stored.createdAt.toMillis()) / 60_000;
    expect(ttlMinutes).toBeCloseTo(15, 0);
    expect(stored.createdAt.toMillis()).toBeGreaterThanOrEqual(before.toMillis() - 1000);
  });
});
