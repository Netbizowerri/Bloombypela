import { describe, expect, it } from 'vitest';
import { selectFeaturedProducts } from './featured';
import type { Product } from '@/types/products';

function product(
  id: string,
  type: 'snack' | 'juice',
  createdAt?: number,
): Product {
  return {
    id,
    name: id,
    slug: id,
    type,
    category: type === 'snack' ? 'Snacks' : 'Fresh juices and drinks',
    description: '',
    ingredients: [],
    allergens: [],
    weightOrVolume: '',
    images: [],
    status: 'active',
    variants: [],
    createdAt,
  };
}

describe('selectFeaturedProducts', () => {
  it('returns four snacks followed by four juices', () => {
    const products = [
      ...Array.from({ length: 6 }, (_, i) => product(`s${i}`, 'snack')),
      ...Array.from({ length: 6 }, (_, i) => product(`j${i}`, 'juice')),
    ];

    const featured = selectFeaturedProducts(products);

    expect(featured).toHaveLength(8);
    expect(featured.slice(0, 4).every((p) => p.type === 'snack')).toBe(true);
    expect(featured.slice(4).every((p) => p.type === 'juice')).toBe(true);
  });

  it('puts the newest products first within each type', () => {
    const products = [
      product('snack-old', 'snack', 1_000),
      product('snack-new', 'snack', 3_000),
      product('snack-mid', 'snack', 2_000),
      product('juice-old', 'juice', 1_500),
      product('juice-new', 'juice', 4_000),
    ];

    expect(selectFeaturedProducts(products, 4).map((p) => p.id)).toEqual([
      'snack-new',
      'snack-mid',
      'snack-old',
      'juice-new',
      'juice-old',
    ]);
  });

  it('keeps catalogue order for undated products, after dated ones', () => {
    const products = [
      product('legacy-a', 'snack'),
      product('dated', 'snack', 5_000),
      product('legacy-b', 'snack'),
    ];

    expect(selectFeaturedProducts(products, 4).map((p) => p.id)).toEqual([
      'dated',
      'legacy-a',
      'legacy-b',
    ]);
  });

  it('returns however many exist when a type has fewer than the limit', () => {
    const products = [product('s1', 'snack'), product('j1', 'juice')];

    expect(selectFeaturedProducts(products, 4).map((p) => p.id)).toEqual(['s1', 'j1']);
  });

  it('handles a limit of zero and an empty catalogue', () => {
    expect(selectFeaturedProducts([product('s1', 'snack')], 0)).toEqual([]);
    expect(selectFeaturedProducts([])).toEqual([]);
  });

  it('does not mutate the array it is given', () => {
    const products = [
      product('a', 'snack', 1_000),
      product('b', 'snack', 2_000),
    ];
    const before = products.map((p) => p.id);

    selectFeaturedProducts(products);

    expect(products.map((p) => p.id)).toEqual(before);
  });

  it('does not let a price edit (updatedAt only) reorder the row', () => {
    // Same products, one of them re-saved: nothing here reads updatedAt, so the
    // order stays derived from createdAt alone.
    const products = [
      product('older', 'snack', 1_000),
      { ...product('edited', 'snack', 2_000), name: 'Renamed' },
    ];

    expect(selectFeaturedProducts(products, 4).map((p) => p.id)).toEqual(['edited', 'older']);
  });
});
