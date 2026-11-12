import { describe, expect, it } from 'vitest';
import { isValidUKPostcode } from './postcode';

describe('isValidUKPostcode', () => {
  it.each(['NE1 1AA', 'NE11 1AA', 'M1 1AA', 'CR0 1NY', 'sw1a 1aa'])(
    'accepts valid UK postcode format: %s',
    (postcode) => {
      expect(isValidUKPostcode(postcode)).toBe(true);
    },
  );

  it.each(['', 'NE1', '12345', 'not-a-postcode', 'NE1 1A', 'NE1 1AAA'])(
    'rejects invalid postcode format: %s',
    (postcode) => {
      expect(isValidUKPostcode(postcode)).toBe(false);
    },
  );
});
