/**
 * Available delivery date computation.
 *
 * All time logic uses Luxon with the Europe/London zone. No raw Date arithmetic.
 * Respects: lead days, cutoff times (Europe/London), closed dates, remaining juice capacity.
 */

import { DateTime } from 'luxon';
import type {
  ClosedDate,
  DateCapacity,
  DeliveryScheduleDay,
} from '../lib/types';

const LONDON_ZONE = 'Europe/London';

/**
 * Computes the list of available delivery dates (ISO date strings YYYY-MM-DD).
 *
 * Rules:
 * - Only dates falling on active schedule weekdays are candidates.
 * - A date must be at least `leadDays` days from `now`.
 * - A date must not be in `closedDates`.
 * - If `hasJuices`, the date must have remaining juice capacity
 *   (juiceReserved < juiceCapacity) and not be closed.
 * - For the earliest candidate date that is "today", if the cutoff time has
 *   already passed in London time, that date is skipped.
 * - Returns up to 20 dates, looking ahead 8 weeks.
 *
 * @param now - current time (any zone; converted to Europe/London)
 * @param schedule - delivery schedule weekdays
 * @param closedDates - dates that are closed
 * @param capacity - per-date capacity records
 * @param hasJuices - whether the cart contains juice items
 * @returns sorted list of available ISO date strings
 */
export function getAvailableDates(
  now: DateTime,
  schedule: DeliveryScheduleDay[],
  closedDates: ClosedDate[],
  capacity: DateCapacity[],
  hasJuices: boolean
): string[] {
  const activeSchedule = schedule.filter((s) => s.isActive);
  if (activeSchedule.length === 0) {
    return [];
  }

  const londonNow = now.setZone(LONDON_ZONE).startOf('day') as DateTime;
  const closedSet = new Set(closedDates.map((c) => c.date));
  const capacityMap = new Map(capacity.map((c) => [c.date, c]));

  const available: string[] = [];
  const endDate = londonNow.plus({ weeks: 8 }).startOf('day') as DateTime;

  let cursor: DateTime = londonNow;

  while (cursor <= endDate && available.length < 20) {
    const weekday = cursor.weekday; // 1 = Monday, 7 = Sunday
    const daySchedule = activeSchedule.find((s) => s.weekday === weekday);

    if (!daySchedule) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    const dateStr = cursor.toISODate() as string;

    // Lead days: date must be at least `leadDays` days from now.
    const minDate = londonNow
      .plus({ days: daySchedule.leadDays })
      .startOf('day') as DateTime;
    if (cursor < minDate) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    // Closed dates.
    if (closedSet.has(dateStr)) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    // Capacity check for juice carts.
    if (hasJuices) {
      const cap = capacityMap.get(dateStr);
      if (cap?.closed) {
        cursor = cursor.plus({ days: 1 });
        continue;
      }
      if (cap && cap.juiceReserved + (cap.juiceHeld ?? 0) >= cap.juiceCapacity) {
        cursor = cursor.plus({ days: 1 });
        continue;
      }
    }

    // Cutoff check for today: if the cutoff time has passed in London time,
    // skip today's delivery.
    if (cursor.startOf('day').equals(londonNow)) {
      const cutoffTime = daySchedule.cutoffTime as string;
      const [cutoffHour, cutoffMinute] = cutoffTime
        .split(':')
        .map((part) => parseInt(part, 10));
      const cutoff = londonNow.set({
        hour: cutoffHour,
        minute: cutoffMinute,
        second: 0,
        millisecond: 0,
      });
      if (now.setZone(LONDON_ZONE) >= cutoff) {
        cursor = cursor.plus({ days: 1 });
        continue;
      }
    }

    available.push(dateStr);
    cursor = cursor.plus({ days: 1 });
  }

  return available;
}
