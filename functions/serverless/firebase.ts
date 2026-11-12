import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().min(1),
});

function getVercelApp() {
  const existing = getApps().find((app) => app.name === 'vercel-api');
  if (existing) return existing;

  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp(
      { projectId: process.env.GCLOUD_PROJECT ?? 'demo-bloom' },
      'vercel-api',
    );
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  }

  let serviceAccountJson: unknown;
  try {
    serviceAccountJson = JSON.parse(rawServiceAccount) as unknown;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.');
  }
  const serviceAccount = serviceAccountSchema.parse(serviceAccountJson);

  return initializeApp(
    {
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    },
    'vercel-api',
  );
}

const app = getVercelApp();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
adminDb.settings({ ignoreUndefinedProperties: true });
