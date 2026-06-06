import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidNIC, parseNIC } from './nic';

// All tests pin the clock to this fixed UTC instant so that age assertions
// remain stable across calendar years. Update every age assertion in this file
// if you change this constant.
const FIXED_NOW = new Date('2026-06-15T00:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseNIC', () => {
  // ── Old format — happy path ─────────────────────────────────────────────

  describe('old format — happy path', () => {
    it('parses a male voter NIC (acceptance table row 1)', () => {
      const result = parseNIC('851234567V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('old');
      expect(result.gender).toBe('male');
      expect(result.dateOfBirth.toISOString()).toBe('1985-05-03T00:00:00.000Z');
      expect(result.age).toBe(41);
      expect(result.isVoter).toBe(true);
      expect(result.serial).toBe('456');
    });

    it('parses a female voter NIC (acceptance table row 2)', () => {
      const result = parseNIC('855010567V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('old');
      expect(result.gender).toBe('female');
      expect(result.dateOfBirth.toISOString()).toBe('1985-01-01T00:00:00.000Z');
      expect(result.age).toBe(41);
      expect(result.isVoter).toBe(true);
      expect(result.serial).toBe('056');
    });

    it('parses a non-voter NIC with X suffix', () => {
      const result = parseNIC('851234567X');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.isVoter).toBe(false);
    });

    it('parses year 1900, documenting the 1900/2000 ambiguity (acceptance table row 4)', () => {
      // Year digits "00" always parse as 1900. A person born in 2000 with an
      // old NIC has identical digits. The ambiguity is unresolvable from the NIC.
      const result = parseNIC('000012345V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('old');
      expect(result.gender).toBe('male');
      expect(result.dateOfBirth.toISOString()).toBe('1900-01-01T00:00:00.000Z');
      expect(result.age).toBe(126);
      expect(result.isVoter).toBe(true);
      expect(result.serial).toBe('234');
    });

    it('parses day 365 in a non-leap year (last valid day of 1985)', () => {
      // Verifies the non-leap year upper boundary for male day codes.
      const result = parseNIC('853654567V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.gender).toBe('male');
      expect(result.dateOfBirth.toISOString()).toBe('1985-12-31T00:00:00.000Z');
    });
  });

  // ── New format — happy path ─────────────────────────────────────────────

  describe('new format — happy path', () => {
    it('parses a male new-format NIC (acceptance table row 5)', () => {
      const result = parseNIC('198512345678');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('new');
      expect(result.gender).toBe('male');
      expect(result.dateOfBirth.toISOString()).toBe('1985-05-03T00:00:00.000Z');
      expect(result.age).toBe(41);
      expect(result.isVoter).toBeNull();
      expect(result.serial).toBe('4567');
    });

    it('parses a female new-format NIC (acceptance table row 7)', () => {
      const result = parseNIC('198550112345');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('new');
      expect(result.gender).toBe('female');
      expect(result.dateOfBirth.toISOString()).toBe('1985-01-01T00:00:00.000Z');
      expect(result.age).toBe(41);
      expect(result.isVoter).toBeNull();
      expect(result.serial).toBe('1234');
    });

    it('parses day 366 in leap year 1988 (acceptance table row 9)', () => {
      // Dec 31 1988. Birthday falls in December, so June 15 2026 is before it → age 37.
      const result = parseNIC('198836612345');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('new');
      expect(result.gender).toBe('male');
      expect(result.dateOfBirth.toISOString()).toBe('1988-12-31T00:00:00.000Z');
      expect(result.age).toBe(37);
      expect(result.isVoter).toBeNull();
      expect(result.serial).toBe('1234');
    });

    it('parses female day code 866 (upper boundary) in leap year 1992', () => {
      // Day code 866 → dayOfYear 366 → Dec 31 1992 (leap year).
      const result = parseNIC('199286634561');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.gender).toBe('female');
      expect(result.dateOfBirth.toISOString()).toBe('1992-12-31T00:00:00.000Z');
      expect(result.age).toBe(33);
    });

    it('parses a year 2000 NIC with no year ambiguity (4-digit year)', () => {
      // 2000 is a leap year, so day 123 = May 2, not May 3.
      const result = parseNIC('200012334561');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('new');
      expect(result.dateOfBirth.toISOString()).toBe('2000-05-02T00:00:00.000Z');
      expect(result.age).toBe(26);
    });
  });

  // ── Input normalisation ─────────────────────────────────────────────────

  describe('input normalisation', () => {
    it('trims leading and trailing whitespace (acceptance table row 10)', () => {
      const result = parseNIC('   851234567v   ');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('old');
      expect(result.gender).toBe('male');
      expect(result.dateOfBirth.toISOString()).toBe('1985-05-03T00:00:00.000Z');
      expect(result.isVoter).toBe(true);
    });

    it('accepts a lowercase voter suffix without whitespace', () => {
      const result = parseNIC('851234567v');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.isVoter).toBe(true);
    });

    it('strips internal whitespace between digit groups', () => {
      const result = parseNIC('851234 567V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.dateOfBirth.toISOString()).toBe('1985-05-03T00:00:00.000Z');
    });
  });

  // ── Failure: invalid format ─────────────────────────────────────────────

  describe('failure — invalid format', () => {
    it('rejects an empty string (acceptance table row 12)', () => {
      const result = parseNIC('');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects non-numeric alphabetic input (acceptance table row 13)', () => {
      const result = parseNIC('abcdefghij');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects an 11-character string (acceptance table row 3)', () => {
      const result = parseNIC('8550156751V');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects hyphenated separators (acceptance table row 11)', () => {
      const result = parseNIC('85-123-4567-V');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects an 8-digit string (too short for old format)', () => {
      const result = parseNIC('12345678');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });

    it('rejects a 13-digit string (too long for new format)', () => {
      const result = parseNIC('1234567890123');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('invalid format');
    });
  });

  // ── Failure: year out of range (new format only) ────────────────────────

  describe('failure — year out of range', () => {
    it('rejects a future year (2099 > 2026)', () => {
      const result = parseNIC('209912334561');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('year out of range');
    });

    it('rejects year 1899 (below the 1900 minimum)', () => {
      const result = parseNIC('189912334561');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('year out of range');
    });

    it('accepts year 1900 — lower bound is inclusive', () => {
      const result = parseNIC('190001212345');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('new');
      expect(result.dateOfBirth.toISOString()).toBe('1900-01-12T00:00:00.000Z');
    });

    it('accepts the current year 2026 — upper bound is inclusive', () => {
      // currentYear is derived from FIXED_NOW (2026-06-15), so year 2026 must pass.
      // Age is 0: born Jan 12 2026, birthday has already passed by the pinned date.
      const result = parseNIC('202601212345');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.format).toBe('new');
      expect(result.dateOfBirth.toISOString()).toBe('2026-01-12T00:00:00.000Z');
      expect(result.age).toBe(0);
    });
  });

  // ── Failure: day code out of range ─────────────────────────────────────

  describe('failure — day code out of range', () => {
    it('rejects day code 0 (below the male minimum of 1)', () => {
      const result = parseNIC('198500012345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('day code out of range');
    });

    it('rejects day code 400 — in the 367–500 dead zone (acceptance table row 6)', () => {
      const result = parseNIC('198540012345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('day code out of range');
    });

    it('rejects day code 867 (above the female maximum of 866)', () => {
      const result = parseNIC('198586712345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('day code out of range');
    });
  });

  // ── Failure: date does not exist ────────────────────────────────────────

  describe('failure — date does not exist', () => {
    it('rejects day 366 in non-leap year 1985 (acceptance table row 8)', () => {
      const result = parseNIC('198536612345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('date does not exist');
    });

    it('rejects day 366 in non-leap year 1990', () => {
      const result = parseNIC('199036612345');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid');
      expect(result.reason).toBe('date does not exist');
    });
  });

  // ── Age boundary tests ──────────────────────────────────────────────────

  describe('age calculation', () => {
    it('age is 36 when birthday falls exactly on the pinned date', () => {
      // Born 15 Jun 1990 (day 166). Pinned to 15 Jun 2026 → birthday is today.
      const result = parseNIC('901664567V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.dateOfBirth.toISOString()).toBe('1990-06-15T00:00:00.000Z');
      expect(result.age).toBe(36);
    });

    it('age is 35 when birthday is one day after the pinned date', () => {
      // Born 16 Jun 1990 (day 167). Pinned to 15 Jun 2026 → birthday not yet this year.
      const result = parseNIC('901674567V');
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error('expected valid');
      expect(result.dateOfBirth.toISOString()).toBe('1990-06-16T00:00:00.000Z');
      expect(result.age).toBe(35);
    });
  });
});

// ── isValidNIC ─────────────────────────────────────────────────────────────

describe('isValidNIC', () => {
  it('returns true for a valid NIC', () => {
    expect(isValidNIC('851234567V')).toBe(true);
  });

  it('returns false for an invalid NIC', () => {
    expect(isValidNIC('invalid')).toBe(false);
  });
});
