/**
 * Client-side promotions API layer.
 *
 * Promotion management was a set of admin-only Cloud Functions. The Spark plan
 * cannot run them, so the admin portal writes `promotions` directly.
 * `firestore.rules` keeps this admin-only and blocks customers from reading
 * codes, exactly as before. `usedCount` is only ever changed by checkout, so it
 * is never written here.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { requireAdminDb } from './firestoreWrite';
import { audit } from './audit';
import type { Promotion } from '../types/promotions';

export type { Promotion } from '../types/promotions';

const COLLECTION = 'promotions';

export type CreatePromotionInput = {
  code: string;
  type: Promotion['type'];
  value: number;
  minSpendPence: number;
  usageLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active?: boolean;
};

export type UpdatePromotionInput = Partial<CreatePromotionInput> & { id: string };

/** Codes are the document suffix, so a code can never be created twice. */
function promotionId(code: string): string {
  return `promo-${code.trim().toLowerCase()}`;
}

export const promotionsApi = {
  /** Staff-readable list for the admin dashboard. */
  async listPromotions(): Promise<Promotion[]> {
    const database = requireAdminDb();
    const snap = await getDocs(collection(database, COLLECTION));
    return snap.docs.map((entry) => {
      const data = entry.data() as Partial<Promotion>;
      return {
        id: entry.id,
        code: typeof data.code === 'string' ? data.code : '',
        type: data.type === 'fixed' || data.type === 'freeDelivery' ? data.type : 'percent',
        value: typeof data.value === 'number' ? data.value : 0,
        minSpendPence: typeof data.minSpendPence === 'number' ? data.minSpendPence : 0,
        usageLimit: typeof data.usageLimit === 'number' ? data.usageLimit : null,
        usedCount: typeof data.usedCount === 'number' ? data.usedCount : 0,
        startsAt: typeof data.startsAt === 'string' ? data.startsAt : null,
        endsAt: typeof data.endsAt === 'string' ? data.endsAt : null,
        active: data.active === true,
      };
    });
  },

  async createPromotion(input: CreatePromotionInput) {
    const database = requireAdminDb();
    const code = input.code.trim().toUpperCase();
    const id = promotionId(code);
    const ref = doc(database, COLLECTION, id);

    if ((await getDoc(ref)).exists()) {
      throw new Error(`Promotion code ${code} already exists. Edit the existing code instead.`);
    }

    const promotion: Promotion = {
      id,
      code,
      type: input.type,
      value: input.value,
      minSpendPence: input.minSpendPence,
      usageLimit: input.usageLimit ?? null,
      usedCount: 0,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      active: input.active ?? true,
    };

    await setDoc(ref, promotion);
    await audit('create', 'promotion', id, { code, type: promotion.type });
    return { data: { ok: true as const, id } };
  },

  async updatePromotion(input: UpdatePromotionInput) {
    const database = requireAdminDb();
    const ref = doc(database, COLLECTION, input.id);
    if (!(await getDoc(ref)).exists()) {
      throw new Error(`Promotion ${input.id} no longer exists. Reload the page.`);
    }

    const { id, ...fields } = input;
    const changes: Record<string, unknown> = {};
    if (fields.code !== undefined) changes.code = fields.code.trim().toUpperCase();
    if (fields.type !== undefined) changes.type = fields.type;
    if (fields.value !== undefined) changes.value = fields.value;
    if (fields.minSpendPence !== undefined) changes.minSpendPence = fields.minSpendPence;
    if (fields.usageLimit !== undefined) changes.usageLimit = fields.usageLimit ?? null;
    if (fields.startsAt !== undefined) changes.startsAt = fields.startsAt ?? null;
    if (fields.endsAt !== undefined) changes.endsAt = fields.endsAt ?? null;
    if (fields.active !== undefined) changes.active = fields.active;

    if (Object.keys(changes).length === 0) {
      throw new Error('Nothing to update.');
    }

    await updateDoc(ref, changes);
    await audit('update', 'promotion', id, changes);
    return { data: { ok: true as const, id } };
  },

  async deletePromotion(id: string) {
    const database = requireAdminDb();
    const ref = doc(database, COLLECTION, id);
    await deleteDoc(ref);
    await audit('delete', 'promotion', id, null);
    return { data: { ok: true as const, id } };
  },

  async togglePromotion(id: string) {
    const database = requireAdminDb();
    const ref = doc(database, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Promotion ${id} no longer exists.`);

    const active = !(snap.data() as Promotion).active;
    await updateDoc(ref, { active });
    await audit('toggle', 'promotion', id, { active });
    return { data: { ok: true as const, id, active } };
  },
};
