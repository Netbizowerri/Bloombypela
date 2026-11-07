import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { defaultProjectId } from './lib/project.js';

/**
 * Creates (or resets) an admin user in the LOCAL Firebase Auth emulator and
 * grants the `role: "admin"` custom claim used by Firestore rules and callables.
 *
 * This script only ever targets the emulator: it sets FIREBASE_AUTH_EMULATOR_HOST
 * itself and refuses to run against a real project. It never touches production
 * users and needs no service account key.
 *
 * Usage (with `npm run emulators` running in another terminal):
 *   npm run dev:admin -- <email> <password>
 *   npm run dev:admin -- <email> <password> staff   # optional role, default admin
 */

const EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';const ROLES = ['admin', 'staff'] as const;
type DevRole = (typeof ROLES)[number];

const USAGE = `
Local admin bootstrap (Auth emulator only)
==========================================

Usage:
  npm run dev:admin -- <email> <password> [admin|staff]

Example:
  npm run dev:admin -- admin@bloombypela.local "LocalOnly-1234"

Notes:
  - Requires the Auth emulator: run "npm run emulators" first.
  - Creates the user if missing, resets the password and sets the role claim.
  - These credentials exist only inside the emulator; never use them in production.
`;

const fail = (message: string): never => {
  console.error(`\nError: ${message}`);
  console.error(USAGE);
  process.exit(1);
};

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    return;
  }

  const [email, password, roleArg, ...extra] = args;
  if (extra.length > 0) fail(`Unexpected arguments: ${extra.join(' ')}`);
  if (!email || !isEmail(email)) fail('A valid email address is required.');
  if (!password || password.length < 6) fail('A password of at least 6 characters is required.');

  const role = (roleArg ?? 'admin') as DevRole;
  if (!ROLES.includes(role)) fail(`Role must be one of: ${ROLES.join(', ')}.`);

  // Force the emulator, whatever the caller's environment says.
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOST;
  const projectId = defaultProjectId();

  const app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId });
  const auth = getAuth(app);

  let uid: string;
  let created = false;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw error;
    const user = await auth.createUser({ email, password, emailVerified: true });
    uid = user.uid;
    created = true;
  }

  const current = (await auth.getUser(uid)).customClaims ?? {};
  await auth.setCustomUserClaims(uid, { ...current, role });

  console.log(`\n${created ? 'Created' : 'Updated'} ${email} (uid: ${uid})`);
  console.log(`  role:     ${role}`);
  console.log(`  project:  ${projectId} (Auth emulator at ${EMULATOR_HOST})`);
  console.log('\nSign in at http://localhost:3000/login, then reload the page.');
  console.log('These credentials exist only in the emulator.\n');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFailed to bootstrap the local admin: ${message}`);
  console.error(
    'Is the Auth emulator running? Start it with "npm run emulators" and retry.\n',
  );
  process.exit(1);
});
