/**
 * Admin catalogue writes, straight to Firestore.
 *
 * These replace the `createProduct` / `updateProduct` / `duplicateProduct` /
 * `softDeleteProduct` Cloud Functions, which cannot run on the Spark plan.
 * `firestore.rules` allows these writes only for staff/admin custom claims and
 * validates the document shape, so the browser cannot create a malformed
 * product even if the form is bypassed.
 */
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { requireAdminDb, stripUndefinedDeep } from '@/lib/firestoreWrite';
import { audit } from '@/lib/audit';
import type {
  ImageAsset,
  Product,
  ProductStatus,
  ProductType,
  ProductVariant,
} from '@/types/products';

/** The fields the admin catalogue form owns. `id` is the document id. */
export type ProductWriteInput = {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  category: string;
  description: string;
  shortDescription?: string | null;
  ingredients: string[];
  allergens: Product['allergens'];
  weightOrVolume: string;
  images: ImageAsset[];
  status: ProductStatus;
  seasonalStartDate?: string | null;
  seasonalEndDate?: string | null;
  variants: ProductVariant[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isPopular?: boolean;
  allergenReviewed: boolean;
};

const COLLECTION = 'products';

function toProductFields(input: ProductWriteInput): Record<string, unknown> {
  return stripUndefinedDeep({
    name: input.name.trim(),
    slug: input.slug.trim(),
    type: input.type,
    category: input.category.trim(),
    description: input.description,
    shortDescription: input.shortDescription ?? null,
    ingredients: input.ingredients,
    allergens: input.allergens,
    weightOrVolume: input.weightOrVolume,
    images: input.images,
    status: input.status,
    seasonalStartDate: input.seasonalStartDate ?? null,
    seasonalEndDate: input.seasonalEndDate ?? null,
    variants: input.variants,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    isPopular: input.isPopular ?? false,
    allergenReviewed: input.allergenReviewed,
  });
}

export const catalogueAdmin = {
  async createProduct(input: ProductWriteInput): Promise<{ ok: true; id: string }> {
    const database = requireAdminDb();
    const ref = doc(database, COLLECTION, input.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error(`A product with id ${input.id} already exists. Reload and try again.`);
    }

    await setDoc(ref, {
      id: input.id,
      ...toProductFields(input),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await audit('create', 'product', input.id, { name: input.name, slug: input.slug });
    return { ok: true, id: input.id };
  },

  async updateProduct(input: ProductWriteInput): Promise<{ ok: true; id: string }> {
    const database = requireAdminDb();
    const ref = doc(database, COLLECTION, input.id);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error(`Product ${input.id} no longer exists. Reload the catalogue.`);
    }

    // `set` with merge keeps createdAt and any field this form does not own.
    await setDoc(
      ref,
      { ...toProductFields(input), updatedAt: serverTimestamp() },
      { merge: true },
    );

    await audit('update', 'product', input.id, { name: input.name, slug: input.slug });
    return { ok: true, id: input.id };
  },

  /** Soft delete: hidden products disappear from the storefront but keep history. */
  async softDeleteProduct(id: string): Promise<{ ok: true; id: string }> {
    const database = requireAdminDb();
    const ref = doc(database, COLLECTION, id);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error(`Product ${id} no longer exists. Reload the catalogue.`);
    }

    await updateDoc(ref, { status: 'hidden', updatedAt: serverTimestamp() });
    await audit('soft-delete', 'product', id, {
      previousStatus: (existing.data() as { status?: string }).status ?? null,
    });
    return { ok: true, id };
  },

  async duplicateProduct(id: string, newId: string): Promise<{ ok: true; id: string }> {
    if (newId === id) throw new Error('The duplicate needs a different product id.');

    const database = requireAdminDb();
    const source = await getDoc(doc(database, COLLECTION, id));
    if (!source.exists()) throw new Error(`Product ${id} no longer exists.`);

    const original = source.data() as Product;
    const copy = stripUndefinedDeep({
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy`,
      isPopular: false,
      // A duplicate is a new document: hide it and require a fresh allergen
      // review so an edited copy can never go live unreviewed.
      status: 'hidden',
      allergenReviewed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(database, COLLECTION, newId), copy);
    await audit('duplicate', 'product', newId, { sourceId: id });
    return { ok: true, id: newId };
  },
};
