/**
 * Promotion / discount code types.
 *
 * Money is integer pence (GBP). Dates are ISO strings.
 */

export interface Promotion {
  id: string;
  code: string; // e.g. "WELCOME10", "FREEDELIVERY"
  type: 'percent' | 'fixed' | 'freeDelivery';
  value: number; // percent (1-100) or fixed amount in pence
  minSpendPence: number; // minimum subtotal to apply
  usageLimit: number | null; // max total redemptions (null = unlimited)
  usedCount: number; // times already redeemed
  startsAt: string | null; // ISO date/time (UTC)
  endsAt: string | null; // ISO date/time (UTC)
  active: boolean;
}

export interface PromotionFormInput {
  code: string;
  type: 'percent' | 'fixed' | 'freeDelivery';
  value: number;
  minSpendPence: number;
  usageLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}
