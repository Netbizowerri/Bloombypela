/**
 * Client-side shipping estimate.
 *
 * Mirrors `functions/src/delivery/fee.ts`: snack-only carts pay £3.99 and
 * carts containing fresh juice pay £5.99. This copy exists so
 * the basket and checkout can show the charge before payment, including while
 * the `quoteCart` callable is unavailable on the Spark plan.
 */
/** Owner-confirmed fixed delivery fees. */
export const DEFAULT_SNACK_SHIPPING_PENCE = 399;
export const DEFAULT_JUICE_SHIPPING_PENCE = 599;
export const DEFAULT_DELIVERY_PROGRESS_TARGET_PENCE = 3000;

export type Fulfilment = 'delivery' | 'collection';

export interface ShippingInput {
  subtotalPence: number;
  hasSnacks: boolean;
  hasJuices: boolean;
  /** Legacy settings field `freeDeliveryThresholdPence`, used for progress copy only. */
  deliveryProgressTargetPence?: number;
  fulfilment?: Fulfilment;
}

export interface ShippingEstimate {
  deliveryFeePence: number;
  /** How much more is needed to reach the configured delivery progress target. */
  amountToDeliveryPence: number;
  isFree: boolean;
  /** Which charge applies before the free threshold. */
  basis: 'snack' | 'juice' | 'none';
}

/** Works out the delivery charge and progress toward the configured target. */
export function estimateShipping(input: ShippingInput): ShippingEstimate {
  const threshold =
    input.deliveryProgressTargetPence ?? DEFAULT_DELIVERY_PROGRESS_TARGET_PENCE;
  const fulfilment = input.fulfilment ?? 'delivery';

  const basis = input.hasJuices ? 'juice' : input.hasSnacks ? 'snack' : 'none';
  const baseFee =
    basis === 'juice'
      ? DEFAULT_JUICE_SHIPPING_PENCE
      : basis === 'snack'
        ? DEFAULT_SNACK_SHIPPING_PENCE
        : 0;

  if (fulfilment === 'collection' || basis === 'none') {
    return { deliveryFeePence: 0, amountToDeliveryPence: 0, isFree: true, basis };
  }

  return {
    deliveryFeePence: baseFee,
    amountToDeliveryPence: Math.max(0, threshold - input.subtotalPence),
    isFree: false,
    basis,
  };
}
