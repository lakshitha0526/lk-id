export type NICResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      format: 'old' | 'new';
      dateOfBirth: Date;
      gender: 'male' | 'female';
      age: number;
      isVoter: boolean | null;
      serial: string;
    };

const OLD_NIC_RE = /^\d{9}[VX]$/;
const NEW_NIC_RE = /^\d{12}$/;

function dayOfYearToDate(year: number, dayOfYear: number): Date | null {
  const date = new Date(Date.UTC(year, 0, dayOfYear));
  // If dayOfYear overflows the year (e.g. day 366 in a non-leap year), Date rolls
  // into the next year. Detecting the mismatch is the rejection mechanism.
  if (date.getUTCFullYear() !== year) {
    return null;
  }
  return date;
}

// TODO(v1.x): a new-format NIC whose year equals the current year can produce
// a future calendar date if the day code places the birthday later in the year
// (e.g. "born 31 Dec 2026" parsed on 15 Jun 2026). computeAge would return -1.
// Realistically impossible (no such NIC would exist yet), but logically reachable.
// Consider adding a guard: if (age < 0) return { valid: false, reason: 'date in future' }.
function computeAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hadBirthday =
    now.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      now.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hadBirthday) {
    age -= 1;
  }
  return age;
}

export function parseNIC(input: string): NICResult {
  const normalised = input.trim().replace(/\s+/g, '').toUpperCase();

  const isOld = OLD_NIC_RE.test(normalised);
  const isNew = !isOld && NEW_NIC_RE.test(normalised);

  if (!isOld && !isNew) {
    return { valid: false, reason: 'invalid format' };
  }

  const format: 'old' | 'new' = isOld ? 'old' : 'new';

  let year: number;
  let rawDayCode: number;
  let serial: string;
  let isVoter: boolean | null;

  if (format === 'old') {
    const twoDigitYear = parseInt(normalised.slice(0, 2), 10);
    // Old NIC year is always interpreted as 19YY. A person born in 2000 (year
    // code "00") is indistinguishable from one born in 1900. This ambiguity
    // cannot be resolved from the NIC alone and is documented in the README.
    year = 1900 + twoDigitYear;
    rawDayCode = parseInt(normalised.slice(2, 5), 10);
    serial = normalised.slice(5, 8);
    // charAt() returns "" for out-of-bounds; safe here because OLD_NIC_RE
    // guarantees length 10 and the final character is already uppercased.
    isVoter = normalised.charAt(9) === 'V';
  } else {
    year = parseInt(normalised.slice(0, 4), 10);
    const currentYear = new Date().getUTCFullYear();
    if (year < 1900 || year > currentYear) {
      return { valid: false, reason: 'year out of range' };
    }
    rawDayCode = parseInt(normalised.slice(4, 7), 10);
    serial = normalised.slice(7, 11);
    isVoter = null;
  }

  let gender: 'male' | 'female';
  let dayOfYear: number;

  if (rawDayCode >= 1 && rawDayCode <= 366) {
    gender = 'male';
    dayOfYear = rawDayCode;
  } else if (rawDayCode >= 501 && rawDayCode <= 866) {
    gender = 'female';
    dayOfYear = rawDayCode - 500;
  } else {
    return { valid: false, reason: 'day code out of range' };
  }

  // Some historical NICs encoded day-of-year assuming every year had 366 days.
  // v1 uses strict actual-calendar-year interpretation: day 366 in a non-leap
  // year is rejected, even though a real NIC issued that year may encode it.
  // This is a documented limitation; see README.
  const dateOfBirth = dayOfYearToDate(year, dayOfYear);
  if (dateOfBirth === null) {
    return { valid: false, reason: 'date does not exist' };
  }

  return {
    valid: true,
    format,
    dateOfBirth,
    gender,
    age: computeAge(dateOfBirth),
    isVoter,
    serial,
  };
}

export function isValidNIC(input: string): boolean {
  return parseNIC(input).valid;
}
