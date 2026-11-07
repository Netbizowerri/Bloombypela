/**
 * Cloudinary helpers shared by the image Cloud Functions.
 *
 * Uploads are signed server-side so the browser never holds the API secret.
 * The cloud name and API key are public values, but they are read from server
 * configuration so the client never hardcodes an account.
 */
import { createHash } from 'crypto';

/**
 * Every product image uploaded from the admin dashboard lives in this folder.
 * Deletion is restricted to this prefix so a callable caller can never delete
 * unrelated assets (logos, editorial images, other Cloudinary projects).
 */
export const PRODUCT_IMAGE_FOLDER = 'bloom-by-pela/products';

/** Parameters that Cloudinary requires to be covered by the signature. */
export type SignableParams = Record<string, string | number>;

/**
 * Builds the Cloudinary signature for a set of parameters.
 *
 * Cloudinary signs the alphabetically sorted `key=value` pairs joined by `&`,
 * then hashes `stringToSign + api_secret` with SHA-1 (the default algorithm).
 * This is a plain digest, not HMAC: HMAC would require sending the extra
 * `signature_algorithm=hmac-sha1` parameter, and without it Cloudinary rejects
 * the upload with "Invalid Signature".
 *
 * `file`, `api_key`, `cloud_name` and `resource_type` must never be included.
 *
 * @see https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export function cloudinarySignature(secret: string, params: SignableParams): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + secret).digest('hex');
}
