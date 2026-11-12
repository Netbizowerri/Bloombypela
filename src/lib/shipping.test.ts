import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JUICE_SHIPPING_PENCE,
  DEFAULT_SNACK_SHIPPING_PENCE,
  estimateShipping,
  lowestActiveAreaFeePence,
} from './shipping';

describe('estimateShipping', () => {
  it('charges £3.99 for a snack-only basket', () => {
    const estimate = estimateShipping({
      subtotalPence: 999,
      hasSnacks: true,
      hasJuices: false,
    });

    expect(estimate.deliveryFeePence).toBe(DEFAULT_SNACK_SHIPPING_PENCE);
    expect(estimate.basis).toBe('snack');
  });

  it('charges £5.99 for a basket with fresh juice', () => {
    const estimate = estimateShipping({
      subtotalPence: 1499,
      hasSnacks: false,
      hasJuices: true,
    });

    expect(estimate.deliveryFeePence).toBe(DEFAULT_JUICE_SHIPPING_PENCE);
    expect(estimate.basis).toBe('juice');
  });

  it('uses the juice fee for a mixed basket', () => {
    const estimate = estimateShipping({
      subtotalPence: 2500,
      hasSnacks: true,
      hasJuices: true,
    });

    expect(estimate.deliveryFeePence).toBe(DEFAULT_JUICE_SHIPPING_PENCE);
    expect(estimate.basis).toBe('juice');
  });

  it('asks for the exact amount left to reach free delivery', () => {
    // One £14.99 six-pack against a £30.00 threshold.
    const estimate = estimateShipping({
      subtotalPence: 1499,
      hasSnacks: false,
      hasJuices: true,
      freeDeliveryThresholdPence: 3000,
    });

    expect(estimate.amountToFreePence).toBe(1501);
    expect(estimate.isFree).toBe(false);
  });

  it('is free at exactly the threshold', () => {
    const estimate = estimateShipping({
      subtotalPence: 3000,
      hasSnacks: true,
      hasJuices: false,
    });

    expect(estimate.deliveryFeePence).toBe(0);
    expect(estimate.amountToFreePence).toBe(0);
    expect(estimate.isFree).toBe(true);
  });

  it('charges nothing for collection', () => {
    const estimate = estimateShipping({
      subtotalPence: 1499,
      hasSnacks: false,
      hasJuices: true,
      fulfilment: 'collection',
    });

    expect(estimate.deliveryFeePence).toBe(0);
    expect(estimate.isFree).toBe(true);
  });

  it('charges nothing for an empty basket', () => {
    const estimate = estimateShipping({
      subtotalPence: 0,
      hasSnacks: false,
      hasJuices: false,
    });

    expect(estimate.deliveryFeePence).toBe(0);
    expect(estimate.amountToFreePence).toBe(0);
    expect(estimate.basis).toBe('none');
  });

  it('uses live settings when they differ from the defaults', () => {
    const estimate = estimateShipping({
      subtotalPence: 1000,
      hasSnacks: true,
      hasJuices: false,
      snackFeePence: 450,
      freeDeliveryThresholdPence: 2000,
    });

    expect(estimate.deliveryFeePence).toBe(450);
    expect(estimate.amountToFreePence).toBe(1000);
  });
});

describe('lowestActiveAreaFeePence', () => {
  it('picks the cheapest active area', () => {
    const areas = [
      { feePence: 699, isActive: true },
      { feePence: 599, isActive: true },
      { feePence: 499, isActive: false },
    ];

    expect(lowestActiveAreaFeePence(areas)).toBe(599);
  });

  it('falls back to £5.99 when no area is active', () => {
    expect(lowestActiveAreaFeePence([])).toBe(DEFAULT_JUICE_SHIPPING_PENCE);
    expect(lowestActiveAreaFeePence([{ feePence: 499, isActive: false }])).toBe(
      DEFAULT_JUICE_SHIPPING_PENCE,
    );
  });
});
