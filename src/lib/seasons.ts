import type { Product } from '../types/products.js';

/**
 * Seasonal-window helpers for catalogue products.
 *
 * Products with `status: 'seasonal'` are only shown to customers while today's
 * calendar date (Europe/London) falls within [seasonalStartDate, seasonalEndDate].
 *
 * Dates are stored as YYYY-MM-DD calendar strings. Comparison is done on
 * Europe/London calendar dates using Intl (no arithmetic on Date objects), so
 * the result is correct across British Summer Time changes without any
 * dependency on Luxon on the client. Functions-side business rules (delivery
 * days, cut-offs) use Luxon per the project rules.
 */
export type SeasonalDates = {
  seasonalStartDate?: string; // YYYY-MM-DD
  seasonalEndDate?: string; // YYYY-MM-DD
};

/**
 * Today's date in Europe/London as a YYYY-MM-DD string.
 * Using the en-CA locale guarantees a numeric YYYY-MM-DD output.
 */
function todayLondon(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns true when a seasonal product is currently in its display window.
 * Products without seasonal dates (or non-seasonal status) are the caller's
 * responsibility; this helper only answers "is the window open right now?".
 * Missing start means "started already"; missing end means "no end yet".
 */
export function isWithinSeasonalWindow(dates: SeasonalDates): boolean {
  const today = todayLondon();
  if (dates.seasonalStartDate && today < dates.seasonalStartDate) {
    return false;
  }
  if (dates.seasonalEndDate && today > dates.seasonalEndDate) {
    return false;
  }
  return true;
}

/**
 * Returns true when the product should be visible to the public right now:
 * status is 'active', or status is 'seasonal' and its date window is open.
 * 'hidden' products are never publicly visible.
 */
export function isPubliclyVisible(product: Pick<Product, 'status'> & SeasonalDates): boolean {
  if (product.status === 'active') return true;
  if (product.status === 'seasonal') return isWithinSeasonalWindow(product);
  return false;
}
