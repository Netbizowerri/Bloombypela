import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolves the Firebase project id used by local scripts.
 *
 * The emulator namespaces Firestore and Auth data by project id, so a seed or
 * role script must use exactly the same id as the browser app. `.firebaserc`
 * is the single source of truth; `GCLOUD_PROJECT` wins when the Firebase CLI
 * sets it (for example under `firebase emulators:exec`).
 */
export function defaultProjectId(): string {
  const fromEnv = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (fromEnv) return fromEnv;

  try {
    const rc = JSON.parse(readFileSync(resolve(process.cwd(), '.firebaserc'), 'utf8')) as {
      projects?: Record<string, unknown>;
    };
    const id = rc.projects?.default;
    if (typeof id === 'string' && id.trim()) return id.trim();
  } catch {
    // Fall through to the error below: guessing a project id here would send
    // local data to the wrong namespace, which is exactly the bug this avoids.
  }

  throw new Error(
    'Could not determine the Firebase project id. Set GCLOUD_PROJECT or provide .firebaserc.',
  );
}
