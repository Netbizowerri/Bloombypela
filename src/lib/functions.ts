import { getFunctions, connectFunctionsEmulator, httpsCallable, type Functions } from 'firebase/functions';
import { app } from './firebase';

// Keep the client in the same region as functions/src/lib/config.ts.
export const functions: Functions = getFunctions(app!, 'europe-west2');

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export function callable<TData = unknown, TResult = unknown>(name: string) {
  return httpsCallable<TData, TResult>(functions, name);
}
