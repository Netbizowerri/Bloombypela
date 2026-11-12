/**
 * Client-side shipping estimate.
 *
 * Mirrors `functions/src/delivery/fee.ts`, which stays authoritative: the free
 * delivery threshold wins, then a cart containing fresh juice pays the delivery
 * area fee, and a snack-only cart pays the flat snack fee. This copy exists so
 * the basket and checkout can show the charge before payment, including while
 * the `quoteCart` callable is unavailable on the Spark plan.
 */
import type { DeliveryArea } from '../types/delivery';

/** Owner-confirmed fallbacks, used until the live settings/areas load. */
export const DEFAULT_SNACK_SHIPPING_PENCE = 399;
export const DEFAULT_JUICE_SHIPPING_PENCE = 599;
export const DEFAULT_FREE_DELIVERY_THRESHOLD_PENCE = 3000;

export type Fulfilment = 'delivery' | 'collection';

export interface ShippingInput {
  subtotalPence: number;
  hasSnacks: boolean;
  hasJuices: boolean;
  /** `publicSettings.snackFlatFeePence`. */
  snackFeePence?: number;
  /** Juice delivery fee for the destination area. */
  juiceFeePence?: number;
  /** `publicSettings.freeDeliveryThresholdPence`. */
  freeDeliveryThresholdPence?: number;
  fulfilment?: Fulfilment;
}

export interface ShippingEstimate {
  deliveryFeePence: number;
  /** How much more is needed for free delivery; 0 once free or collecting. */
  amountToFreePence: number;
  isFree: boolean;
  /** Which charge applies before the free threshold. */
  basis: 'snack' | 'juice' | 'none';
}

/**
 * The cheapest active area fee, used as the juice charge before a postcode has
 * been checked. Falls back to the owner-confirmed £5.99 when no area is active.
 */
export function lowestActiveAreaFeePence(
  areas: Pick<DeliveryArea, 'feePence' | 'isActive'>[],
): number {
  const fees = areas
    .filter((area) => area.isActive)
    .map((area) => area.feePence)
    .filter((fee) => Number.isFinite(fee) && fee >= 0);

  return fees.length > 0 ? Math.min(...fees) : DEFAULT_JUICE_SHIPPING_PENCE;
}

/** Works out what delivery will cost, and how far away free delivery is. */
export function estimateShipping(input: ShippingInput): ShippingEstimate {
  const snackFee = input.snackFeePence ?? DEFAULT_SNACK_SHIPPING_PENCE;
  const juiceFee = input.juiceFeePence ?? DEFAULT_JUICE_SHIPPING_PENCE;
  const threshold =
    input.freeDeliveryThresholdPence ?? DEFAULT_FREE_DELIVERY_THRESHOLD_PENCE;
  const fulfilment = input.fulfilment ?? 'delivery';

  const basis = input.hasJuices ? 'juice' : input.hasSnacks ? 'snack' : 'none';
  const baseFee = basis === 'juice' ? juiceFee : basis === 'snack' ? snackFee : 0;

  if (fulfilment === 'collection' || basis === 'none' || input.subtotalPence >= threshold) {
    return { deliveryFeePence: 0, amountToFreePence: 0, isFree: true, basis };
  }

  return {
    deliveryFeePence: baseFee,
    amountToFreePence: threshold - input.subtotalPence,
    isFree: false,
    basis,
  };
}
