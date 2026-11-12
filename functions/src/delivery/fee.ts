/**
 * Delivery fee computation.
 *
 * Money is integer pence (GBP).
 */

import type { DeliveryArea, PublicSettings } from '../lib/types';

export const SNACK_DELIVERY_FEE_PENCE = 399;
export const JUICE_DELIVERY_FEE_PENCE = 599;

/**
 * Computes the delivery fee for a cart.
 *
 * Rules:
 * - If the area is missing or inactive, throws.
 * - If the cart contains juices, the fixed £5.99 juice delivery fee applies.
 * - If the cart is snack-only, the fixed £3.99 snack delivery fee applies.
 * - If neither juices nor snacks, fee is 0.
 *
 * @param subtotalPence - cart subtotal in pence
 * @param area - the delivery area (must be active)
 * @param settings - retained for compatibility; delivery rates are fixed
 * @param hasJuices - whether the cart contains juice items
 * @param hasSnacks - whether the cart contains snack items
 * @returns delivery fee in pence
 */
export function computeDeliveryFee(
  _subtotalPence: number,
  area: DeliveryArea | null,
  _settings: PublicSettings,
  hasJuices: boolean,
  hasSnacks: boolean
): number {
  if (!area || !area.isActive) {
    throw new Error('Delivery area not found or inactive.');
  }

  if (hasJuices) {
    return JUICE_DELIVERY_FEE_PENCE;
  }

  if (hasSnacks) {
    return SNACK_DELIVERY_FEE_PENCE;
  }

  return 0;
}
