import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Initialises the Admin SDK exactly once per function instance.
 * On the emulator the SDK picks up FIRESTORE_EMULATOR_HOST and
 * FIREBASE_AUTH_EMULATOR_HOST from the environment automatically.
 */
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }
  return initializeApp();
}

let undefinedPropertiesConfigured = false;

/**
 * Firestore refuses to write `undefined` (unlike JSON), and every optional
 * callable field would otherwise have to be stripped by hand. Callable inputs
 * model "not provided" as undefined, so undefined properties are ignored on
 * write instead. Settings can only be applied before the client is first used,
 * which is why this is guarded.
 */
export function adminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  if (!undefinedPropertiesConfigured) {
    db.settings({ ignoreUndefinedProperties: true });
    undefinedPropertiesConfigured = true;
  }
  return db;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
