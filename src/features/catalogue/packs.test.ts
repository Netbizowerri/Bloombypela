import { describe, expect, it } from 'vitest';
import {
  JUICE_PACK_FORMATS,
  JUICE_PACK_FORMAT_LIST,
  detectJuicePackFormat,
} from './packs';

const names = (...values: string[]) => values.map((name) => ({ name }));

describe('detectJuicePackFormat', () => {
  it('recognises a six-pack', () => {
    expect(detectJuicePackFormat(names('Pack of 6 × 330ml Bottles'))).toBe('can-six');
    expect(detectJuicePackFormat(names('Pack of 6 × 330ml'))).toBe('can-six');
    expect(detectJuicePackFormat(names('6-pack'))).toBe('can-six');
  });

  it('recognises bottle packs in any order', () => {
    expect(
      detectJuicePackFormat(names('14 × 60ml Bottles', '30 × 60ml Bottles')),
    ).toBe('bottle-14-30');
    expect(
      detectJuicePackFormat(names('30 × 60ml Bottles', '14 × 60ml Bottles')),
    ).toBe('bottle-14-30');
  });

  it('rejects single-drink variants', () => {
    expect(detectJuicePackFormat(names('330ml Glass Bottle'))).toBeNull();
    expect(detectJuicePackFormat(names('Single 60ml Shot'))).toBeNull();
    expect(
      detectJuicePackFormat(names('330ml Glass Bottle', '750ml Sharing Carafe')),
    ).toBeNull();
  });

  it('rejects a mix of shapes', () => {
    expect(
      detectJuicePackFormat(names('Pack of 6 × 330ml', '750ml Sharing Carafe')),
    ).toBeNull();
  });

  it('rejects empty input', () => {
    expect(detectJuicePackFormat([])).toBeNull();
    expect(detectJuicePackFormat(names('', '   '))).toBeNull();
  });

  it('does not confuse 60ml with a six-pack', () => {
    expect(detectJuicePackFormat(names('14 × 60ml Bottles'))).toBe('bottle-14-30');
  });
});

describe('JUICE_PACK_FORMATS', () => {
  it('sells 330ml drinks only as a pack of six', () => {
    const preset = JUICE_PACK_FORMATS['can-six'];
    expect(preset.variants).toHaveLength(1);
    expect(preset.weightOrVolume).toBe('6 × 330ml');
  });

  it('sells 60ml shots only as 14 and 30 bottle packs', () => {
    const preset = JUICE_PACK_FORMATS['bottle-14-30'];
    expect(preset.variants.map((variant) => variant.name)).toEqual([
      '14 × 60ml Bottles',
      '30 × 60ml Bottles',
    ]);
    expect(preset.weightOrVolume).toBe('60ml per bottle');
  });

  it('round-trips through detection', () => {
    for (const preset of JUICE_PACK_FORMAT_LIST) {
      expect(detectJuicePackFormat(preset.variants)).toBe(preset.id);
    }
  });
});
