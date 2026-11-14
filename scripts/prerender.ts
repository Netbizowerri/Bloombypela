/**
 * Build-time prerendering of the public storefront.
 *
 * Choice of approach: we generate static HTML per route from the built
 * `dist/index.html` shell instead of switching to vite-react-ssg (which would
 * force data routers and rewrite the whole app) or snapshotting with Playwright
 * (which needs a browser plus a running emulator in CI).
 *
 * The SPA shell is kept intact: React mounts over `#root` exactly as before,
 * hosting rewrites still fall back to `/index.html` for unknown paths, and
 * crawlers (and link previews) get real titles, descriptions and product copy
 * without executing JavaScript.
 *
 * Usage: `npm run build` runs this after `vite build`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SEO_ROUTES } from '../src/data/seoRoutes.js';
import { localBusinessSchema, productSchema, websiteSchema } from '../src/lib/seo.js';
import { absoluteUrl, loadPublishedProducts, siteUrl, type BuildProduct } from './lib/buildData.js';

const DIST = resolve(process.cwd(), 'dist');
const SHELL = resolve(DIST, 'index.html');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setMeta(html: string, attribute: 'name' | 'property', key: string, content: string): string {
  const pattern = new RegExp(`<meta ${attribute}="${key}"[^>]*>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

interface HeadInput {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogType?: 'website' | 'product';
  image?: string;
  jsonLd?: unknown[];
}

function renderHead(html: string, input: HeadInput): string {
  const url = absoluteUrl(input.path);
  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(input.title)}</title>`);
  output = output.replace(
    /<meta name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(input.description)}" />`,
  );
  output = output.replace(
    /<link rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  );
  output = output.replace(
    /<meta name="robots"[^>]*>/i,
    `<meta name="robots" content="${input.noindex ? 'noindex, follow' : 'index, follow'}" />`,
  );
  output = setMeta(output, 'property', 'og:title', input.title);
  output = setMeta(output, 'property', 'og:description', input.description);
  output = setMeta(output, 'property', 'og:type', input.ogType ?? 'website');
  output = setMeta(output, 'property', 'og:url', url);
  output = setMeta(output, 'name', 'twitter:title', input.title);
  output = setMeta(output, 'name', 'twitter:description', input.description);
  if (input.image) {
    output = setMeta(output, 'property', 'og:image', input.image);
    output = setMeta(output, 'name', 'twitter:image', input.image);
  }

  if (input.jsonLd && input.jsonLd.length > 0) {
    const payload = JSON.stringify(input.jsonLd.length === 1 ? input.jsonLd[0] : input.jsonLd).replace(
      /<\//g,
      '<\\/',
    );
    output = output.replace(
      '</head>',
      `    <script type="application/ld+json" data-seo-jsonld="true">${payload}</script>\n  </head>`,
    );
  }

  return output;
}

function renderRoot(html: string, body: string): string {
  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

/** Opening markup shared by every prerendered body, as one spreadable part. */
function shellBody(): string[] {
  return [
    '<div style="max-width:48rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif;color:#1c1917;">',
  ];
}

function staticBody(title: string, description: string): string {
  return [
    ...shellBody(),
    `<h1 style="font-size:1.75rem;margin:0 0 .75rem;">${escapeHtml(title)}</h1>`,
    `<p style="line-height:1.6;margin:0 0 1rem;">${escapeHtml(description)}</p>`,
    '<p style="margin:0;">',
    '<a href="/shop">Shop snacks and juices</a> · ',
    '<a href="/delivery">Delivery information</a> · ',
    '<a href="/allergens">Allergen information</a> · ',
    '<a href="/contact">Contact us</a>',
    '</p>',
    '</div>',
  ].join('\n');
}

function productBody(product: BuildProduct): string {
  const prices = product.variants.map((variant) => variant.pricePence);
  const low = prices.length > 0 ? Math.min(...prices) : 0;
  const high = prices.length > 0 ? Math.max(...prices) : 0;
  const priceText =
    low === high
      ? `£${(low / 100).toFixed(2)}`
      : `£${(low / 100).toFixed(2)} – £${(high / 100).toFixed(2)}`;
  const image = product.images[0];

  return [
    ...shellBody(),
    '<p style="margin:0 0 .5rem;"><a href="/shop">Shop</a> / ',
    `<a href="${product.type === 'juice' ? '/shop/juices' : '/shop/snacks'}">${escapeHtml(product.category || 'Products')}</a></p>`,
    image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" width="480" height="360" style="max-width:100%;height:auto;border-radius:12px;" />`
      : '',
    `<h1 style="font-size:1.75rem;margin:1rem 0 .5rem;">${escapeHtml(product.name)}</h1>`,
    `<p style="font-weight:600;margin:0 0 1rem;">${escapeHtml(priceText)}</p>`,
    `<p style="line-height:1.6;margin:0 0 1rem;">${escapeHtml(
      product.shortDescription || product.description,
    )}</p>`,
    '<p style="margin:0 0 .5rem;"><strong>Allergens:</strong> ',
    product.allergens.length > 0
      ? `<strong>${escapeHtml(product.allergens.join(', '))}</strong>`
      : '<strong>None of the 14 major UK allergens declared</strong>',
    '</p>',
    '<p style="margin:0 0 1rem;font-size:.875rem;color:#57534e;">',
    'Our kitchen handles the 14 major UK allergens; cross-contact cannot be excluded. ',
    '<a href="/allergens">Full allergen information</a>.',
    '</p>',
    '<p style="margin:0;">',
    '<a href="/shop">Browse the full range</a> · ',
    '<a href="/delivery">Delivery areas and fees</a>',
    '</p>',
    '</div>',
  ]
    .filter(Boolean)
    .join('\n');
}

function writeRoute(routePath: string, html: string): void {
  const target =
    routePath === '/'
      ? resolve(DIST, 'index.html')
      : resolve(DIST, `${routePath.replace(/^\/+/, '')}/index.html`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, 'utf8');
  written += 1;
}

let written = 0;

async function main(): Promise<void> {
  if (!existsSync(SHELL)) {
    throw new Error('dist/index.html is missing: run `npm run build` with prerendering enabled.');
  }

  const shell = readFileSync(SHELL, 'utf8');
  const origin = siteUrl();
  const products = await loadPublishedProducts();

  for (const route of SEO_ROUTES) {
    let html = renderHead(shell, {
      title: route.title,
      description: route.description,
      path: route.path,
      noindex: route.noindex,
      jsonLd:
        route.path === '/'
          ? [localBusinessSchema(origin), websiteSchema(origin)]
          : undefined,
    });

    if (!route.noindex) {
      html = renderRoot(html, staticBody(route.title, route.description));
    }
    writeRoute(route.path, html);
  }

  for (const product of products) {
    const path = `/product/${product.slug}`;
    let html = renderHead(shell, {
      title: product.seoTitle?.trim() || `${product.name} | Bloom by Pela`,
      description:
        product.seoDescription?.trim() ||
        product.shortDescription ||
        product.description.slice(0, 155),
      path,
      ogType: 'product',
      image: product.images[0],
      jsonLd: [
        productSchema(
          {
            id: product.slug,
            name: product.name,
            slug: product.slug,
            category: product.category,
            description: product.description,
            shortDescription: product.shortDescription,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
            images: product.images.map((url) => ({ url })),
            variants: product.variants,
          },
          origin,
        ),
      ],
    });
    html = renderRoot(html, productBody(product));
    writeRoute(path, html);
  }

  // Home was written first but read before the loop; keep the report honest.
  console.log(`[prerender] ${written} HTML files written (${products.length} product pages) from ${origin}`);
}

main().catch((error: unknown) => {
  console.error('[prerender] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
