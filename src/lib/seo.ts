/** JSON-LD document published in the page head. */
export interface JsonLd {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

/**
 * Joins a site-root path with the public origin, without doubling slashes.
 * Shared by the React pages and the build-time prerender/sitemap scripts, so
 * canonical URLs are identical in the client and in the static HTML.
 */
export function absoluteUrl(path: string, baseUrl: string): string {
  const origin = baseUrl.replace(/\/+$/, '');
  if (!path || path === '/') return `${origin}/`;
  return `${origin}/${path.replace(/^\/+/, '')}`;
}

function availability(stock: number): string {
  return stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

function priceString(pence: number): string {
  return (pence / 100).toFixed(2);
}

/** LocalBusiness schema for the home page. */
export function localBusinessSchema(baseUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl.replace(/\/+$/, '')}/#business`,
    name: 'Bloom by Pela',
    description:
      'Premium packaged snacks and fresh cold-pressed juices, handcrafted in Newcastle upon Tyne.',
    url: absoluteUrl('/', baseUrl),
    image: 'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloombypela',
    telephone: '+44 191 000 0000',
    priceRange: '££',
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Credit Card, Debit Card, Apple Pay, Google Pay',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Newcastle upon Tyne',
      addressCountry: 'GB',
    },
    areaServed: {
      '@type': 'City',
      name: 'Newcastle upon Tyne',
    },
  };
}

/** WebSite schema for the home page, enabling sitelinks search boxes. */
export function websiteSchema(baseUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl.replace(/\/+$/, '')}/#website`,
    name: 'Bloom by Pela',
    url: absoluteUrl('/', baseUrl),
    inLanguage: 'en-GB',
    publisher: { '@id': `${baseUrl.replace(/\/+$/, '')}/#business` },
  };
}

/**
 * The product fields JSON-LD needs.
 *
 * Declared structurally (rather than importing `Product`) so the build-time
 * prerenderer can reuse this function with the plain objects it reads from
 * Firestore. A full `Product` satisfies it.
 */
export interface SeoProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images: Array<{ url: string }>;
  variants: Array<{ pricePence: number; stock: number; sku: string }>;
}

/**
 * Product schema with GBP offers and stock availability.
 * Uses an AggregateOffer when a product has more than one purchasable size.
 */
export function productSchema(product: SeoProduct, baseUrl: string): JsonLd {
  const variants = product.variants.filter((variant) => variant.pricePence > 0);
  const prices = variants.map((variant) => variant.pricePence);
  const lowest = prices.length > 0 ? Math.min(...prices) : 0;
  const highest = prices.length > 0 ? Math.max(...prices) : 0;
  const inStock = variants.some((variant) => variant.stock > 0);
  const url = absoluteUrl(`/product/${product.slug}`, baseUrl);

  const offers =
    variants.length > 1
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'GBP',
          lowPrice: priceString(lowest),
          highPrice: priceString(highest),
          offerCount: variants.length,
          availability: availability(inStock ? 1 : 0),
          url,
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          price: priceString(lowest),
          availability: availability(inStock ? 1 : 0),
          url,
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.seoTitle?.trim() || product.name,
    description:
      product.seoDescription?.trim() || product.shortDescription || product.description,
    sku: variants[0]?.sku || product.id,
    image: product.images.map((image) => image.url).filter(Boolean),
    brand: { '@type': 'Brand', name: 'Bloom by Pela' },
    category: product.category,
    offers,
  };
}
