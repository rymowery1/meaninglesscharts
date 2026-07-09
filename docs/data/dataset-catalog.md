# Dataset Catalog

Candidate datasets for the initial cache, drawn only from the four keyless approved sources (World Bank, NASA POWER, USGS, Wikimedia Pageviews) so a first chart can exist before BLS/OpenAQ key registration happens. **Nothing here is launch-ready.** Every entry is `verificationStatus: "proposed"`, `launchReady: false` — real values, exact date ranges, and exact API query parameters only get confirmed once a fetcher script in `scripts/fetch-data/` actually runs (Phase 4). This list needs a `NEEDS_USER_DECISION` sign-off before Phase 4 fetcher scripts get written for it.

Mirrored in `src/data/datasets.json` as `DatasetMeta` entries (metadata only — no `src/data/series/` files exist yet).

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

None of these are in `src/data/pairings.json` yet — `checkPairing()` also requires `launchReady: true` and `verificationStatus: "approved"`, and every dataset is still gated on `licenseOrReuseNotes` being `NEEDS_SOURCE`. `npm run generate:pairings` currently writes an empty array for exactly that reason; it reports the 3 above as "structurally ready, gated on launch status only" so it's visible what's one license confirmation away from shipping.

`worldbank-forest-area-pct-annual` (environment) and `worldbank-agricultural-land-pct-annual` (agriculture) have no valid partner in this 8-dataset set — kept in the catalog for when a non-World-Bank, non-NASA-POWER source joins (e.g. BLS or OpenAQ).

## Open items before this catalog can move past "proposed"

1. User sign-off on this specific list (or a different set of indicators).
2. A decision on `nasa-power-temp-annual`'s geography (single city vs. regional/global average).
3. Verification of whether annual/monthly frequencies are natively queryable per dataset above, versus requiring client-side aggregation (which the pairing rules forbid in the MVP).
4. Actual fetcher scripts (Phase 4) confirming real date ranges, point counts, and license terms.
