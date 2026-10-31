/**
 * Shared Cloud Functions configuration.
 * Region is fixed to europe-west2 (London) for every function.
 */
export const REGION = 'europe-west2';

/**
 * Callable CORS allow list: the live site, the Firebase Hosting preview domains
 * and the local emulator/hosting origins. Anything else is rejected.
 */
export const ALLOWED_ORIGINS: (string | RegExp)[] = [
  'https://bloombypela.com',
  'https://www.bloombypela.com',
  /^https:\/\/bloombypela-[a-z0-9-]+\.web\.app$/,
  /^https:\/\/bloombypela-[a-z0-9-]+\.firebaseapp\.com$/,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];
