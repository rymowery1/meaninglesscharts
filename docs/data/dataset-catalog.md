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
| `worldbank-life-expectancy-annual` | Life expectancy at birth, total (years) | The World Bank | global-indicators | annual | indicator code `SP.DYN.LE00.IN`, verified live 2026-07-10 |
| `worldbank-co2-emissions-per-capita-annual` | CO2 emissions per capita | The World Bank | environment | annual | indicator code `EN.GHG.CO2.PC.CE.AR5` (the legacy `EN.ATM.CO2E.PC` code is archived/deleted — confirmed live), verified 2026-07-10 |
| `worldbank-unemployment-rate-annual` | Unemployment rate (% of total labor force) | The World Bank | economy | annual | indicator code `SL.UEM.TOTL.ZS`, verified live 2026-07-10 |
| `worldbank-electric-power-consumption-annual` | Electric power consumption per capita | The World Bank | global-indicators | annual | indicator code `EG.USE.ELEC.KH.PC`, verified live 2026-07-10 (still actively published, despite being widely assumed discontinued) |
| `worldbank-mobile-subscriptions-annual` | Mobile cellular subscriptions (per 100 people) | The World Bank | global-indicators | annual | indicator code `IT.CEL.SETS.P2`, verified live 2026-07-10; values are ~0 before mobile telephony existed, which excludes it from pairing with any weather-domain partner whose shared window starts that early — see `docs/data/normalization-rules.md`'s baseline-too-small rule |

## Valid candidate pairings under `docs/data/pairing-rules.md`

All 8 datasets now have real fetched data (2026-07-09) — this section is updated against actual values, not proposals.

**`nasa-power-temp-annual` (weather) + `worldbank-gdp-growth-annual` (economy) is INVALID**, despite passing the domain/org/frequency checks — real data revealed `worldbank-gdp-growth-annual` contains negative values (2009: -1.33%, 2020: -2.89%) and therefore fails the normalization eligibility check in `docs/data/normalization-rules.md` (a series that crosses zero can't be indexed to 100 without distorting its shape). Per that document's rule, the pairing is rejected outright rather than worked around with an offset or a different baseline.

Verified by running the actual `checkPairing()` logic (`src/utils/pairings.ts`) against all 8 real series via `npm run generate:pairings`, not just checked by hand — that run caught a third valid pairing this document's earlier hand-check missed. Three pairings pass domain/org/frequency/overlap/normalization-eligibility checks:

- **`nasa-power-temp-annual`** (weather, annual, 1981–2025, all positive) **+ `worldbank-population-total-annual`** (global-indicators, annual, 1960–2025, all positive) — 45 shared points (min for annual is 6)
- **`nasa-power-temp-annual`** (weather) **+ `worldbank-internet-users-pct-annual`** (global-indicators, annual, 2005–2025, all positive) — different orgs, `weather`+`global-indicators` not blocked
- **`usgs-quakes-m5-5-monthly-count`** (physical-events, monthly, 2000-01–2026-06, all positive) **+ `wikimedia-enwiki-pageviews-monthly`** (culture-attention, monthly, 2015-07–2026-06, all positive) — 132 shared points (min for monthly is 14)

**Update, 2026-07-09:** all 8 datasets now have confirmed `licenseOrReuseNotes` (verified live via WebFetch against each source's actual terms page — see `decision-log.md`) and are `verificationStatus: "approved"`, `launchReady: true`. `npm run generate:pairings` re-ran and wrote all 3 pairings above to `src/data/pairings.json` for real (no longer an empty array). `npm run validate:pairings` confirms all 3 pass. This catalog is no longer "proposed" — it reflects what's actually shipped.

`worldbank-forest-area-pct-annual` (environment) and `worldbank-agricultural-land-pct-annual` (agriculture) still have no valid partner in this 8-dataset set — kept in the catalog for when a non-World-Bank, non-NASA-POWER source joins (e.g. BLS or OpenAQ).

## Update, 2026-07-10: 5 more World Bank indicators added

Expanded from 8 to 13 datasets, all still from the keyless World Bank Indicators API (see
`docs/data/approved-sources.md` — a Kaggle key the user offered was declined, since Kaggle is on
CLAUDE.md's Avoid list; a plane-crash-fatality database was also declined, since scraping it would
violate the no-scrapers rule and pairing fatality data risks the "don't make sensitive human
outcomes the punchline" rule). All 5 new indicator codes were verified against the live API before
being added — one initially-assumed code (`EN.ATM.CO2E.PC` for CO2 emissions) turned out to be
archived; `EN.GHG.CO2.PC.CE.AR5` is the live replacement.

`npm run generate:pairings` found 3 new valid pairings (all partnered with `nasa-power-temp-annual`,
since every new dataset is annual World Bank data and can't pair with another World Bank dataset —
same-source-organization is blocked): life expectancy, unemployment rate, and electric power
consumption. `worldbank-co2-emissions-per-capita-annual` (environment domain) has no valid partner
yet — `environment` is blocked from pairing with `weather`, its only same-frequency non-World-Bank
option. `worldbank-mobile-subscriptions-annual` structurally could pair with `nasa-power-temp-annual`
but is rejected by the new baseline-too-small normalization rule (see `normalization-rules.md`) —
its 1981 value (0.0015 subscriptions/100 people) would blow the index scale up ~7,400,000% by 2024.

Now 6 total pairings in `src/data/pairings.json` (up from 3), all with hand-written chart copy —
see `docs/content/chart-copy.md`, `fake-insight-templates.md`, `reveal-templates.md`.

## Update, 2026-07-10 (continued): 4 more datasets, one real seasonality finding

Expanded from 13 to 17. Rather than adding more `global-indicators` (already 5 of 13, unable to
pair with each other), picked underrepresented domains and one new frequency:

- `worldbank-inflation-annual` (economy, `FP.CPI.TOTL.ZG`) — verified live, no deflation years in
  the world aggregate, so normalization-eligible.
- `worldbank-renewable-energy-pct-annual` (environment, `EG.FEC.RNEW.ZS`) — verified live; reporting
  lags to 2020 (IEA energy-balance data takes years to finalize).
- `worldbank-cereal-yield-annual` (agriculture, `AG.YLD.CREL.KG`) — verified live.
- `nasa-power-temp-monthly` — extended `scripts/fetch-data/nasa-power.ts` to also write the API's
  native monthly keys (previously only the annual "13th month" key was used), from the same API
  call as `nasa-power-temp-annual`.

**Finding:** `nasa-power-temp-monthly` has no valid pairing partner. A single mid-latitude city's
monthly temperature crosses zero every winter (min -4.89°C, and the 1981-01 baseline itself is
negative), so it fails the existing negative-baseline/crosses-zero eligibility checks in any
realistic multi-year shared window — this is real physics, not a bug, and didn't need a new
normalization rule (unlike the mobile-subscriptions case). Kept in the catalog as real, verified
data regardless, same precedent as `co2-emissions-per-capita`/`forest-area`/`agricultural-land`.

Of the 4 new datasets, only `worldbank-inflation-annual` (economy, not blocked from weather)
produced a new valid pairing, again with `nasa-power-temp-annual` — `environment` and `agriculture`
are both permanently blocked from pairing with `weather`, so renewable-energy and cereal-yield have
no partner either. This is a structural ceiling: as long as `nasa-power-temp-annual` is the only
non-World-Bank annual dataset, every new World Bank annual indicator can only ever open a pairing
if it's `economy`, `global-indicators`, or `culture-attention` domain — adding more `environment`/
`agriculture` datasets doesn't grow pairing count without a second non-World-Bank annual source.

Now 7 total pairings, 17 datasets.

## Status

Resolved — this catalog is implemented, not just proposed. Remaining open items (deploy target,
whether to register BLS/OpenAQ keys to expand pairing variety further) are tracked in
`docs/source-of-truth/open-questions.md`, not here.
