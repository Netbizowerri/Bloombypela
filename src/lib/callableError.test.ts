import { describe, expect, it } from 'vitest';
import { describeCallableError, isBackendMissing } from './callableError';

describe('describeCallableError', () => {
  it('explains a bare internal error as a missing backend', () => {
    const message = describeCallableError({ code: 'functions/internal', message: 'internal' });
    expect(message).toContain('not deployed');
    expect(message).toContain('npm run emulators');
    expect(message).not.toMatch(/^internal$/i);
  });

  it('explains an unreachable backend', () => {
    expect(
      describeCallableError({ code: 'functions/unavailable', message: 'unavailable' }),
    ).toContain('Cannot reach the Cloud Functions backend');
  });

  it('keeps a real server error message', () => {
    expect(
      describeCallableError({
        code: 'functions/internal',
        message: 'Could not update product X. Try again.',
      }),
    ).toBe('Server error: Could not update product X. Try again.');
  });

  it('maps auth and permission codes', () => {
    expect(describeCallableError({ code: 'functions/unauthenticated' })).toContain(
      'session has expired',
    );
    expect(describeCallableError({ code: 'functions/permission-denied' })).toContain(
      'permission',
    );
  });

  it('surfaces field-level zod issues from invalid-argument errors', () => {
    expect(
      describeCallableError({
        code: 'functions/invalid-argument',
        message: 'The request payload is invalid.',
        details: {
          issues: [
            { path: 'variants.0.pricePence', message: 'Expected number, received string' },
            { path: 'name', message: 'Too small' },
          ],
        },
      }),
    ).toBe('variants.0.pricePence: Expected number, received string; name: Too small');
  });

  it('falls back for unknown errors', () => {
    expect(describeCallableError(new Error('boom'))).toBe('boom');
    expect(describeCallableError(undefined, 'fallback')).toBe('fallback');
  });
});

describe('isBackendMissing', () => {
  it('detects missing endpoints', () => {
    expect(isBackendMissing({ code: 'functions/internal', message: 'internal' })).toBe(true);
    expect(isBackendMissing({ code: 'functions/unavailable' })).toBe(true);
    expect(isBackendMissing({ code: 'functions/internal', message: 'Firestore failed' })).toBe(
      false,
    );
  });
});
