/**
 * Admin delivery callable functions.
 *
 * Requires admin or staff role. Every write also creates an auditLog entry
 * via the Admin SDK. The client cannot write auditLog directly (blocked by
 * Firestore rules).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { ALLOWED_ORIGINS } from '../lib/config';
import { adminDb } from '../lib/admin';
import { requireRole } from '../lib/auth';
import { fromZodError } from '../lib/errors';
import type {
  DeliveryArea,
  DeliveryScheduleDay,
  ClosedDate,
  DateCapacity,
  PublicSettings,
} from '../lib/types';

function writeAuditLog(
  db: FirebaseFirestore.Firestore,
  identity: { uid: string; email: string | null },
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> | null,
): Promise<void> {
  return db
    .collection('auditLog')
    .add({
      action,
      entityType,
      entityId,
      uid: identity.uid,
      email: identity.email,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    })
    .then(() => undefined);
}

// ---------------------------------------------------------------------
// Delivery Areas
// ---------------------------------------------------------------------

const DeliveryAreaInput = z.object({
  id: z.string().trim().min(1).optional(),
  outwardCode: z.string().trim().min(1).max(10).toUpperCase(),
  areaName: z.string().trim().min(1).max(100),
  feePence: z.number().int().nonnegative(),
  minimumOrderPence: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

export const createDeliveryArea = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = DeliveryAreaInput.safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { outwardCode, areaName, feePence, minimumOrderPence, isActive } = input.data;
    const id = input.data.id ?? `da-${outwardCode.toLowerCase()}`;
    const db = adminDb();

    const exists = await db
      .collection('deliveryAreas')
      .doc(id)
      .get();
    if (exists.exists) {
      throw new HttpsError('already-exists', `Delivery area ${id} already exists.`);
    }

    const area: DeliveryArea = { id, outwardCode, areaName, feePence, minimumOrderPence, isActive };
    await db.collection('deliveryAreas').doc(id).set(area);
    await writeAuditLog(db, identity, 'create', 'deliveryArea', id, {
      outwardCode,
      areaName,
    });
    return { ok: true, id };
  },
);

export const updateDeliveryArea = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = z.object({ id: z.string().trim().min(1) }).and(DeliveryAreaInput).safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { id, ...fields } = input.data;
    const db = adminDb();
    const ref = db.collection('deliveryAreas').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Delivery area ${id} not found.`);

    const updateData: Record<string, unknown> = {};
    if ('outwardCode' in fields) updateData.outwardCode = fields.outwardCode;
    if ('areaName' in fields) updateData.areaName = fields.areaName;
    if ('feePence' in fields) updateData.feePence = fields.feePence;
    if ('minimumOrderPence' in fields) updateData.minimumOrderPence = fields.minimumOrderPence;
    if ('isActive' in fields) updateData.isActive = fields.isActive;

    await ref.update(updateData);
    await writeAuditLog(db, identity, 'update', 'deliveryArea', id, fields);
    return { ok: true, id };
  },
);

export const deleteDeliveryArea = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(request.data);
    if (!parsed.success) throw fromZodError(parsed.error);
    const { id } = parsed.data;
    const db = adminDb();
    const ref = db.collection('deliveryAreas').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Delivery area ${id} not found.`);

    await ref.delete();
    await writeAuditLog(db, identity, 'delete', 'deliveryArea', id, null);
    return { ok: true, id };
  },
);

// ---------------------------------------------------------------------
// Delivery Schedule
// ---------------------------------------------------------------------

const DeliveryScheduleInput = z.object({
  id: z.string().trim().min(1).optional(),
  weekday: z.number().int().min(1).max(7),
  cutoffTime: z.string().regex(/^\d{2}:\d{2}$/),
  leadDays: z.number().int().nonnegative().max(30),
  isActive: z.boolean().default(true),
});

export const upsertDeliverySchedule = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = DeliveryScheduleInput.safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { id, ...fields } = input.data;
    const docId = id ?? `schedule-wk${fields.weekday}`;
    const db = adminDb();

    const scheduleDay: DeliveryScheduleDay = {
      id: docId,
      weekday: fields.weekday,
      cutoffTime: fields.cutoffTime,
      leadDays: fields.leadDays,
      isActive: fields.isActive,
    };
    await db.collection('deliverySchedule').doc(docId).set(scheduleDay);
    await writeAuditLog(db, identity, 'upsert', 'deliverySchedule', docId, {
      weekday: fields.weekday,
    });
    return { ok: true, id: docId };
  },
);

// ---------------------------------------------------------------------
// Closed Dates
// ---------------------------------------------------------------------

const ClosedDateInput = z.object({
  id: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(200),
});

export const upsertClosedDate = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = ClosedDateInput.safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { id, ...fields } = input.data;
    const docId = id ?? fields.date;
    const db = adminDb();

    const closedDate: ClosedDate = { id: docId, date: fields.date, reason: fields.reason };
    await db.collection('closedDates').doc(docId).set(closedDate);
    await writeAuditLog(db, identity, 'upsert', 'closedDate', docId, {
      date: fields.date,
    });
    return { ok: true, id: docId };
  },
);

export const deleteClosedDate = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(request.data);
    if (!parsed.success) throw fromZodError(parsed.error);
    const { id } = parsed.data;
    const db = adminDb();
    await db.collection('closedDates').doc(id).delete();
    await writeAuditLog(db, identity, 'delete', 'closedDate', id, null);
    return { ok: true, id };
  },
);

// ---------------------------------------------------------------------
// Date Capacity
// ---------------------------------------------------------------------

const DateCapacityInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  juiceCapacity: z.number().int().nonnegative(),
  juiceReserved: z.number().int().nonnegative().default(0),
  subscriberShare: z.number().int().nonnegative().default(0),
  closed: z.boolean().default(false),
});

export const upsertDateCapacity = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = DateCapacityInput.safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { date, ...fields } = input.data;
    const db = adminDb();

    const capacity: DateCapacity = {
      date,
      juiceCapacity: fields.juiceCapacity,
      juiceReserved: fields.juiceReserved,
      subscriberShare: fields.subscriberShare,
      closed: fields.closed,
    };
    await db.collection('dateCapacity').doc(date).set(capacity);
    await writeAuditLog(db, identity, 'upsert', 'dateCapacity', date, {
      juiceCapacity: fields.juiceCapacity,
      closed: fields.closed,
    });
    return { ok: true, id: date };
  },
);

// ---------------------------------------------------------------------
// Public Settings
// ---------------------------------------------------------------------

const PublicSettingsInput = z.object({
  freeDeliveryThresholdPence: z.number().int().nonnegative(),
  snackFlatFeePence: z.number().int().nonnegative(),
  collectionEnabled: z.boolean().default(true),
  collectionDetails: z.string().trim().max(500).optional().nullable(),
});

export const updatePublicSettings = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin']);
    const input = PublicSettingsInput.safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const db = adminDb();

    const settings: PublicSettings = {
      freeDeliveryThresholdPence: input.data.freeDeliveryThresholdPence,
      snackFlatFeePence: input.data.snackFlatFeePence,
      collectionEnabled: input.data.collectionEnabled,
      collectionDetails: input.data.collectionDetails ?? undefined,
    };
    await db.collection('publicSettings').doc('settings').set(settings);
    await writeAuditLog(
      db,
      identity,
      'update',
      'publicSettings',
      'settings',
      settings as unknown as Record<string, unknown>,
    );
    return { ok: true };
  },
);
