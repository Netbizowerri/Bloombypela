import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format money stored as integer pence into GBP.
 * E.g., 1450 pence -> "£14.50"
 */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}

/**
 * The 14 Major UK Allergens as mandated by UK Food Standards Agency
 */
export const UK_ALLERGENS = [
  'Celery',
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Lupin',
  'Milk',
  'Molluscs',
  'Mustard',
  'Peanuts',
  'Sesame',
  'Soybeans',
  'Sulphur dioxide and sulphites',
  'Tree nuts',
] as const;

export type UKAllergen = typeof UK_ALLERGENS[number];

/**
 * Format date in Europe/London timezone
 */
export function formatLondonDate(dateInput: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    ...options,
  }).format(d);
}
