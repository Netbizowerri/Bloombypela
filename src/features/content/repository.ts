/**
 * Public reads of the `content` collection.
 *
 * Firestore rules expose a document only when `published == true`, so an
 * unpublished draft is invisible to the storefront even if its slug is known.
 */
import { doc, getDoc, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContentPage } from '@/types/content';

const COLLECTION = 'content';

function readMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const candidate = value as { toMillis?: unknown };
    if (typeof candidate.toMillis === 'function') {
      const millis = (candidate.toMillis as () => number)();
      return Number.isFinite(millis) ? millis : null;
    }
  }
  return null;
}

export function docToContent(snap: DocumentData): ContentPage {
  const data = snap.data() as Record<string, unknown>;
  return {
    slug: snap.id,
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    bodyHtml: typeof data.bodyHtml === 'string' ? data.bodyHtml : '',
    published: data.published === true,
    placeholder: data.placeholder !== false,
    updatedAt: readMillis(data.updatedAt),
  };
}

export async function getContentPage(slug: string): Promise<ContentPage | null> {
  if (!db) {
    throw new Error('Firestore is not initialized. Check the VITE_FIREBASE_* environment variables.');
  }
  const snap = await getDoc(doc(db, COLLECTION, slug));
  if (!snap.exists()) return null;
  const page = docToContent(snap);
  return page.published ? page : null;
}
