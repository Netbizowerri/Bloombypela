/**
 * Drinks are never sold singly.
 *
 * The owner's rule:
 * - 330ml drinks are sold as a pack of six.
 * - 60ml shots (Ginger Shot, Golden Boost) are sold as 14-bottle and
 *   30-bottle packs.
 *
 * These presets drive the admin product form, and `detectJuicePackFormat`
 * recognises the same shapes on products that already exist so an edit does
 * not silently rewrite them.
 */

export type JuicePackFormat = 'can-six' | 'bottle-14-30';

export interface JuicePackPreset {
  id: JuicePackFormat;
  /** Short label for the admin format chooser. */
  label: string;
  /** One-line explanation shown under the label. */
  summary: string;
  /** Stored in `weightOrVolume` when the format is applied. */
  weightOrVolume: string;
  /** Variant names, in display order. Prices are entered by staff; SKU is optional. */
  variants: { name: string }[];
}

export const JUICE_PACK_FORMATS: Record<JuicePackFormat, JuicePackPreset> = {
  'can-six': {
    id: 'can-six',
    label: 'Pack of 6 (330ml)',
    summary: 'Six 330ml drinks per pack',
    weightOrVolume: '6 × 330ml',
    variants: [{ name: 'Pack of 6 × 330ml' }],
  },
  'bottle-14-30': {
    id: 'bottle-14-30',
    label: '14 & 30 bottles (60ml)',
    summary: '60ml shots sold as 14-bottle and 30-bottle packs',
    weightOrVolume: '60ml per bottle',
    variants: [{ name: '14 × 60ml Bottles' }, { name: '30 × 60ml Bottles' }],
  },
};

export const JUICE_PACK_FORMAT_LIST: JuicePackPreset[] = [
  JUICE_PACK_FORMATS['can-six'],
  JUICE_PACK_FORMATS['bottle-14-30'],
];

/** Six-packs mention 6 on their own, e.g. "Pack of 6 × 330ml Bottles". */
const SIX_PACK_PATTERN = /\b6\b/;
/** Bottle packs mention 14 or 30 on their own, e.g. "14 × 60ml Bottles". */
const BOTTLE_PACK_PATTERN = /\b(?:14|30)\b/;

/**
 * Works out which pack shape an existing product uses.
 *
 * Returns null when the variants are neither shape — typically an older
 * single-drink product (`330ml Glass Bottle`) — so the admin form can ask the
 * owner to convert it instead of rewriting prices behind their back.
 */
export function detectJuicePackFormat(
  variants: { name: string }[],
): JuicePackFormat | null {
  const names = variants
    .map((variant) => variant.name.trim().toLowerCase())
    .filter((name) => name.length > 0);

  if (names.length === 0) return null;
  if (names.every((name) => BOTTLE_PACK_PATTERN.test(name))) return 'bottle-14-30';
  if (names.every((name) => SIX_PACK_PATTERN.test(name))) return 'can-six';
  return null;
}
