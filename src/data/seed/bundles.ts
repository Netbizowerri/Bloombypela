// PLACEHOLDER: Seed catalogue content. Replace with real bundles before launch.
import type { ProductBundle } from '../../types/products';

export const SEED_BUNDLES: ProductBundle[] = [
  {
    id: 'bundle-tasting-box',
    name: 'The Bloom Tasting Box',
    slug: 'the-bloom-tasting-box',
    description:
      'The ultimate introduction to Bloom by Pela: 2 packs of Plantain chips, 1 Coconut chips, 1 Chin chin, plus 2 Fresh juices and drinks (Tropical Bloom & Zobo).',
    pricePence: 2200,
    compareAtPricePence: 2600,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    productIds: ['prod-snack-plantain-chips', 'prod-snack-coconut-chips', 'prod-juice-tropical-bloom', 'prod-juice-zobo'],
    status: 'active',
  },
];
