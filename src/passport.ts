export type PassportResult =
  | { valid: false; reason: string }
  | { valid: true; normalised: string; prefix: string; number: string };

// Accepts any single uppercase letter followed by 7 digits.
// Current SL passports use "N" as the prefix; older books used "M" and "L".
// TODO(v1.x): research the full set of issued prefixes via the DIG/Immigration
// website and decide whether to whitelist (reject unknown letters) or keep this
// permissive any-letter rule. Whitelisting reduces false acceptance but risks
// rejecting valid documents issued with unfamiliar prefixes.
const PASSPORT_RE = /^[A-Z]\d{7}$/;

export function parsePassport(input: string): PassportResult {
  const normalised = input.trim().replace(/\s+/g, '').toUpperCase();

  if (!PASSPORT_RE.test(normalised)) {
    return { valid: false, reason: 'invalid format' };
  }

  return {
    valid: true,
    normalised,
    // charAt() avoids the string | undefined from noUncheckedIndexedAccess.
    prefix: normalised.charAt(0),
    number: normalised.slice(1),
  };
}

export function isValidPassport(input: string): boolean {
  return parsePassport(input).valid;
}
