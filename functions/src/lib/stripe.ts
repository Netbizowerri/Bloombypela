/**
 * Stripe configuration for Cloud Functions.
 *
 * Secrets come from Firebase Secret Manager via defineSecret. The API version
 * is read from the installed SDK (`Stripe.API_VERSION`) so it can never drift
 * from the pinned library. Live keys are never stored in the repository.
 */

import Stripe from 'stripe';
import { defineSecret } from 'firebase-functions/params';

export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

/** Pinned by the installed SDK (stripe@23.x -> 2026-10-28.endive). */
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = Stripe.API_VERSION;

let cachedClient: Stripe | null = null;

/** One Stripe client per function instance, keyed by the current secret. */
export function stripeClient(secretKey: string): Stripe {
  if (!cachedClient || cachedClient.getApiField('key') !== secretKey) {
    cachedClient = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  }
  return cachedClient;
}

/**
 * Public base URL used for Stripe success/cancel redirects.
 * Set APP_URL on the functions runtime; falls back to the live site.
 */
export function getAppUrl(): string {
  return process.env.APP_URL ?? 'https://bloombypela.com';
}
