/**
 * Dashboard figures and CSV exports, computed in the browser.
 *
 * `getDashboardStats` and `exportOrdersCSV` were Cloud Functions. The Spark
 * plan cannot run them, and both only read data the staff role is already
 * allowed to read, so the aggregation happens here instead.
 *
 * This module is deliberately free of Firebase imports so it can be unit
 * tested. Callers pass plain `OrderRecord`s and timestamps; Firestore
 * `Timestamp` values are accepted because they expose `toDate()`.
 */
import type { OrderRecord } from '../types/orders';

export const LOW_STOCK_THRESHOLD = 5;

const LONDON_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Acceptance test for anything Firestore may return for a timestamp field. */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object') {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') {
      const parsed = candidate.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

/** Calendar date in Europe/London as `YYYY-MM-DD`, matching the business rules. */
export function londonDateKey(value: unknown): string | null {
  const date = toDate(value);
  if (!date) return null;
  const parts = LONDON_DATE.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return year && month && day ? `${year}-${month}-${day}` : null;
}

/**
 * Shifts a `YYYY-MM-DD` key by whole days.
 * Anchored at midday UTC so a British Summer Time change cannot move the date.
 */
export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  const anchored = new Date(Date.UTC(year, month - 1, day, 12));
  anchored.setUTCDate(anchored.getUTCDate() + days);
  return anchored.toISOString().slice(0, 10);
}

export type LowStockRow = {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  stock: number;
  threshold: number;
};

export type DashboardStats = {
  ok: true;
  today: {
    orderCount: number;
    revenuePence: number;
    orders: Array<{
      orderNumber: string;
      customer: string;
      area: string;
      totalPence: number;
      status: string;
    }>;
  };
  revenue7dPence: number;
  revenue30dPence: number;
  upcomingDeliveryDates: Array<{
    date: string;
    count: number;
    areas: Array<{ area: string; count: number }>;
  }>;
  lowStock: LowStockRow[];
  lowStockThreshold: number;
  generatedAt: string;
};

type ProductStock = {
  id: string;
  name: string;
  variants?: Array<{ id: string; name: string; stock?: number }>;
};

/**
 * Counts revenue and orders for the London "today", the last 7 and the last
 * 30 calendar days, upcoming delivery dates, and variants at or below
 * `LOW_STOCK_THRESHOLD`.
 */
export function computeDashboardStats(
  orders: OrderRecord[],
  products: ProductStock[],
  now: Date = new Date(),
): DashboardStats {
  const todayKey = londonDateKey(now) ?? new Date().toISOString().slice(0, 10);
  const sevenDayKey = shiftDateKey(todayKey, -6);
  const thirtyDayKey = shiftDateKey(todayKey, -29);

  let todayRevenue = 0;
  let todayOrderCount = 0;
  const todayOrders: DashboardStats['today']['orders'] = [];
  let revenue7d = 0;
  let revenue30d = 0;

  const dateCounts = new Map<string, { count: number; areas: Map<string, number> }>();

  for (const order of orders) {
    const createdKey = londonDateKey(order.createdAt);

    if (createdKey === todayKey) {
      todayRevenue += order.totalPence;
      todayOrderCount += 1;
      todayOrders.push({
        orderNumber: order.orderNumber,
        customer: order.contact.name,
        area: order.fulfilment.areaName ?? '',
        totalPence: order.totalPence,
        status: order.status,
      });
    }

    if (createdKey) {
      if (createdKey >= sevenDayKey) revenue7d += order.totalPence;
      if (createdKey >= thirtyDayKey) revenue30d += order.totalPence;
    }

    if (
      order.status === 'cancelled' ||
      order.status === 'refunded' ||
      order.status === 'partially_refunded'
    ) {
      continue;
    }
    if (order.fulfilment.method !== 'delivery' || !order.fulfilment.deliveryDate) continue;

    const date = order.fulfilment.deliveryDate.slice(0, 10);
    if (date < todayKey) continue;

    const entry = dateCounts.get(date) ?? { count: 0, areas: new Map<string, number>() };
    const area = order.fulfilment.areaName ?? 'Unknown';
    entry.count += 1;
    entry.areas.set(area, (entry.areas.get(area) ?? 0) + 1);
    dateCounts.set(date, entry);
  }

  const upcomingDeliveryDates = [...dateCounts.entries()]
    .map(([date, entry]) => ({
      date,
      count: entry.count,
      areas: [...entry.areas.entries()].map(([area, count]) => ({ area, count })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lowStock: LowStockRow[] = [];
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const stock = typeof variant.stock === 'number' ? variant.stock : 0;
      if (stock <= LOW_STOCK_THRESHOLD) {
        lowStock.push({
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantName: variant.name,
          stock,
          threshold: LOW_STOCK_THRESHOLD,
        });
      }
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);

  return {
    ok: true,
    today: {
      orderCount: todayOrderCount,
      revenuePence: todayRevenue,
      orders: todayOrders,
    },
    revenue7dPence: revenue7d,
    revenue30dPence: revenue30d,
    upcomingDeliveryDates,
    lowStock,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    generatedAt: now.toISOString(),
  };
}

/**
 * RFC 4180 CSV field escaping, plus formula-injection neutralisation: a value
 * starting with = + - @ is prefixed with a tab so a spreadsheet treats it as
 * text rather than a formula.
 */
export function csvField(value: string | number): string {
  const text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) {
    return `"\t${text.replace(/"/g, '""')}"`;
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(header: string[], rows: Array<Array<string | number>>): string {
  return [
    header.map(csvField).join(','),
    ...rows.map((row) => row.map(csvField).join(',')),
  ].join('\n');
}

export type CsvExportFilters = {
  fromDate?: string | null;
  toDate?: string | null;
  status?: string | null;
  area?: string | null;
  deliveryDate?: string | null;
};

/** Filters an already-loaded order list with the same rules the callable used. */
export function filterOrdersForExport(
  orders: OrderRecord[],
  filters: CsvExportFilters,
): OrderRecord[] {
  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.area && (order.fulfilment.areaName ?? '') !== filters.area) return false;
    if (filters.deliveryDate && (order.fulfilment.deliveryDate ?? '') !== filters.deliveryDate) {
      return false;
    }
    if (filters.fromDate || filters.toDate) {
      const createdKey = londonDateKey(order.createdAt);
      if (!createdKey) return false;
      if (filters.fromDate && createdKey < filters.fromDate) return false;
      if (filters.toDate && createdKey > filters.toDate) return false;
    }
    return true;
  });
}

export function buildOrdersCsv(orders: OrderRecord[]): string {
  return rowsToCsv(
    [
      'Order Number',
      'Customer',
      'Email',
      'Phone',
      'Status',
      'Payment Status',
      'Fulfilment',
      'Area',
      'Delivery Date',
      'Subtotal (pence)',
      'Delivery Fee (pence)',
      'Discount (pence)',
      'Total (pence)',
      'Refunded (pence)',
      'Notes',
      'Created At',
    ],
    orders.map((order) => [
      order.orderNumber,
      order.contact.name,
      order.contact.email,
      order.contact.phone,
      order.status,
      order.paymentStatus,
      order.fulfilment.method,
      order.fulfilment.areaName ?? '',
      order.fulfilment.deliveryDate ?? '',
      order.subtotalPence,
      order.deliveryFeePence,
      order.discountPence,
      order.totalPence,
      order.refundedPence,
      order.notes,
      toDate(order.createdAt)?.toISOString() ?? '',
    ]),
  );
}

export function buildDeliveryCsv(orders: OrderRecord[]): string {
  return rowsToCsv(
    [
      'Delivery Date',
      'Order Number',
      'Customer',
      'Phone',
      'Postcode',
      'Area',
      'Items Summary',
      'Total (pence)',
      'Status',
    ],
    orders.map((order) => [
      order.fulfilment.deliveryDate ?? '',
      order.orderNumber,
      order.contact.name,
      order.contact.phone,
      order.fulfilment.address?.postcode ?? '',
      order.fulfilment.areaName ?? '',
      order.items
        .map((item) => `${item.quantity}× ${item.name}`)
        .join('; ')
        .slice(0, 200),
      order.totalPence,
      order.status,
    ]),
  );
}

/** `orders-2026-01-01-to-2026-01-31.csv`, matching the old export filenames. */
export function exportFilename(filters: CsvExportFilters): string {
  if (filters.deliveryDate) return `delivery-${filters.deliveryDate}.csv`;
  return `orders-${filters.fromDate ?? 'all'}-to-${filters.toDate ?? 'all'}.csv`;
}
