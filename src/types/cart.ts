import { Product, ProductVariant } from './products';

export interface CartItem {
  id: string; // unique item id in cart (productId + variantId)
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface DeliveryArea {
  id: string;
  outwardCode: string; // e.g. "NE1", "NE2", "NE3"
  areaName: string;
  feePence: number;
  minimumOrderPence: number;
  freeDeliveryThresholdPence: number;
  isActive: boolean;
}

export interface DeliveryScheduleDay {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, 4 = Thursday, etc.
  dayName: string; // "Thursday"
  cutOffHourLondon: number; // e.g. 12 (12:00 PM)
  cutOffDayOfWeek: number; // e.g. 1 (Monday)
  leadDays: number;
  isActive: boolean;
}

export interface DateCapacity {
  date: string; // YYYY-MM-DD
  maxUnits: number;
  reservedUnits: number;
  confirmedUnits: number;
  isClosed?: boolean;
}
