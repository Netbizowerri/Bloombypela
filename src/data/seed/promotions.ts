// PLACEHOLDER: Seed promotion content. Replace with real promo codes before launch.
import type { Promotion } from '../../types/promotions.js';

export const SEED_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-welcome10',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minSpendPence: 2000,
    usageLimit: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    active: true,
  },
  {
    id: 'promo-freedelivery',
    code: 'FREEDELIVERY',
    type: 'freeDelivery',
    value: 0,
    minSpendPence: 3000,
    usageLimit: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    active: true,
  },
];
