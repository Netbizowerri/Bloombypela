/**
 * Essential domain types mirrored from the client (`src/types/*`).
 * Cloud Functions re-declare these instead of importing client code so the
 * functions bundle stays server-only and type-checks independently.
 *
 * Money is integer pence (GBP). Dates are ISO strings or YYYY-MM-DD calendar
 * strings (Europe/London) depending on the field.
 */

export type ProductType = 'snack' | 'juice';
export type ProductStatus = 'active' | 'hidden' | 'seasonal';

export interface ImageAsset {
  url: string; // Cloudinary secure_url
  publicId: string; // Cloudinary public_id (empty for externally hosted images)
}

export interface ProductVariant {
  id: string;
  name: string;
  pricePence: number;
  sku: string;
  stock: number;
  isDefault?: boolean;
  image?: ImageAsset;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  category: string;
  description: string;
  shortDescription?: string;
  ingredients: string[];
  allergens: string[]; // 14 UK allergens (client side: UKAllergen union)
  weightOrVolume: string;
  images: ImageAsset[];
  status: ProductStatus;
  seasonalStartDate?: string; // YYYY-MM-DD (Europe/London)
  seasonalEndDate?: string; // YYYY-MM-DD (Europe/London)
  variants: ProductVariant[];
  seoTitle?: string;
  seoDescription?: string;
  isPopular?: boolean;
}

export interface ProductBundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePence: number;
  compareAtPricePence?: number;
  image: string;
  productIds: string[];
  status: 'active' | 'hidden';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripePriceId?: string;
  bottleCount: number;
  pricePence: number;
  frequency: 'weekly';
  description: string;
  features: string[];
  isPopular?: boolean;
}

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
  juiceCapacity: number;
  juiceReserved: number;
  juiceHeld?: number; // bottles held by open checkout reservations
  subscriberShare: number;
  closed: boolean;
}

export interface PublicSettings {
  freeDeliveryThresholdPence: number;
  snackFlatFeePence: number;
  collectionEnabled: boolean;
  collectionDetails?: string;
}

export interface AuditLogEntry {
  id?: string;
  action: string; // e.g. 'create', 'update', 'soft-delete', 'duplicate'
  entityType: string; // e.g. 'product'
  entityId: string;
  uid: string; // Firebase Auth uid of the actor
  email: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: unknown; // Firestore server timestamp
}

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

/** Status lifecycle for orders. */
export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'collected'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface OrderStatusTransition {
  from: OrderStatus | null;
  to: OrderStatus;
  allowed: boolean;
  reason?: string;
}

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
  promotionRestored?: boolean;
  statusHistory: Array<{ status: string; at: unknown; note?: string }>;
  internalNote?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface EmailTemplate {
  id: string; // order_id + template_key
  orderNumber: string;
  templateKey: 'order_confirmation' | 'status_update' | 'admin_new_order' | 'low_stock_alert';
  recipient: string;
  sentAt: unknown;
}

