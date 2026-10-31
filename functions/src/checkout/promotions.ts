/**
 * Promotion management callable functions.
 *
 * Requires admin role. Every write also creates an auditLog entry via the
 * Admin SDK. The client cannot write auditLog directly (blocked by Firestore
 * rules).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { ALLOWED_ORIGINS } from '../lib/config';
import { adminDb } from '../lib/admin';
import { requireRole } from '../lib/auth';
import { fromZodError } from '../lib/errors';
import type { Promotion } from '../lib/types';

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

const PromotionInput = z.object({
  id: z.string().trim().min(1).optional(),
  code: z.string().trim().min(3).max(20).toUpperCase(),
  type: z.enum(['percent', 'fixed', 'freeDelivery']),
  value: z.number().int().nonnegative().max(10000),
  minSpendPence: z.number().int().nonnegative(),
  usageLimit: z.number().int().nonnegative().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const createPromotion = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin']);
    const input = PromotionInput.safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { id, ...fields } = input.data;
    const docId = id ?? `promo-${fields.code.toLowerCase()}`;
    const db = adminDb();

    const exists = await db.collection('promotions').doc(docId).get();
    if (exists.exists) {
      throw new HttpsError('already-exists', `Promotion ${docId} already exists.`);
    }

    const promotion: Promotion = {
      id: docId,
      code: fields.code,
      type: fields.type,
      value: fields.value,
      minSpendPence: fields.minSpendPence,
      usageLimit: fields.usageLimit ?? null,
      usedCount: 0,
      startsAt: fields.startsAt ?? null,
      endsAt: fields.endsAt ?? null,
      active: fields.active,
    };
    await db.collection('promotions').doc(docId).set(promotion);
    await writeAuditLog(db, identity, 'create', 'promotion', docId, {
      code: fields.code,
      type: fields.type,
    });
    return { ok: true, id: docId };
  },
);

export const updatePromotion = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin']);
    const input = z.object({ id: z.string().trim().min(1) }).and(PromotionInput).safeParse(request.data);
    if (!input.success) throw fromZodError(input.error);
    const { id, ...fields } = input.data;
    const db = adminDb();
    const ref = db.collection('promotions').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Promotion ${id} not found.`);

    const updateData: Record<string, unknown> = {};
    if ('code' in fields) updateData.code = fields.code;
    if ('type' in fields) updateData.type = fields.type;
    if ('value' in fields) updateData.value = fields.value;
    if ('minSpendPence' in fields) updateData.minSpendPence = fields.minSpendPence;
    if ('usageLimit' in fields) updateData.usageLimit = fields.usageLimit;
    if ('startsAt' in fields) updateData.startsAt = fields.startsAt;
    if ('endsAt' in fields) updateData.endsAt = fields.endsAt;
    if ('active' in fields) updateData.active = fields.active;

    await ref.update(updateData);
    await writeAuditLog(db, identity, 'update', 'promotion', id, fields);
    return { ok: true, id };
  },
);

export const deletePromotion = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin']);
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(request.data);
    if (!parsed.success) throw fromZodError(parsed.error);
    const { id } = parsed.data;
    const db = adminDb();
    const ref = db.collection('promotions').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Promotion ${id} not found.`);

    await ref.delete();
    await writeAuditLog(db, identity, 'delete', 'promotion', id, null);
    return { ok: true, id };
  },
);

export const togglePromotion = onCall(
  { secrets: [], cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin']);
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(request.data);
    if (!parsed.success) throw fromZodError(parsed.error);
    const { id } = parsed.data;
    const db = adminDb();
    const ref = db.collection('promotions').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Promotion ${id} not found.`);

    const current = snap.data() as { active?: boolean };
    await ref.update({ active: !current.active });
    await writeAuditLog(db, identity, 'toggle', 'promotion', id, {
      active: !current.active,
    });
    return { ok: true, id, active: !current.active };
  },
);
