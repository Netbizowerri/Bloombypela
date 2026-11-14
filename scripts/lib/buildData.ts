/**
 * Build-time data loading for the sitemap and the prerenderer.
 *
 * Runs inside `npm run build` (locally, in GitHub Actions, or before a Firebase
 * deploy). It uses the Admin SDK so it can read draft-free catalogue data that
 * the public browser SDK cannot list.
 *
 * Credential options, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON (CI secret: a JSON key file as one string)
 *   2. GOOGLE_APPLICATION_CREDENTIALS (a local service-account key file)
 *   3. FIRESTORE_EMULATOR_HOST (local development against the emulator)
 *
 * With none of these the build still succeeds: the sitemap keeps the static
 * routes, and prerendering uses the generic shell. A warning is printed so a
 * silently empty product sitemap is obvious in the build log.
 */
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defaultProjectId } from './project.js';
import { isPubliclyVisible } from '../../src/lib/seasons.js';

export interface BuildVariant {
  name: string;
  pricePence: number;
  sku: string;
  stock: number;
}

export interface BuildProduct {
  slug: string;
  name: string;
  description: string;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: string;
  type: 'snack' | 'juice';
  allergens: string[];
  images: string[];
  variants: BuildVariant[];
}

const FALLBACK_SITE_URL = 'https://bloombypela.com';

/** Public origin used for canonical URLs, the sitemap and JSON-LD. */
export function siteUrl(): string {
  const configured = process.env.VITE_APP_URL?.trim();
  return (configured || FALLBACK_SITE_URL).replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  const origin = siteUrl();
  if (!path || path === '/') return `${origin}/`;
  return `${origin}/${path.replace(/^\/+/, '')}`;
}

function initBuildApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) {
    const parsed = JSON.parse(rawServiceAccount) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing project_id, client_email or private_key.');
    }
    return initializeApp({
      projectId: parsed.project_id,
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        // Newlines are escaped when the key is stored as a single-line secret.
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      }),
    });
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: defaultProjectId() });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ projectId: defaultProjectId(), credential: applicationDefault() });
  }

  return null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'url' in entry) {
        return readString((entry as { url?: unknown }).url);
      }
      return '';
    })
    .filter(Boolean);
}

function readVariants(value: unknown): BuildVariant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const variant = entry as Record<string, unknown>;
    const pricePence = typeof variant.pricePence === 'number' ? variant.pricePence : 0;
    if (!Number.isFinite(pricePence) || pricePence <= 0) return [];
    return [
      {
        name: readString(variant.name),
        pricePence,
        sku: readString(variant.sku),
        stock: typeof variant.stock === 'number' ? variant.stock : 0,
      },
    ];
  });
}

/**
 * Every product that should be publicly visible right now (active, plus
 * seasonal products inside their Europe/London window).
 */
export async function loadPublishedProducts(): Promise<BuildProduct[]> {
  try {
    const app = initBuildApp();
    if (!app) {
      console.warn(
        '[build] No Firebase credentials found: sitemap and prerender will skip product pages.\n' +
          '        Set FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS or FIRESTORE_EMULATOR_HOST.',
      );
      return [];
    }

    const db = getFirestore(app);
    const snap = await db
      .collection('products')
      .where('status', 'in', ['active', 'seasonal'])
      .get();

    const products: BuildProduct[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const status = readString(data.status);
      if (
        !isPubliclyVisible({
          status: status === 'seasonal' || status === 'hidden' ? status : 'active',
          seasonalStartDate: readString(data.seasonalStartDate) || undefined,
          seasonalEndDate: readString(data.seasonalEndDate) || undefined,
        })
      ) {
        return;
      }

      const slug = readString(data.slug);
      if (!slug) return;

      products.push({
        slug,
        name: readString(data.name),
        description: readString(data.description),
        shortDescription: readString(data.shortDescription) || null,
        seoTitle: readString(data.seoTitle) || null,
        seoDescription: readString(data.seoDescription) || null,
        category: readString(data.category),
        type: data.type === 'juice' ? 'juice' : 'snack',
        allergens: readStringArray(data.allergens),
        images: readImages(data.images),
        variants: readVariants(data.variants),
      });
    });

    return products.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn(
      `[build] Could not read products for the sitemap/prerender: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}
