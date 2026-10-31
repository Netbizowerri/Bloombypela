import { HttpsError } from 'firebase-functions/v2/https';
import type { ZodError } from 'zod';

export const unauthenticated = (message = 'You must sign in to call this function.'): HttpsError =>
  new HttpsError('unauthenticated', message);

export const permissionDenied = (message = 'You do not have permission to do this.'): HttpsError =>
  new HttpsError('permission-denied', message);

export const invalidArgument = (message = 'The request is invalid.'): HttpsError =>
  new HttpsError('invalid-argument', message);

export const notFound = (message = 'The requested record was not found.'): HttpsError =>
  new HttpsError('not-found', message);

export const internal = (message = 'Something went wrong. Please try again.'): HttpsError =>
  new HttpsError('internal', message);

/**
 * Converts a failed zod parse into a structured invalid-argument error.
 * Field paths are returned so the client can show validation messages.
 */
export const fromZodError = (error: ZodError): HttpsError =>
  new HttpsError('invalid-argument', 'The request payload is invalid.', {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
