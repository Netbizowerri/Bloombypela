/**
 * Client-side order types (mirrors functions/src/lib/types.ts).
 */

export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'collected'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
  name: string;
  variantName: string;
  sku: string;
  productType: 'snack' | 'juice';
  unitPricePence: number;
  lineTotalPence: number;
}

export interface OrderContact {
  name: string;
  email: string;
  emailLower: string;
  phone: string;
}

export interface OrderAddress {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
}

export interface OrderFulfilment {
  method: 'delivery' | 'collection';
  address: OrderAddress | null;
  areaName: string | null;
  deliveryDate: string | null;
  collectionDetails: string | null;
}

export interface OrderRecord {
  orderNumber: string;
  reservationId: string;
  userId: string | null;
  contact: OrderContact;
  items: OrderItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  fulfilment: OrderFulfilment;
  notes: string;
  status: OrderStatus;
  paymentStatus: 'paid' | 'refunded' | 'partially_refunded';
  refundedPence: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  promotionId: string | null;
  promoCode: string | null;
  internalNote?: string;
  statusHistory: Array<{ status: string; at: unknown; note?: string }>;
  createdAt: unknown;
  updatedAt: unknown;
}
