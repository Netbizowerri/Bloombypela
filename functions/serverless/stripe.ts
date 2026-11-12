import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  if (!client) {
    client = new Stripe(secretKey, { apiVersion: Stripe.API_VERSION });
  }
  return client;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? 'https://bloombypela.com';
}
