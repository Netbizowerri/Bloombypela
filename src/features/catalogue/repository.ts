/**
 * Typed catalogue repository over Firestore.
 *
 * Public queries never ask for `status: 'hidden'` documents: they filter on
 * `status in ['active', 'seasonal']` at the database level, which matches the
 * Firestore rule `resource.data.status != 'hidden'` for public readers, and the
 * seasonal date window is applied in memory afterwards.
 *
 * Admin queries (includeHidden: true) read every document; they are only used
 * from the admin portal, where Firestore rules require a staff/admin role.
 */
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isPubliclyVisible } from '@/lib/seasons';
import type { ImageAsset, Product, ProductBundle, SubscriptionPlan } from '@/types/products';

const COLLECTIONS = {
  products: 'products',
  bundles: 'bundles',
  subscriptionPlans: 'subscriptionPlans',
} as const;

function requireDb(): Firestore {
  if (!db) {
    throw new Error(
      'Firestore is not initialized. Check the VITE_FIREBASE_* environment variables.',
    );
  }
  return db as Firestore;
}

function normalizeImages(images: unknown): ImageAsset[] {
  if (!Array.isArray(images)) return [];
  return images.map((image) => {
    if (typeof image === 'string') return { url: image, publicId: '' };
    const img = image as Record<string, unknown>;
    return {
      url: typeof img.url === 'string' ? img.url : '',
      publicId: typeof img.publicId === 'string' ? img.publicId : '',
    };
  });
}

/**
 * Reads a Firestore timestamp (or a plain number) as epoch milliseconds.
 * Returns undefined when the document was written without `createdAt`.
 */
function readTimestampMillis(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const candidate = value as { toMillis?: unknown };
    if (typeof candidate.toMillis === 'function') {
      const millis = (candidate.toMillis as () => number)();
      if (Number.isFinite(millis)) return millis;
    }
  }
  return undefined;
}

function docToProduct(snap: DocumentData): Product {
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : '',
    slug: typeof data.slug === 'string' ? data.slug : '',
    type: (data.type === 'juice' ? 'juice' : 'snack') as Product['type'],
    category: typeof data.category === 'string' ? data.category : '',
    description: typeof data.description === 'string' ? data.description : '',
    shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : undefined,
    ingredients: Array.isArray(data.ingredients) ? [...data.ingredients] : [],
    allergens: Array.isArray(data.allergens) ? [...data.allergens] : [],
    weightOrVolume: typeof data.weightOrVolume === 'string' ? data.weightOrVolume : '',
    images: normalizeImages(data.images),
    status: (data.status === 'hidden' || data.status === 'seasonal'
      ? data.status
      : 'active') as Product['status'],
    seasonalStartDate: typeof data.seasonalStartDate === 'string' ? data.seasonalStartDate : undefined,
    seasonalEndDate: typeof data.seasonalEndDate === 'string' ? data.seasonalEndDate : undefined,
    variants: Array.isArray(data.variants) ? [...data.variants] : [],
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : undefined,
    seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : undefined,
    isPopular: typeof data.isPopular === 'boolean' ? data.isPopular : undefined,
    allergenReviewed: data.allergenReviewed === true,
    createdAt: readTimestampMillis(data.createdAt),
  };
}

function docToBundle(snap: DocumentData): ProductBundle {
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : '',
    slug: typeof data.slug === 'string' ? data.slug : '',
    description: typeof data.description === 'string' ? data.description : '',
    pricePence: typeof data.pricePence === 'number' ? data.pricePence : 0,
    compareAtPricePence:
      typeof data.compareAtPricePence === 'number' ? data.compareAtPricePence : undefined,
    image: typeof data.image === 'string' ? data.image : '',
    productIds: Array.isArray(data.productIds) ? [...data.productIds] : [],
    status: data.status === 'hidden' ? 'hidden' : 'active',
  };
}

function docToPlan(snap: DocumentData): SubscriptionPlan {
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : '',
    stripePriceId: typeof data.stripePriceId === 'string' ? data.stripePriceId : undefined,
    bottleCount: typeof data.bottleCount === 'number' ? data.bottleCount : 0,
    pricePence: typeof data.pricePence === 'number' ? data.pricePence : 0,
    frequency: 'weekly',
    description: typeof data.description === 'string' ? data.description : '',
    features: Array.isArray(data.features) ? [...data.features] : [],
    isPopular: typeof data.isPopular === 'boolean' ? data.isPopular : undefined,
  };
}

type ProductListOptions = {
  category?: string;
  type?: 'snack' | 'juice';
  includeHidden?: boolean;
};

export const catalogueRepository = {
  /**
   * List products, optionally filtered by category or type.
   * Unless `includeHidden` is true, only publicly visible products are returned.
   */
  async listProducts(options: ProductListOptions = {}): Promise<Product[]> {
    const database = requireDb();
    const constraints: QueryConstraint[] = [];

    if (!options.includeHidden) {
      // Public readers may not see hidden products; this matches Firestore rules.
      constraints.push(where('status', 'in', ['active', 'seasonal']));
    }
    if (options.category) constraints.push(where('category', '==', options.category));
    if (options.type) constraints.push(where('type', '==', options.type));

    const snap = await getDocs(
      query(collection(database, COLLECTIONS.products), ...constraints),
    );
    let products = snap.docs.map(docToProduct);

    if (!options.includeHidden) {
      products = products.filter((product) => isPubliclyVisible(product));
    }
    return products;
  },

  /**
   * Get one publicly visible product by slug.
   *
   * The `status` filter is not optional: Firestore security rules only allow a
   * public reader when the query itself guarantees `status != 'hidden'`. A bare
   * `where('slug', '==', slug)` query is rejected with "Missing or insufficient
   * permissions", which is why this must mirror `listProducts`.
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    const database = requireDb();
    const snap = await getDocs(
      query(
        collection(database, COLLECTIONS.products),
        where('status', 'in', ['active', 'seasonal']),
        where('slug', '==', slug),
        limit(1),
      ),
    );
    if (snap.empty) return null;
    const product = docToProduct(snap.docs[0]);
    // Seasonal products outside their window are not for sale yet/any more.
    return isPubliclyVisible(product) ? product : null;
  },

  async listBundles(): Promise<ProductBundle[]> {
    const database = requireDb();
    const snap = await getDocs(collection(database, COLLECTIONS.bundles));
    return snap.docs.map(docToBundle);
  },

  async listPlans(): Promise<SubscriptionPlan[]> {
    const database = requireDb();
    const snap = await getDocs(collection(database, COLLECTIONS.subscriptionPlans));
    return snap.docs.map(docToPlan);
  },
};
