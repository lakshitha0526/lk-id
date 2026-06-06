export type BRNResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      type: 'private-limited' | 'public-limited';
      number: string;
      normalised: string;
    };

// This validator handles PV (private limited) and PB (public limited) companies
// only — entities registered under the Companies Act No. 7 of 2007.
// Other entity types (sole proprietorship, partnership, BOI-registered, society,
// NGO) use different BRN formats and are intentionally out of v1 scope.
// TODO(v1.x): extend to cover additional entity types once their BRN formats
// can be reliably documented; see SPEC §4 and §13.
const BRN_RE = /^(PV|PB)(\d{5,8})$/;

export function parseBRN(input: string): BRNResult {
  const normalised = input.trim().replace(/\s+/g, '').toUpperCase();

  if (!BRN_RE.test(normalised)) {
    return { valid: false, reason: 'invalid format' };
  }

  // After regex validation, normalised is guaranteed to be a 2-char prefix
  // (PV or PB) followed by 5–8 digits. slice() avoids the string | undefined
  // union that noUncheckedIndexedAccess would add to capture-group access.
  const prefix = normalised.slice(0, 2);
  const number = normalised.slice(2);

  return {
    valid: true,
    type: prefix === 'PV' ? 'private-limited' : 'public-limited',
    number,
    normalised,
  };
}

export function isValidBRN(input: string): boolean {
  return parseBRN(input).valid;
}
