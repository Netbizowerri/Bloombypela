import { describe, expect, it } from 'vitest';
import {
  buildOrdersCsv,
  computeDashboardStats,
  csvField,
  filterOrdersForExport,
  londonDateKey,
  shiftDateKey,
} from './ordersReport';
import type { OrderRecord } from '../types/orders';

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    orderNumber: 'BBP-0001',
    reservationId: 'res-1',
    userId: 'customer-1',
    contact: {
      name: 'Ada Bloom',
      email: 'ada@example.com',
      emailLower: 'ada@example.com',
      phone: '+447700900123',
    },
    items: [],
    subtotalPence: 1000,
    deliveryFeePence: 300,
    discountPence: 0,
    totalPence: 1300,
    fulfilment: {
      method: 'delivery',
      address: { line1: '1 Grey St', line2: null, city: 'Newcastle', postcode: 'NE1 6EE' },
      areaName: 'NE1',
      deliveryDate: '2026-11-10',
      collectionDetails: null,
    },
    notes: '',
    status: 'confirmed',
    paymentStatus: 'paid',
    refundedPence: 0,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    promotionId: null,
    promoCode: null,
    statusHistory: [],
    createdAt: new Date('2026-11-06T10:00:00Z'),
    updatedAt: new Date('2026-11-06T10:00:00Z'),
    ...overrides,
  };
}

describe('londonDateKey', () => {
  it('returns the London calendar date, not the UTC date', () => {
    // 23:30 UTC on 29 March is 00:30 BST on 30 March.
    expect(londonDateKey(new Date('2026-03-29T23:30:00Z'))).toBe('2026-03-30');
    // 00:30 UTC on 26 October is 00:30 GMT on 26 October (BST ended).
    expect(londonDateKey(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-25');
  });

  it('accepts Firestore-style timestamps and rejects junk', () => {
    expect(londonDateKey({ toDate: () => new Date('2026-11-06T12:00:00Z') })).toBe('2026-11-06');
    expect(londonDateKey(null)).toBeNull();
    expect(londonDateKey('not-a-date')).toBeNull();
  });
});

describe('shiftDateKey', () => {
  it('shifts across month and British Summer Time boundaries', () => {
    expect(shiftDateKey('2026-11-06', -6)).toBe('2026-10-31');
    expect(shiftDateKey('2026-03-29', 1)).toBe('2026-03-30');
    expect(shiftDateKey('2026-10-25', -1)).toBe('2026-10-24');
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('computeDashboardStats', () => {
  const now = new Date('2026-11-06T12:00:00Z');

  it("counts only today's London orders for the today block", () => {
    const stats = computeDashboardStats(
      [
        order({ orderNumber: 'A', createdAt: new Date('2026-11-06T09:00:00Z') }),
        order({ orderNumber: 'B', createdAt: new Date('2026-11-05T09:00:00Z') }),
      ],
      [],
      now,
    );

    expect(stats.today.orderCount).toBe(1);
    expect(stats.today.revenuePence).toBe(1300);
    expect(stats.today.orders.map((o) => o.orderNumber)).toEqual(['A']);
  });

  it('sums 7 and 30 day revenue from calendar dates', () => {
    const stats = computeDashboardStats(
      [
        order({ orderNumber: 'TODAY', createdAt: new Date('2026-11-06T09:00:00Z') }),
        order({ orderNumber: 'SIX_DAYS', createdAt: new Date('2026-10-31T09:00:00Z') }),
        order({ orderNumber: 'SEVEN_DAYS', createdAt: new Date('2026-10-30T09:00:00Z') }),
        order({ orderNumber: 'FORTY_DAYS', createdAt: new Date('2026-09-01T09:00:00Z') }),
      ],
      [],
      now,
    );

    expect(stats.revenue7dPence).toBe(2600);
    expect(stats.revenue30dPence).toBe(3900);
  });

  it('lists upcoming delivery dates and ignores cancelled or past ones', () => {
    const stats = computeDashboardStats(
      [
        order({ orderNumber: 'SOON', fulfilment: { ...order().fulfilment, deliveryDate: '2026-11-10' } }),
        order({ orderNumber: 'LATER', fulfilment: { ...order().fulfilment, deliveryDate: '2026-11-12' } }),
        order({
          orderNumber: 'CANCELLED',
          status: 'cancelled',
          fulfilment: { ...order().fulfilment, deliveryDate: '2026-11-11' },
        }),
        order({ orderNumber: 'PAST', fulfilment: { ...order().fulfilment, deliveryDate: '2026-11-01' } }),
        order({
          orderNumber: 'COLLECT',
          fulfilment: { ...order().fulfilment, method: 'collection', deliveryDate: null },
        }),
      ],
      [],
      now,
    );

    expect(stats.upcomingDeliveryDates.map((d) => d.date)).toEqual(['2026-11-10', '2026-11-12']);
    expect(stats.upcomingDeliveryDates[0].areas).toEqual([{ area: 'NE1', count: 1 }]);
  });

  it('flags variants at or below the threshold, lowest first', () => {
    const stats = computeDashboardStats([], [
      { id: 'p1', name: 'Plantain chips', variants: [{ id: 'v1', name: '150g', stock: 2 }] },
      { id: 'p2', name: 'Zobo', variants: [{ id: 'v2', name: '500ml', stock: 5 }] },
      { id: 'p3', name: 'Chin chin', variants: [{ id: 'v3', name: '200g', stock: 40 }] },
    ], now);

    expect(stats.lowStock.map((row) => row.productId)).toEqual(['p1', 'p2']);
    expect(stats.lowStockThreshold).toBe(5);
  });
});

describe('filterOrdersForExport', () => {
  it('filters by London date range and status', () => {
    const orders = [
      order({ orderNumber: 'A', createdAt: new Date('2026-11-01T10:00:00Z') }),
      order({ orderNumber: 'B', createdAt: new Date('2026-11-06T10:00:00Z'), status: 'delivered' }),
    ];

    expect(
      filterOrdersForExport(orders, { fromDate: '2026-11-05', toDate: '2026-11-06' }).map(
        (o) => o.orderNumber,
      ),
    ).toEqual(['B']);

    expect(
      filterOrdersForExport(orders, { status: 'delivered' }).map((o) => o.orderNumber),
    ).toEqual(['B']);
  });
});

describe('csvField', () => {
  it('neutralises spreadsheet formulas', () => {
    expect(csvField('=1+1')).toBe('"\t=1+1"');
    expect(csvField('+44')).toBe('"\t+44"');
    expect(csvField('-10')).toBe('"\t-10"');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(csvField('Grey St, Newcastle')).toBe('"Grey St, Newcastle"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
    expect(csvField(1300)).toBe('1300');
  });
});

describe('buildOrdersCsv', () => {
  it('writes a header plus one escaped row per order', () => {
    const csv = buildOrdersCsv([order({ contact: { ...order().contact, name: 'Bloom, Ada' } })]);
    const [header, row] = csv.split('\n');

    expect(header.startsWith('Order Number,Customer,Email')).toBe(true);
    expect(row).toContain('"Bloom, Ada"');
    expect(row).toContain('1300');
  });
});
