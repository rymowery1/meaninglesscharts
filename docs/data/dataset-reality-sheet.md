# Dataset Reality Sheet

Tracks, per dataset, whether every required `DatasetMeta` field (per CLAUDE.md / `.claude/agents/data-sources.md`) is real and verified, or still a placeholder. A dataset cannot be `launchReady: true` until every row is checked.

| id | source org verified | source URL verified | date range verified | methodology note verified | license verified | fetchedAt real | series file exists, provenance != placeholder | verificationStatus |
|---|---|---|---|---|---|---|---|---|
| `worldbank-gdp-growth-annual` | ✅ | ✅ | ✅ | ☐ | ☐ | ✅ | ✅ | needs-verification |
| `worldbank-population-total-annual` | ✅ | ✅ | ✅ | ☐ | ☐ | ✅ | ✅ | needs-verification |
| `worldbank-forest-area-pct-annual` | ✅ | ✅ | ✅ | ☐ | ☐ | ✅ | ✅ | needs-verification |
| `worldbank-agricultural-land-pct-annual` | ✅ | ✅ | ✅ | ☐ | ☐ | ✅ | ✅ | needs-verification |
| `nasa-power-temp-annual` | ✅ | ✅ | ✅ | ✅ | ☐ | ✅ | ✅ | needs-verification |
| `usgs-quakes-m5-5-monthly-count` | ✅ | ✅ | ✅ | ✅ | ☐ | ✅ | ✅ | needs-verification |
| `wikimedia-enwiki-pageviews-monthly` | ✅ | ✅ | ✅ | ✅ | ☐ | ✅ | ✅ | needs-verification |
| `worldbank-internet-users-pct-annual` | ✅ | ✅ | ✅ | ☐ | ☐ | ✅ | ✅ | needs-verification |

## 2026-07-09 — World Bank fetch

`scripts/fetch-data/worldbank.ts` ran successfully against the live API for all 5 World Bank candidates. Real data landed in `src/data/series/`, `provenance: "script"`, no null/NaN/Infinity values, no missing points. `dateRange`, `sourceUrl`, `unit`, `fetchedAt`, and `seriesPath` in `src/data/datasets.json` now reflect the actual response — not proposed values.

Still blocking `launchReady: true` for all 5: `methodologyNotes` and `licenseOrReuseNotes` are still `NEEDS_SOURCE` — the World Bank's specific per-indicator methodology and its Open Data license terms haven't been confirmed against an actual terms-of-use or metadata page yet, only recalled from general background knowledge (noted as unconfirmed in `docs/data/approved-sources.md`).

## 2026-07-09 — NASA POWER fetch

`scripts/fetch-data/nasa-power.ts` ran successfully: 45 annual points (1981–2025) at a single point (Washington, D.C.), using NASA POWER's own native annual-average key rather than a client-computed aggregate. `methodologyNotes` is filled in (the native-annual-key fact); `licenseOrReuseNotes` is still `NEEDS_SOURCE`.

## 2026-07-09 — USGS fetch

`scripts/fetch-data/usgs.ts` ran successfully: 318 monthly M5.5+ global earthquake counts (2000-01 to 2026-06), derived from 13,088 raw catalog events. All positive integers, no null/zero/negative values. `methodologyNotes` explains the monthly-count-from-raw-events derivation.

## 2026-07-09 — Wikimedia fetch

`scripts/fetch-data/wikimedia.ts` ran successfully: 132 monthly pageview totals for English Wikipedia (2015-07 to 2026-06), `agent=user` filtered. All positive.

## All 8 datasets now have real data — normalization eligibility checked

Ran each series' values through the eligibility check in `docs/data/normalization-rules.md` (zero/negative baseline, any negative value, zero-crossing). Result: **`worldbank-gdp-growth-annual` fails** — it has 2 negative annual values (2009, 2020) and therefore crosses zero. It cannot be normalized to index-100 and any pairing using it is invalid, full stop — see the updated "Valid candidate pairings" section in `docs/data/dataset-catalog.md`. All 7 other datasets pass.

## 2026-07-09 — License verification and launch approval

Fetched the actual terms-of-use/copyright pages for all 4 sources (not recalled from memory):
- World Bank: CC-BY 4.0, confirmed at https://datacatalog.worldbank.org/public-licenses
- NASA: general public-domain/not-copyrighted policy, confirmed at https://www.nasa.gov/nasa-brand-center/images-and-media/ (no POWER-specific data-rights page found — checked, 404)
- USGS: U.S. Public Domain, confirmed at https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- Wikimedia: CC0 for Analytics datasets specifically, confirmed at https://dumps.wikimedia.org/legal.html

With `licenseOrReuseNotes` filled in for real (and `methodologyNotes` filled in for the 4 remaining World Bank datasets), all 8 datasets now have every required field populated with verified information. All 8 flipped to `verificationStatus: "approved"`, `launchReady: true`. `npm run validate:data` confirms 8/8 launchReady with 0 errors.

`npm run generate:pairings` now writes the 3 real valid pairings to `src/data/pairings.json` (previously empty). `npm run validate:pairings` confirms all 3 pass `checkPairing()`.
