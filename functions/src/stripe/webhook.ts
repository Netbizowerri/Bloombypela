/**
 * Stripe webhook (HTTP function).
 *
 * This is the ONLY place orders are created or changed. The browser success
 * redirect never confirms anything.
 *
 * Guarantees:
 * - The raw request body is signature-verified with STRIPE_WEBHOOK_SECRET.
 * - Every event id is recorded in `stripeEvents` inside the same transaction
 *   that mutates orders/stock, so replaying an event is a no-op.
 * - Unexpected failures return 500 so Stripe retries (with backoff).
 * - No card data or customer PII is logged.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/logger';
import Stripe from 'stripe';
import { adminDb } from '../lib/admin';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, stripeClient } from '../lib/stripe';
import { processStripeEvent, type StripeEventLike } from '../checkout/reservationService';

export const stripeWebhook = onRequest(
  { secrets: [STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY], cors: false },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const signature = request.header('stripe-signature');
    if (!signature) {
      response.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    if (!request.rawBody) {
      response.status(400).json({ error: 'Missing raw request body' });
      return;
    }

    let event: StripeEventLike;

    try {
      // Static verification only: no API key and no network call needed.
      const verified = Stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET.value(),
      );
      event = verified as unknown as StripeEventLike;
    } catch (error) {
      logger.warn('stripeWebhook signature verification failed', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      response.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const handlerStartedAt = Date.now();

    try {
      const result = await processStripeEvent(adminDb(), event);

      // A released checkout may have created a one-off coupon that will never
      // be used. Clean it up outside the transaction; failure is not fatal.
      if (result.couponId) {
        await stripeClient(STRIPE_SECRET_KEY.value())
          .coupons.del(result.couponId)
          .catch((error: unknown) => {
            logger.warn('stripeWebhook could not delete unused coupon', {
              eventId: event.id,
              couponId: result.couponId,
              reason: error instanceof Error ? error.message : 'unknown',
            });
          });
      }

      logger.info('stripeWebhook processed', {
        eventId: event.id,
        eventType: event.type,
        duplicate: result.duplicate,
        outcome: result.outcome,
        durationMs: Date.now() - handlerStartedAt,
      });

      // 200 for duplicates too: Stripe must stop retrying.
      response.status(200).json({ received: true, duplicate: result.duplicate });
    } catch (error) {
      logger.error('stripeWebhook failed', {
        eventId: event.id,
        eventType: event.type,
        durationMs: Date.now() - handlerStartedAt,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      response.status(500).json({ error: 'Webhook handler failed' });
    }
  },
);
