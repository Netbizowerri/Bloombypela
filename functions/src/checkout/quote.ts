/**
 * quoteCart callable function.
 *
 * No auth required. Rate limited. Validated with zod.
 * Computes an authoritative server-side quote from cart items.
 * Ignores any price sent by the client - all pricing comes from Firestore.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ALLOWED_ORIGINS } from '../lib/config';
import { fromZodError } from '../lib/errors';
import { adminDb } from '../lib/admin';
import { checkRateLimit } from '../lib/rateLimit';
import { computeCartQuote } from './quoteService';
import { isValidUKPostcode } from '../delivery/outwardCode';

const QUOTE_CART_LIMIT = { maxRequests: 20, windowMs: 60_000 };

const QuoteCartInput = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        variantId: z.string().trim().min(1),
        quantity: z.number().int().positive().max(99),
      }),
    )
    .min(1)
    .max(50),
  postcode: z.string().trim().max(20),
  fulfilment: z.enum(['delivery', 'collection']),
  deliveryDate: z.string().optional().nullable(),
  promoCode: z.string().trim().max(20).optional().nullable(),
}).superRefine(({ fulfilment, postcode }, ctx) => {
  if (fulfilment === 'delivery' && !isValidUKPostcode(postcode)) {
    ctx.addIssue({
      code: 'custom',
      path: ['postcode'],
      message: 'Enter a valid UK postcode.',
    });
  }
});

/**
 * quoteCart: computes an authoritative server-side quote.
 * All pricing is loaded from Firestore; client-supplied prices are ignored.
 */
export const quoteCart = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  const ip = request.rawRequest.ip ?? 'unknown';
  if (
    !checkRateLimit(
      `quoteCart:${ip}`,
      QUOTE_CART_LIMIT.maxRequests,
      QUOTE_CART_LIMIT.windowMs,
    )
  ) {
    throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
  }

  const parsed = QuoteCartInput.safeParse(request.data ?? {});
  if (!parsed.success) throw fromZodError(parsed.error);

  const db = adminDb();
  const quote = await computeCartQuote(db, {
    items: parsed.data.items,
    postcode: parsed.data.postcode,
    fulfilment: parsed.data.fulfilment,
    deliveryDate: parsed.data.deliveryDate ?? null,
    promoCode: parsed.data.promoCode ?? null,
  });

  // Keep the public response shape identical to the previous implementation.
  return {
    lines: quote.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      name: line.name,
      unitPricePence: line.unitPricePence,
      lineTotalPence: line.lineTotalPence,
    })),
    subtotalPence: quote.subtotalPence,
    deliveryFeePence: quote.deliveryFeePence,
    discountPence: quote.discountPence,
    totalPence: quote.totalPence,
    warnings: quote.warnings,
    promoApplied: quote.promoApplied,
    promoCode: quote.promoCode,
    promoMessage: quote.promoMessage,
  };
});
