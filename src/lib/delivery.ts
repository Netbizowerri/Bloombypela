/**
 * Client-side delivery API layer.
 *
 * Wraps Firebase callable functions for delivery configuration.
 * All writes go through Cloud Functions (Admin SDK) which also write auditLog.
 * Client can never write auditLog directly.
 */

import { callable } from './functions';

export type { DeliveryArea, DeliveryScheduleDay, ClosedDate, DateCapacity, PublicSettings } from '../types/delivery';

const checkPostcodeFn = callable<
  { postcode: string },
  { served: boolean; outwardCode: string; area: { id: string; outwardCode: string; areaName: string; feePence: number; minimumOrderPence: number; isActive: boolean } | null }
>('checkPostcode');

const getAvailableDatesFn = callable<
  { now: string; hasJuices?: boolean },
  { dates: string[] }
>('getAvailableDates');

const createDeliveryAreaFn = callable<
  { outwardCode: string; areaName: string; feePence: number; minimumOrderPence: number; isActive?: boolean; id?: string },
  { ok: boolean; id: string }
>('createDeliveryArea');

const updateDeliveryAreaFn = callable<
  { id: string; outwardCode?: string; areaName?: string; feePence?: number; minimumOrderPence?: number; isActive?: boolean },
  { ok: boolean; id: string }
>('updateDeliveryArea');

const deleteDeliveryAreaFn = callable<
  { id: string },
  { ok: boolean; id: string }
>('deleteDeliveryArea');

const upsertDeliveryScheduleFn = callable<
  { weekday: number; cutoffTime: string; leadDays: number; isActive?: boolean; id?: string },
  { ok: boolean; id: string }
>('upsertDeliverySchedule');

const upsertClosedDateFn = callable<
  { date: string; reason: string; id?: string },
  { ok: boolean; id: string }
>('upsertClosedDate');

const deleteClosedDateFn = callable<
  { id: string },
  { ok: boolean; id: string }
>('deleteClosedDate');

const upsertDateCapacityFn = callable<
  { date: string; juiceCapacity: number; juiceReserved?: number; subscriberShare?: number; closed?: boolean },
  { ok: boolean; id: string }
>('upsertDateCapacity');

const updatePublicSettingsFn = callable<
  { freeDeliveryThresholdPence: number; snackFlatFeePence: number; collectionEnabled?: boolean; collectionDetails?: string | null },
  { ok: boolean }
>('updatePublicSettings');

const quoteCartFn = callable<
  { items: { productId: string; variantId: string; quantity: number }[]; postcode: string; fulfilment: 'delivery' | 'collection'; deliveryDate?: string | null; promoCode?: string | null },
  { lines: { productId: string; variantId: string; quantity: number; name: string; unitPricePence: number; lineTotalPence: number }[]; subtotalPence: number; deliveryFeePence: number; discountPence: number; totalPence: number; warnings: string[]; promoApplied: boolean; promoCode: string | null; promoMessage: string | null }
>('quoteCart');

export const deliveryApi = {
  checkPostcode: (postcode: string) => checkPostcodeFn({ postcode }),
  getAvailableDates: (now: string, hasJuices?: boolean) => getAvailableDatesFn({ now, hasJuices }),
  quoteCart: (data: Parameters<typeof quoteCartFn>[0]) => quoteCartFn(data),
  createDeliveryArea: (data: Parameters<typeof createDeliveryAreaFn>[0]) => createDeliveryAreaFn(data),
  updateDeliveryArea: (data: Parameters<typeof updateDeliveryAreaFn>[0]) => updateDeliveryAreaFn(data),
  deleteDeliveryArea: (id: string) => deleteDeliveryAreaFn({ id }),
  upsertDeliverySchedule: (data: Parameters<typeof upsertDeliveryScheduleFn>[0]) => upsertDeliveryScheduleFn(data),
  upsertClosedDate: (data: Parameters<typeof upsertClosedDateFn>[0]) => upsertClosedDateFn(data),
  deleteClosedDate: (id: string) => deleteClosedDateFn({ id }),
  upsertDateCapacity: (data: Parameters<typeof upsertDateCapacityFn>[0]) => upsertDateCapacityFn(data),
  updatePublicSettings: (data: Parameters<typeof updatePublicSettingsFn>[0]) => updatePublicSettingsFn(data),
};
