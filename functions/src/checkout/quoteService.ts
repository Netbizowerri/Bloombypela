/**
 * Authoritative cart pricing service.
 *
 * Shared by the public `quoteCart` callable and the Stripe checkout flow so the
 * price shown to the customer and the price sent to Stripe always come from the
 * same server-side computation. Client-supplied prices are never read.
 */

import { DateTime } from 'luxon';
import type { Firestore } from 'firebase-admin/firestore';
import { invalidArgument } from '../lib/errors';
import {
  computeDeliveryFee,
  getAvailableDates,
  isAreaServed,
  parseOutwardCode,
} from '../delivery';
import { computeQuoteCore, type QuoteLine } from './pricing';
import type {
  DateCapacity,
  DeliveryArea,
  Product,
  ProductVariant,
  Promotion,
  PublicSettings,
} from '../lib/types';

export type Fulfilment = 'delivery' | 'collection';

export interface QuoteRequestItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface QuoteRequest {
  items: QuoteRequestItem[];
  postcode: string;
  fulfilment: Fulfilment;
  deliveryDate?: string | null;
  promoCode?: string | null;
}

export interface PricedLine extends QuoteLine {
  productType: Product['type'];
  variantName: string;
  sku: string;
}

export interface CartQuote {
  lines: PricedLine[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  warnings: string[];
  promoApplied: boolean;
  promoCode: string | null;
  promoMessage: string | null;
  promotionId: string | null;
  fulfilment: Fulfilment;
  postcode: string;
  deliveryDate: string | null;
  areaName: string | null;
  collectionDetails: string | null;
  hasJuices: boolean;
  juiceBottles: number;
}

// Used only when the publicSettings document is missing. Fees match the owner's
// confirmed shipping: £3.99 for snack-only carts, £5.99 for carts with juices
// (the juice fee lives on each delivery area, not here).
const FALLBACK_SETTINGS: PublicSettings = {
  freeDeliveryThresholdPence: 3000,
  snackFlatFeePence: 399,
  collectionEnabled: false,
};

/** Loads products by id in a single batched read (no 30-item `in` limit). */
async function loadProducts(
  db: Firestore,
  productIds: string[],
): Promise<Map<string, Product>> {
  const snaps = await db.getAll(
    ...productIds.map((id) => db.collection('products').doc(id)),
  );

  const products = new Map<string, Product>();
  for (const snap of snaps) {
    if (!snap.exists) continue;
    products.set(snap.id, { ...(snap.data() as Product), id: snap.id });
  }
  return products;
}

/**
 * Computes an authoritative quote from Firestore.
 *
 * Throws an `invalid-argument` HttpsError when the request cannot be priced at
 * all (unknown product, invalid postcode, unserved area, unavailable date).
 * Individual unavailable lines are reported through `warnings` instead.
 */
export async function computeCartQuote(
  db: Firestore,
  request: QuoteRequest,
  now: DateTime = DateTime.now(),
): Promise<CartQuote> {
  const { items, postcode, fulfilment, promoCode } = request;
  const deliveryDate = request.deliveryDate ?? null;

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await loadProducts(db, productIds);

  for (const item of items) {
    if (!products.has(item.productId)) {
      throw invalidArgument(`Product ${item.productId} not found`);
    }
  }

  const variants = new Map<string, Map<string, ProductVariant>>();
  for (const [id, product] of products) {
    const map = new Map<string, ProductVariant>();
    for (const variant of product.variants ?? []) {
      map.set(variant.id, variant);
    }
    variants.set(id, map);
  }

  const warnings: string[] = [];
  const validItems: QuoteRequestItem[] = [];

  for (const item of items) {
    const product = products.get(item.productId) as Product;
    const variant = variants.get(product.id)?.get(item.variantId);

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

  const lines: PricedLine[] = [];
  let subtotalPence = 0;
  let juiceBottles = 0;
  let hasJuices = false;
  let hasSnacks = false;

  for (const item of validItems) {
    const product = products.get(item.productId) as Product;
    const variant = variants.get(product.id)?.get(item.variantId) as ProductVariant;
    const lineTotalPence = variant.pricePence * item.quantity;

    subtotalPence += lineTotalPence;
    if (product.type === 'juice') {
      hasJuices = true;
      juiceBottles += item.quantity;
    } else {
      hasSnacks = true;
    }

    lines.push({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      name: product.name,
      unitPricePence: variant.pricePence,
      lineTotalPence,
      productType: product.type,
      variantName: variant.name,
      sku: variant.sku,
    });
  }

  let deliveryFeePence = 0;
  let areaName: string | null = null;

  const settingsSnap = await db.collection('publicSettings').doc('settings').get();
  const settings = settingsSnap.exists
    ? (settingsSnap.data() as PublicSettings)
    : FALLBACK_SETTINGS;

  if (fulfilment === 'delivery') {
    let outwardCode: string;
    try {
      outwardCode = parseOutwardCode(postcode);
    } catch {
      throw invalidArgument('Invalid UK postcode format');
    }

    const areasSnap = await db
      .collection('deliveryAreas')
      .where('isActive', '==', true)
      .get();

    const areas: DeliveryArea[] = areasSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        outwardCode: String(data.outwardCode ?? ''),
        areaName: String(data.areaName ?? ''),
        feePence: Number(data.feePence ?? 0),
        minimumOrderPence: Number(data.minimumOrderPence ?? 0),
        isActive: Boolean(data.isActive),
      };
    });

    if (!isAreaServed(outwardCode, areas)) {
      throw invalidArgument(`Postcode ${postcode} is not in our delivery area`);
    }

    const area =
      areas.find(
        (candidate) =>
          candidate.outwardCode.toUpperCase() === outwardCode.toUpperCase(),
      ) ?? null;

    areaName = area?.areaName ?? null;

    deliveryFeePence = computeDeliveryFee(
      subtotalPence,
      area,
      settings,
      hasJuices,
      hasSnacks,
    );

    if (hasJuices && deliveryDate) {
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
        return {
          id: doc.id,
          date: String(data.date),
          reason: String(data.reason ?? ''),
        };
      });

      const capacitySnap = await db.collection('dateCapacity').get();
      const capacity: DateCapacity[] = capacitySnap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          date: String(data.date),
          juiceCapacity: Number(data.juiceCapacity ?? 0),
          juiceReserved: Number(data.juiceReserved ?? 0),
          juiceHeld: Number(data.juiceHeld ?? 0),
          subscriberShare: Number(data.subscriberShare ?? 0),
          closed: Boolean(data.closed),
        };
      });

      const availableDates = getAvailableDates(
        now,
        schedule,
        closedDates,
        capacity,
        true,
      );

      if (!availableDates.includes(deliveryDate)) {
        throw invalidArgument(`Delivery date ${deliveryDate} is not available`);
      }
    }
  }

  let promotion: Promotion | null = null;
  let promotionId: string | null = null;
  let promoMessage: string | null = null;
  let promoApplied = false;

  if (promoCode) {
    const promoSnap = await db
      .collection('promotions')
      .where('code', '==', promoCode.toUpperCase())
      .limit(1)
      .get();

    if (!promoSnap.empty) {
      const doc = promoSnap.docs[0];
      promotion = { ...(doc.data() as Promotion), id: doc.id };
      promotionId = doc.id;
      const nowIso = now.toUTC().toISO() ?? '';

      if (!promotion.active) {
        promoMessage = 'Promotion is not active';
      } else if (promotion.startsAt && nowIso < promotion.startsAt) {
        promoMessage = 'Promotion not yet valid';
      } else if (promotion.endsAt && nowIso > promotion.endsAt) {
        promoMessage = 'Promotion has expired';
      } else if (
        promotion.usageLimit !== null &&
        promotion.usedCount >= promotion.usageLimit
      ) {
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

  const quote = computeQuoteCore(lines, deliveryFeePence, promotion, warnings);

  return {
    ...quote,
    promoCode: promoCode ? (promoApplied ? promoCode.toUpperCase() : null) : null,
    promoMessage: promoMessage ?? quote.promoMessage,
    promoApplied: promoApplied || quote.promoApplied,
    promotionId: promoApplied ? promotionId : null,
    fulfilment,
    postcode,
    deliveryDate,
    areaName,
    collectionDetails: fulfilment === 'collection' ? settings.collectionDetails ?? null : null,
    hasJuices,
    juiceBottles,
  };
}

function formatPenceCore(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
