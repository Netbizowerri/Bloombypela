/**
 * Cloudinary URL helper.
 *
 * Given a Cloudinary secure_url and a width, returns the same image with
 * `f_auto,q_auto,w_<width>,c_limit` transformation applied so the storefront
 * never serves unscaled originals. Any existing transformation segment between
 * `/image/upload/` and the public id is replaced (not duplicated), while the
 * public id path (including folders such as `bloom-by-pela/products`) is kept.
 * Non-Cloudinary URLs (e.g. Unsplash placeholder images in seed data) are returned unchanged.
 *
 * Example:
 *   cld('https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloombypela_Plantain_Chips', 600)
 *   // -> 'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_600,c_limit/Bloombypela_Plantain_Chips'
 *
 *   cld('https://res.cloudinary.com/titznrnk/image/upload/v1793696881/bloom-by-pela/products/abc.jpg', 600)
 *   // -> 'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_600,c_limit/bloom-by-pela/products/abc.jpg'
 */

/**
 * A transformation segment is a comma separated list of `key_value` parts,
 * for example `f_auto,q_auto` or `w_600,c_limit`. Folder names with hyphens
 * and public ids with underscored words (`Bloombypela_Skin_Glow`) do not
 * match because the first `_` sits after more than five characters.
 */
function looksLikeTransformation(segment: string): boolean {
  if (!segment.includes('_') || segment.includes('-')) return false;
  return segment
    .split(',')
    .every((part) => /^[a-z]{1,5}_[^,/]+$/i.test(part));
}

/**
 * Removes the delivery transformation and, when present, the version segment
 * from the part of the path after `/image/upload/`, keeping the full public id
 * path (folders included).
 */
function publicIdPath(rest: string): string {
  const segments = rest.split('/').filter(Boolean);

  // Uploaded assets always carry a version, which is the safest anchor:
  // transformations may contain several segments, the version does not.
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  if (versionIndex !== -1) {
    return segments.slice(versionIndex + 1).join('/');
  }

  // Seed assets have no version but do start with a transformation segment.
  if (segments.length > 1 && looksLikeTransformation(segments[0])) {
    return segments.slice(1).join('/');
  }

  return segments.join('/');
}

export function cld(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('res.cloudinary.com')) {
      const marker = '/image/upload/';
      const index = parsed.pathname.indexOf(marker);
      if (index !== -1) {
        const prefix = parsed.pathname.slice(0, index + marker.length);
        const rest = parsed.pathname.slice(index + marker.length);
        const path = publicIdPath(rest);
        if (path) {
          parsed.pathname = `${prefix}f_auto,q_auto,w_${width},c_limit/${path}`;
        }
      }
      return parsed.toString();
    }
  } catch {
    // Not a parseable URL: return as-is.
  }
  return url;
}

/**
 * Extracts the public id (folder path included) from a Cloudinary image URL,
 * for example `bloom-by-pela/products/abc-123` or `Bloombypela_Plantain_Chips`.
 * Returns null for non-Cloudinary URLs and for URLs from which the public id
 * cannot be determined.
 */
export function cloudinaryPublicId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('res.cloudinary.com')) return null;
    const marker = '/image/upload/';
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = publicIdPath(parsed.pathname.slice(index + marker.length));
    return path || null;
  } catch {
    return null;
  }
}
