/**
 * Client-side delivery API layer.
 *
 * Two very different halves:
 *
 * - Storefront reads (`quoteCart`) are
 *   still Cloud Functions. They need server-side pricing logic and cannot run
 *   on the Spark plan, which is why checkout is not available on this plan.
 * - Admin configuration (`createDeliveryArea`, `upsertDeliverySchedule`,
 *   `upsertClosedDate`, `upsertDateCapacity`, `updatePublicSettings`) writes
 *   directly to Firestore. `firestore.rules` restricts those collections to
 *   staff/admin and validates the money fields.
 */
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { callable } from './functions';
import { requireAdminDb, stripUndefinedDeep } from './firestoreWrite';
import { audit } from './audit';

export type { DeliveryArea, DeliveryScheduleDay, ClosedDate, DateCapacity, PublicSettings } from '../types/delivery';

const quoteCartFn = callable<
  { items: { productId: string; variantId: string; quantity: number }[]; postcode: string; fulfilment: 'delivery' | 'collection'; deliveryDate?: string | null; promoCode?: string | null },
  { lines: { productId: string; variantId: string; quantity: number; name: string; unitPricePence: number; lineTotalPence: number }[]; subtotalPence: number; deliveryFeePence: number; discountPence: number; totalPence: number; warnings: string[]; promoApplied: boolean; promoCode: string | null; promoMessage: string | null }
>('quoteCart');

export type DeliveryAreaInput = {
  id?: string;
  outwardCode: string;
  areaName: string;
  feePence: number;
  minimumOrderPence: number;
  isActive?: boolean;
};

export type DeliveryScheduleInput = {
  id?: string;
  weekday: number;
  cutoffTime: string;
  leadDays: number;
  isActive?: boolean;
};

export type ClosedDateInput = {
  id?: string;
  date: string;
  reason: string;
};

export type DateCapacityInput = {
  date: string;
  juiceCapacity: number;
  juiceReserved?: number;
  subscriberShare?: number;
  closed?: boolean;
};

export type PublicSettingsInput = {
  freeDeliveryThresholdPence: number;
  snackFlatFeePence: number;
  collectionEnabled?: boolean;
  collectionDetails?: string | null;
};

export const deliveryApi = {
  quoteCart: (data: Parameters<typeof quoteCartFn>[0]) => quoteCartFn(data),

  async createDeliveryArea(input: DeliveryAreaInput) {
    const database = requireAdminDb();
    const outwardCode = input.outwardCode.trim().toUpperCase();
    const id = input.id ?? `da-${outwardCode.toLowerCase()}`;
    const ref = doc(database, 'deliveryAreas', id);

    if ((await getDoc(ref)).exists()) {
      throw new Error(`Delivery area ${outwardCode} already exists.`);
    }

    await setDoc(ref, {
      id,
      outwardCode,
      areaName: input.areaName.trim(),
      feePence: input.feePence,
      minimumOrderPence: input.minimumOrderPence,
      isActive: input.isActive ?? true,
    });

    await audit('create', 'deliveryArea', id, { outwardCode, areaName: input.areaName });
    return { data: { ok: true as const, id } };
  },

  async updateDeliveryArea(input: DeliveryAreaInput & { id: string }) {
    const database = requireAdminDb();
    const ref = doc(database, 'deliveryAreas', input.id);
    if (!(await getDoc(ref)).exists()) {
      throw new Error(`Delivery area ${input.outwardCode} no longer exists. Reload the page.`);
    }

    const { id, ...fields } = input;
    const changes = stripUndefinedDeep({
      outwardCode: fields.outwardCode.trim().toUpperCase(),
      areaName: fields.areaName.trim(),
      feePence: fields.feePence,
      minimumOrderPence: fields.minimumOrderPence,
      isActive: fields.isActive,
    });

    await updateDoc(ref, changes);
    await audit('update', 'deliveryArea', id, changes);
    return { data: { ok: true as const, id } };
  },

  async deleteDeliveryArea(id: string) {
    const database = requireAdminDb();
    await deleteDoc(doc(database, 'deliveryAreas', id));
    await audit('delete', 'deliveryArea', id, null);
    return { data: { ok: true as const, id } };
  },

  async upsertDeliverySchedule(input: DeliveryScheduleInput) {
    const database = requireAdminDb();
    const id = input.id ?? `schedule-wk${input.weekday}`;

    await setDoc(doc(database, 'deliverySchedule', id), {
      id,
      weekday: input.weekday,
      cutoffTime: input.cutoffTime,
      leadDays: input.leadDays,
      isActive: input.isActive ?? true,
    });

    await audit('upsert', 'deliverySchedule', id, { weekday: input.weekday });
    return { data: { ok: true as const, id } };
  },

  async upsertClosedDate(input: ClosedDateInput) {
    const database = requireAdminDb();
    const id = input.id ?? input.date;

    await setDoc(doc(database, 'closedDates', id), {
      id,
      date: input.date,
      reason: input.reason.trim(),
    });

    await audit('upsert', 'closedDate', id, { date: input.date });
    return { data: { ok: true as const, id } };
  },

  async deleteClosedDate(id: string) {
    const database = requireAdminDb();
    await deleteDoc(doc(database, 'closedDates', id));
    await audit('delete', 'closedDate', id, null);
    return { data: { ok: true as const, id } };
  },

  async upsertDateCapacity(input: DateCapacityInput) {
    const database = requireAdminDb();

    await setDoc(
      doc(database, 'dateCapacity', input.date),
      {
        date: input.date,
        juiceCapacity: input.juiceCapacity,
        juiceReserved: input.juiceReserved ?? 0,
        subscriberShare: input.subscriberShare ?? 0,
        closed: input.closed ?? false,
      },
      { merge: true },
    );

    await audit('upsert', 'dateCapacity', input.date, {
      juiceCapacity: input.juiceCapacity,
      closed: input.closed ?? false,
    });
    return { data: { ok: true as const, id: input.date } };
  },

  async updatePublicSettings(input: PublicSettingsInput) {
    const database = requireAdminDb();
    const settings = stripUndefinedDeep({
      freeDeliveryThresholdPence: input.freeDeliveryThresholdPence,
      snackFlatFeePence: input.snackFlatFeePence,
      collectionEnabled: input.collectionEnabled ?? true,
      collectionDetails: input.collectionDetails ?? null,
    });

    await setDoc(doc(database, 'publicSettings', 'settings'), settings);
    await audit('update', 'publicSettings', 'settings', settings);
    return { data: { ok: true as const } };
  },
};
