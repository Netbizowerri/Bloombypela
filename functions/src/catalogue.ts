import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/logger';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './lib/admin';
import { requireRole } from './lib/auth';
import { ALLOWED_ORIGINS } from './lib/config';
import { fromZodError } from './lib/errors';
import type { Product } from './lib/types';

/** A product shows at most three photos in the admin dashboard and storefront. */
const MAX_PRODUCT_IMAGES = 3;

const AllergenSchema = z.enum([
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
]);

const VariantSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  pricePence: z.number().int().nonnegative(),
  // Optional: not every product carries a SKU, so blank is stored as ''.
  sku: z.string().trim().max(64).optional().default(''),
  stock: z.number().int().nonnegative(),
  isDefault: z.boolean().optional(),
  image: z
    .object({
      url: z.string().url(),
      publicId: z.string(),
    })
    .optional(),
});

const ProductInputSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  type: z.enum(['snack', 'juice']),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(4000),
  shortDescription: z.string().max(500).optional().nullable(),
  ingredients: z.array(z.string().trim().min(1)).max(50),
  allergens: z.array(AllergenSchema),
  weightOrVolume: z.string().trim().min(1).max(100),
  images: z.array(
    z.object({
      url: z.string().url(),
      publicId: z.string(),
    }),
  ).max(MAX_PRODUCT_IMAGES),
  status: z.enum(['active', 'hidden', 'seasonal']),
  seasonalStartDate: z.string().optional().nullable(),
  seasonalEndDate: z.string().optional().nullable(),
  variants: z.array(VariantSchema).min(1),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  isPopular: z.boolean().optional(),
});

type ProductInput = z.infer<typeof ProductInputSchema>;

function validateProduct(input: unknown): ProductInput {
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) throw fromZodError(parsed.error);
  return parsed.data;
}

/** Firestore rejects undefined values unless ignoreUndefinedProperties is enabled. */
function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
}

function writeAuditLog(
  db: FirebaseFirestore.Firestore,
  identity: { uid: string; email: string | null },
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> | null,
): Promise<void> {
  return db
    .collection('auditLog')
    .add({
      action,
      entityType,
      entityId,
      uid: identity.uid,
      email: identity.email,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    })
    .then(() => undefined);
}

/**
 * Create a product (and an auditLog entry). Admin/staff only.
 */
export const createProduct = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = validateProduct(request.data);
    const db = adminDb();
    const product: Product = omitUndefined({
      id: input.id,
      name: input.name,
      slug: input.slug,
      type: input.type,
      category: input.category,
      description: input.description,
      shortDescription: input.shortDescription ?? undefined,
      ingredients: input.ingredients,
      allergens: input.allergens,
      weightOrVolume: input.weightOrVolume,
      images: input.images,
      status: input.status,
      seasonalStartDate: input.seasonalStartDate ?? undefined,
      seasonalEndDate: input.seasonalEndDate ?? undefined,
      variants: input.variants,
      seoTitle: input.seoTitle ?? undefined,
      seoDescription: input.seoDescription ?? undefined,
      isPopular: input.isPopular,
    });
    try {
      await db.collection('products').doc(input.id).set(product);
      await writeAuditLog(
        db,
        identity,
        'create',
        'product',
        input.id,
        { name: input.name, slug: input.slug },
      );
    } catch (error) {
      logger.error('createProduct failed', {
        productId: input.id,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw new HttpsError(
        'internal',
        `Could not create product ${input.name}. Try again.`,
      );
    }
    return { ok: true, id: input.id };
  },
);

/**
 * Update a product (and an auditLog entry). Admin/staff only.
 */
export const updateProduct = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const input = validateProduct(request.data);
    const db = adminDb();
    const ref = db.collection('products').doc(input.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Product ${input.id} not found.`);
    const previous = snap.data() as Partial<Product>;
    try {
      await ref.set(
        omitUndefined({
          ...previous,
          name: input.name,
          slug: input.slug,
          type: input.type,
          category: input.category,
          description: input.description,
          shortDescription: input.shortDescription ?? undefined,
          ingredients: input.ingredients,
          allergens: input.allergens,
          weightOrVolume: input.weightOrVolume,
          images: input.images,
          status: input.status,
          seasonalStartDate: input.seasonalStartDate ?? undefined,
          seasonalEndDate: input.seasonalEndDate ?? undefined,
          variants: input.variants,
          seoTitle: input.seoTitle ?? undefined,
          seoDescription: input.seoDescription ?? undefined,
          isPopular: input.isPopular,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      await writeAuditLog(
        db,
        identity,
        'update',
        'product',
        input.id,
        { name: input.name, slug: input.slug },
      );
    } catch (error) {
      logger.error('updateProduct failed', {
        productId: input.id,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw new HttpsError(
        'internal',
        `Could not update product ${input.id}. Try again.`,
      );
    }
    return { ok: true, id: input.id };
  },
);

/**
 * Soft-delete a product by setting status to 'hidden' (and an auditLog entry).
 * Admin/staff only.
 */
export const softDeleteProduct = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(request.data);
    if (!parsed.success) throw fromZodError(parsed.error);
    const { id } = parsed.data;
    const db = adminDb();
    const ref = db.collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', `Product ${id} not found.`);
    const previous = snap.data() as { status?: string };
    await ref.update({
      status: 'hidden',
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeAuditLog(db, identity, 'soft-delete', 'product', id, {
      previousStatus: previous.status,
    });
    return { ok: true, id };
  },
);

/**
 * Duplicate a product with a new id/slug (and an auditLog entry).
 * Admin/staff only.
 */
export const duplicateProduct = onCall(
  { cors: ALLOWED_ORIGINS },
  async (request) => {
    const identity = requireRole(request, ['admin', 'staff']);
    const parsed = z
      .object({ id: z.string().trim().min(1), newId: z.string().trim().min(1) })
      .safeParse(request.data);
    if (!parsed.success) throw fromZodError(parsed.error);
    const { id, newId } = parsed.data;
    if (newId === id) throw new HttpsError('invalid-argument', 'newId must differ from id');
    const db = adminDb();
    const snap = await db.collection('products').doc(id).get();
    if (!snap.exists) throw new HttpsError('not-found', `Product ${id} not found.`);
    const existing = snap.data() as Product;
    const dup: Product = omitUndefined({
      ...existing,
      id: newId,
      slug: existing.slug + '-copy',
      name: existing.name + ' (Copy)',
      isPopular: undefined,
    });
    await db.collection('products').doc(newId).set(dup);
    await writeAuditLog(db, identity, 'duplicate', 'product', newId, {
      sourceId: id,
    });
    return { ok: true, id: newId };
  },
);
