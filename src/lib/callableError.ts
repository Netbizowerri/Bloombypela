/**
 * Human-readable messages for Cloud Functions callable failures.
 *
 * The Firebase JS SDK reports an unreachable or undeployed callable endpoint as
 * `functions/internal` with the literal message `internal`. That is what the
 * admin dashboard used to show as "Stats failed. Internal." It tells an operator
 * nothing, so this module turns the well-known codes into actionable text.
 *
 * Kept free of Firebase imports so it can be unit tested in isolation.
 */

const BACKEND_NOT_DEPLOYED =
  'The backend is not available. Cloud Functions are not deployed for this Firebase ' +
  'project (the free Spark plan cannot run them). For local work run the emulators ' +
  '(npm run emulators) and set VITE_USE_EMULATORS="true"; for production enable the ' +
  'Blaze plan and run firebase deploy --only functions.';

const BACKEND_UNREACHABLE =
  'Cannot reach the Cloud Functions backend. If you are developing locally, start the ' +
  'emulators with npm run emulators and reload the page.';

/** Reads `code` and `message` from anything that looks like a FirebaseError. */
function normalize(err: unknown): { code: string; message: string } {
  if (typeof err === 'object' && err !== null) {
    const candidate = err as { code?: unknown; message?: unknown };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : '',
      message: typeof candidate.message === 'string' ? candidate.message.trim() : '',
    };
  }
  if (typeof err === 'string') return { code: '', message: err.trim() };
  return { code: '', message: '' };
}

/**
 * Maps a callable error to text suitable for a toast or an inline error panel.
 * Unknown errors fall back to their own message, then to `fallback`.
 */
export function describeCallableError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const { code, message } = normalize(err);

  switch (code) {
    case 'functions/unauthenticated':
      return 'Your session has expired. Sign in again and retry.';
    case 'permission-denied':
    case 'functions/permission-denied':
      return 'This account does not have permission to do that. Ask the owner to grant an admin role.';
    case 'unauthenticated':
      return 'Your session has expired. Sign in again and retry.';
    case 'unavailable':
    case 'functions/unavailable':
      return BACKEND_UNREACHABLE;
    case 'failed-precondition':
      return message || 'The database rejected that query. Reload the page and try again.';
    case 'functions/internal':
      // A bare "internal" means Google's frontend answered without a function
      // behind it: the endpoint does not exist (or cannot start).
      if (!message || /^internal$/i.test(message)) return BACKEND_NOT_DEPLOYED;
      return `Server error: ${message}`;
    case 'functions/not-found':
      return BACKEND_NOT_DEPLOYED;
    case 'functions/resource-exhausted':
      return message || 'Too many requests. Wait a moment and try again.';
    case 'functions/deadline-exceeded':
      return 'The server took too long to respond. Try again.';
    case 'functions/invalid-argument': {
      const details = (err as { details?: unknown } | null)?.details;
      const issues =
        typeof details === 'object' && details !== null && 'issues' in details
          ? (details as { issues?: unknown }).issues
          : null;
      if (Array.isArray(issues) && issues.length > 0) {
        return issues
          .map((issue) => {
            const item = issue as { path?: unknown; message?: unknown };
            const path = typeof item.path === 'string' ? item.path : '';
            const text = typeof item.message === 'string' ? item.message : '';
            return path ? `${path}: ${text}` : text;
          })
          .filter(Boolean)
          .join('; ');
      }
      return message || 'The request was rejected. Check the form values and try again.';
    }
    default:
      return message || fallback;
  }
}

/** True when the callable error means the backend itself is missing. */
export function isBackendMissing(err: unknown): boolean {
  const { code, message } = normalize(err);
  if (code === 'functions/unavailable' || code === 'functions/not-found') return true;
  return code === 'functions/internal' && (!message || /^internal$/i.test(message));
}
