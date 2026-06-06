import { describe, expect, it } from 'vitest';
import { isValidTIN, parseTIN } from './tin';

// No fake timers needed — TIN validation has no date arithmetic.

describe('parseTIN', () => {
  // ── Happy path ─────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('parses a standard 9-digit TIN', () => {
      const result = parseTIN('123456789');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.tin).toBe('123456789');
    });

    it('parses a TIN with a leading zero — leading zeros are valid', () => {
      // A TIN starting with 0 is format-valid; no numeric interpretation is applied.
      const result = parseTIN('000000001');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.tin).toBe('000000001');
    });
  });

  // ── Input normalisation ─────────────────────────────────────────────────

  describe('input normalisation', () => {
    it('trims leading and trailing whitespace', () => {
      const result = parseTIN('  123456789  ');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.tin).toBe('123456789');
    });

    it('strips internal whitespace', () => {
      const result = parseTIN('123 456 789');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.tin).toBe('123456789');
    });
  });

  // ── Failure: invalid format ─────────────────────────────────────────────

  describe('failure — invalid format', () => {
    it('rejects an empty string', () => {
      const result = parseTIN('');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects 8 digits (too short)', () => {
      const result = parseTIN('12345678');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects 10 digits (too long)', () => {
      const result = parseTIN('1234567890');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a 9-character string containing a letter', () => {
      const result = parseTIN('12345678A');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a hyphenated string', () => {
      const result = parseTIN('123-456-789');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });
  });
});

// ── isValidTIN ─────────────────────────────────────────────────────────────

describe('isValidTIN', () => {
  it('returns true for a valid TIN', () => {
    expect(isValidTIN('123456789')).toBe(true);
  });

  it('returns false for an invalid TIN', () => {
    expect(isValidTIN('invalid')).toBe(false);
  });
});
