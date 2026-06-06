import { describe, expect, it } from 'vitest';
import { isValidBRN, parseBRN } from './brn';

// No fake timers needed — BRN validation has no date arithmetic.

describe('parseBRN', () => {
  // ── Happy path — PV (private limited) ──────────────────────────────────

  describe('happy path — PV (private limited)', () => {
    it('parses PV with 5 digits — lower boundary of digit range', () => {
      const result = parseBRN('PV12345');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.type).toBe('private-limited');
      expect(result.number).toBe('12345');
      expect(result.normalised).toBe('PV12345');
    });

    it('parses PV with 8 digits — upper boundary of digit range', () => {
      const result = parseBRN('PV12345678');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.type).toBe('private-limited');
      expect(result.number).toBe('12345678');
      expect(result.normalised).toBe('PV12345678');
    });
  });

  // ── Happy path — PB (public limited) ───────────────────────────────────

  describe('happy path — PB (public limited)', () => {
    it('parses PB with 5 digits — lower boundary of digit range', () => {
      const result = parseBRN('PB12345');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.type).toBe('public-limited');
      expect(result.number).toBe('12345');
      expect(result.normalised).toBe('PB12345');
    });

    it('parses PB with 8 digits — upper boundary of digit range', () => {
      const result = parseBRN('PB12345678');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.type).toBe('public-limited');
      expect(result.number).toBe('12345678');
      expect(result.normalised).toBe('PB12345678');
    });
  });

  // ── Normalisation equivalence ───────────────────────────────────────────

  describe('normalisation equivalence', () => {
    it('all whitespace variants produce the identical normalised string "PV12345"', () => {
      // These four inputs must all collapse to the same canonical form.
      // If any differs, the normalisation pipeline is broken for some consumer.
      const variants = [
        'PV12345', // no space — canonical form
        'PV 12345', // space between prefix and digits
        'PV 12 345', // space within digit group
        'pv12345', // lowercase prefix
      ];
      for (const input of variants) {
        const result = parseBRN(input);
        expect(result.valid).toBe(true);
        if (!result.valid) throw new Error(`expected '${input}' to be valid`);
        expect(result.normalised).toBe('PV12345');
      }
    });

    it('trims leading and trailing whitespace', () => {
      const result = parseBRN('  PB12345  ');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.normalised).toBe('PB12345');
    });
  });

  // ── Boundary: digit-count range {5,8} ──────────────────────────────────

  describe('failure — digit-count boundary', () => {
    it('rejects 4 digits — one below the minimum', () => {
      const result = parseBRN('PV1234');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects 9 digits — one above the maximum', () => {
      const result = parseBRN('PV123456789');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });
  });

  // ── Failure: invalid format ─────────────────────────────────────────────

  describe('failure — invalid format', () => {
    it('rejects an empty string', () => {
      const result = parseBRN('');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a string with an unrecognised prefix', () => {
      const result = parseBRN('GA12345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a digit-only string with no prefix', () => {
      const result = parseBRN('12345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });
  });
});

// ── isValidBRN ─────────────────────────────────────────────────────────────

describe('isValidBRN', () => {
  it('returns true for a valid BRN', () => {
    expect(isValidBRN('PV12345')).toBe(true);
  });

  it('returns false for an invalid BRN', () => {
    expect(isValidBRN('invalid')).toBe(false);
  });
});
