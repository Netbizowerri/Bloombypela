import { existsSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { defaultProjectId } from './lib/project.js';

/**
 * Grants the `role` custom claim used by Firestore rules and Cloud Functions.
 *
 * Credentials come from a service account key file referenced by
 * GOOGLE_APPLICATION_CREDENTIALS. The key file must never be committed.
 * When FIREBASE_AUTH_EMULATOR_HOST is set the script targets the Auth emulator
 * instead and needs no credentials.
 */

const ASSIGNABLE_ROLES = ['admin', 'staff'] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const USAGE = `
Grant an admin or staff role
============================

Usage:
  npm run set-role -- <email> <role>

  <email>  Email address of an existing Firebase Auth user.
  <role>   "admin" or "staff".

Examples:
  npm run set-role -- owner@bloombypela.com admin
  npm run set-role -- packer@bloombypela.com staff

Credentials:
  Set GOOGLE_APPLICATION_CREDENTIALS to the path of a Firebase service account
  JSON key (Project settings > Service accounts > Generate new private key).
  Never commit the key file.

Emulator:
  Start the emulators, then run with FIREBASE_AUTH_EMULATOR_HOST set, e.g.
  $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"   (PowerShell)
  export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" (bash)

The affected user must sign out and sign in again (or the app must refresh the
ID token) before the new role claim appears in rules and callables.
`;

const fail = (message: string): never => {
  console.error(`\nError: ${message}`);
  console.error(USAGE);
  process.exit(1);
};

const isAssignableRole = (value: string): value is AssignableRole =>
  ASSIGNABLE_ROLES.some((role) => role === value);

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    return;
  }

  const [email, role, ...extra] = args;
  if (extra.length > 0) {
    fail(`Unexpected arguments: ${extra.join(' ')}`);
  }
  if (!email || !isEmail(email)) {
    fail('A valid email address is required as the first argument.');
  }
  if (!role || !isAssignableRole(role)) {
    fail(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}.`);
  }

  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!emulatorHost && !keyPath) {
    fail(
      'GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a service account JSON key file.'
    );
  }
  if (!emulatorHost && keyPath && !existsSync(keyPath)) {
    fail(`Service account key file not found at: ${keyPath}`);
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp(
          emulatorHost
            ? { projectId: defaultProjectId() }
            : { credential: applicationDefault(), projectId: defaultProjectId() }
        );

  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  const existingClaims = user.customClaims ?? {};

  await auth.setCustomUserClaims(user.uid, { ...existingClaims, role });

  const target = emulatorHost ? `Auth emulator (${emulatorHost})` : `project ${app.options.projectId}`;
  console.log(`\nRole "${role}" granted to ${email} (uid: ${user.uid}) on ${target}.`);
  console.log('The user must sign out and sign in again for the claim to take effect.\n');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFailed to set role: ${message}\n`);
  process.exit(1);
});
