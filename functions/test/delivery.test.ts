import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { parseOutwardCode, isAreaServed } from '../src/delivery/outwardCode';
import { computeDeliveryFee } from '../src/delivery/fee';
import { getAvailableDates } from '../src/delivery/dates';
import type {
  ClosedDate,
  DateCapacity,
  DeliveryArea,
  DeliveryScheduleDay,
  PublicSettings,
} from '../src/lib/types';

const LONDON = 'Europe/London';

const london = (iso: string): DateTime => DateTime.fromISO(iso, { zone: LONDON });

const schedule: DeliveryScheduleDay[] = [
  { id: 'sched-thu', weekday: 4, cutoffTime: '12:00', leadDays: 3, isActive: true }, // Thursday
  { id: 'sched-mon', weekday: 1, cutoffTime: '18:00', leadDays: 1, isActive: true }, // Monday
];

const areas: DeliveryArea[] = [
  { id: 'a1', outwardCode: 'NE1', areaName: 'City Centre', feePence: 350, minimumOrderPence: 1200, isActive: true },
  { id: 'a2', outwardCode: 'NE2', areaName: 'Jesmond', feePence: 350, minimumOrderPence: 1200, isActive: false },
  { id: 'a3', outwardCode: 'NE3', areaName: 'Gosforth', feePence: 400, minimumOrderPence: 1500, isActive: true },
];

const settings: PublicSettings = {
  freeDeliveryThresholdPence: 3000,
  snackFlatFeePence: 250,
  collectionEnabled: true,
  collectionDetails: 'Click & collect at our shop',
};

describe('parseOutwardCode', () => {
  it('returns outward code for standard postcode', () => {
    expect(parseOutwardCode('ne1 1aa')).toBe('NE1');
    expect(parseOutwardCode('NE11 1AA')).toBe('NE11');
    expect(parseOutwardCode('M1 1AA')).toBe('M1');
    expect(parseOutwardCode('CR0 1NY')).toBe('CR0');
  });

  it('throws on invalid postcode', () => {
    expect(() => parseOutwardCode('not-a-postcode')).toThrow();
    expect(() => parseOutwardCode('')).toThrow();
    expect(() => parseOutwardCode('NE1')).toThrow();
    expect(() => parseOutwardCode('NE1 1')).toThrow();
  });
});

describe('isAreaServed', () => {
  it('returns true for active area', () => {
    expect(isAreaServed('NE1', areas)).toBe(true);
    expect(isAreaServed('ne1', areas)).toBe(true);
  });

  it('returns false for inactive area', () => {
    expect(isAreaServed('NE2', areas)).toBe(false);
  });

  it('returns false for unknown area', () => {
    expect(isAreaServed('XX1', areas)).toBe(false);
  });
});

describe('computeDeliveryFee', () => {
  it('returns 0 when subtotal meets free delivery threshold', () => {
    expect(computeDeliveryFee(3000, areas[0], settings, true, false)).toBe(0);
    expect(computeDeliveryFee(5000, areas[0], settings, false, true)).toBe(0);
  });

  it('returns area fee for juice carts below threshold', () => {
    expect(computeDeliveryFee(1000, areas[0], settings, true, false)).toBe(350);
    expect(computeDeliveryFee(1000, areas[2], settings, true, false)).toBe(400);
  });

  it('returns snack flat fee for snack-only carts below threshold', () => {
    expect(computeDeliveryFee(1000, areas[0], settings, false, true)).toBe(250);
    expect(computeDeliveryFee(2000, areas[0], settings, false, true)).toBe(250);
  });

  it('throws for missing or inactive area', () => {
    expect(() => computeDeliveryFee(1000, null, settings, true, false)).toThrow();
    expect(() => computeDeliveryFee(1000, areas[1], settings, true, false)).toThrow();
  });

  it('returns 0 for empty cart', () => {
    expect(computeDeliveryFee(1000, areas[0], settings, false, false)).toBe(0);
  });
});

describe('getAvailableDates', () => {
  const closedDates: ClosedDate[] = [{ id: 'cd-1', date: '2027-03-11', reason: 'Public holiday' }];
  const capacity: DateCapacity[] = [
    { date: '2027-03-18', juiceCapacity: 100, juiceReserved: 100, subscriberShare: 0, closed: false }, // full
    { date: '2027-03-25', juiceCapacity: 100, juiceReserved: 50, subscriberShare: 0, closed: false },
  ];

  it('returns dates on active weekdays only', () => {
    const now = london('2027-03-01T09:00:00'); // Monday
    const dates = getAvailableDates(now, schedule, closedDates, capacity, false);
    // All dates should be Thursday or Monday
    for (const d of dates) {
      const wd = DateTime.fromISO(d, { zone: LONDON }).weekday;
      expect(wd).toBeOneOf([1, 4]);
    }
  });

  it('respects lead days', () => {
    // Thursday schedule has leadDays: 3
    const now = london('2027-03-01T09:00:00'); // Monday
    const dates = getAvailableDates(now, schedule, [], [], false);
    // First Thursday from Mar 1 is Mar 4. leadDays=3 means Mar 1+3=Mar 4, so Mar 4 is OK.
    expect(dates).toContain('2027-03-04');
  });

  it('excludes dates before lead days', () => {
    // Monday schedule has leadDays: 1
    const now = london('2027-03-04T09:00:00'); // Thursday
    const dates = getAvailableDates(now, schedule, [], [], false);
    // Next Monday is Mar 8. leadDays=1 means Mar 4+1=Mar 5, so Mar 8 is OK.
    // But Thursday Mar 4 itself is "today" so it won't be >= Mar 5.
    expect(dates).not.toContain('2027-03-04');
  });

  it('excludes closed dates', () => {
    const now = london('2027-03-01T09:00:00'); // Monday
    const dates = getAvailableDates(now, schedule, closedDates, capacity, false);
    expect(dates).not.toContain('2027-03-11'); // Closed Thursday
  });

  it('excludes dates with exhausted juice capacity', () => {
    const now = london('2027-03-01T09:00:00'); // Monday
    const datesWithJuice = getAvailableDates(now, schedule, closedDates, capacity, true);
    expect(datesWithJuice).not.toContain('2027-03-18'); // Full capacity

    const datesWithoutJuice = getAvailableDates(now, schedule, closedDates, capacity, false);
    expect(datesWithoutJuice).toContain('2027-03-18'); // Capacity only matters for juice
  });

  it('cut-off: just before cutoff time includes today', () => {
    // Monday schedule: cutoff 18:00, leadDays: 1
    const now = london('2027-03-01T17:59:00'); // Monday, 1 minute before cutoff
    void getAvailableDates(now, schedule, [], [], false);
    // Since leadDays=1, minDate is Mar 2 (Tuesday). Monday Mar 1 is before minDate.
    // So Monday is not available regardless of cutoff.
    // Let's test with a date where today IS the delivery day and leadDays=0
    const scheduleNoLead: DeliveryScheduleDay[] = [
      { id: 'snl-1', weekday: 1, cutoffTime: '18:00', leadDays: 0, isActive: true },
    ];
    const dates2 = getAvailableDates(now, scheduleNoLead, [], [], false);
    expect(dates2).toContain('2027-03-01'); // Before cutoff, today is available
  });

  it('cut-off: just after cutoff time excludes today', () => {
    const scheduleNoLead: DeliveryScheduleDay[] = [
      { id: 'snl-2', weekday: 1, cutoffTime: '18:00', leadDays: 0, isActive: true },
    ];
    const now = london('2027-03-01T18:01:00'); // Monday, 1 minute after cutoff
    const dates = getAvailableDates(now, scheduleNoLead, [], [], false);
    expect(dates).not.toContain('2027-03-01'); // After cutoff, today not available
  });

  it('DST: cut-off at 18:00 stays 18:00 on BST start (28 March 2027)', () => {
    // 28 March 2027: clocks go forward 1 hour at 1:00 AM GMT
    const scheduleNoLead: DeliveryScheduleDay[] = [
      { id: 'snl-3', weekday: 7, cutoffTime: '18:00', leadDays: 0, isActive: true }, // Sunday
    ];
    const now = london('2027-03-28T17:59:00'); // 1 minute before 18:00 London time
    const dates = getAvailableDates(now, scheduleNoLead, [], [], false);
    expect(dates).toContain('2027-03-28'); // 18:00 cutoff respected in London time

    const nowAfter = london('2027-03-28T18:01:00'); // 1 minute after 18:00 London time
    const datesAfter = getAvailableDates(nowAfter, scheduleNoLead, [], [], false);
    expect(datesAfter).not.toContain('2027-03-28');
  });

  it('DST: cut-off at 18:00 stays 18:00 on BST end (31 October 2027)', () => {
    // 31 October 2027: clocks go back 1 hour at 2:00 AM BST
    const scheduleNoLead: DeliveryScheduleDay[] = [
      { id: 'snl-4', weekday: 7, cutoffTime: '18:00', leadDays: 0, isActive: true }, // Sunday
    ];
    const now = london('2027-10-31T17:59:00'); // 1 minute before 18:00 London time
    const dates = getAvailableDates(now, scheduleNoLead, [], [], false);
    expect(dates).toContain('2027-10-31'); // 18:00 cutoff respected in London time

    const nowAfter = london('2027-10-31T18:01:00'); // 1 minute after 18:00 London time
    const datesAfter = getAvailableDates(nowAfter, scheduleNoLead, [], [], false);
    expect(datesAfter).not.toContain('2027-10-31');
  });

  it('mixed cart: juice availability checks capacity, snack-only does not', () => {
    const now = london('2027-03-01T09:00:00'); // Monday
    const datesWithJuice = getAvailableDates(now, schedule, closedDates, capacity, true);
    expect(datesWithJuice).not.toContain('2027-03-18'); // Full capacity blocks juice

    const datesSnackOnly = getAvailableDates(now, schedule, closedDates, capacity, false);
    expect(datesSnackOnly).toContain('2027-03-18'); // Snack-only ignores capacity
  });
});
