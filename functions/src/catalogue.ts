import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './lib/admin';
import { requireRole } from './lib/auth';
import { ALLOWED_ORIGINS } from './lib/config';
import { fromZodError } from './lib/errors';
import type { Product } from './lib/types';

const CLOUDINARY_API_SECRET = defineSecret('CLOUDINARY_API_SECRET');
// Public Cloudinary key (not a secret); the secret is CLOUDINARY_API_SECRET above.
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? 'titznrnk';

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
  sku: z.string().trim().min(1),
  stock: z.number().int().nonnegative(),
  isDefault: z.boolean().optional(),
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
  ),
  status: z.enum(['active', 'hidden', 'seasonal']),
  seasonalStartDate: z.string().optional().nullable(),
  seasonalEndDate: z.string().optional().nullable(),
  variants: z.array(VariantSchema).min(1),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  isPopular: z.boolean().optional(),
  origin: z.enum(['Nigeria', 'UK Prepared', 'West Africa']).optional().nullable(),
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
 * Returns a Cloudinary signed upload payload for the admin image uploader.
 * Admin/staff only. The client uploads the file directly to Cloudinary with
 * the returned signature, then stores secure_url + public_id.
 */
export const getUploadSignature = onCall(
  { secrets: [CLOUDINARY_API_SECRET], cors: ALLOWED_ORIGINS },
  async (request) => {
    requireRole(request, ['admin', 'staff']);
    const secret = CLOUDINARY_API_SECRET.value();
    if (!secret) {
      throw new HttpsError('internal', 'CLOUDINARY_API_SECRET is not configured.');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha1', secret).update(`timestamp=${timestamp}`).digest('hex');

    return {
      timestamp,
      signature,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
    };
  },
);

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
      origin: input.origin ?? undefined,
    });
    await db.collection('products').doc(input.id).set(product);
    await writeAuditLog(
      db,
      identity,
      'create',
      'product',
      input.id,
      { name: input.name, slug: input.slug },
    );
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
        origin: input.origin ?? undefined,
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
