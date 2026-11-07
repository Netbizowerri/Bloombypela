/**
 * Human-readable messages for Firebase Authentication failures.
 *
 * In local development the app talks to the Auth emulator, which starts empty
 * and loses every account when it restarts. The default SDK message
 * ("Firebase: Error (auth/invalid-credential).") hides that, so this module
 * turns the common codes into instructions an operator can act on.
 */
import { usingEmulators } from './firebase';

export function describeAuthError(
  err: unknown,
  fallback = 'Sign-in failed. Check your email address and password.',
): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  const message = err instanceof Error ? err.message.trim() : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return usingEmulators
        ? 'No local emulator account matches that email and password. The emulator starts empty, so create an admin with: npm run dev:admin -- <email> "<password>"'
        : 'The email address or password is incorrect.';

    case 'auth/network-request-failed':
      return usingEmulators
        ? 'Cannot reach the Firebase Auth emulator. Start it with npm run emulators, then reload the page.'
        : 'Cannot reach Firebase. Check your internet connection and try again.';

    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase is not configured correctly. Check the VITE_FIREBASE_* environment variables.';

    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Wait a few minutes and try again.';

    case 'auth/user-disabled':
      return 'This account has been disabled.';

    case 'auth/invalid-email':
      return 'That email address is not valid.';

    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this Firebase project.';

    default:
      return message || fallback;
  }
}
