export type TINResult =
  | { valid: false; reason: string }
  | { valid: true; tin: string };

// TODO(v1.x): the check-digit algorithm for SL TIN is not publicly documented
// by IRD. Existing implementations disagree on edge cases. v1 validates format
// only (9 digits). Revisit when a reliable algorithm source is found; see SPEC §4.
const TIN_RE = /^\d{9}$/;

export function parseTIN(input: string): TINResult {
  // No toUpperCase needed — TIN is digit-only.
  const normalised = input.trim().replace(/\s+/g, '');

  if (!TIN_RE.test(normalised)) {
    return { valid: false, reason: 'invalid format' };
  }

  return { valid: true, tin: normalised };
}

export function isValidTIN(input: string): boolean {
  return parseTIN(input).valid;
}
