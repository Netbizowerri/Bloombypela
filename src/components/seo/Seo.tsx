import { useEffect, useMemo } from 'react';
import { DEFAULT_OG_IMAGE, pageTitle, siteUrl } from '../../lib/site';
import type { JsonLd } from '../../lib/seo';

export interface SeoProps {
  /** Page-specific title. "| Bloom by Pela" is appended when missing. */
  title: string;
  description: string;
  /** Site-root path, e.g. "/product/chin-chin". Used for the canonical URL. */
  path: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  /** Commerce and account screens stay out of the index. */
  noindex?: boolean;
  jsonLd?: JsonLd[];
}

/**
 * Single head synchroniser.
 *
 * React 19 can hoist `<title>`/`<meta>` when they are rendered, but this app is
 * prerendered to static HTML at build time. Rendering the tags again would leave
 * duplicate descriptions/canonicals in the document (one static, one from
 * React). Updating the existing elements in place keeps exactly one of each in
 * both the prerendered HTML and the hydrated SPA.
 */
export function Seo({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
}: SeoProps): null {
  const fullTitle = pageTitle(title);
  const url = siteUrl(path);
  const jsonLdText = useMemo(
    () => (jsonLd && jsonLd.length > 0 ? JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : jsonLd) : ''),
    [jsonLd],
  );

  useEffect(() => {
    document.title = fullTitle;

    const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      const selector = `meta[${attribute}="${key}"]`;
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:site_name', 'Bloom by Pela');
    upsertMeta('property', 'og:locale', 'en_GB');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
    if (jsonLdText) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.textContent = jsonLdText;
      document.head.appendChild(script);
    }
  }, [fullTitle, description, url, image, type, noindex, jsonLdText]);

  return null;
}
