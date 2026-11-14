/**
 * Generates public/sitemap.xml from the shared route table plus every product
 * that is publicly visible in Firestore at build time.
 *
 * Run with `npm run sitemap` (also part of `npm run build`). Without Firebase
 * credentials the report/sitemap still covers the static routes; see
 * scripts/lib/buildData.ts for the credential options.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEO_ROUTES } from '../src/data/seoRoutes.js';
import { absoluteUrl, loadPublishedProducts, siteUrl } from './lib/buildData.js';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

async function main(): Promise<void> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const products = await loadPublishedProducts();

  const entries = [
    ...SEO_ROUTES.filter((route) => !route.noindex).map((route) =>
      urlEntry(
        absoluteUrl(route.path),
        today,
        route.changefreq ?? 'monthly',
        route.priority ?? '0.5',
      ),
    ),
    ...products.map((product) =>
      urlEntry(absoluteUrl(`/product/${product.slug}`), today, 'weekly', '0.8'),
    ),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');

  const target = resolve(process.cwd(), 'public', 'sitemap.xml');
  mkdirSync(resolve(process.cwd(), 'public'), { recursive: true });
  writeFileSync(target, xml, 'utf8');

  console.log(
    `[sitemap] ${entries.length} URLs written to public/sitemap.xml (${products.length} product pages, origin ${siteUrl()})`,
  );
}

main().catch((error: unknown) => {
  console.error('[sitemap] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
