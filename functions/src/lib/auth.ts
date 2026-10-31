import type { DecodedIdToken } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { permissionDenied, unauthenticated } from './errors';

export type UserRole = 'customer' | 'staff' | 'admin';

export interface CallerIdentity {
  uid: string;
  role: UserRole;
  email: string | null;
  token: DecodedIdToken;
}

const isUserRole = (value: unknown): value is UserRole =>
  value === 'customer' || value === 'staff' || value === 'admin';

const resolveRole = (claim: unknown): UserRole => (isUserRole(claim) ? claim : 'customer');

/**
 * Requires a signed-in caller and returns the verified identity, including the
 * role custom claim. Throws an unauthenticated HttpsError otherwise.
 */
export function requireAuth(request: CallableRequest): CallerIdentity {
  if (!request.auth) {
    throw unauthenticated();
  }

  return {
    uid: request.auth.uid,
    role: resolveRole(request.auth.token.role),
    email: request.auth.token.email ?? null,
    token: request.auth.token,
  };
}

/**
 * Requires a signed-in caller whose role custom claim is one of `allowed`.
 * Admin is not implicitly allowed unless listed; pass ['admin'] or
 * ['staff', 'admin'] explicitly so each callable documents its own policy.
 */
export function requireRole(request: CallableRequest, allowed: UserRole[]): CallerIdentity {
  const identity = requireAuth(request);
  if (!allowed.includes(identity.role)) {
    throw permissionDenied();
  }
  return identity;
}
