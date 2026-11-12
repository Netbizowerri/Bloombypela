import { describe, expect, it } from 'vitest';
import { penceToPounds, poundsToPence } from './money';

describe('poundsToPence', () => {
  it('converts whole pounds', () => {
    expect(poundsToPence('7')).toBe(700);
    expect(poundsToPence('0')).toBe(0);
  });

  it('converts pounds and pence', () => {
    expect(poundsToPence('7.99')).toBe(799);
    expect(poundsToPence('3.99')).toBe(399);
    expect(poundsToPence('5.99')).toBe(599);
    expect(poundsToPence('24.99')).toBe(2499);
    expect(poundsToPence('0.05')).toBe(5);
    expect(poundsToPence('7.9')).toBe(790);
  });

  it('rounds away binary float drift', () => {
    expect(0.29 * 100).not.toBe(29); // the problem being guarded against
    expect(poundsToPence('19.99')).toBe(1999);
    expect(poundsToPence('0.29')).toBe(29);
  });

  it('trims surrounding spaces', () => {
    expect(poundsToPence('  3.99 ')).toBe(399);
  });

  it('rejects anything that is not a plain amount', () => {
    expect(poundsToPence('')).toBeNaN();
    expect(poundsToPence('.')).toBeNaN();
    expect(poundsToPence('7.')).toBeNaN();
    expect(poundsToPence('7.999')).toBeNaN();
    expect(poundsToPence('.99')).toBeNaN();
    expect(poundsToPence('-1')).toBeNaN();
    expect(poundsToPence('£7.99')).toBeNaN();
    expect(poundsToPence('abc')).toBeNaN();
  });
});

describe('penceToPounds', () => {
  it('formats pence as pounds for editing', () => {
    expect(penceToPounds(799)).toBe('7.99');
    expect(penceToPounds(700)).toBe('7.00');
    expect(penceToPounds(0)).toBe('0.00');
    expect(penceToPounds(2499)).toBe('24.99');
  });

  it('returns an empty string for unusable values', () => {
    expect(penceToPounds(Number.NaN)).toBe('');
  });

  it('round-trips through the pair', () => {
    for (const pence of [399, 599, 799, 1499, 2099, 2499, 3499]) {
      expect(poundsToPence(penceToPounds(pence))).toBe(pence);
    }
  });
});
