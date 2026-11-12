import type { IncomingMessage } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { adminDb } from '../serverless/firebase';
import { getStripeClient } from '../serverless/stripe';
import { processStripeEvent, type StripeEventLike } from '../src/checkout/reservationService';

export const config = { api: { bodyParser: false } };

const MAX_WEBHOOK_BYTES = 1_000_000;

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_WEBHOOK_BYTES) {
      throw new Error('Stripe webhook payload is too large.');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export default async function stripeWebhook(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header.' });
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    res.status(500).json({ error: 'Webhook is not configured.' });
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.warn('Stripe webhook signature verification failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(400).json({ error: 'Invalid signature or webhook body.' });
    return;
  }

  try {
    const eventLike: StripeEventLike = {
      id: event.id,
      type: event.type,
      data: { object: event.data.object as unknown as Record<string, unknown> },
    };
    const result = await processStripeEvent(adminDb, eventLike);

    if (result.couponId) {
      await getStripeClient().coupons.del(result.couponId).catch((error: unknown) => {
        console.error('Could not delete unused Stripe coupon', {
          eventId: event.id,
          couponId: result.couponId,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      });
    }

    res.status(200).json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    console.error('Stripe webhook processing failed', {
      eventId: event.id,
      eventType: event.type,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
}
