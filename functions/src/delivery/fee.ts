/**
 * Delivery fee computation.
 *
 * Money is integer pence (GBP).
 */

import type { DeliveryArea, PublicSettings } from '../lib/types';

/**
 * Computes the delivery fee for a cart.
 *
 * Rules:
 * - If the area is missing or inactive, throws.
 * - If the cart subtotal meets or exceeds the free delivery threshold, fee is 0.
 * - If the cart contains juices, the area's delivery fee applies.
 * - If the cart is snack-only, the flat snack fee from settings applies.
 * - If neither juices nor snacks, fee is 0.
 *
 * @param subtotalPence - cart subtotal in pence
 * @param area - the delivery area (must be active)
 * @param settings - public settings (free delivery threshold, snack flat fee)
 * @param hasJuices - whether the cart contains juice items
 * @param hasSnacks - whether the cart contains snack items
 * @returns delivery fee in pence
 */
export function computeDeliveryFee(
  subtotalPence: number,
  area: DeliveryArea | null,
  settings: PublicSettings,
  hasJuices: boolean,
  hasSnacks: boolean
): number {
  if (!area || !area.isActive) {
    throw new Error('Delivery area not found or inactive.');
  }

  // Free delivery threshold overrides everything.
  if (subtotalPence >= settings.freeDeliveryThresholdPence) {
    return 0;
  }

  if (hasJuices) {
    return area.feePence;
  }

  if (hasSnacks) {
    return settings.snackFlatFeePence;
  }

  return 0;
}
