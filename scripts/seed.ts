import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { defaultProjectId } from './lib/project.js';
import { SEED_PRODUCTS } from '../src/data/seed/products.js';
import { SEED_BUNDLES } from '../src/data/seed/bundles.js';
import { SEED_SUBSCRIPTION_PLANS } from '../src/data/seed/subscriptionPlans.js';
import { SEED_DELIVERY_AREAS } from '../src/data/seed/deliveryAreas.js';
import { SEED_DELIVERY_SCHEDULE } from '../src/data/seed/deliverySchedule.js';
import { SEED_CLOSED_DATES } from '../src/data/seed/closedDates.js';
import { SEED_DATE_CAPACITY } from '../src/data/seed/dateCapacity.js';
import { SEED_CATEGORIES } from '../src/data/seed/categories.js';
import { SEED_PUBLIC_SETTINGS } from '../src/data/seed/publicSettings.js';
import { SEED_PROMOTIONS } from '../src/data/seed/promotions.js';

const CONFIRM_TOKEN = 'YES_SEED_BLOOM_BY_PELA';

const USAGE = `
Seed Bloom by Pela catalogue data into Firestore
=================================================

Default (emulator):
  npm run seed
  # targets the Firestore emulator at FIRESTORE_EMULATOR_HOST (default 127.0.0.1:8080)

Real project (requires explicit opt-in):
  npm run seed -- --project <project-id> --confirm ${CONFIRM_TOKEN}

All seed content is marked PLACEHOLDER and must be replaced with real data before launch.
`;

const fail = (message: string): never => {
  console.error(`\nError: ${message}`);
  console.error(USAGE);
  process.exit(1);
};

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) cleaned[key] = stripUndefined(val);
    }
    return cleaned;
  }
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let projectId: string | undefined;
  let confirm: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectId = args[i + 1];
      i += 1;
    } else if (args[i] === '--confirm' && args[i + 1]) {
      confirm = args[i + 1];
      i += 1;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(USAGE);
      return;
    } else {
      fail(`Unexpected argument: ${args[i]}`);
    }
  }

  const isReal = Boolean(projectId);

  if (isReal) {
    if (confirm !== CONFIRM_TOKEN) {
      fail(
        `Real-project seeding requires the typed confirmation: --confirm ${CONFIRM_TOKEN}`,
      );
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      fail('GOOGLE_APPLICATION_CREDENTIALS must point at a service account key file.');
    }
    initializeApp({ projectId });
  } else {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    initializeApp({
      projectId: defaultProjectId(),
    });
  }

  const app = getApps()[0] as App;
  const db = getFirestore(app) as Firestore;
  const batch = db.batch();

  const collections: Array<[string, unknown[]]> = [
    ['products', SEED_PRODUCTS],
    ['categories', SEED_CATEGORIES],
    ['bundles', SEED_BUNDLES],
    ['subscriptionPlans', SEED_SUBSCRIPTION_PLANS],
    ['deliveryAreas', SEED_DELIVERY_AREAS],
    ['deliverySchedule', SEED_DELIVERY_SCHEDULE],
    ['closedDates', SEED_CLOSED_DATES],
    ['dateCapacity', SEED_DATE_CAPACITY.map((c: { date: string }) => ({ ...c, id: c.date }))],
    ['promotions', SEED_PROMOTIONS],
  ];

  // publicSettings uses a fixed document id 'settings'
  const settingsDoc = { id: 'settings', ...SEED_PUBLIC_SETTINGS } as Record<string, unknown>;

  let count = 0;
  for (const [collectionName, docs] of collections) {
    for (const doc of docs) {
      const { id, ...data } = doc as { id: string };
      batch.set(
        db.collection(collectionName).doc(id),
        stripUndefined(data) as Record<string, unknown>,
      );
      count += 1;
    }
  }

  await batch.commit();

  // publicSettings uses a fixed document id 'settings'
  await db
    .collection('publicSettings')
    .doc('settings')
    .set(stripUndefined(settingsDoc) as Record<string, unknown>);
  count += 1;

  const target = isReal
    ? `project ${projectId}`
    : `Firestore emulator (${process.env.FIRESTORE_EMULATOR_HOST})`;
  console.log(`\nSeeded ${count} documents into ${target}.`);
  console.log('All seed content is marked PLACEHOLDER and must be replaced before launch.\n');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFailed to seed: ${message}\n`);
  process.exit(1);
});
