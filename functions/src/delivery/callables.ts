/**
 * Public delivery callable functions.
 *
 * No auth required. Rate limited and validated with zod.
 * Reads delivery configuration from Firestore and applies pure business logic.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { ALLOWED_ORIGINS } from '../lib/config';
import { fromZodError } from '../lib/errors';
import { adminDb } from '../lib/admin';
import { checkRateLimit } from '../lib/rateLimit';
import { parseOutwardCode, isAreaServed, getAvailableDates } from './index';
import type {
  DeliveryArea,
  DeliveryScheduleDay,
  ClosedDate,
  DateCapacity,
} from '../lib/types';

const CHECK_POSTCODE_LIMIT = { maxRequests: 30, windowMs: 60_000 };
const GET_AVAILABLE_DATES_LIMIT = { maxRequests: 20, windowMs: 60_000 };

const CheckPostcodeInput = z.object({
  postcode: z.string().trim().min(1).max(20),
});

const GetAvailableDatesInput = z.object({
  now: z.string().datetime(),
  hasJuices: z.boolean().default(false),
});

/**
 * Checks whether a postcode is in an active delivery area.
 * Returns area details and fee if served.
 */
export const checkPostcode = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
    const ip = request.rawRequest.ip ?? 'unknown';
    if (
      !checkRateLimit(
        `checkPostcode:${ip}`,
        CHECK_POSTCODE_LIMIT.maxRequests,
        CHECK_POSTCODE_LIMIT.windowMs,
      )
    ) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    const parsed = CheckPostcodeInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const { postcode } = parsed.data;
    let outwardCode: string;
    try {
      outwardCode = parseOutwardCode(postcode);
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid UK postcode format.');
    }

    const db = adminDb();
    const areasSnap = await db
      .collection('deliveryAreas')
      .where('isActive', '==', true)
      .get();
    const areas = areasSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        outwardCode: String(data.outwardCode ?? ''),
        areaName: String(data.areaName ?? ''),
        feePence: Number(data.feePence ?? 0),
        minimumOrderPence: Number(data.minimumOrderPence ?? 0),
        isActive: Boolean(data.isActive),
      } as DeliveryArea;
    });

    const served = isAreaServed(outwardCode, areas);
    const area = areas.find(
      (a) => a.outwardCode.toUpperCase() === outwardCode.toUpperCase(),
    );

    return {
      served,
      outwardCode,
      area: area
        ? {
            id: area.id,
            outwardCode: area.outwardCode,
            areaName: area.areaName,
            feePence: area.feePence,
            minimumOrderPence: area.minimumOrderPence,
            isActive: area.isActive,
          }
        : null,
    };
  },
);

/**
 * Returns available delivery dates for a given time.
 * Respects lead days, cutoff times, closed dates, and juice capacity.
 */
export const getAvailableDatesCallable = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
    const ip = request.rawRequest.ip ?? 'unknown';
    if (
      !checkRateLimit(
        `getAvailableDates:${ip}`,
        GET_AVAILABLE_DATES_LIMIT.maxRequests,
        GET_AVAILABLE_DATES_LIMIT.windowMs,
      )
    ) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    const parsed = GetAvailableDatesInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const { now, hasJuices } = parsed.data;
    const nowDateTime = DateTime.fromISO(now);
    if (!nowDateTime.isValid) {
      throw new HttpsError('invalid-argument', 'Invalid date/time.');
    }

    const db = adminDb();

    const scheduleSnap = await db.collection('deliverySchedule').get();
    const schedule = scheduleSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        weekday: Number(data.weekday),
        cutoffTime: String(data.cutoffTime ?? ''),
        leadDays: Number(data.leadDays ?? 0),
        isActive: Boolean(data.isActive),
      } as DeliveryScheduleDay;
    });

    const closedSnap = await db.collection('closedDates').get();
    const closedDates = closedSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return { date: String(data.date), reason: String(data.reason ?? '') } as ClosedDate;
    });

    const capacitySnap = await db.collection('dateCapacity').get();
    const capacity = capacitySnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        date: String(data.date),
        juiceCapacity: Number(data.juiceCapacity ?? 0),
        juiceReserved: Number(data.juiceReserved ?? 0),
        subscriberShare: Number(data.subscriberShare ?? 0),
        closed: Boolean(data.closed),
      } as DateCapacity;
    });

    const dates = getAvailableDates(
      nowDateTime,
      schedule,
      closedDates,
      capacity,
      hasJuices,
    );

    return { dates };
  },
);
