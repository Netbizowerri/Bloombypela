/**
 * Pounds ↔ pence helpers for admin money inputs.
 *
 * Firestore stores money as integer pence (GBP). Admin forms let staff type
 * pounds and pence (`7.99`), so the typed string is parsed exactly once here
 * and rounded to the nearest penny to avoid binary float drift such as
 * `7.99 * 100 === 798.9999999999999`.
 */

/** Matches a plain money amount with at most two decimal places. */
const POUNDS_PATTERN = /^\d+(?:\.\d{1,2})?$/;

/**
 * Converts a typed pounds string to integer pence.
 *
 * Returns NaN when the text is not a plain amount with 0–2 decimals, so the
 * form's validation can report it instead of silently saving a wrong price.
 */
export function poundsToPence(input: string): number {
  const value = input.trim();
  if (!POUNDS_PATTERN.test(value)) return Number.NaN;
  return Math.round(Number(value) * 100);
}

/** Formats integer pence as a plain pounds string for editing, e.g. 799 → '7.99'. */
export function penceToPounds(pence: number): string {
  if (!Number.isFinite(pence)) return '';
  return (pence / 100).toFixed(2);
}
