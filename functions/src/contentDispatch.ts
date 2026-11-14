/**
 * Rebuild trigger for the prerendered storefront.
 *
 * The public pages are prerendered at build time, so a product or policy edit in
 * the admin portal must produce a new build. This Firestore trigger calls
 * GitHub's `repository_dispatch` API, which starts
 * `.github/workflows/rebuild-hosting.yml`.
 *
 * Requirements:
 *   - secret GITHUB_DISPATCH_TOKEN: a fine-grained PAT with "Contents: read" and
 *     "Actions: write" (or a classic PAT with `repo`) for this repository;
 *   - env GITHUB_REPOSITORY (the workflow sets it automatically) or
 *     GITHUB_REPO, e.g. "bloom-by-pela/bloombypela".
 *
 * Rapid edits produce one dispatch per change; the workflow's concurrency group
 * collapses queued runs so only the latest build deploys.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/logger';
import { REGION } from './lib/config';

const GITHUB_DISPATCH_TOKEN = defineSecret('GITHUB_DISPATCH_TOKEN');

function repository(): string {
  const fromEnv = process.env.GITHUB_REPO ?? process.env.GITHUB_REPOSITORY;
  if (fromEnv && fromEnv.includes('/')) return fromEnv;
  throw new Error('GITHUB_REPO must be set to "owner/repository" for rebuild dispatches.');
}

async function dispatch(reason: string, payload: Record<string, unknown>): Promise<void> {
  const token = GITHUB_DISPATCH_TOKEN.value();
  if (!token) {
    logger.warn('GITHUB_DISPATCH_TOKEN missing: skipping rebuild dispatch', { reason });
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${repository()}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'bloom-by-pela-cloud-function',
    },
    body: JSON.stringify({ event_type: 'content-update', client_payload: { reason, ...payload } }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GitHub dispatch failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  logger.info('rebuild dispatched', { reason, payload });
}

export const onProductChanged = onDocumentWritten(
  {
    document: 'products/{productId}',
    region: REGION,
    secrets: [GITHUB_DISPATCH_TOKEN],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before && !after) return;

    // Only a change that could alter a prerendered page matters: content,
    // slug, price, stock availability or publication status. The admin portal
    // writes these on every save, so this is intentionally broad but cheap.
    const relevantKeys = [
      'name',
      'slug',
      'description',
      'shortDescription',
      'seoTitle',
      'seoDescription',
      'status',
      'images',
      'variants',
      'allergens',
      'category',
      'seasonalStartDate',
      'seasonalEndDate',
    ] as const;

    const changed = relevantKeys.some(
      (key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null),
    );
    if (!changed) return;

    try {
      await dispatch('product', { productId: event.params.productId });
    } catch (error) {
      logger.error('product rebuild dispatch failed', {
        productId: event.params.productId,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
  },
);

export const onContentChanged = onDocumentWritten(
  {
    document: 'content/{slug}',
    region: REGION,
    secrets: [GITHUB_DISPATCH_TOKEN],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return; // Deleted copy needs no prerendered page.
    if (before && before.bodyHtml === after.bodyHtml && before.title === after.title) return;

    try {
      await dispatch('content', { slug: event.params.slug });
    } catch (error) {
      logger.error('content rebuild dispatch failed', {
        slug: event.params.slug,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
  },
);
