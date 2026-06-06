import { describe, expect, it } from 'vitest';
import { isValidPassport, parsePassport } from './passport';

// No fake timers needed — passport validation has no date arithmetic.

describe('parsePassport', () => {
  // ── Happy path ─────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('parses a current-series N-prefix passport', () => {
      const result = parsePassport('N1234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.normalised).toBe('N1234567');
      expect(result.prefix).toBe('N');
      expect(result.number).toBe('1234567');
    });

    it('parses a passport with a non-N letter prefix (A)', () => {
      const result = parsePassport('A1234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('A');
      expect(result.number).toBe('1234567');
    });

    it('parses a passport with letter prefix Z and all-nines number', () => {
      const result = parsePassport('Z9999999');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.prefix).toBe('Z');
      expect(result.number).toBe('9999999');
    });
  });

  // ── Input normalisation ─────────────────────────────────────────────────

  describe('input normalisation', () => {
    it('accepts a lowercase prefix and uppercases it', () => {
      const result = parsePassport('n1234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.normalised).toBe('N1234567');
      expect(result.prefix).toBe('N');
    });

    it('trims leading and trailing whitespace', () => {
      const result = parsePassport('  N1234567  ');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.normalised).toBe('N1234567');
    });

    it('strips internal whitespace', () => {
      // Consistent with parseNIC — the library strips internal spaces on all validators.
      const result = parsePassport('N 1234567');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.normalised).toBe('N1234567');
    });
  });

  // ── Failure: invalid format ─────────────────────────────────────────────

  describe('failure — invalid format', () => {
    it('rejects an empty string', () => {
      const result = parsePassport('');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a number shorter than 7 digits (N + 6 digits)', () => {
      const result = parsePassport('N123456');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a number longer than 7 digits (N + 8 digits)', () => {
      const result = parsePassport('N12345678');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects input that starts with a digit', () => {
      const result = parsePassport('12345678');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects input with two leading letters', () => {
      const result = parsePassport('NX1234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a hyphenated passport number', () => {
      const result = parsePassport('N-1234567');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });
  });
});

// ── isValidPassport ─────────────────────────────────────────────────────────

describe('isValidPassport', () => {
  it('returns true for a valid passport number', () => {
    expect(isValidPassport('N1234567')).toBe(true);
  });

  it('returns false for an invalid passport number', () => {
    expect(isValidPassport('invalid')).toBe(false);
  });
});
