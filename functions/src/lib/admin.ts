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

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
