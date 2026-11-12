import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JUICE_SHIPPING_PENCE,
  DEFAULT_SNACK_SHIPPING_PENCE,
  estimateShipping,
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

  it('asks for the exact amount left to reach the delivery progress target', () => {
    // One £14.99 six-pack against a £30.00 threshold.
    const estimate = estimateShipping({
      subtotalPence: 1499,
      hasSnacks: false,
      hasJuices: true,
      deliveryProgressTargetPence: 3000,
    });

    expect(estimate.amountToDeliveryPence).toBe(1501);
    expect(estimate.isFree).toBe(false);
  });

  it('continues charging delivery at and above the progress target', () => {
    const estimate = estimateShipping({
      subtotalPence: 3000,
      hasSnacks: true,
      hasJuices: false,
    });

    expect(estimate.deliveryFeePence).toBe(DEFAULT_SNACK_SHIPPING_PENCE);
    expect(estimate.amountToDeliveryPence).toBe(0);
    expect(estimate.isFree).toBe(false);
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
    expect(estimate.amountToDeliveryPence).toBe(0);
    expect(estimate.basis).toBe('none');
  });

  it('keeps the fixed snack delivery rate', () => {
    const estimate = estimateShipping({
      subtotalPence: 1000,
      hasSnacks: true,
      hasJuices: false,
      deliveryProgressTargetPence: 2000,
    });

    expect(estimate.deliveryFeePence).toBe(399);
    expect(estimate.amountToDeliveryPence).toBe(1000);
  });

});
