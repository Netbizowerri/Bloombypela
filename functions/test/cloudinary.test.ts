import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { cloudinarySignature, PRODUCT_IMAGE_FOLDER } from '../src/lib/cloudinary';

const SECRET = 'test-secret';

// Cloudinary's default algorithm: SHA-1 of (string to sign + api secret).
const sha1 = (value: string): string => createHash('sha1').update(value + SECRET).digest('hex');

describe('cloudinarySignature', () => {
  it('signs the alphabetically sorted key=value pairs joined by &, appending the secret', () => {
    const timestamp = 1700000000;
    const expected = sha1(
      `folder=${PRODUCT_IMAGE_FOLDER}&public_id=abc-123&timestamp=${timestamp}`,
    );

    expect(
      cloudinarySignature(SECRET, {
        timestamp,
        public_id: 'abc-123',
        folder: PRODUCT_IMAGE_FOLDER,
      }),
    ).toBe(expected);
  });

  it('does not depend on property order', () => {
    const params = { folder: PRODUCT_IMAGE_FOLDER, public_id: 'abc-123', timestamp: 1700000000 };
    const reversed = { timestamp: 1700000000, public_id: 'abc-123', folder: PRODUCT_IMAGE_FOLDER };

    expect(cloudinarySignature(SECRET, params)).toBe(cloudinarySignature(SECRET, reversed));
  });

  it('changes when a signed value changes', () => {
    const base = { folder: PRODUCT_IMAGE_FOLDER, public_id: 'abc-123', timestamp: 1700000000 };

    expect(cloudinarySignature(SECRET, base)).not.toBe(
      cloudinarySignature(SECRET, { ...base, public_id: 'def-456' }),
    );
  });
});
