/**
 * Helpers shared by the admin portal's direct-to-Firestore writes.
 *
 * The project runs on the Firebase Spark plan, which cannot execute Cloud
 * Functions. Admin actions therefore write straight to Firestore from the
 * browser, authenticated by a Firebase ID token that carries the `role`
 * custom claim. `firestore.rules` is the enforcement point: every collection
 * written this way is restricted to `staff`/`admin` and validated there.
 */
import type { Firestore } from 'firebase/firestore';
import { db } from './firebase';

/** Returns the Firestore instance or throws a message an admin can act on. */
export function requireAdminDb(): Firestore {
  if (!db) {
    throw new Error(
      'Firestore is not initialized. Check the VITE_FIREBASE_* environment variables.',
    );
  }
  return db;
}

/**
 * True for object literals only. Firestore `Timestamp` and `FieldValue`
 * instances are class instances, so they survive the recursive copy intact.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Firestore rejects `undefined` anywhere in a document, including inside
 * arrays. Forms produce `undefined` for untouched optional fields, so drop
 * those entries instead of failing the whole write.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) out[key] = stripUndefinedDeep(item);
    }
    return out as T;
  }
  return value;
}
