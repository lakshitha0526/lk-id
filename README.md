# lk-id

> Sri Lankan identity validators for TypeScript — NIC, mobile, passport, TIN, BRN.

**Status:** Work in progress. v1.0.0 in active development.
See [`SPEC.md`](./SPEC.md) for the design, scope, and roadmap.

## Why this exists

Sri Lankan SaaS products keep rewriting the same validation logic — NIC parsing, mobile number normalisation, passport/TIN/BRN format checks. Existing npm packages are partial, stale, or untyped. `lk-id` is a single, well-tested, TypeScript-first library covering the common Sri Lankan identity formats.

## Install

```bash
npm install lk-id
```

> Not yet published. See [milestones](./SPEC.md#12-phased-delivery) for the release plan.

## Quick example

```ts
import { parseNIC } from 'lk-id';

const result = parseNIC('851234567V');

if (result.valid) {
  console.log(result.dateOfBirth);  // 1985-05-03
  console.log(result.gender);        // 'male'
  console.log(result.age);
}
```

## What's included (v1)

| Validator | Status |
|---|---|
| NIC (old + new format) | In progress |
| Mobile number | Planned |
| Passport | Planned |
| TIN | Planned |
| BRN (PV/PB) | Planned |

## Roadmap and known limitations

See [`SPEC.md`](./SPEC.md). Two things worth flagging upfront:

- **Check-digit validation is not included in v1.** The check-digit algorithms for SL NIC and TIN are not publicly documented. v1 validates structure only.
- **Mobile operator detection is best-effort.** Sri Lanka launched Mobile Number Portability around 2022, so prefix-to-operator lookup returns the *original allocation*, not the current operator.

## Contributing

Issues and PRs welcome once v1.0.0 lands. The mobile operator mapping in `src/data/mobile-operators.json` is intentionally data-driven so it can be updated without code changes.

## License

[MIT](./LICENSE) © Lakshitha
