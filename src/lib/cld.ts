/**
 * Cloudinary URL helper.
 *
 * Given a Cloudinary secure_url and a width, returns the same image with
 * `f_auto,q_auto,w_<width>,c_limit` transformation applied so the storefront
 * never serves unscaled originals. Any existing transformation segment between
 * `/image/upload/` and the public id is replaced (not duplicated).
 * Non-Cloudinary URLs (e.g. Unsplash placeholder images in seed data) are returned unchanged.
 *
 * Example:
 *   cld('https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloombypela_Plantain_Chips', 600)
 *   // -> 'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_600,c_limit/Bloombypela_Plantain_Chips'
 */
export function cld(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('res.cloudinary.com')) {
      const marker = '/image/upload/';
      const index = parsed.pathname.indexOf(marker);
      if (index !== -1) {
        const prefix = parsed.pathname.slice(0, index + marker.length);
        const rest = parsed.pathname.slice(index + marker.length);
        const lastSlash = rest.lastIndexOf('/');
        const publicId =
          lastSlash === -1 ? rest : rest.slice(lastSlash + 1);
        parsed.pathname = `${prefix}f_auto,q_auto,w_${width},c_limit/${publicId}`;
      }
      return parsed.toString();
    }
  } catch {
    // Not a parseable URL: return as-is.
  }
  return url;
}
