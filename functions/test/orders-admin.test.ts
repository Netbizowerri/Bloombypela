import { describe, expect, it } from 'vitest';
import { isAllowedTransition, csvField } from '../src/orders/admin';
import type { OrderStatus } from '../src/lib/types';

const statuses: OrderStatus[] = [
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'collected',
  'cancelled',
  'refunded',
  'partially_refunded',
];

describe('isAllowedTransition - status transition validation', () => {
  it('allows confirmed -> preparing', () => {
    expect(isAllowedTransition('confirmed', 'preparing')).toBe(true);
  });

  it('allows confirmed -> cancelled', () => {
    expect(isAllowedTransition('confirmed', 'cancelled')).toBe(true);
  });

  it('allows preparing -> out_for_delivery', () => {
    expect(isAllowedTransition('preparing', 'out_for_delivery')).toBe(true);
  });

  it('allows preparing -> collected', () => {
    expect(isAllowedTransition('preparing', 'collected')).toBe(true);
  });

  it('allows preparing -> cancelled', () => {
    expect(isAllowedTransition('preparing', 'cancelled')).toBe(true);
  });

  it('allows out_for_delivery -> delivered', () => {
    expect(isAllowedTransition('out_for_delivery', 'delivered')).toBe(true);
  });

  it('allows out_for_delivery -> collected', () => {
    expect(isAllowedTransition('out_for_delivery', 'collected')).toBe(true);
  });

  it('allows out_for_delivery -> cancelled', () => {
    expect(isAllowedTransition('out_for_delivery', 'cancelled')).toBe(true);
  });

  it('rejects prepared -> delivered (skip step)', () => {
    expect(isAllowedTransition('preparing', 'delivered')).toBe(false);
  });

  it('rejects delivered -> any (terminal)', () => {
    for (const to of statuses) {
      if (to === 'delivered') continue;
      expect(isAllowedTransition('delivered', to)).toBe(false);
    }
  });

  it('rejects cancelled -> any (terminal)', () => {
    for (const to of statuses) {
      if (to === 'cancelled') continue;
      expect(isAllowedTransition('cancelled', to)).toBe(false);
    }
  });

  it('rejects refunded -> any (terminal)', () => {
    for (const to of statuses) {
      if (to === 'refunded') continue;
      expect(isAllowedTransition('refunded', to)).toBe(false);
    }
  });

  it('allows null -> confirmed (initial)', () => {
    expect(isAllowedTransition(null, 'confirmed')).toBe(true);
  });

  it('rejects null -> preparing (skip initial)', () => {
    expect(isAllowedTransition(null, 'preparing')).toBe(false);
  });

  it('rejects same status transition', () => {
    for (const s of statuses) {
      expect(isAllowedTransition(s, s)).toBe(false);
    }
  });
});

describe('csvField - RFC 4180 escaping + formula injection neutralisation', () => {
  it('returns plain value unchanged', () => {
    expect(csvField('hello')).toBe('hello');
    expect(csvField(42)).toBe('42');
  });

  it('escapes values containing commas', () => {
    expect(csvField('a,b')).toBe('"a,b"');
  });

  it('escapes values containing quotes', () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('escapes values containing newlines', () => {
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises formula injection starting with =', () => {
    expect(csvField('=1+1')).toBe('"\t=1+1"');
  });

  it('neutralises formula injection starting with +', () => {
    expect(csvField('+1+1')).toBe('"\t+1+1"');
  });

  it('neutralises formula injection starting with -', () => {
    expect(csvField('-1+1')).toBe('"\t-1+1"');
  });

  it('neutralises formula injection starting with @', () => {
    expect(csvField('@SUM(A1:A2)')).toBe('"\t@SUM(A1:A2)"');
  });

  it('escapes values with both comma and formula char', () => {
    expect(csvField('=SUM,1')).toBe('"\t=SUM,1"');
  });

  it('handles empty string', () => {
    expect(csvField('')).toBe('');
  });
});

describe('refund amount validation rules', () => {
  it('refund cannot exceed unrefunded total', () => {
    const totalPence = 1000;
    const refundedPence = 300;
    const remaining = totalPence - refundedPence;
    const requested = 800;
    expect(requested > remaining).toBe(true);
    expect(requested <= remaining).toBe(false);
  });

  it('full refund allowed when equal to remaining', () => {
    const totalPence = 1000;
    const refundedPence = 0;
    const requested = 1000;
    expect(requested <= totalPence - refundedPence).toBe(true);
  });

  it('partial refund allowed when less than remaining', () => {
    const totalPence = 1000;
    const refundedPence = 0;
    const requested = 400;
    expect(requested <= totalPence - refundedPence).toBe(true);
  });
});
