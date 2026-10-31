// PLACEHOLDER: Seed delivery schedule content. Replace with real schedule before launch.
import type { DeliveryScheduleDay } from '../../types/delivery.js';

export const SEED_DELIVERY_SCHEDULE: DeliveryScheduleDay[] = [
  {
    id: 'sched-mon',
    weekday: 1,
    cutoffTime: '12:00',
    leadDays: 3,
    isActive: true,
  },
  {
    id: 'sched-thu',
    weekday: 4,
    cutoffTime: '12:00',
    leadDays: 3,
    isActive: true,
  },
];
