# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-06-06

### Fixed

- First functional npm release. The v1.0.0 publish completed in a broken state
  on the npm registry — the version metadata was created but the package
  contents did not match the built artefacts. v1.0.1 is otherwise identical to
  the intended v1.0.0 release: same five validators, same API surface, same
  return shapes. v1.0.0 will be deprecated on npm.

## [1.0.0] - 2026-06-06

### Added

- `parseNIC` / `isValidNIC` / `NICResult` — parses Sri Lankan National Identity
  Cards in both the old (9-digit + V/X suffix) and new (12-digit) formats.
  Extracts date of birth (UTC midnight), gender, age (computed at call time),
  voter registration status, and serial number. Validates that the encoded
  calendar date exists (leap-year check on day 366).

- `parseMobile` / `isValidMobile` / `MobileResult` — validates and normalises
  Sri Lankan mobile numbers to E.164 form (`+94XXXXXXXXX`). Accepts eight input
  formats (local, international, hyphenated, space-separated, parenthesised).
  Returns the current operator by prefix. Rejects unallocated prefixes (073,
  079) and non-mobile prefixes.

- `parsePassport` / `isValidPassport` / `PassportResult` — validates the format
  of a Sri Lankan passport number (one letter followed by 7 digits). Input is
  trimmed, whitespace-stripped, and uppercased before matching.

- `parseTIN` / `isValidTIN` / `TINResult` — validates the format of a 9-digit
  Sri Lankan Taxpayer Identification Number issued by the Inland Revenue
  Department. Leading zeros are valid.

- `parseBRN` / `isValidBRN` / `BRNResult` — validates Private Limited (`PV`)
  and Public Limited (`PB`) company Business Registration Numbers under the
  Companies Act No. 7 of 2007. Accepts 5–8 digit registration numbers; returns
  a canonical normalised form with no whitespace.

- `src/data/mobile-operators.json` — prefix-to-operator mapping for allocated
  SL mobile prefixes (070–078 excluding 073), sourced from TRCSL. Data-driven
  so it can be updated without code changes.

- `docs/mobile-operator-research.md` — full source documentation for the mobile
  operator mapping: operator history, MNP status as of June 2026, and
  verification checklist for future releases.

- README with usage examples, accepted input formats, full return-type shapes,
  and a consolidated Known Limitations section documenting check-digit omissions,
  the NIC 1900/2000 year ambiguity, the MNP authoritative-vs-best-effort
  transition, and v1 scope restrictions per validator.

[Unreleased]: https://github.com/lakshitha0526/lk-id/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/lakshitha0526/lk-id/releases/tag/v1.0.1
[1.0.0]: https://github.com/lakshitha0526/lk-id/releases/tag/v1.0.0
