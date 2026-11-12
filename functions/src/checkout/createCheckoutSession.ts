/**
 * createCheckoutSession callable.
 *
 * The browser is never trusted for money:
 *  1. The cart is re-priced from Firestore with the same service the public
 *     quote uses (client prices are ignored entirely).
 *  2. Stock and juice capacity are held in a 15 minute reservation inside a
 *     Firestore transaction.
 *  3. Stripe line items are built from that server quote only.
 *
 * If Stripe session creation fails the reservation is released immediately.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import Stripe from 'stripe';
import { z } from 'zod';
import { adminDb } from '../lib/admin';
import { ALLOWED_ORIGINS } from '../lib/config';
import { fromZodError, internal, invalidArgument } from '../lib/errors';
import { checkRateLimit } from '../lib/rateLimit';
import { getAppUrl, STRIPE_SECRET_KEY, stripeClient } from '../lib/stripe';
import { isValidUKPostcode } from '../delivery/outwardCode';
import { computeCartQuote } from './quoteService';
import { createReservation, releaseReservation } from './reservationService';

const CHECKOUT_LIMIT = { maxRequests: 10, windowMs: 60_000 };

/** Stripe requires `expires_at` to be at least 30 minutes in the future. */
const STRIPE_SESSION_MINUTES = 30;

const CheckoutInput = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(120),
        variantId: z.string().trim().min(1).max(120),
        quantity: z.number().int().positive().max(99),
      }),
    )
    .min(1)
    .max(50),
  contact: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(30),
  }),
  fulfilment: z.enum(['delivery', 'collection']),
  address: z
    .object({
      line1: z.string().trim().min(1).max(200),
      line2: z.string().trim().max(200).optional().nullable(),
      city: z.string().trim().min(1).max(120),
      postcode: z.string().trim().max(20).refine(isValidUKPostcode, 'Enter a valid UK postcode.'),
    })
    .optional()
    .nullable(),
  deliveryDate: z.string().trim().max(10).optional().nullable(),
  notes: z.string().trim().max(1000).optional(),
  promoCode: z.string().trim().max(20).optional().nullable(),
});

function lineItemName(name: string, variantName: string): string {
  return variantName && variantName.toLowerCase() !== 'default'
    ? `${name} — ${variantName}`
    : name;
}

export const createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: ALLOWED_ORIGINS },
  async (request) => {
    const ip = request.rawRequest.ip ?? 'unknown';
    const limitKey = request.auth ? `checkout:${request.auth.uid}` : `checkout:ip:${ip}`;
    if (!checkRateLimit(limitKey, CHECKOUT_LIMIT.maxRequests, CHECKOUT_LIMIT.windowMs)) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many checkout attempts. Please wait a minute and try again.',
      );
    }

    const parsed = CheckoutInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const input = parsed.data;
    const db = adminDb();
    const now = DateTime.utc();

    const fulfilment = input.fulfilment;
    const postcode = fulfilment === 'delivery' ? input.address?.postcode ?? '' : '';

    if (fulfilment === 'delivery') {
      if (!input.address) {
        throw invalidArgument('A delivery address is required for delivery orders.');
      }
    }

    // Re-price from Firestore. Any price sent by the client is discarded here.
    const quote = await computeCartQuote(db, {
      items: input.items,
      postcode,
      fulfilment,
      deliveryDate: input.deliveryDate ?? null,
      promoCode: input.promoCode ?? null,
    });

    if (quote.warnings.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        `Some items are unavailable: ${quote.warnings.join('; ')}. Please review your basket.`,
      );
    }

    if (quote.totalPence <= 0) {
      throw invalidArgument('The order total must be greater than zero.');
    }

    const reservation = await createReservation(
      db,
      quote,
      {
        userId: request.auth?.uid ?? null,
        contact: {
          name: input.contact.name,
          email: input.contact.email,
          phone: input.contact.phone,
        },
        address:
          fulfilment === 'delivery' && input.address
            ? {
                line1: input.address.line1,
                line2: input.address.line2 ?? null,
                city: input.address.city,
                postcode: input.address.postcode,
              }
            : null,
        notes: input.notes ?? '',
      },
      now,
    );

    const appUrl = getAppUrl();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = quote.lines.map(
      (line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: line.unitPricePence,
          product_data: {
            name: lineItemName(line.name, line.variantName),
            // SKUs are optional, and Stripe metadata should not carry blanks.
            ...(line.sku ? { metadata: { sku: line.sku } } : {}),
          },
        },
      }),
    );

    if (quote.deliveryFeePence > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: quote.deliveryFeePence,
          product_data: { name: 'Delivery' },
        },
      });
    }

    const client = stripeClient(STRIPE_SECRET_KEY.value());
    let couponId: string | null = null;

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        line_items: lineItems,
        customer_email: input.contact.email,
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
        expires_at: now.plus({ minutes: STRIPE_SESSION_MINUTES }).toUnixInteger(),
        metadata: {
          reservationId: reservation.id,
          userId: reservation.userId ?? 'guest',
        },
        // No payment_method_types: Stripe uses the dashboard's automatic
        // payment methods so Apple Pay / Google Pay appear when enabled.
      };

      if (quote.discountPence > 0) {
        const coupon = await client.coupons.create({
          amount_off: quote.discountPence,
          currency: 'gbp',
          duration: 'once',
          name: quote.promoCode ? `Promotion ${quote.promoCode}` : 'Discount',
          metadata: { reservationId: reservation.id },
        });
        couponId = coupon.id;
        sessionParams.discounts = [{ coupon: coupon.id }];
      }

      const session = await client.checkout.sessions.create(sessionParams, {
        idempotencyKey: `checkout-${reservation.id}`,
      });

      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL.');
      }

      await db.collection('reservations').doc(reservation.id).update({
        stripeSessionId: session.id,
        stripeCouponId: couponId,
        updatedAt: Timestamp.now(),
      });

      return {
        url: session.url,
        sessionId: session.id,
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt.toDate().toISOString(),
      };
    } catch (error) {
      // Never leave stock held for a checkout that could not start.
      await releaseReservation(db, reservation.id, 'released').catch(() => undefined);
      if (couponId) {
        await client.coupons.del(couponId).catch(() => undefined);
      }

      const message =
        error instanceof Stripe.errors.StripeError
          ? `Stripe error: ${error.message}`
          : 'Unable to start payment. Please try again.';
      // Log the full error server-side; never send Stripe internals to the client.
      console.error('createCheckoutSession failed', {
        reservationId: reservation.id,
        stripeType: error instanceof Stripe.errors.StripeError ? error.type : null,
        message,
      });
      throw internal('Unable to start payment. Please try again.');
    }
  },
);
