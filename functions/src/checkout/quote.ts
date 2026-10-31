/**
 * quoteCart callable function.
 *
 * No auth required. Rate limited. Validated with zod.
 * Computes an authoritative server-side quote from cart items.
 * Ignores any price sent by the client - all pricing comes from Firestore.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { ALLOWED_ORIGINS } from '../lib/config';
import { fromZodError, invalidArgument } from '../lib/errors';
import { adminDb } from '../lib/admin';
import { checkRateLimit } from '../lib/rateLimit';
import { parseOutwardCode, isAreaServed, computeDeliveryFee, getAvailableDates } from '../delivery/index';
import { computeQuoteCore, type QuoteLine } from './pricing';
import type { DeliveryArea, PublicSettings, Promotion } from '../lib/types';

const QUOTE_CART_LIMIT = { maxRequests: 20, windowMs: 60_000 };

const QuoteCartInput = z.object({
  items: z.array(
    z.object({
      productId: z.string().trim().min(1),
      variantId: z.string().trim().min(1),
      quantity: z.number().int().positive().max(99),
    }),
  ).min(1).max(50),
  postcode: z.string().trim().min(1).max(20),
  fulfilment: z.enum(['delivery', 'collection']),
  deliveryDate: z.string().optional().nullable(),
  promoCode: z.string().trim().max(20).optional().nullable(),
});

/**
 * quoteCart: computes an authoritative server-side quote.
 * All pricing is loaded from Firestore; client-supplied prices are ignored.
 */
export const quoteCart = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
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

    const { items, postcode, fulfilment, deliveryDate, promoCode } = parsed.data;
    const db = adminDb();

    // 1. Load all products referenced in the cart from Firestore
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productDocs = await db.collection('products').where('__name__', 'in', productIds.slice(0, 30)).get();
    const productsMap = new Map<string, any>();
    productDocs.forEach((doc) => {
      productsMap.set(doc.id, doc.data());
    });

    // Check that all requested products exist
    for (const item of items) {
      if (!productsMap.has(item.productId)) {
        throw invalidArgument(`Product ${item.productId} not found`);
      }
    }

    // 2. Build variants map per product
    const variantsMap = new Map<string, Map<string, any>>();
    for (const [id, product] of productsMap.entries()) {
      const productVariants = new Map<string, any>();
      for (const variant of product.variants) {
        productVariants.set(variant.id, variant);
      }
      variantsMap.set(id, productVariants);
    }

    // 3. Validate each item against server data
    const warnings: string[] = [];
    const validItems: { productId: string; variantId: string; quantity: number }[] = [];

    for (const item of items) {
      const product = productsMap.get(item.productId);
      const variant = variantsMap.get(product.id)?.get(item.variantId);

      if (!variant) {
        warnings.push(`Variant not found for ${product.name}`);
        continue;
      }

      if (product.status !== 'active') {
        warnings.push(`${product.name} is not available`);
        continue;
      }

      if (variant.stock < item.quantity) {
        warnings.push(`${product.name} (${variant.name}): only ${variant.stock} in stock`);
        continue;
      }

      validItems.push(item);
    }

    if (validItems.length === 0) {
      throw invalidArgument('No valid items in cart');
    }

    // 4. Build line items with server-computed prices
    const lines: QuoteLine[] = [];
    let subtotalPence = 0;

    for (const item of validItems) {
      const product = productsMap.get(item.productId)!;
      const variant = variantsMap.get(product.id)!.get(item.variantId)!;
      const lineTotalPence = variant.pricePence * item.quantity;
      subtotalPence += lineTotalPence;
      lines.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        name: product.name,
        unitPricePence: variant.pricePence,
        lineTotalPence,
      });
    }

    // 5. Compute delivery fee (delivery fulfilment only)
    let deliveryFeePence = 0;

    if (fulfilment === 'delivery') {
      let outwardCode: string;
      try {
        outwardCode = parseOutwardCode(postcode);
      } catch {
        throw invalidArgument('Invalid UK postcode format');
      }

      const areasSnap = await db.collection('deliveryAreas').where('isActive', '==', true).get();
      const areas: DeliveryArea[] = areasSnap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          outwardCode: String(data.outwardCode ?? ''),
          areaName: String(data.areaName ?? ''),
          feePence: Number(data.feePence ?? 0),
          minimumOrderPence: Number(data.minimumOrderPence ?? 0),
          isActive: Boolean(data.isActive),
        } as DeliveryArea;
      });

      if (!isAreaServed(outwardCode, areas)) {
        throw invalidArgument(`Postcode ${postcode} is not in our delivery area`);
      }

      const area = areas.find((a) => a.outwardCode.toUpperCase() === outwardCode.toUpperCase()) ?? null;

      const settingsSnap = await db.collection('publicSettings').doc('settings').get();
      const settings = settingsSnap.exists
        ? (settingsSnap.data() as PublicSettings)
        : { freeDeliveryThresholdPence: 3000, snackFlatFeePence: 250, collectionEnabled: false };

      const hasJuices = validItems.some((i) => productsMap.get(i.productId)?.type === 'juice');
      const hasSnacks = validItems.some((i) => productsMap.get(i.productId)?.type === 'snack');

      deliveryFeePence = computeDeliveryFee(subtotalPence, area, settings, hasJuices, hasSnacks);

      // 6. Validate delivery date for juice carts
      if (hasJuices && deliveryDate) {
        const now = DateTime.now();
        const scheduleSnap = await db.collection('deliverySchedule').get();
        const schedule = scheduleSnap.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return {
            id: doc.id,
            weekday: Number(data.weekday),
            cutoffTime: String(data.cutoffTime ?? ''),
            leadDays: Number(data.leadDays ?? 0),
            isActive: Boolean(data.isActive),
          };
        });

        const closedSnap = await db.collection('closedDates').get();
        const closedDates = closedSnap.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return { id: doc.id, date: String(data.date), reason: String(data.reason ?? '') };
        });

        const capacitySnap = await db.collection('dateCapacity').get();
        const capacity = capacitySnap.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return {
            date: String(data.date),
            juiceCapacity: Number(data.juiceCapacity ?? 0),
            juiceReserved: Number(data.juiceReserved ?? 0),
            subscriberShare: Number(data.subscriberShare ?? 0),
            closed: Boolean(data.closed),
          };
        });

        const availableDates = getAvailableDates(now, schedule, closedDates, capacity, true);
        if (!availableDates.includes(deliveryDate)) {
          throw invalidArgument(`Delivery date ${deliveryDate} is not available`);
        }
      }
    }

    // 7. Load and validate promotion
    let promotion: Promotion | null = null;
    let promoMessage: string | null = null;
    let promoApplied = false;

    if (promoCode) {
      const promoSnap = await db.collection('promotions')
        .where('code', '==', promoCode.toUpperCase())
        .limit(1)
        .get();
      if (!promoSnap.empty) {
        promotion = promoSnap.docs[0].data() as Promotion;
        const now = new Date().toISOString();

        if (!promotion.active) {
          promoMessage = 'Promotion is not active';
        } else if (promotion.startsAt && now < promotion.startsAt) {
          promoMessage = 'Promotion not yet valid';
        } else if (promotion.endsAt && now > promotion.endsAt) {
          promoMessage = 'Promotion has expired';
        } else if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
          promoMessage = 'Promotion usage limit exhausted';
        } else if (subtotalPence < promotion.minSpendPence) {
          promoMessage = `Minimum spend of ${formatPenceCore(promotion.minSpendPence)} required`;
        } else {
          promoApplied = true;
        }
      } else {
        promoMessage = 'Invalid promotion code';
      }
    }

    // 8. Compute final quote using pure core
    const quote = computeQuoteCore(lines, deliveryFeePence, promotion, warnings);

    return {
      ...quote,
      promoCode: promoCode ? (promoApplied ? promoCode.toUpperCase() : null) : null,
      promoMessage: promoMessage ?? quote.promoMessage,
      promoApplied: promoApplied || quote.promoApplied,
    };
  },
);

/**
 * Format pence as a GBP string.
 */
function formatPenceCore(pence: number): string {
  const pounds = (pence / 100).toFixed(2);
  return `£${pounds}`;
}
