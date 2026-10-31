/**
 * Pure pricing core for quoteCart.
 *
 * All money is integer pence (GBP). No floats. No client-trusted prices.
 * These functions are pure (no Firestore, no DateTime) so they can be unit
 * tested in isolation.
 */

import type { Promotion } from '../lib/types';

/**
 * Represents a single line item in the quote (computed server-side).
 */
export interface QuoteLine {
  productId: string;
  variantId: string;
  quantity: number;
  name: string;
  unitPricePence: number;
  lineTotalPence: number;
}

/**
 * The result of computing a quote.
 */
export interface QuoteResult {
  lines: QuoteLine[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  warnings: string[];
  promoApplied: boolean;
  promoCode: string | null;
  promoMessage: string | null;
}

/**
 * Compute a quote from pre-validated inputs.
 *
 * This is the pure pricing core. It receives already-validated line items
 * (with server-loaded prices), the computed delivery fee, and an optional
 * promotion. It never trusts any price sent by the client.
 *
 * @param lines - validated line items with server-computed unit prices
 * @param deliveryFeePence - computed delivery fee (from callable delivery logic)
 * @param promotion - applicable Promotion or null
 * @param subtotalPence - IGNORED (recomputed from lines server-side)
 * @returns QuoteResult
 */
export function computeQuoteCore(
  lines: QuoteLine[],
  deliveryFeePence: number,
  promotion: Promotion | null,
  warnings: string[]
): QuoteResult {
  // Recompute subtotal from server-loaded prices (ignore client subtotal)
  let subtotalPence = 0;
  for (const line of lines) {
    subtotalPence += line.lineTotalPence;
  }

  // Compute discount from promotion
  let discountPence = 0;
  let promoApplied = false;
  let promoMessage: string | null = null;

  if (promotion && promotion.active) {
    const now = new Date().toISOString();

    if (promotion.startsAt && now < promotion.startsAt) {
      promoMessage = 'Promotion not yet valid';
    } else if (promotion.endsAt && now > promotion.endsAt) {
      promoMessage = 'Promotion has expired';
    } else if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
      promoMessage = 'Promotion usage limit exhausted';
    } else if (subtotalPence < promotion.minSpendPence) {
      promoMessage = `Minimum spend of ${formatPenceCore(promotion.minSpendPence)} required`;
    } else {
      switch (promotion.type) {
        case 'percent': {
          discountPence = Math.floor((subtotalPence * promotion.value) / 100);
          promoApplied = true;
          promoMessage = `${promotion.value}% off applied`;
          break;
        }
        case 'fixed': {
          discountPence = Math.min(promotion.value, subtotalPence);
          promoApplied = true;
          promoMessage = `${formatPenceCore(promotion.value)} off applied`;
          break;
        }
        case 'freeDelivery': {
          promoApplied = true;
          promoMessage = 'Free delivery applied';
          break;
        }
      }
    }
  }

  // Apply free delivery promotion by zeroing the delivery fee
  const effectiveDeliveryFeePence =
    promoApplied && promotion?.type === 'freeDelivery' ? 0 : deliveryFeePence;

  const totalPence = Math.max(0, subtotalPence - discountPence + effectiveDeliveryFeePence);

  return {
    lines,
    subtotalPence,
    deliveryFeePence: effectiveDeliveryFeePence,
    discountPence,
    totalPence,
    warnings,
    promoApplied,
    promoCode: promotion?.code ?? null,
    promoMessage,
  };
}

/**
 * Format pence as a GBP string (pure).
 */
function formatPenceCore(pence: number): string {
  const pounds = (pence / 100).toFixed(2);
  return `£${pounds}`;
}

/**
 * Validate a promotion code format.
 */
export function validatePromoCode(code: string): boolean {
  return /^[A-Z0-9]{3,20}$/.test(code.trim().toUpperCase());
}
