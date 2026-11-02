/**
 * Delivery domain types.
 *
 * Money is integer pence (GBP). Dates are ISO date strings (YYYY-MM-DD).
 * Weekdays use Luxon convention: 1 = Monday, 7 = Sunday.
 * Cutoff times are 'HH:mm' strings in Europe/London.
 */

export interface DeliveryArea {
  id: string;
  outwardCode: string; // e.g. "NE1"
  areaName: string;
  feePence: number;
  minimumOrderPence: number;
  isActive: boolean;
}

export interface DeliveryScheduleDay {
  id: string;
  weekday: number; // 1 (Monday) to 7 (Sunday)
  cutoffTime: string; // 'HH:mm' Europe/London
  leadDays: number;
  isActive: boolean;
}

export interface ClosedDate {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface DateCapacity {
  date: string; // YYYY-MM-DD
  juiceCapacity: number; // max juice bottles for this date
  juiceReserved: number; // bottles already reserved by subscribers
  juiceHeld?: number; // bottles held by open checkouts (server-managed)
  subscriberShare: number; // bottles reserved by subscription plans
  closed: boolean;
}

export interface PublicSettings {
  freeDeliveryThresholdPence: number;
  snackFlatFeePence: number;
  collectionEnabled: boolean;
  collectionDetails?: string;
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
