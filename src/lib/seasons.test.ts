import { describe, expect, it } from 'vitest';
import { isWithinSeasonalWindow, isPubliclyVisible } from './seasons';

describe('isWithinSeasonalWindow', () => {
  it('returns false before the seasonal start date', () => {
    expect(isWithinSeasonalWindow({ seasonalStartDate: '2099-01-01' })).toBe(false);
  });

  it('returns false after the seasonal end date', () => {
    expect(isWithinSeasonalWindow({ seasonalEndDate: '2020-01-01' })).toBe(false);
  });

  it('returns true when today is within the open window', () => {
    expect(
      isWithinSeasonalWindow({
        seasonalStartDate: '2020-01-01',
        seasonalEndDate: '2099-12-31',
      }),
    ).toBe(true);
  });

  it('returns true when only the end date is set and it is in the future', () => {
    expect(isWithinSeasonalWindow({ seasonalEndDate: '2099-12-31' })).toBe(true);
  });

  it('returns true when only the start date is set and it is in the past', () => {
    expect(isWithinSeasonalWindow({ seasonalStartDate: '2020-01-01' })).toBe(true);
  });

  it('returns true when no seasonal dates are provided', () => {
    expect(isWithinSeasonalWindow({})).toBe(true);
  });
});

describe('isPubliclyVisible', () => {
  it('returns true for active products', () => {
    expect(isPubliclyVisible({ status: 'active' })).toBe(true);
  });

  it('returns true for seasonal products within their window', () => {
    expect(
      isPubliclyVisible({
        status: 'seasonal',
        seasonalStartDate: '2020-01-01',
        seasonalEndDate: '2099-12-31',
      }),
    ).toBe(true);
  });

  it('returns false for seasonal products before their window', () => {
    expect(
      isPubliclyVisible({ status: 'seasonal', seasonalStartDate: '2099-01-01' }),
    ).toBe(false);
  });

  it('returns false for hidden products', () => {
    expect(isPubliclyVisible({ status: 'hidden' })).toBe(false);
  });
});
