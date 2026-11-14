/**
 * Staff writes to the `content` collection.
 *
 * Firestore rules require the staff/admin custom claim for every write and cap
 * the document shape, so the browser cannot publish arbitrary fields.
 */
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { requireAdminDb, stripUndefinedDeep } from '@/lib/firestoreWrite';
import { audit } from '@/lib/audit';
import { docToContent } from './repository';
import type { ContentPage, ContentWriteInput } from '@/types/content';

const COLLECTION = 'content';

export const contentAdmin = {
  async listContent(): Promise<ContentPage[]> {
    const database = requireAdminDb();
    const snap = await getDocs(collection(database, COLLECTION));
    return snap.docs
      .map(docToContent)
      .sort((a, b) => a.slug.localeCompare(b.slug));
  },

  async getContent(slug: string): Promise<ContentPage | null> {
    const database = requireAdminDb();
    const snap = await getDoc(doc(database, COLLECTION, slug));
    return snap.exists() ? docToContent(snap) : null;
  },

  async saveContent(input: ContentWriteInput): Promise<{ ok: true; slug: string }> {
    const database = requireAdminDb();
    const slug = input.slug.trim();
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) {
      throw new Error('Content slugs must be 2-60 characters of a-z, 0-9 or hyphens.');
    }
    if (!input.title.trim()) {
      throw new Error('A title is required.');
    }

    await setDoc(
      doc(database, COLLECTION, slug),
      stripUndefinedDeep({
        slug,
        title: input.title.trim(),
        description: input.description.trim(),
        bodyHtml: input.bodyHtml,
        published: input.published,
        placeholder: input.placeholder,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );

    await audit('update', 'contentPage', slug, {
      title: input.title.trim(),
      published: input.published,
    });
    return { ok: true, slug };
  },
};
