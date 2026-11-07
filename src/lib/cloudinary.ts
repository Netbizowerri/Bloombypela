/**
 * Client-side Cloudinary configuration for direct unsigned uploads.
 *
 * Uploads go straight from the browser to Cloudinary using an unsigned upload
 * preset, so no Cloud Function or API secret is needed. This keeps the project
 * on the Firebase Spark (free) plan: Cloudinary secret / API key never leave
 * the Cloudinary dashboard, and no server-side signing is required.
 *
 * Setup (one-time, in the Cloudinary dashboard):
 *   1. Go to Settings -> Upload -> Upload presets
 *   2. Add an unsigned preset (signing mode: Unsigned)
 *   3. Set the folder to `bloom-by-pela/products` (optional but recommended)
 *   4. Copy the preset ID and set VITE_CLOUDINARY_UPLOAD_PRESET in .env
 *
 * Only public values are exposed here — no API secret, no signing key.
 */

export const CLOUDINARY_CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'titznrnk').trim();

/** Unsigned upload preset ID from the Cloudinary dashboard. Required. */
export const CLOUDINARY_UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim();

/** Direct Cloudinary upload endpoint (unsigned preset flow). */
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/** Matches the 5 MB limit enforced by the uploader in the admin dashboard. */
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

/** Folder prefix used for product images (informational only; the preset can enforce it). */
export const PRODUCT_IMAGE_FOLDER = 'bloom-by-pela/products';

/** Allowed image MIME types for the admin uploader. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];