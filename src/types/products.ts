import type { UKAllergen } from '../lib/utils.js';

export type ProductType = 'snack' | 'juice';
export type ProductStatus = 'active' | 'hidden' | 'seasonal';

/**
 * A single image asset stored on a product.
 * `url` is the Cloudinary secure_url (render through `cld()` for transformations);
 * `publicId` is the Cloudinary public_id (empty for externally hosted images).
 */
export interface ImageAsset {
  url: string;
  publicId: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "100g Pouch", "250g Jar", "250ml Bottle", "500ml Bottle"
  pricePence: number; // Stored in integer pence (GBP)
  sku: string;
  stock: number; // For snacks; For juices this reflects immediate bottle inventory
  isDefault?: boolean;
  /**
   * Optional photo for this specific size/pack. When present the storefront
   * shows it in place of the product's first image while the variant is selected.
   */
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
  allergens: UKAllergen[];
  weightOrVolume: string; // e.g., "150g", "330ml"
  images: ImageAsset[];
  status: ProductStatus;
  seasonalStartDate?: string; // YYYY-MM-DD (Europe/London calendar date)
  seasonalEndDate?: string; // YYYY-MM-DD (Europe/London calendar date)
  variants: ProductVariant[];
  seoTitle?: string;
  seoDescription?: string;
  isPopular?: boolean;
  /**
   * Firestore `createdAt` as epoch milliseconds. Used to surface the newest
   * products on the homepage; absent on documents written before this field
   * was read, which fall back to catalogue order.
   */
  createdAt?: number;
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
  name: string; // "Weekly Bloom 3" or "Weekly Bloom 5"
  stripePriceId?: string;
  bottleCount: number;
  pricePence: number;
  frequency: 'weekly';
  description: string;
  features: string[];
  isPopular?: boolean;
}
