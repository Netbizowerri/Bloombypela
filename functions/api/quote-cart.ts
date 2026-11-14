import { HttpsError } from 'firebase-functions/v2/https';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { adminDb } from '../serverless/firebase';
import { handleCors, requestIp, sendMethodNotAllowed } from '../serverless/http';
import { checkRateLimit } from '../src/lib/rateLimit';
import { isValidUKPostcode } from '../src/delivery/outwardCode';
import { computeCartQuote } from '../src/checkout/quoteService';

const quoteInputSchema = z.object({
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

export default async function quoteCart(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  const ip = requestIp(req);
  if (!checkRateLimit(`quoteCart:${ip}`, 20, 60_000)) {
    res.status(429).json({ error: 'Too many quote requests. Please try again later.' });
    return;
  }

  const parsed = quoteInputSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'The quote request is invalid.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const quote = await computeCartQuote(adminDb, {
      items: parsed.data.items,
      postcode: parsed.data.postcode,
      fulfilment: parsed.data.fulfilment,
      deliveryDate: parsed.data.deliveryDate ?? null,
      promoCode: parsed.data.promoCode ?? null,
    });
    res.status(200).json({
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
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      const status = error.code === 'invalid-argument' ? 400 : 500;
      res.status(status).json({ error: error.message });
      return;
    }
    console.error('Quote API failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(500).json({ error: 'Unable to calculate the order total.' });
  }
}
