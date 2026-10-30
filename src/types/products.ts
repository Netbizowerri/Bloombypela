import { UKAllergen } from '../lib/utils';

export type ProductType = 'snack' | 'juice';
export type ProductStatus = 'active' | 'hidden' | 'seasonal';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "100g Pouch", "250g Jar", "250ml Bottle", "500ml Bottle"
  pricePence: number; // Stored in integer pence (GBP)
  sku: string;
  stock: number; // For snacks; For juices this reflects immediate bottle inventory
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
  allergens: UKAllergen[];
  weightOrVolume: string; // e.g., "150g", "330ml"
  images: string[];
  status: ProductStatus;
  seasonalStartDate?: string;
  seasonalEndDate?: string;
  variants: ProductVariant[];
  seoTitle?: string;
  seoDescription?: string;
  isPopular?: boolean;
  origin?: 'Nigeria' | 'UK Prepared' | 'West Africa';
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
