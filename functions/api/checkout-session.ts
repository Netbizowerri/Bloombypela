import { HttpsError } from 'firebase-functions/v2/https';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DateTime } from 'luxon';
import Stripe from 'stripe';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminAuth, adminDb } from '../serverless/firebase';
import { handleCors, requestIp, sendMethodNotAllowed } from '../serverless/http';
import { getAppUrl, getStripeClient } from '../serverless/stripe';
import { checkRateLimit } from '../src/lib/rateLimit';
import { isValidUKPostcode } from '../src/delivery/outwardCode';
import { computeCartQuote } from '../src/checkout/quoteService';
import { createReservation, releaseReservation } from '../src/checkout/reservationService';

const CHECKOUT_LIMIT = { maxRequests: 10, windowMs: 60_000 };
const STRIPE_SESSION_MINUTES = 30;

const checkoutInputSchema = z.object({
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
  notes: z.string().trim().max(1000).optional(),
  promoCode: z.string().trim().max(20).optional().nullable(),
}).superRefine(({ fulfilment, address }, ctx) => {
  if (fulfilment === 'delivery' && !address) {
    ctx.addIssue({
      code: 'custom',
      path: ['address'],
      message: 'A delivery address is required.',
    });
  }
});

function lineItemName(name: string, variantName: string): string {
  return variantName && variantName.toLowerCase() !== 'default'
    ? `${name} — ${variantName}`
    : name;
}

function errorStatus(error: unknown): number {
  if (!(error instanceof HttpsError)) return 500;
  switch (error.code) {
    case 'invalid-argument':
      return 400;
    case 'failed-precondition':
      return 409;
    case 'resource-exhausted':
      return 429;
    case 'unauthenticated':
      return 401;
    default:
      return 500;
  }
}

export default async function checkoutSession(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  const ip = requestIp(req);
  const authorization = req.headers.authorization;
  let uid: string | null = null;

  try {
    if (authorization) {
      const match = /^Bearer (.+)$/i.exec(authorization);
      if (!match) {
        res.status(401).json({ error: 'Invalid authorization header.' });
        return;
      }
      try {
        uid = (await adminAuth.verifyIdToken(match[1])).uid;
      } catch {
        res.status(401).json({ error: 'Your sign-in has expired. Please sign in again.' });
        return;
      }
    }

    const limitKey = uid ? `checkout:${uid}` : `checkout:ip:${ip}`;
    if (!checkRateLimit(limitKey, CHECKOUT_LIMIT.maxRequests, CHECKOUT_LIMIT.windowMs)) {
      res.status(429).json({ error: 'Too many checkout attempts. Please wait a minute and try again.' });
      return;
    }

    const parsed = checkoutInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: 'The checkout details are invalid.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const input = parsed.data;
    const stripe = getStripeClient();
    const postcode = input.fulfilment === 'delivery' ? input.address?.postcode ?? '' : '';
    const now = DateTime.utc();
    const quote = await computeCartQuote(adminDb, {
      items: input.items,
      postcode,
      fulfilment: input.fulfilment,
      promoCode: input.promoCode ?? null,
    });

    if (quote.warnings.length > 0) {
      res.status(409).json({
        error: `Some items are unavailable: ${quote.warnings.join('; ')}. Please review your basket.`,
      });
      return;
    }
    if (quote.totalPence <= 0) {
      res.status(400).json({ error: 'The order total must be greater than zero.' });
      return;
    }

    const reservation = await createReservation(
      adminDb,
      quote,
      {
        userId: uid,
        contact: input.contact,
        address:
          input.fulfilment === 'delivery' && input.address
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

    let couponId: string | null = null;
    let sessionId: string | null = null;

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = quote.lines.map(
        (line) => ({
          quantity: line.quantity,
          price_data: {
            currency: 'gbp',
            unit_amount: line.unitPricePence,
            product_data: {
              name: lineItemName(line.name, line.variantName),
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

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        line_items: lineItems,
        customer_email: input.contact.email,
        success_url: `${getAppUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getAppUrl()}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
        expires_at: now.plus({ minutes: STRIPE_SESSION_MINUTES }).toUnixInteger(),
        metadata: {
          reservationId: reservation.id,
          userId: uid ?? 'guest',
        },
      };

      if (quote.discountPence > 0) {
        const coupon = await stripe.coupons.create({
          amount_off: quote.discountPence,
          currency: 'gbp',
          duration: 'once',
          name: quote.promoCode ? `Promotion ${quote.promoCode}` : 'Discount',
          metadata: { reservationId: reservation.id },
        });
        couponId = coupon.id;
        sessionParams.discounts = [{ coupon: coupon.id }];
      }

      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `checkout-${reservation.id}`,
      });
      sessionId = session.id;
      if (!session.url) throw new Error('Stripe did not return a checkout URL.');

      await adminDb.collection('reservations').doc(reservation.id).update({
        stripeSessionId: session.id,
        stripeCouponId: couponId,
        updatedAt: Timestamp.now(),
      });

      res.status(200).json({
        url: session.url,
        sessionId: session.id,
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt.toDate().toISOString(),
      });
    } catch (error) {
      if (sessionId) {
        await stripe.checkout.sessions.expire(sessionId).catch((cleanupError: unknown) => {
          console.error('Could not expire incomplete Stripe checkout session', {
            reservationId: reservation.id,
            reason: cleanupError instanceof Error ? cleanupError.message : 'unknown',
          });
        });
      }
      await releaseReservation(adminDb, reservation.id, 'released').catch(
        (cleanupError: unknown) => {
          console.error('Could not release failed checkout reservation', {
            reservationId: reservation.id,
            reason: cleanupError instanceof Error ? cleanupError.message : 'unknown',
          });
        },
      );
      if (couponId) {
        await stripe.coupons.del(couponId).catch((cleanupError: unknown) => {
          console.error('Could not delete unused Stripe coupon', {
            reservationId: reservation.id,
            reason: cleanupError instanceof Error ? cleanupError.message : 'unknown',
          });
        });
      }
      console.error('Stripe checkout session creation failed', {
        reservationId: reservation.id,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      res.status(502).json({ error: 'Unable to start payment. Please try again.' });
    }
  } catch (error) {
    if (res.headersSent) return;
    const status = errorStatus(error);
    if (status === 500) {
      console.error('Checkout API failed', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
    res.status(status).json({
      error:
        error instanceof HttpsError && status !== 500
          ? error.message
          : 'Unable to start payment. Please try again.',
    });
  }
}
