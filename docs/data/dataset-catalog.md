# Dataset Catalog

Dataset cache drawn from the four keyless approved sources (World Bank, NASA POWER, USGS, Wikimedia Pageviews). **Update, 2026-07-09: all 8 datasets below are implemented, not proposed.** Every entry is `verificationStatus: "approved"`, `launchReady: true`, with real fetched values, confirmed date ranges, and real API query parameters (fetcher scripts in `scripts/fetch-data/` have run — see `decision-log.md`). The table below is kept as historical reference for each indicator's origin; treat `src/data/datasets.json` and `src/data/series/` as the actual source of truth for current values.

Mirrored in `src/data/datasets.json` as `DatasetMeta` entries, with matching series files in `src/data/series/`.

## Candidates

| id | label | org | domain | frequency | notes |
|---|---|---|---|---|---|
| `worldbank-gdp-growth-annual` | GDP growth (annual %) | The World Bank | economy | annual | World Bank indicator code `NY.GDP.MKTP.KD.ZG`, `NEEDS_VERIFICATION` |
| `worldbank-population-total-annual` | Population, total | The World Bank | global-indicators | annual | indicator code `SP.POP.TOTL`, `NEEDS_VERIFICATION` |
| `worldbank-forest-area-pct-annual` | Forest area (% of land area) | The World Bank | environment | annual | indicator code `AG.LND.FRST.ZS`, `NEEDS_VERIFICATION` |
| `worldbank-agricultural-land-pct-annual` | Agricultural land (% of land area) | The World Bank | agriculture | annual | indicator code `AG.LND.AGRI.ZS`, `NEEDS_VERIFICATION` |
| `nasa-power-temp-annual` | Annual average temperature at 2m | NASA POWER | weather | annual | geography (single point vs. regional average) is `NEEDS_USER_DECISION`; whether POWER's "climatology" endpoint natively returns annual values or requires client aggregation from monthly is `NEEDS_VERIFICATION` |
| `usgs-quakes-m5-5-monthly-count` | Global M5.5+ earthquake count | U.S. Geological Survey | physical-events | monthly | magnitude threshold raised from the original M4.5+ idea to keep a single API request under USGS's 20,000-result cap; monthly counts are derived by counting raw catalog events per calendar month — resolved as legitimate (not a forbidden resampling of an existing series, since the catalog has no other native frequency), see decision-log.md |
| `wikimedia-enwiki-pageviews-monthly` | English Wikipedia total monthly pageviews | Wikimedia Foundation | culture-attention | monthly | project-wide aggregate via the Pageviews API, `NEEDS_VERIFICATION` on exact endpoint |
| `worldbank-internet-users-pct-annual` | Individuals using the Internet (% of population) | The World Bank | global-indicators | annual | indicator code `IT.NET.USER.ZS`, `NEEDS_VERIFICATION`; same org and domain as `worldbank-population-total-annual`, so it can't pair with it — proposed as a spare |

## Valid candidate pairings under `docs/data/pairing-rules.md`

All 8 datasets now have real fetched data (2026-07-09) — this section is updated against actual values, not proposals.

**`nasa-power-temp-annual` (weather) + `worldbank-gdp-growth-annual` (economy) is INVALID**, despite passing the domain/org/frequency checks — real data revealed `worldbank-gdp-growth-annual` contains negative values (2009: -1.33%, 2020: -2.89%) and therefore fails the normalization eligibility check in `docs/data/normalization-rules.md` (a series that crosses zero can't be indexed to 100 without distorting its shape). Per that document's rule, the pairing is rejected outright rather than worked around with an offset or a different baseline.

Verified by running the actual `checkPairing()` logic (`src/utils/pairings.ts`) against all 8 real series via `npm run generate:pairings`, not just checked by hand — that run caught a third valid pairing this document's earlier hand-check missed. Three pairings pass domain/org/frequency/overlap/normalization-eligibility checks:

- **`nasa-power-temp-annual`** (weather, annual, 1981–2025, all positive) **+ `worldbank-population-total-annual`** (global-indicators, annual, 1960–2025, all positive) — 45 shared points (min for annual is 6)
- **`nasa-power-temp-annual`** (weather) **+ `worldbank-internet-users-pct-annual`** (global-indicators, annual, 2005–2025, all positive) — different orgs, `weather`+`global-indicators` not blocked
- **`usgs-quakes-m5-5-monthly-count`** (physical-events, monthly, 2000-01–2026-06, all positive) **+ `wikimedia-enwiki-pageviews-monthly`** (culture-attention, monthly, 2015-07–2026-06, all positive) — 132 shared points (min for monthly is 14)

**Update, 2026-07-09:** all 8 datasets now have confirmed `licenseOrReuseNotes` (verified live via WebFetch against each source's actual terms page — see `decision-log.md`) and are `verificationStatus: "approved"`, `launchReady: true`. `npm run generate:pairings` re-ran and wrote all 3 pairings above to `src/data/pairings.json` for real (no longer an empty array). `npm run validate:pairings` confirms all 3 pass. This catalog is no longer "proposed" — it reflects what's actually shipped.

`worldbank-forest-area-pct-annual` (environment) and `worldbank-agricultural-land-pct-annual` (agriculture) still have no valid partner in this 8-dataset set — kept in the catalog for when a non-World-Bank, non-NASA-POWER source joins (e.g. BLS or OpenAQ).

## Status

Resolved — this catalog is implemented, not just proposed. Remaining open items (deploy target,
whether to register BLS/OpenAQ keys to expand past 3 pairings) are tracked in
`docs/source-of-truth/open-questions.md`, not here.
