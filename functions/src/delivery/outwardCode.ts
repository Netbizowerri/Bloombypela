/**
 * UK postcode outward code parsing and area lookup.
 *
 * UK postcode format: outward code (2-4 chars) + space + inward code (3 chars).
 * Examples: "NE1 1AA", "NE11 1AA", "M1 1AA", "CR0 1NY"
 * The outward code is everything before the final 3-character inward code.
 */

const UK_POSTCODE_REGEX =
  /^[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}$/;

/**
 * Parses a UK postcode and returns its outward code (uppercase, no spaces).
 * Throws if the postcode is not a valid UK postcode format.
 *
 * @param postcode - e.g. "ne1 1aa", "NE11 1AA"
 * @returns outward code, e.g. "NE1", "NE11"
 */
export function parseOutwardCode(postcode: string): string {
  const trimmed = postcode?.trim() ?? '';
  if (!UK_POSTCODE_REGEX.test(trimmed)) {
    throw new Error(`Invalid UK postcode format: "${postcode}"`);
  }
  const normalized = trimmed.toUpperCase().replace(/\s+/g, '');
  // Inward code is always the last 3 characters (digit + 2 letters)
  return normalized.slice(0, -3);
}

/**
 * Checks whether an outward code corresponds to an active delivery area.
 */
export function isAreaServed(
  outwardCode: string,
  areas: { outwardCode: string; isActive: boolean }[]
): boolean {
  const code = outwardCode.toUpperCase();
  return areas.some((a) => a.isActive && a.outwardCode.toUpperCase() === code);
}
