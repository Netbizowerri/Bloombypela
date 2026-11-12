// Bundle content is awaiting owner-confirmed pricing after the November 2026
// price change, so it is hidden and described as coming soon. The stored price
// is the old value and must not be rendered until it is recalculated.
import type { ProductBundle } from '../../types/products.js';

export const SEED_BUNDLES: ProductBundle[] = [
  {
    id: 'bundle-tasting-box',
    name: 'The Bloom Tasting Box',
    slug: 'the-bloom-tasting-box',
    description: 'Coming soon: we are finalising new bundle pricing around the updated menu.',
    pricePence: 2200,
    compareAtPricePence: 2600,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    productIds: ['prod-snack-plantain-chips', 'prod-snack-coconut-chips', 'prod-juice-tropical-bloom', 'prod-juice-zobo'],
    status: 'hidden',
  },
];
