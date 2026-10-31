import { describe, expect, it } from 'vitest';
import { computeQuoteCore, type QuoteLine } from '../src/checkout/pricing';
import type { Promotion } from '../src/lib/types';

const line = (overrides: Partial<QuoteLine> = {}): QuoteLine => ({
  productId: 'prod-1',
  variantId: 'variant-1',
  quantity: 1,
  name: 'Test Product',
  unitPricePence: 1000,
  lineTotalPence: 1000,
  ...overrides,
});

const promotion = (overrides: Partial<Promotion> = {}): Promotion => ({
  id: 'promo-1',
  code: 'TEST10',
  type: 'percent',
  value: 10,
  minSpendPence: 0,
  usageLimit: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  active: true,
  ...overrides,
});

describe('computeQuoteCore - subtotal and delivery', () => {
  it('computes subtotal from line items', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 }), line({ lineTotalPence: 2500 })],
      350,
      null,
      [],
    );
    expect(result.subtotalPence).toBe(3500);
    expect(result.totalPence).toBe(3850);
  });

  it('adds delivery fee to total', () => {
    const result = computeQuoteCore([line()], 350, null, []);
    expect(result.deliveryFeePence).toBe(350);
    expect(result.totalPence).toBe(1350);
  });

  it('zeroes total for free items with no delivery', () => {
    const result = computeQuoteCore([], 0, null, []);
    expect(result.totalPence).toBe(0);
  });
});

describe('computeQuoteCore - percent discount', () => {
  it('applies percent discount', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 20, minSpendPence: 0 }),
      [],
    );
    expect(result.discountPence).toBe(200);
    expect(result.totalPence).toBe(1150);
    expect(result.promoApplied).toBe(true);
    expect(result.promoMessage).toBe('20% off applied');
  });

  it('floors percent discount to integer pence', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 333 })],
      0,
      promotion({ type: 'percent', value: 33, minSpendPence: 0 }),
      [],
    );
    expect(result.discountPence).toBe(109); // floor(333 * 33 / 100) = floor(109.89) = 109
  });
});

describe('computeQuoteCore - fixed discount', () => {
  it('applies fixed discount', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'fixed', value: 500, minSpendPence: 0 }),
      [],
    );
    expect(result.discountPence).toBe(500);
    expect(result.totalPence).toBe(850);
    expect(result.promoMessage).toBe('£5.00 off applied');
  });

  it('caps fixed discount at subtotal (never negative total)', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 200 })],
      350,
      promotion({ type: 'fixed', value: 500, minSpendPence: 0 }),
      [],
    );
    expect(result.discountPence).toBe(200);
    expect(result.totalPence).toBe(350); // subtotal - discount + delivery = 200-200+350
  });
});

describe('computeQuoteCore - free delivery', () => {
  it('zeros delivery fee for freeDelivery promotion', () => {
    const result = computeQuoteCore(
      [line()],
      350,
      promotion({ type: 'freeDelivery', value: 0, minSpendPence: 0 }),
      [],
    );
    expect(result.deliveryFeePence).toBe(0);
    expect(result.totalPence).toBe(1000);
    expect(result.promoApplied).toBe(true);
    expect(result.promoMessage).toBe('Free delivery applied');
  });
});

describe('computeQuoteCore - minimum spend', () => {
  it('does not apply discount below minSpend', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 10, minSpendPence: 2000 }),
      [],
    );
    expect(result.discountPence).toBe(0);
    expect(result.promoApplied).toBe(false);
    expect(result.promoMessage).toBe('Minimum spend of £20.00 required');
  });

  it('applies discount at or above minSpend', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 2000 })],
      350,
      promotion({ type: 'percent', value: 10, minSpendPence: 2000 }),
      [],
    );
    expect(result.discountPence).toBe(200);
    expect(result.promoApplied).toBe(true);
  });
});

describe('computeQuoteCore - usage limit', () => {
  it('rejects promotion when usage limit exhausted', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 10, usageLimit: 5, usedCount: 5 }),
      [],
    );
    expect(result.discountPence).toBe(0);
    expect(result.promoApplied).toBe(false);
    expect(result.promoMessage).toBe('Promotion usage limit exhausted');
  });

  it('applies promotion when usage limit not exhausted', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 10, usageLimit: 5, usedCount: 2 }),
      [],
    );
    expect(result.discountPence).toBe(100);
    expect(result.promoApplied).toBe(true);
  });

  it('ignores usage limit when null (unlimited)', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 10, usageLimit: null, usedCount: 999 }),
      [],
    );
    expect(result.discountPence).toBe(100);
    expect(result.promoApplied).toBe(true);
  });
});

describe('computeQuoteCore - expiry', () => {
  it('rejects expired promotion', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 10, endsAt: '2020-01-01T00:00:00Z' }),
      [],
    );
    expect(result.discountPence).toBe(0);
    expect(result.promoApplied).toBe(false);
    expect(result.promoMessage).toBe('Promotion has expired');
  });

  it('rejects not-yet-valid promotion', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ type: 'percent', value: 10, startsAt: '2099-01-01T00:00:00Z' }),
      [],
    );
    expect(result.discountPence).toBe(0);
    expect(result.promoApplied).toBe(false);
    expect(result.promoMessage).toBe('Promotion not yet valid');
  });
});

describe('computeQuoteCore - inactive promotion', () => {
  it('does not apply inactive promotion', () => {
    const result = computeQuoteCore(
      [line({ lineTotalPence: 1000 })],
      350,
      promotion({ active: false }),
      [],
    );
    expect(result.discountPence).toBe(0);
    expect(result.promoApplied).toBe(false);
  });
});

describe('computeQuoteCore - mixed cart', () => {
  it('sums multiple line items correctly', () => {
    const result = computeQuoteCore(
      [
        line({ productId: 'p1', variantId: 'v1', quantity: 2, lineTotalPence: 2000 }),
        line({ productId: 'p2', variantId: 'v2', quantity: 1, lineTotalPence: 1500 }),
        line({ productId: 'p3', variantId: 'v3', quantity: 3, lineTotalPence: 4500 }),
      ],
      0,
      null,
      [],
    );
    expect(result.subtotalPence).toBe(8000);
    expect(result.totalPence).toBe(8000);
  });
});

describe('computeQuoteCore - warnings', () => {
  it('passes through warnings', () => {
    const result = computeQuoteCore(
      [line()],
      350,
      null,
      ['Product X is not available', 'Variant Y out of stock'],
    );
    expect(result.warnings).toEqual([
      'Product X is not available',
      'Variant Y out of stock',
    ]);
  });
});

describe('computeQuoteCore - null promotion', () => {
  it('handles null promotion gracefully', () => {
    const result = computeQuoteCore([line()], 350, null, []);
    expect(result.discountPence).toBe(0);
    expect(result.promoApplied).toBe(false);
    expect(result.promoCode).toBeNull();
    expect(result.promoMessage).toBeNull();
  });
});
