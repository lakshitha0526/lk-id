import operatorData from './data/mobile-operators.json' with { type: 'json' };

// Cast to Record<string, string> so prefix lookups return string | undefined
// under noUncheckedIndexedAccess. The JSON literal type has no index signature.
const operators = operatorData as Record<string, string>;

export type MobileResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      e164: string;
      local: string;
      prefix: string;
      operator: string;
    };

// Derived directly from the JSON keys so VALID_PREFIXES and operators can
// never diverge. 073 and 079 are absent from the JSON — not allocated to any
// mobile operator by TRCSL as of June 2026. See docs/mobile-operator-research.md.
const VALID_PREFIXES = new Set(Object.keys(operators));

export function parseMobile(input: string): MobileResult {
  // Step 1: strip all characters except digits and a leading '+'.
  // A leading '+' is detected before stripping so it can be reattached.
  const trimmed = input.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  const stripped = hasLeadingPlus ? `+${digits}` : digits;

  // Step 2: normalise to E.164 form (+94XXXXXXXXX).
  // Rules are evaluated in order; the first match wins.
  let e164: string;
  if (stripped.startsWith('+94')) {
    // Already in international form — keep as-is, validate length in step 3.
    e164 = stripped;
  } else if (stripped.startsWith('94') && stripped.length === 11) {
    // International digits without the '+' prefix.
    e164 = `+${stripped}`;
  } else if (stripped.startsWith('0') && stripped.length === 10) {
    // Local form with leading zero (e.g. 0771234567).
    e164 = `+94${stripped.slice(1)}`;
  } else if (stripped.length === 9 && stripped.startsWith('7')) {
    // Nine-digit form with no country code or leading zero (e.g. 771234567).
    e164 = `+94${stripped}`;
  } else {
    return { valid: false, reason: 'invalid format' };
  }

  // Step 3: validate final form — must be exactly '+94' followed by 9 digits.
  // This catches length errors from the '+94…' branch (e.g. +94 with too few
  // or too many digits) that the branching rules above don't check explicitly.
  if (!/^\+94\d{9}$/.test(e164)) {
    return { valid: false, reason: 'invalid format' };
  }

  // Step 4: extract and validate the two-digit mobile prefix (chars 3–4 of e164).
  // 073 and 079 are absent from VALID_PREFIXES — unallocated by TRCSL.
  const prefix = e164.slice(3, 5);
  if (!VALID_PREFIXES.has(prefix)) {
    return { valid: false, reason: 'invalid prefix' };
  }

  // Step 5: look up operator.
  // After the VALID_PREFIXES check, operators[prefix] is guaranteed to exist
  // because VALID_PREFIXES is derived from Object.keys(operators).
  // TODO(v2): when MNP launches, rename 'operator' → 'originalOperator' and
  // add 'mnpStatus' field. Until then, prefix-to-operator is authoritative.
  // See docs/mobile-operator-research.md for MNP timeline and sources.
  const operator = operators[prefix] as string;

  // Step 6: construct the local form (replace '+94' with leading '0').
  const local = `0${e164.slice(3)}`;

  return { valid: true, e164, local, prefix, operator };
}

export function isValidMobile(input: string): boolean {
  return parseMobile(input).valid;
}
