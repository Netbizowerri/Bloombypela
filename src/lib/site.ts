/**
 * Public site identity used by metadata, canonical URLs and JSON-LD.
 *
 * `VITE_APP_URL` is the single configured origin (see .env.example). The
 * fallback exists only so a local build still renders absolute URLs; production
 * builds must set the variable to the live domain.
 */
const configured = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();

export const SITE_URL = (configured || 'https://bloombypela.com').replace(/\/+$/, '');

export const SITE_NAME = 'Bloom by Pela';

export const DEFAULT_TITLE = 'Bloom by Pela | Life in Every Bite & Life in Every Sip';

export const DEFAULT_DESCRIPTION =
  'Premium packaged snacks and fresh cold-pressed juices crafted in Newcastle upon Tyne, UK. Local delivery and collection.';

export const DEFAULT_OG_IMAGE =
  'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloombypela';

export const CONTACT_EMAIL = 'hello@bloombypela.com';

export function siteUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}

/** Formats a page title as "Page | Bloom by Pela" unless it already is. */
export function pageTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}
