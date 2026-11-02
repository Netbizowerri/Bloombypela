/**
 * Scheduled reservation expiry.
 *
 * Runs every 5 minutes. For each reservation whose 15 minute hold has passed:
 *  1. Close the Stripe Checkout Session first, so the customer cannot pay for
 *     stock we are about to release.
 *  2. Release the stock and juice capacity holds.
 *
 * A session that Stripe reports as already paid is left alone: the webhook is
 * the only thing allowed to turn it into an order, and the payment is real.
 * A session that is complete but still unpaid belongs to a delayed payment
 * method; its hold is kept while Stripe settles, but never beyond
 * MAX_SETTLEMENT_DAYS. Releasing it is safe because a late payment revalidates
 * stock and is never allowed to oversell.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/logger';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import type Stripe from 'stripe';
import { adminDb } from '../lib/admin';
import { REGION } from '../lib/config';
import { STRIPE_SECRET_KEY, stripeClient } from '../lib/stripe';
import { releaseReservation } from '../checkout/reservationService';

const BATCH_LIMIT = 100;

/** Delayed payment methods can take up to 7 days to settle. */
const MAX_SETTLEMENT_DAYS = 7;
const SECONDS_PER_DAY = 86_400;

export interface ExpirySummary {
  scanned: number;
  released: number;
  skippedPaid: number;
  skippedAwaitingPayment: number;
}

async function deleteUnusedCoupon(
  client: Pick<Stripe, 'coupons'> | null,
  couponId: string | null,
  reservationId: string,
): Promise<void> {
  if (!client || !couponId) return;
  try {
    await client.coupons.del(couponId);
  } catch (error) {
    // A missing coupon is already clean; anything else is retried implicitly
    // by the next run only if the reservation were still pending (it is not).
    logger.warn('reservation expiry: could not delete unused coupon', {
      reservationId,
      couponId,
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/**
 * Expires sessions then releases holds. Exported for tests with a fake client.
 */
export async function expireReservations(
  db: Firestore,
  client: Pick<Stripe, 'checkout' | 'coupons'> | null,
  now: DateTime = DateTime.utc(),
  limit = BATCH_LIMIT,
): Promise<ExpirySummary> {
  const snap = await db
    .collection('reservations')
    .where('status', '==', 'pending')
    .where('expiresAt', '<=', Timestamp.fromDate(now.toJSDate()))
    .limit(limit)
    .get();

  let released = 0;
  let skippedPaid = 0;
  let skippedAwaitingPayment = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as {
      stripeSessionId?: string | null;
      stripeCouponId?: string | null;
    };
    const sessionId = data.stripeSessionId ?? null;
    const couponId = data.stripeCouponId ?? null;

    if (sessionId && client) {
      try {
        const session = await client.checkout.sessions.retrieve(sessionId);

        if (session.status === 'complete') {
          if (session.payment_status === 'paid') {
            // Paid but the webhook has not run yet. Never release this hold.
            skippedPaid += 1;
            continue;
          }

          // Delayed payment still settling. Stripe normally delivers
          // async_payment_succeeded/failed within this window.
          const createdSeconds = typeof session.created === 'number' ? session.created : null;
          const settledDays =
            createdSeconds === null
              ? 0
              : (now.toSeconds() - createdSeconds) / SECONDS_PER_DAY;

          if (settledDays < MAX_SETTLEMENT_DAYS) {
            skippedAwaitingPayment += 1;
            continue;
          }
          // Settlement window passed without an async event: release. A late
          // payment is revalidated by the webhook and cannot oversell.
        } else if (session.status === 'open') {
          await client.checkout.sessions.expire(sessionId);
        }
      } catch (error) {
        // 404/expired sessions are safe to release; anything else is retried on
        // the next run so a transient Stripe outage cannot silently hold stock.
        logger.warn('reservation expiry: could not close Stripe session', {
          reservationId: doc.id,
          reason: error instanceof Error ? error.message : 'unknown',
        });
        continue;
      }
    }

    const releasedId = await releaseReservation(db, doc.id, 'expired');
    if (releasedId) {
      released += 1;
      await deleteUnusedCoupon(client, couponId, doc.id);
    }
  }

  return { scanned: snap.size, released, skippedPaid, skippedAwaitingPayment };
}

export const releaseExpiredReservations = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: REGION,
    secrets: [STRIPE_SECRET_KEY],
    retryCount: 0,
  },
  async () => {
    const startedAt = Date.now();
    const db = adminDb();
    const client = stripeClient(STRIPE_SECRET_KEY.value());

    const summary = await expireReservations(db, client);

    logger.info('releaseExpiredReservations completed', {
      ...summary,
      durationMs: Date.now() - startedAt,
    });
  },
);
