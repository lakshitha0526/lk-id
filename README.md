# lk-id

Sri Lankan identity validators for TypeScript.

[![npm version](https://img.shields.io/npm/v/lk-id)](https://www.npmjs.com/package/lk-id)
[![License: MIT](https://img.shields.io/npm/l/lk-id)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/lakshitha0526/lk-id/ci.yml?branch=main)](https://github.com/lakshitha0526/lk-id/actions)

## Why this exists

Sri Lankan SaaS products keep rewriting the same validation logic — NIC parsing, mobile number normalisation, passport/TIN/BRN format checks. Existing npm packages cover only part of this ground, are often stale on the 12-digit NIC format, or ship no TypeScript types. `lk-id` is a single, well-tested, TypeScript-first library covering the common SL identity formats with zero runtime dependencies.

## Install

```bash
npm install lk-id
```

Requires Node 18 or later. Types are bundled — no separate `@types` package needed.

## Quickstart

Every validator returns a discriminated union. Check `result.valid` before accessing other fields.

```ts
import { parseNIC } from 'lk-id';

const result = parseNIC('900012345V');

if (!result.valid) {
  // TypeScript narrows: result is { valid: false; reason: string }
  console.error(result.reason); // e.g. 'invalid format'
  return;
}

// TypeScript narrows: all success fields are accessible
console.log(result.format);      // 'old'
console.log(result.gender);      // 'male'
console.log(result.dateOfBirth); // 1990-01-01T00:00:00.000Z (UTC midnight)
console.log(result.age);         // 36  (computed at call time)
console.log(result.isVoter);     // true
console.log(result.serial);      // '234'
```

---

## Validators

### NIC

Parses Sri Lankan National Identity Cards in both the old (9-digit + V/X) and new (12-digit) formats.

**What it validates:** structure and date validity. It does not validate the check digit (algorithm not publicly documented).

#### Old format (pre-2016)

```
[YY][DDD][SSS][C][V/X]   — 10 characters total
```

| Segment | Length | Meaning |
|---|---|---|
| YY | 2 | Birth year, last two digits. Always interpreted as 19YY. |
| DDD | 3 | Day-of-year code: 1–366 = male, 501–866 = female. |
| SSS | 3 | Serial number. |
| C | 1 | Check digit (not validated). |
| V/X | 1 | Voter registration status. |

#### New format (2016 onwards)

```
[YYYY][DDD][SSSS][C]   — 12 digits, no trailing letter
```

| Segment | Length | Meaning |
|---|---|---|
| YYYY | 4 | Full birth year. |
| DDD | 3 | Day-of-year code: same male/female rule as old format. |
| SSSS | 4 | Serial number. |
| C | 1 | Check digit (not validated). |

#### Usage

```ts
import { parseNIC, isValidNIC } from 'lk-id';

// Old format — discriminated union narrowing
const old = parseNIC('900012345V');
// => {
//      valid: true,
//      format: 'old',
//      dateOfBirth: 1990-01-01T00:00:00.000Z,
//      gender: 'male',
//      age: 36,         // computed at call time
//      isVoter: true,
//      serial: '234'
//    }

// New format — no voter marker
const fresh = parseNIC('198512345678');
// => {
//      valid: true,
//      format: 'new',
//      dateOfBirth: 1985-05-03T00:00:00.000Z,
//      gender: 'male',
//      age: 41,
//      isVoter: null,   // new format has no V/X suffix
//      serial: '4567'
//    }

// Female NIC — day code 501–866
const female = parseNIC('855010567V');
// => {
//      valid: true,
//      format: 'old',
//      dateOfBirth: 1985-01-01T00:00:00.000Z,
//      gender: 'female',
//      age: 41,
//      isVoter: true,
//      serial: '056'
//    }

// Failure
parseNIC('invalid')
// => { valid: false, reason: 'invalid format' }

// Convenience wrapper
isValidNIC('900012345V') // true
isValidNIC('not-a-nic')  // false
```

#### Normalisation

Input is trimmed, internal whitespace stripped, and the final character uppercased before matching. `'  900012345v  '` is treated identically to `'900012345V'`.

#### Limitations

See [Known limitations](#known-limitations) for the 1900/2000 year ambiguity, historic 366-day encoding, and the future-dated NIC edge case.

---

### Mobile number

Validates Sri Lankan mobile numbers and normalises them to E.164 form.

**What it validates:** format and prefix allocation. It does not verify that a number has been issued.

#### Accepted input formats

All of the following normalise to `+94771234567`:

| Input | Form |
|---|---|
| `0771234567` | Local with leading zero |
| `+94771234567` | E.164 |
| `94771234567` | International without `+` |
| `771234567` | 9-digit local |
| `077-123-4567` | Hyphenated |
| `077 123 4567` | Space-separated |
| `(077) 123 4567` | Parenthesised prefix |
| `+94 77 123 4567` | Spaced E.164 |

Non-digit characters (spaces, hyphens, parentheses) are stripped before processing. A leading `+` is preserved.

#### Supported prefixes

| Prefix | Operator |
|---|---|
| 070, 071 | SLTMobitel |
| 072, 078 | Hutch |
| 074, 075, 076, 077 | Dialog |

Prefixes 073 and 079 are not allocated by TRCSL and are rejected.

#### Usage

```ts
import { parseMobile, isValidMobile } from 'lk-id';

parseMobile('0771234567')
// => {
//      valid: true,
//      e164: '+94771234567',
//      local: '0771234567',
//      prefix: '77',
//      operator: 'Dialog'
//    }

parseMobile('+94 77 123 4567')
// => { valid: true, e164: '+94771234567', local: '0771234567', ... }

parseMobile('+94712222222')
// => {
//      valid: true,
//      e164: '+94712222222',
//      local: '0712222222',
//      prefix: '71',
//      operator: 'SLTMobitel'
//    }

parseMobile('0731234567')
// => { valid: false, reason: 'invalid prefix' }  // 073 unallocated

parseMobile('0111234567')
// => { valid: false, reason: 'invalid prefix' }  // 011 is a Colombo landline prefix

isValidMobile('0771234567') // true
isValidMobile('0731234567') // false
```

#### Two reason strings

| Reason | When |
|---|---|
| `'invalid format'` | String cannot be normalised to `+94` + 9 digits |
| `'invalid prefix'` | Number is well-formed but the 2-digit prefix is not an allocated mobile prefix |

#### Mobile Number Portability note

Sri Lanka has not yet implemented Mobile Number Portability as of June 2026 (implementation has been delayed repeatedly; the latest stated target is August 2026). The `operator` field is therefore currently **authoritative** — the prefix reliably identifies the operator. When MNP launches this changes: `operator` will represent the *original allocation*, not the current operator.

**When MNP launches:** `lk-id` will release a new major version. The `operator` field will be renamed `originalOperator` and a `mnpStatus` field will be added. This is a breaking API change by design — a field rename forces consumers to handle the new semantics rather than silently trusting stale data.

See [`docs/mobile-operator-research.md`](./docs/mobile-operator-research.md) for the full MNP timeline, operator history, and data sources.

---

### Passport

Validates the format of a Sri Lankan passport number.

**What it validates:** structure only — one letter followed by 7 digits. It does not verify that the number was actually issued.

```ts
import { parsePassport, isValidPassport } from 'lk-id';

parsePassport('N7654321')
// => {
//      valid: true,
//      normalised: 'N7654321',
//      prefix: 'N',
//      number: '7654321'
//    }

parsePassport('  n1234567  ')  // trimmed and uppercased
// => { valid: true, normalised: 'N1234567', prefix: 'N', number: '1234567' }

parsePassport('12345678')
// => { valid: false, reason: 'invalid format' }

isValidPassport('N7654321') // true
```

#### Normalisation

Input is trimmed, internal whitespace stripped, and uppercased. `'  n7654321  '` is treated identically to `'N7654321'`.

#### Accepted prefixes

The validator accepts any single uppercase letter. Current SL passports use `N`. Older passports used `M` and `L`. Whitelisting to confirmed issued prefixes is a v1.x research item.

---

### TIN

Validates the format of a Sri Lankan Taxpayer Identification Number issued by the Inland Revenue Department.

**What it validates:** structure only — 9 digits. Check-digit validation is intentionally excluded: the algorithm is not publicly documented by IRD, and implementing an unverified algorithm risks false negatives.

```ts
import { parseTIN, isValidTIN } from 'lk-id';

parseTIN('987654321')
// => { valid: true, tin: '987654321' }

parseTIN('000000001')  // leading zeros are valid
// => { valid: true, tin: '000000001' }

parseTIN('123 456 789')  // internal whitespace stripped
// => { valid: true, tin: '123456789' }

parseTIN('12345678')
// => { valid: false, reason: 'invalid format' }  // 8 digits

isValidTIN('987654321') // true
```

---

### BRN

Validates Business Registration Numbers for private limited (PV) and public limited (PB) companies registered under the Companies Act No. 7 of 2007.

**What it validates:** the PV/PB prefix and a 5–8 digit registration number. Other entity types are out of scope for v1.

```ts
import { parseBRN, isValidBRN } from 'lk-id';

parseBRN('PV 00012345')
// => {
//      valid: true,
//      type: 'private-limited',
//      number: '00012345',
//      normalised: 'PV00012345'
//    }

parseBRN('PB12345')
// => {
//      valid: true,
//      type: 'public-limited',
//      number: '12345',
//      normalised: 'PB12345'
//    }

parseBRN('pv 00012345')   // lowercase + space — same result
// => { valid: true, type: 'private-limited', ... normalised: 'PV00012345' }

parseBRN('GA12345')
// => { valid: false, reason: 'invalid format' }

isValidBRN('PV12345') // true
```

#### Normalisation

Input is trimmed, all internal whitespace stripped, and uppercased. `'pv 000 12345'` and `'PV00012345'` produce the same `normalised` output.

#### Scope

This validator handles PV (private limited) and PB (public limited) entities only. Sole proprietorships, partnerships, BOI-registered companies, societies, and NGOs use different BRN formats and are not supported in v1.

---

## Common patterns

### Discriminated union narrowing

All validators return `{ valid: false; reason: string } | { valid: true; …fields }`. TypeScript narrows the type when you check `valid`:

```ts
import { parseNIC } from 'lk-id';

function processNIC(input: string) {
  const result = parseNIC(input);

  if (!result.valid) {
    // Here: result is { valid: false; reason: string }
    throw new Error(`Invalid NIC: ${result.reason}`);
  }

  // Here: result has format, dateOfBirth, gender, age, isVoter, serial
  return {
    dob: result.dateOfBirth,
    gender: result.gender,
  };
}
```

### Convenience wrappers

Each validator ships an `isValidX` wrapper for cases where you only need a boolean:

```ts
import { isValidNIC, isValidMobile } from 'lk-id';

// Simple guard — no need to destructure
if (!isValidNIC(req.body.nic)) {
  return res.status(400).json({ error: 'Invalid NIC' });
}

// Filter an array
const validNumbers = inputs.filter(isValidMobile);
```

### Bulk validation

```ts
import { parseNIC } from 'lk-id';

const inputs = ['900012345V', '198512345678', 'garbage'];

const results = inputs
  .map(parseNIC)
  .filter(r => r.valid);

// TypeScript narrows: each element of `results` has all success fields
results.forEach(r => {
  console.log(r.dateOfBirth, r.gender);
});
```

---

## Known limitations

### NIC

**1900/2000 year ambiguity.** Old-format NICs encode the birth year as two digits, always interpreted as `19YY`. A person born in 2000 with an old NIC (year digits `00`) is indistinguishable from someone born in 1900. This ambiguity is unresolvable from the NIC alone and is documented behaviour.

**Historic 366-day encoding.** Some NICs issued before computerisation encoded day-of-year assuming every year had 366 days. `lk-id` uses a strict actual-calendar interpretation: day 366 in a non-leap year is rejected. A small number of valid real-world NICs may fail for this reason.

**Future-dated NICs.** A new-format NIC with the current calendar year as its birth year can encode a date later in the same year (e.g., born 31 Dec 2026, parsed on 15 Jun 2026). The `age` field will be `-1` in this case. Realistically, such a NIC would not exist yet, but the edge case is logically reachable.

**No check-digit validation.** The check-digit algorithm for SL NICs is not publicly documented. v1 validates structure only.

### Mobile

**MNP not yet live.** Sri Lanka has not implemented Mobile Number Portability as of June 2026. The `operator` field is currently authoritative. When MNP launches, it will represent the original allocation only, and `lk-id` will release a new major version with a renamed field. See [`docs/mobile-operator-research.md`](./docs/mobile-operator-research.md).

**Landline numbers are not supported.** Inputs with a landline prefix (e.g., `011` for Colombo) are rejected with `reason: 'invalid prefix'`.

### Passport

**Format validation only.** The validator confirms the structural pattern (one letter + 7 digits) but cannot verify that a passport number was actually issued.

**Any letter prefix accepted.** The validator accepts any single uppercase letter. It does not whitelist to confirmed SL prefixes (N, M, L). This is a v1.x research item.

### TIN

**Format validation only.** The IRD check-digit algorithm for TIN is not publicly documented. v1 validates the 9-digit structure only.

### BRN

**Limited companies only.** Only PV (private limited) and PB (public limited) BRNs are supported. Sole proprietorships, partnerships, BOI-registered entities, societies, and NGOs have different formats and are out of v1 scope.

---

## Roadmap

### v1.x

- **Passport prefix whitelist** — research confirmed SL passport prefixes (N current; M, L legacy) and decide whether to whitelist or keep the any-letter rule.
- **NIC future-dated guard** — return `{ valid: false, reason: 'date in future' }` for new-format NICs encoding a date after today.
- **TIN check digit** — add validation when a reliable algorithm source is found.
- **BRN entity types** — research and document BRN formats for other entity types.

### v2

- **Mobile MNP** — when MNP launches, rename `operator` → `originalOperator` and add `mnpStatus`. This will be a major version bump.
- **Comprehensive BRN** — sole proprietorship, partnership, BOI, society, NGO formats.
- **Schema adapters** — Zod and Valibot integration packages.
- **Landline parser** — Sri Lankan landline numbers (excluded from v1).
- **Driving licence** — format validator when the number structure can be confirmed.

### Versioning note

The v1 → v2 transition is deliberately tied to the MNP launch. There is no point incrementing the major version for internal improvements while a known breaking change (the `operator` field rename) is pending. When MNP goes live, all breaking changes will be bundled into a single v2 release.

---

## Contributing

Issues and pull requests are welcome at [github.com/lakshitha0526/lk-id](https://github.com/lakshitha0526/lk-id). If you have a correction to the mobile operator mapping, the `src/data/mobile-operators.json` file is intentionally data-driven so it can be updated without code changes. If you spot an edge case in NIC or BRN handling that isn't covered by the test suite, opening an issue with a concrete input and expected output is the most useful contribution.

---

## License

[MIT](./LICENSE)
