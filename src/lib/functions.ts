import { getFunctions, connectFunctionsEmulator, httpsCallable, type Functions } from 'firebase/functions';
import { app } from './firebase';

// Keep the client in the same region as functions/src/lib/config.ts.
export const functions: Functions = getFunctions(app!, 'europe-west2');

/**
 * True when the app is talking to the local Cloud Functions emulator.
 * Both flags are required: emulator wiring never runs in a production build.
 */
export const usingFunctionsEmulator =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

if (usingFunctionsEmulator) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} else if (import.meta.env.DEV) {
  // Cloud Functions need the Blaze plan, so a Spark project has no callable
  // endpoints at all. Warn once instead of letting every admin action fail with
  // a bare "internal" error.
  console.warn(
    '[bloom] VITE_USE_EMULATORS is not "true": admin callables will call the live ' +
      'Firebase project. If functions are not deployed there, run the emulator suite ' +
      '(npm run emulators) and restart the dev server.',
  );
}

export function callable<TData = unknown, TResult = unknown>(name: string) {
  return httpsCallable<TData, TResult>(functions, name);
}
