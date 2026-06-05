# `lk-id` — Implementation Plan (v1.0.0)

**Status:** Draft
**Owner:** Lakshitha
**Last updated:** 05 Jun 2026
**Target release:** ~5 weekends from start

---

## 1. Problem

Sri Lankan software products repeatedly hit the same identity-validation problems — NIC parsing, mobile number normalisation, passport/TIN/BRN format checks — and every team writes the same 200 lines of glue code from scratch. Existing npm packages are partial (NIC-only), stale (don't cover the new 12-digit NIC format), or untyped. There is no single, well-tested, TypeScript-first library covering the common Sri Lankan identity formats.

## 2. Target users

- Sri Lankan SaaS developers building user registration, KYC, or compliance flows
- Backend engineers integrating with Sri Lankan banks, payment gateways, or government APIs
- Anyone building an HR, payroll, or finance product for the Sri Lankan market

## 3. Success metrics (v1.0.0)

- Published on npm as `lk-id` with provenance
- Five validators shipped (NIC, mobile, passport, TIN, BRN)
- 90%+ test coverage on validator logic
- README has working copy-paste examples for every validator
- Works in both ESM and CJS consumers, Node 18+
- Zero runtime dependencies
- First external GitHub star (any source) within 4 weeks of release
- First external issue or PR within 8 weeks

## 4. Scope

### In scope (v1)

| Validator | Function | Output |
|---|---|---|
| NIC | Old (9-digit + V/X) and new (12-digit) | Date of birth, gender, age, voter status, serial |
| Mobile number | Sri Lankan mobile only | E.164 normalised form, original operator allocation |
| Passport | Sri Lankan passport format | Format-valid yes/no |
| TIN | 9-digit Taxpayer Identification Number | Format-valid yes/no |
| BRN | PV/PB limited company registration only | Type, normalised form |

### Out of scope (v1)

- Landline phone numbers
- Sole proprietorship BRN formats (vary by Divisional Secretariat)
- Driving licence numbers
- EPF / ETF / SLPA membership numbers
- Check-digit validation for NIC and TIN (algorithms not publicly documented; revisit in v1.1)
- Address parsing or postal code validation
- Sinhala/Tamil text validation
- Any kind of identity lookup against external services

### Deferred to v2+

- Landline number parser
- Comprehensive BRN parser (all entity types)
- Optional strict check-digit validation (`{ strict: true }`)
- Zod / Yup / Valibot schema adapters

---

## 5. Technical decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Native typing for consumers; transpile to dual ESM/CJS |
| Runtime target | Node 18+ | LTS, current de facto baseline |
| Build tool | `tsup` | Single config produces ESM + CJS + .d.ts; simplest path |
| Test framework | `vitest` | Native ESM, fast, no jest/babel toolchain |
| Linter / formatter | `biome` | Single fast tool, no ESLint+Prettier config sprawl |
| Package manager | `npm` | Default; no benefit from yarn/pnpm here |
| CI | GitHub Actions | Free, standard for OSS |
| Publishing | `npm publish --provenance` | Cryptographic provenance from CI |
| License | MIT | Maximum reuse, standard for utility libs |
| Runtime dependencies | **None** | This is a validation lib; deps would be a smell |

Lock these in `SPEC.md` so future you doesn't second-guess.

### Why no check-digit validation in v1

The check-digit algorithms for SL NIC and TIN are not officially published. Existing libraries implement them differently, and most are wrong on edge cases. Shipping a "validates" function that returns false negatives is worse than shipping format-only validation that's honest about its limits. Document this clearly in the README; revisit in v1.1 if a reliable algorithm source is found.

### Mobile number portability caveat

Sri Lanka launched MNP (Mobile Number Portability) around 2022. Operator-by-prefix lookup now tells you the *original allocation*, not the current operator. The `parseMobile()` return type makes this explicit, and the README has a dedicated note.

---

## 6. Repository structure

```
lk-id/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + typecheck + test + build on PR/push
│       └── release.yml         # npm publish on tag push
├── src/
│   ├── index.ts                # public re-exports
│   ├── nic.ts
│   ├── nic.test.ts
│   ├── mobile.ts
│   ├── mobile.test.ts
│   ├── passport.ts
│   ├── passport.test.ts
│   ├── tin.ts
│   ├── tin.test.ts
│   ├── brn.ts
│   ├── brn.test.ts
│   └── data/
│       └── mobile-operators.json   # researched prefix-to-operator mapping
├── .gitignore
├── .npmignore                  # or use "files" in package.json instead
├── biome.json
├── CHANGELOG.md
├── LICENSE                     # MIT
├── package.json
├── README.md
├── SPEC.md                     # this document
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## 7. API design

### 7.1 Universal return shape (discriminated union)

Every validator returns either a failure with a `reason`, or a success with the extracted data:

```ts
type ValidationResult<T> =
  | { valid: false; reason: string }
  | ({ valid: true } & T);
```

Each validator has its own `T`. Two functions per validator:

```ts
parseX(input: string): ValidationResult<XData>   // full parse, returns extracted data
isValidX(input: string): boolean                 // convenience wrapper
```

Rationale: discriminated unions force consumers to handle failure paths. Exceptions for invalid user input are bad ergonomics in validation libraries.

### 7.2 Public exports (`src/index.ts`)

```ts
export { parseNIC, isValidNIC, type NICResult } from './nic';
export { parseMobile, isValidMobile, type MobileResult } from './mobile';
export { parsePassport, isValidPassport, type PassportResult } from './passport';
export { parseTIN, isValidTIN, type TINResult } from './tin';
export { parseBRN, isValidBRN, type BRNResult } from './brn';
```

No default export. Named exports only.

---

## 8. Per-validator specifications

### 8.1 NIC

#### Format

**Old format** (10 characters total, used until ~2016):
```
[YY][DDD][SSS][C][L]
```
- Positions 1–2: birth year, last two digits (interpret as 19YY — see ambiguity note)
- Positions 3–5: day-of-year code (1–366 = male, 501–866 = female; subtract 500 for actual day)
- Positions 6–8: serial number
- Position 9: check digit (not validated in v1)
- Position 10: `V` (voter) or `X` (non-voter), case-insensitive

**New format** (12 digits, introduced January 2016):
```
[YYYY][DDD][SSSS][C]
```
- Positions 1–4: full birth year
- Positions 5–7: day-of-year code (same male/female rule)
- Positions 8–11: serial number
- Position 12: check digit (not validated in v1)

#### Algorithm

1. Trim input, strip internal whitespace, uppercase the final letter if old format.
2. Match against old (`/^\d{9}[VX]$/`) or new (`/^\d{12}$/`) pattern; reject otherwise.
3. Extract year:
   - Old: prefix `19` to the two-digit year.
   - New: use the four digits directly. Reject if year > current year or year < 1900.
4. Extract raw day-code (DDD).
5. Determine gender and actual day-of-year:
   - 1–366: male, day-of-year = raw
   - 501–866: female, day-of-year = raw − 500
   - Anything else (0, 367–500, 867+): invalid
6. Compute date of birth from (year, day-of-year). Reject if the date doesn't exist (e.g., day 366 in a non-leap year).
7. Compute current age from date of birth using UTC.
8. Return success object.

#### Return type

```ts
export type NICResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      format: 'old' | 'new';
      dateOfBirth: Date;            // UTC midnight on the parsed day
      gender: 'male' | 'female';
      age: number;                  // years, computed against new Date() at call time
      isVoter: boolean | null;      // null for new format (no voter marker)
      serial: string;               // zero-padded
    };
```

#### Known ambiguities (document in README)

- Old NIC year is always interpreted as 19YY. A person born in 2000–2015 issued an old NIC would parse as born in 1900–1915. This cannot be resolved from the NIC alone.
- Some historical NICs encoded day-of-year assuming every year had 366 days. v1 uses the strict actual-calendar-year interpretation; some valid real NICs may be rejected. Acceptable trade-off for v1.

#### Acceptance test cases

| Input | Expected |
|---|---|
| `851234567V` | valid, old format, year 1985, male, day 123 (3 May 1985), voter, serial 456 |
| `855010567V` | valid, old format, year 1985, female, day 1 (1 Jan 1985), voter, serial 056 |
| `8550156751V` | invalid: length |
| `000012345V` | valid, old format, year 1900, male, day 1 (1 Jan 1900), voter, serial 234 — code comment must note the 1900/2000 ambiguity |
| `198512345678` | valid, new format, year 1985, male, day 123, serial 4567 |
| `198540012345` | invalid: day code 400 is in the 367–500 dead zone |
| `198550112345` | valid, new format, year 1985, female, day 1, serial 1234 |
| `198536612345` | invalid: day 366 in non-leap year 1985 |
| `198836612345` | valid, new format, year 1988 (leap year), male, day 366 (31 Dec 1988), serial 1234 |
| `   851234567v   ` | valid, normalised to `851234567V`, same result as row 1 |
| `85-123-4567-V` | invalid: only strict format accepted in v1 (no separators) |
| (empty string) | invalid |
| `abcdefghij` | invalid |

Add at least 25 test cases total covering every branch.

---

### 8.2 Mobile number

#### Accepted input formats

All of these normalise to `+94771234567`:
- `0771234567`
- `+94771234567`
- `94771234567`
- `771234567`
- `077-123-4567`
- `077 123 4567`
- `(077) 123 4567`
- `+94 77 123 4567`

#### Algorithm

1. Strip all characters except digits and a leading `+`.
2. Normalise to `+94XXXXXXXXX` (12 chars):
   - Starts with `+94`: keep
   - Starts with `94` (length 11): prepend `+`
   - Starts with `0` (length 10): replace `0` with `+94`
   - Length 9 and starts with `7`: prepend `+94`
   - Otherwise: invalid
3. Validate length is exactly 12 chars (`+94` + 9 digits).
4. Extract the two-digit prefix after `+94`. Must be one of: `70`, `71`, `72`, `74`, `75`, `76`, `77`, `78`.
5. Look up original operator from `data/mobile-operators.json`.
6. Return success object.

#### Return type

```ts
export type MobileResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      e164: string;                  // e.g., "+94771234567"
      local: string;                  // e.g., "0771234567"
      prefix: string;                 // e.g., "77"
      originalOperator: string;       // e.g., "Dialog"
      operatorCaveat: string;         // standard MNP caveat string
    };
```

#### Research item before coding

The exact prefix-to-operator mapping must be sourced from **TRCSL** (Telecommunications Regulatory Commission of Sri Lanka) or another authoritative public source. Do not hardcode from memory. Store the result in `src/data/mobile-operators.json` so it can be updated without a code change.

#### Acceptance test cases

| Input | Expected |
|---|---|
| `0771234567` | valid, e164 `+94771234567`, prefix 77 |
| `+94771234567` | valid, same |
| `94771234567` | valid, same |
| `771234567` | valid, same |
| `077-123-4567` | valid, same |
| `+94 77 123 4567` | valid, same |
| `0117654321` | landline prefix 11, invalid (not in v1) |
| `+94731234567` | prefix 73 not allocated to mobile, invalid |
| `0771234` | too short, invalid |
| `077123456789` | too long, invalid |
| `abc` | invalid |
| empty | invalid |

---

### 8.3 Passport

#### Format

One letter (typically `N`) followed by 7 digits, e.g., `N1234567`.

#### Algorithm

1. Trim and uppercase input.
2. Match against `/^[A-Z]\d{7}$/`.
3. Return success or failure.

#### Return type

```ts
export type PassportResult =
  | { valid: false; reason: string }
  | { valid: true; normalised: string; prefix: string; number: string };
```

#### Note

This is format validation only. There is no public algorithm to verify that a passport number was actually issued. Document this.

---

### 8.4 TIN

#### Format

9 digits, no letters. Issued by IRD.

#### Algorithm

1. Strip whitespace.
2. Match against `/^\d{9}$/`.
3. Return success or failure.

#### Return type

```ts
export type TINResult =
  | { valid: false; reason: string }
  | { valid: true; tin: string };
```

#### Note

Check-digit algorithm not officially documented. v1 is format-only. Document this.

---

### 8.5 BRN (Limited companies only)

#### Format

Modern company registration under the Companies Act No. 7 of 2007:
- Private limited: `PV` followed by digits, e.g., `PV 00012345`
- Public limited: `PB` followed by digits, e.g., `PB 00012345`

Digit length varies (typically 5–8 digits). Whitespace between prefix and digits is optional.

#### Algorithm

1. Trim, uppercase, collapse internal whitespace.
2. Match against `/^(PV|PB)\s*(\d{5,8})$/`.
3. Return success object with type and normalised form (no space).

#### Return type

```ts
export type BRNResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      type: 'private-limited' | 'public-limited';
      number: string;                // digits only
      normalised: string;             // e.g., "PV12345"
    };
```

#### Note

This validator handles only PV/PB. Other entity types (sole proprietorship, partnership, BOI-registered, society, NGO) have different formats and are out of v1.

---

## 9. Testing strategy

- **Framework:** `vitest`
- **Co-located tests:** `src/nic.test.ts` next to `src/nic.ts`
- **Coverage tool:** `vitest --coverage` (uses `v8` provider)
- **Coverage target:** 90% line coverage on validator logic; 100% on date arithmetic helpers
- **Test categories per validator:**
  1. Happy path (every supported input format)
  2. Each failure reason (one test per `reason` string)
  3. Edge cases (leap years, boundary values, whitespace, case sensitivity)
  4. Property-based tests for normalisation (optional, with `fast-check` as a devDep only)
- **CI:** run on every PR and push to `main`. Fail the build if coverage drops below 90%.

---

## 10. Build and publish

### 10.1 `tsup.config.ts`

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false, // not worth it for a small lib; keep stack traces readable
});
```

### 10.2 `package.json` (key fields)

```json
{
  "name": "lk-id",
  "version": "1.0.0",
  "description": "Sri Lankan identity validators (NIC, mobile, passport, TIN, BRN)",
  "keywords": ["sri-lanka", "nic", "validation", "identity", "lk"],
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "biome check src",
    "format": "biome format --write src",
    "prepublishOnly": "npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

### 10.3 GitHub Actions

**`.github/workflows/ci.yml`** — runs on every PR and push:
- Checkout
- Setup Node 20
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run build`

**`.github/workflows/release.yml`** — runs on `v*` tag push:
- All of the above
- `npm publish --provenance --access public` with `NODE_AUTH_TOKEN` from secrets

Set up the NPM token as a repository secret (`NPM_TOKEN`) before the first release.

### 10.4 Versioning

Semantic versioning. v1.0.0 is the initial release. Breaking changes to the return shape or function signatures bump major.

### 10.5 Pre-publish sanity check

Before tagging v1.0.0:
1. `npm pack` to build a tarball
2. Install it into a separate sandbox project: `npm install ./lk-id-1.0.0.tgz`
3. Test ESM import: `import { parseNIC } from 'lk-id'`
4. Test CJS require in a separate sandbox: `const { parseNIC } = require('lk-id')`
5. Confirm `.d.ts` types are picked up by TypeScript autocompletion

Skip this step and you'll ship a broken package.

---

## 11. Open research items (do before coding)

1. **Mobile prefix-to-operator mapping** — pull from TRCSL or another authoritative public source. Acceptable to publish v1 with conservative mappings if a definitive source isn't found; note this in the README.
2. **Current SL passport letter prefixes** — confirm `N` is the only or primary one in current circulation; older passports may use `M` or `L`. Decide whether to whitelist or accept any letter.
3. **NIC check-digit algorithm** — only if you want to ship v1.1 soon after. Skip for v1.

Park these in `RESEARCH.md` and resolve before coding the affected validator.

---

## 12. Phased delivery

Five-weekend plan. Adjust based on actual weekend availability.

### Weekend 1 — Project skeleton + NIC

- Repo init, license, gitignore, biome config
- `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- GitHub Actions CI workflow
- Implement `nic.ts` with full discriminated union
- 25+ unit tests
- Confirm CI runs green on push

**Deliverable:** repo on GitHub with green CI, NIC parser working locally.

### Weekend 2 — Mobile + Passport

- Research and create `data/mobile-operators.json`
- Implement `mobile.ts` with normalisation
- Implement `passport.ts`
- Tests for both
- First README draft with NIC and mobile examples

**Deliverable:** three of five validators done, README skeleton in place.

### Weekend 3 — TIN + BRN

- Implement `tin.ts`
- Implement `brn.ts` (PV/PB only)
- Tests for both
- Full `src/index.ts` exports

**Deliverable:** all five validators done, full coverage report.

### Weekend 4 — Documentation + release prep

- Full README with copy-paste examples for every validator
- `CHANGELOG.md` with v1.0.0 entry
- `RESEARCH.md` documenting open items and limitations
- Release workflow set up, NPM token added to repo secrets
- Pre-publish sanity check with `npm pack` + sandbox install

**Deliverable:** repo ready to publish.

### Weekend 5 — Publish + announce

- Tag `v1.0.0`, watch release workflow run, confirm package on npmjs.com
- Write a short blog post: "Why I built lk-id" (the design decisions + MNP caveat make a good narrative)
- Post to Sri Lankan dev communities: Reddit r/srilanka tech threads, dev-focused FB groups, LinkedIn
- Set up GitHub issue templates and `CONTRIBUTING.md`

**Deliverable:** v1.0.0 on npm, blog post published, library discoverable.

---

## 13. v2 roadmap (for the README "future" section)

- Landline phone number parser
- Comprehensive BRN parser (sole proprietorship, partnership, BOI, society)
- Optional strict check-digit validation (`{ strict: true }`)
- Schema adapters: `zod`, `valibot`
- Driving licence number validator
- EPF / ETF membership number validators

---

## 14. Risks and how to handle them

| Risk | Mitigation |
|---|---|
| `lk-id` name gets taken on npm before you publish | Reserve a placeholder publish of v0.0.1 once the skeleton is in place |
| Mobile operator mapping is wrong / outdated | Make it data-driven (JSON file), invite PRs in README |
| Someone publishes a competing library mid-build | Differentiate on TypeScript-first, complete coverage, honest limitations |
| Scope creep (you start adding addresses, calendar, etc.) | Re-read this doc. Defer everything to v2 |
| Underestimating weekend availability | Each weekend's deliverable is independently shippable. Drop a validator before dropping quality |

---

## 15. Definition of done (v1.0.0)

- [ ] All five validators implemented
- [ ] 90%+ test coverage
- [ ] CI green on `main`
- [ ] README has working examples for each validator
- [ ] MNP caveat and check-digit limitations documented
- [ ] Published on npm with provenance
- [ ] Tagged `v1.0.0` on GitHub with release notes
- [ ] Pre-publish sandbox test passed (ESM + CJS + types)

Tick these off as you go. When all are ticked, v1.0.0 is done — don't keep polishing, ship and move on to v1.1 or `lk-sms`.
