import type { Product } from '@/types/products';

/**
 * Orders one type by "newest first".
 *
 * `createdAt` is the only signal used: `updatedAt` is deliberately ignored so
 * that editing a price does not reshuffle the homepage. Documents written
 * without `createdAt` keep the order Firestore returned them in and sort after
 * dated products.
 */
function newestOfType(products: Product[], limit: number): Product[] {
  const dated = products.filter((product) => product.createdAt !== undefined);
  const undated = products.filter((product) => product.createdAt === undefined);

  dated.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return [...dated, ...undated].slice(0, limit);
}

/**
 * Picks the homepage featured row: the newest snacks first, then the newest
 * juices, `perType` of each. Input order is never mutated.
 */
export function selectFeaturedProducts(products: Product[], perType = 4): Product[] {
  const limit = Math.max(0, Math.floor(perType));
  if (limit === 0) return [];

  const snacks = products.filter((product) => product.type === 'snack');
  const juices = products.filter((product) => product.type === 'juice');

  return [...newestOfType(snacks, limit), ...newestOfType(juices, limit)];
}
