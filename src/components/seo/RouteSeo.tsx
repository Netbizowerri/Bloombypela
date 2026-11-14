import React from 'react';
import { useLocation } from 'react-router-dom';
import { Seo } from './Seo';
import { DEFAULT_OG_IMAGE, SITE_URL } from '../../lib/site';
import { localBusinessSchema, websiteSchema, type JsonLd } from '../../lib/seo';
import { SEO_ROUTES } from '../../data/seoRoutes';

/**
 * Head metadata for the static storefront routes.
 *
 * Product pages and the staff-editable content pages render their own `<Seo>`
 * (they depend on Firestore data), so they are deliberately absent from the
 * route table: a second synchroniser would overwrite their titles.
 */
export const RouteSeo: React.FC = () => {
  const { pathname } = useLocation();
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const route = SEO_ROUTES.find((candidate) => candidate.path === normalised);

  if (!route) return null;

  // The home page publishes the business and WebSite entities once. `SITE_URL`
  // is read at run time, so the same table cannot carry pre-built URLs.
  const jsonLd: JsonLd[] | undefined =
    normalised === '/'
      ? [localBusinessSchema(SITE_URL), websiteSchema(SITE_URL)]
      : undefined;

  return (
    <Seo
      title={route.title}
      description={route.description}
      path={normalised}
      noindex={route.noindex}
      image={DEFAULT_OG_IMAGE}
      jsonLd={jsonLd}
    />
  );
};
