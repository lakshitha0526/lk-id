# Mobile Operator Research (for `mobile.ts`)

**Date:** 06 Jun 2026
**Researcher:** review and update before each `mobile.ts` release
**Purpose:** Provide authoritative source data and design recommendations for the mobile number validator's operator lookup feature

---

## Executive summary

Sri Lanka has **three active mobile operators** as of June 2026 (down from four following the Dialog–Airtel amalgamation in 2024):

| Operator | Subscribers | Prefixes |
|---|---|---|
| Dialog Axiata (includes Airtel brand) | ~17 million | 074, 075, 076, 077 |
| SLTMobitel | ~9 million | 070, 071 |
| Hutch (absorbed Etisalat in 2018) | ~4 million | 072, 078 |

**Mobile Number Portability (MNP) is NOT yet live in Sri Lanka.** It has been delayed repeatedly (originally targeted for 2022, then late 2024, then June 2025, now targeting August 2026). This is significant for the library: as of writing, the prefix-to-operator mapping is **authoritative**, not best-effort. Update the SPEC §8.2 design accordingly.

Prefixes 073 and 079 are not allocated to mobile services.

---

## Operator landscape

### Active operators

**Dialog Axiata** is the dominant mobile operator with roughly 57% market share. Following the completion of the [Dialog–Airtel Lanka amalgamation in September 2024](https://www.dialog.lk/news/dialog-axiata-completes-amalgamation-with-airtel-lanka), Airtel Lanka is no longer a separate entity. The 075 prefix continues to operate under the "Airtel by Dialog" brand for marketing purposes but the underlying operator is Dialog.

**SLTMobitel** is the second-largest operator, formed by the merger of Sri Lanka Telecom (SLT, the state-owned fixed-line incumbent) and Mobitel. Often still referred to in older sources as just "Mobitel".

**Hutch** is the third operator, owned by CK Hutchison Holdings. Absorbed Etisalat Lanka in 2018, which is why the 072 prefix (previously Etisalat) is now operated by Hutch.

### Recent consolidation events

- **2018:** Hutch absorbed Etisalat Lanka → 072 transferred to Hutch
- **September 2024:** Dialog completed amalgamation with Airtel Lanka → Airtel ceased to exist as a separate operator; 075 continues as "Airtel by Dialog" brand under Dialog

### Operators no longer active

- **Bharti Airtel Lanka** — absorbed by Dialog, 2024
- **Etisalat Lanka** — absorbed by Hutch, 2018
- **Tigo / Celltel / CallLink** — historic predecessors of Hutch
- **MTN Networks** — original name of Dialog before rebrand

---

## Prefix-to-operator allocation (June 2026)

| Prefix | Operator | Brand notes |
|---|---|---|
| 070 | SLTMobitel | |
| 071 | SLTMobitel | Historic Mobitel allocation, pre-SLT merger |
| 072 | Hutch | Previously Etisalat (transferred 2018) |
| 073 | *not allocated* | |
| 074 | Dialog | |
| 075 | Dialog | Operates under "Airtel by Dialog" brand |
| 076 | Dialog | |
| 077 | Dialog | Original/primary Dialog prefix |
| 078 | Hutch | |
| 079 | *not allocated* | |

This matches SPEC §8.2's valid prefix list: 70, 71, 72, 74, 75, 76, 77, 78.

---

## Mobile Number Portability (MNP) status

**MNP is not currently active in Sri Lanka.** The implementation has been delayed multiple times:

- Original target: 2022 — missed
- Revised: late 2024 — missed
- Revised: June 2025 — missed
- Latest stated target: August 2026 ([source](https://www.themorning.lk/articles/sUckPs4xdqcAmfVwgfKw))

Procurement for the technical system has been completed and Lanka Number Portability Services (LNPS) has been established as the operator of the MNP platform, but the service is not live as of June 2026. Status of the August 2026 target should be verified before any production release of `lk-id`.

### What this means for the library

Until MNP launches:
- Prefix-to-operator lookup is **authoritative** — the prefix reliably indicates the current operator
- The SPEC §8.2 design of an `operatorCaveat` field with an MNP warning is **premature**

When MNP launches:
- Prefix becomes **best-effort** — represents original allocation
- A caveat field becomes appropriate

### Recommended approach for v1

Two options:

**Option A — Simple, current-accurate (recommended for v1.0.0):**
Return `operator` as a plain string. Document MNP status in README. When MNP launches, release v2 with a renamed `originalOperator` field and a `mnpStatus` field.

```ts
{ valid: true; e164: string; local: string; prefix: string; operator: string }
```

**Option B — Future-proof (more verbose):**
Keep the SPEC §8.2 design but include the current MNP status in the return:

```ts
{ valid: true; e164: string; local: string; prefix: string;
  operator: string;
  mnpStatus: 'inactive' | 'active';   // currently 'inactive'
  operatorNote: string;                // varies based on mnpStatus
}
```

**My recommendation: Option A.** Simpler return shape, accurate to current state, semver-safe transition to v2 when MNP launches. Document the MNP situation in README's "Known limitations" section.

---

## Data file (ready to use)

Save as `src/data/mobile-operators.json`:

```json
{
  "70": "SLTMobitel",
  "71": "SLTMobitel",
  "72": "Hutch",
  "74": "Dialog",
  "75": "Dialog",
  "76": "Dialog",
  "77": "Dialog",
  "78": "Hutch"
}
```

Notes for the implementation:

- Keys are 2-digit prefix strings (matches the two characters extracted from positions 3–4 of the E.164 form `+94XXXXXXXXX`)
- Values are operator display names (use `SLTMobitel` not `Mobitel` — this is the current branded name)
- Prefix 075 maps to `Dialog` not `Airtel by Dialog` — the actual operator is Dialog; the brand is a marketing artefact. If a consumer needs the brand information, that's a v1.x enhancement.

---

## README disclosure (suggested text)

For the README's mobile section, suggest including:

> **Mobile operator detection.** The `parseMobile()` function returns the mobile operator associated with the number's prefix. As of June 2026, Sri Lanka has not yet implemented Mobile Number Portability (MNP), so this mapping is authoritative. When MNP launches (currently targeting August 2026), prefix-to-operator lookup will become best-effort and represent the original allocation rather than the current operator. The library will be updated to reflect this when MNP goes live.

---

## Open questions for future verification

1. **Is the 075 prefix still being newly issued?** With Airtel absorbed into Dialog, are new SIMs being issued on 075, or is it being phased out? Check before v1.1.

2. **Has the August 2026 MNP target slipped further?** Re-verify before publishing v1.0.0.

3. **Is there a publicly downloadable TRCSL data file?** The official numbering plan PDF at `trc.gov.lk/content/files/numbering/numberingmanual.pdf` is dated 2009. A more current source would be preferable.

4. **Brand information for 075.** If consumers want to display "Airtel by Dialog" rather than "Dialog", that's a future enhancement. Track demand before adding.

---

## Sources

Primary sources (more authoritative):

- [Telecommunications Regulatory Commission of Sri Lanka — Numbering](https://www.trc.gov.lk/pages_e.php?id=121) — TRCSL's own page on the National Numbering Plan
- [TRCSL Numbering Plan PDF (2009)](http://www.trc.gov.lk/content/files/numbering/numberingmanual.pdf) — official numbering plan; somewhat dated
- [Dialog Axiata — Dialog-Airtel amalgamation announcement](https://www.dialog.lk/news/dialog-axiata-completes-amalgamation-with-airtel-lanka) — primary source for the 2024 consolidation

Secondary sources (recent and reliable):

- [Wikipedia — Telephone numbers in Sri Lanka](https://en.wikipedia.org/wiki/Telephone_numbers_in_Sri_Lanka) — overall structure of the numbering plan
- [Wikipedia — Hutch (Sri Lanka)](https://en.wikipedia.org/wiki/Hutch_(Sri_Lanka)) — operator background and history
- [Sent.dm — Sri Lanka phone number validation guide (Mar 2026)](https://www.sent.dm/en/resources/phone-number-standards/lk) — current prefix-to-operator table

MNP status sources:

- [The Morning — MNP missed deadline again (Jul 2025)](https://www.themorning.lk/articles/sUckPs4xdqcAmfVwgfKw) — most recent on missed deadlines, August 2026 target
- [EconomyNext — MNP planned for June 2025 (Feb 2025)](https://economynext.com/sri-lanka-eyes-mobile-number-portability-in-june-206704/) — Ministerial committee on the June 2025 target (subsequently missed)
- [Text.lk — TRCSL updates on MNP (Aug 2025)](https://text.lk/news/trcsl-updates-on-mobile-number-portability/) — procurement and LNPS background
- [Newswire — Number portability status (Oct 2024)](https://www.newswire.lk/2024/10/07/number-portability-in-sri-lanka-whats-happening/) — LNPS establishment

Inaccurate sources to be aware of:

- **Grokipedia** claims MNP has been live since 2017 — this is wrong. Cross-checked against multiple Sri Lankan sources confirming MNP is not yet active.
- **JustCall blog** claims MNP doesn't exist — correct on the fact, but the article is general guidance rather than authoritative.

---

## Verification checklist before v1.0.0 release

- [ ] Confirm prefix-to-operator table against current TRCSL guidance (re-check before each release)
- [ ] Verify MNP launch status as of the day of release
- [ ] Update README disclosure if MNP status has changed
- [ ] If MNP launches, plan v2 with renamed field (`originalOperator`) and `mnpStatus` field
