import { describe, expect, it } from 'vitest';
import { isValidMobile, parseMobile } from './mobile';

// No fake timers needed — mobile validation has no date arithmetic.

describe('parseMobile', () => {
  // ── Input format normalisation ──────────────────────────────────────────

  describe('input format normalisation', () => {
    it('all 8 SPEC §8.2 input formats normalise to the same e164', () => {
      // Every format listed in the spec must produce an identical canonical result.
      // If any fails, the normalisation chain is broken for that input class.
      const formats = [
        '0771234567',
        '+94771234567',
        '94771234567',
        '771234567',
        '077-123-4567',
        '077 123 4567',
        '(077) 123 4567',
        '+94 77 123 4567',
      ];
      for (const input of formats) {
        const result = parseMobile(input);
        expect(result.valid).toBe(true);
        if (!result.valid) throw new Error(`expected '${input}' to be valid`);
        expect(result.e164).toBe('+94771234567');
      }
    });

    it('94… format (11 digits, no leading +) — full field assertion', () => {
      // Exercises the "starts with '94', length 11 → prepend +" branch.
      const result = parseMobile('94771234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.e164).toBe('+94771234567');
      expect(result.local).toBe('0771234567');
      expect(result.prefix).toBe('77');
      expect(result.operator).toBe('Dialog');
    });

    it('7… format (9 digits, no country code or leading zero) — full field assertion', () => {
      // Exercises the "length 9, starts with '7' → prepend +94" branch.
      const result = parseMobile('771234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.e164).toBe('+94771234567');
      expect(result.local).toBe('0771234567');
      expect(result.prefix).toBe('77');
      expect(result.operator).toBe('Dialog');
    });
  });

  // ── Operator lookup — one test per allocated prefix ─────────────────────

  describe('operator lookup — one test per allocated prefix', () => {
    it('prefix 70 → SLTMobitel', () => {
      const result = parseMobile('0701111111');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('70');
      expect(result.operator).toBe('SLTMobitel');
    });

    it('prefix 71 → SLTMobitel', () => {
      const result = parseMobile('0712222222');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('71');
      expect(result.operator).toBe('SLTMobitel');
    });

    it('prefix 72 → Hutch (previously Etisalat, transferred 2018)', () => {
      const result = parseMobile('0723333333');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('72');
      expect(result.operator).toBe('Hutch');
    });

    it('prefix 74 → Dialog', () => {
      const result = parseMobile('0744444444');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('74');
      expect(result.operator).toBe('Dialog');
    });

    it('prefix 75 → Dialog (marketed as "Airtel by Dialog" post-amalgamation)', () => {
      // Dialog absorbed Airtel Lanka in Sep 2024. The underlying operator is Dialog;
      // "Airtel by Dialog" is a marketing brand. See docs/mobile-operator-research.md.
      const result = parseMobile('0755555555');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('75');
      expect(result.operator).toBe('Dialog');
    });

    it('prefix 76 → Dialog', () => {
      const result = parseMobile('0766666666');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('76');
      expect(result.operator).toBe('Dialog');
    });

    it('prefix 77 → Dialog', () => {
      const result = parseMobile('0777777777');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('77');
      expect(result.operator).toBe('Dialog');
    });

    it('prefix 78 → Hutch', () => {
      const result = parseMobile('0788888888');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('78');
      expect(result.operator).toBe('Hutch');
    });
  });

  // ── Full field assertion and local form ─────────────────────────────────

  describe('full field assertion and local form conversion', () => {
    it('local form is "0" + e164.slice(3), all five fields present', () => {
      const result = parseMobile('0771234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.e164).toBe('+94771234567');
      expect(result.local).toBe('0771234567');
      expect(result.prefix).toBe('77');
      expect(result.operator).toBe('Dialog');
      // Explicitly verify the local-form derivation rule.
      expect(result.local).toBe(`0${result.e164.slice(3)}`);
    });
  });

  // ── Garbage-character behaviour ─────────────────────────────────────────

  describe('garbage-character behaviour', () => {
    it('strips all non-digits when "+" is not the leading character', () => {
      // The '+' in this input is mid-string, so hasLeadingPlus=false.
      // All non-digits are stripped → '94771234567' (11 digits starting with 94).
      // This is per SPEC §8.2 step 1's strip-all-non-digits rule.
      // Future refactoring toward stricter input validation will require an
      // explicit SPEC change and updates to this test.
      const result = parseMobile('abc+94771234567def');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.e164).toBe('+94771234567');
    });
  });

  // ── Failure: invalid format ─────────────────────────────────────────────

  describe('failure — invalid format', () => {
    it('rejects an empty string', () => {
      const result = parseMobile('');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects 0-prefix input that is too short (9 chars, needs 10)', () => {
      const result = parseMobile('077123456');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects 0-prefix input that is too long (11 chars, needs 10)', () => {
      const result = parseMobile('07712345678');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a wrong country code (+91…)', () => {
      const result = parseMobile('+91771234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects pure non-digit input', () => {
      const result = parseMobile('hello');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a bare "+" with no digits', () => {
      const result = parseMobile('+');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects multiple "+" signs with no valid number', () => {
      const result = parseMobile('++++');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects 94-prefix input with wrong length (8 digits — needs 11)', () => {
      const result = parseMobile('94771234');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects +94 too short — step 3 catches it (10 chars, needs 12)', () => {
      // Branch 1 (starts +94) matches. Step 3's regex requires exactly 12 chars.
      const result = parseMobile('+94771234');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects +94 too long — step 3 catches it (13 chars, needs 12)', () => {
      // Symmetric counterpart to the too-short test. Without this, step 3's regex
      // could be silently weakened to /^\+94\d{9,}$/ and only the short side fails.
      const result = parseMobile('+947712345678');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });
  });

  // ── Failure: invalid prefix ─────────────────────────────────────────────

  describe('failure — invalid prefix', () => {
    it('rejects landline prefix 11 (Colombo area code — SPEC §8.2 acceptance table)', () => {
      // 0111234567 → +94111234567 → prefix '11' → not in VALID_PREFIXES.
      const result = parseMobile('0111234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid prefix');
    });

    it('rejects unallocated prefix 73', () => {
      const result = parseMobile('0731234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid prefix');
    });

    it('rejects unallocated prefix 79', () => {
      const result = parseMobile('0791234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid prefix');
    });

    it('rejects non-mobile prefix 80', () => {
      const result = parseMobile('0801234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid prefix');
    });
  });
});

// ── isValidMobile ───────────────────────────────────────────────────────────

describe('isValidMobile', () => {
  it('returns true for a valid Sri Lankan mobile number', () => {
    expect(isValidMobile('0771234567')).toBe(true);
  });

  it('returns false for an invalid input', () => {
    expect(isValidMobile('invalid')).toBe(false);
  });
});
