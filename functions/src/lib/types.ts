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
  origin?: string;
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
  outwardCode: string;
  areaName: string;
  feePence: number;
  minimumOrderPence: number;
  freeDeliveryThresholdPence: number;
  isActive: boolean;
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
