/**
 * Client-side checkout API.
 *
 * The client only ever sends item ids, quantities and contact details.
 * Prices and totals are computed by the createCheckoutSession Cloud Function
 * from Firestore; nothing returned by the browser is trusted.
 */

import { callable } from './functions';
import { postServerApi } from './serverApi';

export interface CheckoutRequestItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CheckoutRequest {
  items: CheckoutRequestItem[];
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  fulfilment: 'delivery' | 'collection';
  address?: {
    line1: string;
    line2?: string | null;
    city: string;
    postcode: string;
  } | null;
  notes?: string;
  promoCode?: string | null;
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
  reservationId: string;
  expiresAt: string;
}

export interface PublicOrderItem {
  name: string;
  variantName: string;
  quantity: number;
  unitPricePence: number;
  lineTotalPence: number;
  /** Absent for orders placed before allergen capture was added. */
  allergens?: string[];
}

export interface PublicOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  items: PublicOrderItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  fulfilment: {
    method: 'delivery' | 'collection';
    deliveryDate: string | null;
    areaName: string | null;
  };
  notes: string;
  createdAt: string | null;
}

export type OrderBySessionResult =
  | { state: 'confirmed'; order: PublicOrder }
  | { state: 'pending' | 'unfulfilled' | 'not_found'; order: null };

const lookupGuestOrderFn = callable<
  { orderNumber: string; email: string },
  { order: PublicOrder }
>('lookupGuestOrder');

export const checkoutApi = {
  createCheckoutSession: (payload: CheckoutRequest) =>
    postServerApi<CheckoutRequest, CheckoutSessionResponse>('/api/checkout-session', payload),
  getOrderBySession: (sessionId: string) =>
    postServerApi<{ sessionId: string }, OrderBySessionResult>('/api/order-by-session', {
      sessionId,
    }),
  lookupGuestOrder: (orderNumber: string, email: string) =>
    lookupGuestOrderFn({ orderNumber, email }),
};
