/**
 * Client-side promotions API layer.
 *
 * Wraps Firebase callable functions for promotion management.
 * All writes go through Cloud Functions (Admin SDK) which also write auditLog.
 * Client can never write auditLog directly.
 */

import { callable } from './functions';

export type { Promotion } from '../types/promotions';

const createPromotionFn = callable<
  { code: string; type: 'percent' | 'fixed' | 'freeDelivery'; value: number; minSpendPence: number; usageLimit: number | null; startsAt: string | null; endsAt: string | null; active?: boolean },
  { ok: boolean; id: string }
>('createPromotion');

const updatePromotionFn = callable<
  { id: string; code?: string; type?: 'percent' | 'fixed' | 'freeDelivery'; value?: number; minSpendPence?: number; usageLimit?: number | null; startsAt?: string | null; endsAt?: string | null; active?: boolean },
  { ok: boolean; id: string }
>('updatePromotion');

const deletePromotionFn = callable<
  { id: string },
  { ok: boolean; id: string }
>('deletePromotion');

const togglePromotionFn = callable<
  { id: string },
  { ok: boolean; id: string; active: boolean }
>('togglePromotion');

export const promotionsApi = {
  createPromotion: (data: Parameters<typeof createPromotionFn>[0]) => createPromotionFn(data),
  updatePromotion: (data: Parameters<typeof updatePromotionFn>[0]) => updatePromotionFn(data),
  deletePromotion: (id: string) => deletePromotionFn({ id }),
  togglePromotion: (id: string) => togglePromotionFn({ id }),
};
