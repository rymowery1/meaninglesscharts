# Approved Sources

Everything below is background knowledge about each API, not a verified fact. Nothing here has been confirmed by an actual successful fetch yet — that only happens once a fetcher script in `scripts/fetch-data/` runs successfully (Phase 4). Until then, treat every "no key required," rate limit, and date range as `NEEDS_VERIFICATION`. Do not mark a dataset `launchReady: true` on the strength of this document alone.

Status values used below follow `DatasetVerificationStatus`: `approved` (source family cleared for use), `proposed`, `needs-source`, `needs-verification`, `rejected`.

## Keyless priority (start here)

### World Bank Indicators API
- **Organization:** The World Bank
- **Type:** intergovernmental
- **Docs:** https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation
- **Base URL:** https://api.worldbank.org/v2/
- **Access:** public-api, no key historically required — `NEEDS_VERIFICATION`
- **Cost:** free — `NEEDS_VERIFICATION`
- **Coverage:** thousands of country-level economic, social, and environmental indicators, generally annual frequency, many series back to the 1960s
- **Bias risk:** medium-low — country reporting quality varies, some indicators have significant gaps for smaller/lower-income countries
- **License/reuse:** CC-BY 4.0, confirmed via https://datacatalog.worldbank.org/public-licenses on 2026-07-09. Requires attribution.
- **Status:** approved

### NASA POWER
- **Organization:** NASA Langley Research Center (POWER project — Prediction Of Worldwide Energy Resources)
- **Type:** government
- **Docs:** https://power.larc.nasa.gov/docs/services/api/
- **Base URL:** https://power.larc.nasa.gov/api/
- **Access:** public-api, no key required — `NEEDS_VERIFICATION`
- **Cost:** free — `NEEDS_VERIFICATION`
- **Coverage:** satellite/model-derived meteorological and solar parameters (temperature, precipitation, radiation, etc.) for any point or regional average, at daily, monthly, or climatological (annual) frequency. Data generally starts in the early 1980s (satellite era) — `NEEDS_VERIFICATION`
- **Bias risk:** low — model/satellite-derived, but resolution and accuracy vary by region
- **License/reuse:** NASA content is generally public domain / not copyrighted in the US, confirmed via https://www.nasa.gov/nasa-brand-center/images-and-media/ on 2026-07-09. No POWER-specific data-rights page was found (404); this is NASA's general policy applied as the best available source.
- **Status:** approved

### USGS Earthquake Catalog (FDSN Event Web Service)
- **Organization:** U.S. Geological Survey
- **Type:** government
- **Docs:** https://earthquake.usgs.gov/fdsnws/event/1/
- **Base URL:** https://earthquake.usgs.gov/fdsnws/event/1/query
- **Access:** public-api, no key required — `NEEDS_VERIFICATION`
- **Cost:** free — `NEEDS_VERIFICATION`
- **Coverage:** global earthquake event catalog with magnitude, location, and time; comprehensive global M4.5+ coverage generally available from 1900s onward, denser/lower-magnitude coverage in more recent decades — `NEEDS_VERIFICATION`
- **Bias risk:** low-medium — detection capability has improved over time, so raw event counts are not fully comparable across long historical windows; a fixed magnitude threshold and a recent-enough window reduce this
- **License/reuse:** U.S. Public Domain, confirmed via https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits on 2026-07-09. Credit requested: "U.S. Geological Survey".
- **Status:** approved

### Wikimedia Analytics / Pageviews API
- **Organization:** Wikimedia Foundation
- **Type:** nonprofit
- **Docs:** https://wikimedia.org/api/rest_v1/
- **Base URL:** https://wikimedia.org/api/rest_v1/metrics/pageviews/
- **Access:** public-api, no key required, but requires a descriptive `User-Agent` header per Wikimedia's API etiquette — `NEEDS_VERIFICATION`
- **Cost:** free
- **Coverage:** per-article or per-project pageview counts, hourly/daily/monthly; data available from July 2015 onward — `NEEDS_VERIFICATION`
- **Bias risk:** medium — pageviews reflect attention/virality, bot traffic filtering is imperfect, and spikes can come from off-wiki events unrelated to any "real" trend
- **License/reuse:** CC0 (public domain) specifically for Analytics datasets, confirmed via https://dumps.wikimedia.org/legal.html on 2026-07-09.
- **Status:** approved

## Keyless — added 2026-07-10 (funny-first expansion, Batch B: new source organizations)

These were added after the original four to break the structural pairing ceiling (see
`dataset-catalog.md`): more source organizations = more legal pairings, and genuinely non-typical series.

### NOAA Global Monitoring Laboratory — Mauna Loa CO₂
- **Organization:** NOAA Global Monitoring Laboratory (GML); historical 1958–74 data from Scripps (C.D. Keeling)
- **Type:** government
- **Base URL:** https://gml.noaa.gov/webdata/ccgg/trends/co2/ (plain CSV: `co2_mm_mlo.csv`, `co2_annmean_mlo.csv`)
- **Access:** public download, no key required — verified live 2026-07-10 (parsed successfully)
- **Cost:** free
- **Coverage:** the Keeling curve — monthly mean CO₂ from 1958, annual mean from 1959, in ppm. Strictly positive.
- **Bias risk:** low — single well-characterized observatory, the canonical global reference series.
- **License/reuse:** U.S. federal data, made freely available; NOAA requests citation of NOAA/GML (Xin Lan)
  and Scripps (C.D. Keeling) for the early portion. Terms confirmed in the CSV header + gml.noaa.gov, 2026-07-10.
- **Status:** approved

### WDC-SILSO, Royal Observatory of Belgium — sunspot numbers
- **Organization:** WDC-SILSO, Royal Observatory of Belgium (Brussels)
- **Type:** academic / government observatory
- **Base URL:** https://www.sidc.be/SILSO/DATA/ (semicolon CSV: `SN_m_tot_V2.0.csv`)
- **Access:** public download, no key required — verified live 2026-07-10 (parsed successfully)
- **Cost:** free
- **Coverage:** monthly mean total sunspot number (v2.0), continuous from 1749. Value 0.0 is a real deep-minimum
  reading; −1 marks missing. A long window that includes a deep solar minimum can have a baseline near 0, which
  can trip the normalization eligibility check — expected, handled by rejecting that pairing.
- **Bias risk:** low-medium — historical reconstruction; early centuries less certain than the modern record.
- **License/reuse:** **CC BY-NC 4.0 (NonCommercial)** — confirmed via sidc.be 2026-07-10. More restrictive than the
  catalog's other sources; usable for this non-commercial project but **NEEDS_USER_DECISION** before launch if the
  site is ever monetized. Required credit: "Source: WDC-SILSO, Royal Observatory of Belgium, Brussels".
- **Status:** approved (data), license flagged for user decision — kept `launchReady: false` until confirmed.

### Google Books Ngram Viewer — word frequency
- **Organization:** Google Books Ngram Viewer
- **Type:** open-data (Google)
- **Base URL:** https://books.google.com/ngrams/json (the JSON endpoint the public viewer uses)
- **Access:** public JSON endpoint, no key required — verified live 2026-07-10 (parsed successfully). NOTE:
  this endpoint is **not a formally documented API**; it powers the public viewer and could change without
  notice. The fetcher fails loudly (asserts one value per year) rather than writing a misaligned series.
- **Cost:** free
- **Coverage:** yearly relative frequency of a word/phrase across the Google Books corpus. `en-2019` corpus
  runs 1800→2019 (220 annual points at `smoothing=0`). Values are tiny positive proportions.
- **Bias risk:** medium — reflects the changing composition of digitized books and OCR quality, not spoken
  usage; a word's frequency can be distorted by scanning artifacts, especially pre-1900.
- **License/reuse:** the underlying Ngram datasets are released CC BY 3.0 by Google. Credit "Google Books
  Ngram Viewer". Confirmed via https://books.google.com/ngrams/info (checked 2026-07-10).
- **Status:** approved (undocumented-endpoint caveat noted above)

## Manual-download sources (Batch 4 — user supplies the file, converter validates)

These have no clean free API. The user downloads/compiles a file into `data-import/`; a converter in
`scripts/fetch-data/` writes the series with `provenance: "manual-download"`. See `data-import/README.md`.

### Apple Inc. — iPhone unit sales (SEC EDGAR 10-K filings)
- **Organization:** Apple Inc. (Form 10-K, via SEC EDGAR)
- **Type:** open-data (public company filings)
- **Base URL:** https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-K
- **Access:** manual-cache — no free units API exists; numbers are compiled by the user from the filings.
- **Cost:** free
- **Coverage:** annual iPhone units sold, FY2007–FY2018 only (Apple stopped disclosing unit sales after
  FY2018). Apple's fiscal year ends late September, so a fiscal year ≠ the calendar year — disclosed.
- **Bias risk:** low — the company's own audited figures; but single-company commercial data, and the
  series is short and ends in 2018.
- **License/reuse:** factual financial figures disclosed in SEC filings are not copyrightable; cite
  "Apple Inc. Form 10-K (SEC EDGAR)". Public.
- **Status:** approved (manual-download; each value must cite the 10-K it came from)

### RIAA — U.S. Sales Database (recorded-music revenue by format)
- **Organization:** Recording Industry Association of America (RIAA)
- **Type:** nonprofit / industry association
- **Base URL:** https://www.riaa.com/u-s-sales-database/
- **Access:** manual download (interactive tool export); no documented API — `NEEDS_VERIFICATION` that a
  clean CSV export exists (checked 2026-07-10; page is JS-driven and directs data questions to
  research@riaa.com).
- **Cost:** free to view
- **Coverage:** U.S. recorded-music revenue by format (LP/EP, vinyl single, cassette, CD, downloads,
  streaming subscriptions, etc.), annual, ~1973→present, nominal and inflation-adjusted.
- **Bias risk:** low-medium — U.S.-only, wholesale/estimated retail value; format definitions change over time.
- **License/reuse:** **NEEDS_VERIFICATION** — reuse terms are not clearly stated (site directs to
  research@riaa.com). Treat as unconfirmed; datasets stay `launchReady:false` until the license is
  confirmed, same handling as SILSO's non-commercial flag.
- **Status:** proposed (data usable once downloaded; **license gate** before launch)

## Keyed priority (defer until the keyless four are working end to end)

### U.S. Bureau of Labor Statistics (BLS) Public Data API
- **Organization:** U.S. Bureau of Labor Statistics
- **Type:** government
- **Docs:** https://www.bls.gov/developers/
- **Base URL:** https://api.bls.gov/publicAPI/v2/timeseries/data/
- **Access:** public-api; v1 works keyless with tight limits, v2 requires a registration key for higher limits — `NEEDS_VERIFICATION`
- **Cost:** free-with-key
- **Coverage:** CPI, employment, wages, and other US labor/economic series, generally monthly or annual
- **Bias risk:** low — official government statistical methodology, but subject to periodic revision
- **License/reuse:** U.S. government work, generally public domain — `NEEDS_SOURCE`
- **Status:** approved (key registration required before use — see `.env.example`)

### OpenAQ
- **Organization:** OpenAQ (nonprofit)
- **Type:** nonprofit
- **Docs:** https://docs.openaq.org/
- **Base URL:** https://api.openaq.org/v3/
- **Access:** public-api, API key required for v3 — `NEEDS_VERIFICATION`
- **Cost:** free-with-key
- **Coverage:** aggregated ground-station air quality measurements (PM2.5, PM10, O3, NO2, etc.) from many countries and networks, station-level, variable history length
- **Bias risk:** medium — station density is uneven globally, so "global" air quality series are really a patchwork of whichever stations report
- **License/reuse:** OpenAQ republishes third-party government/network data under varying licenses per source — `NEEDS_SOURCE`, check per-station attribution requirements
- **Status:** approved (key registration required before use — see `.env.example`)

## Deferred (not rejected — out of scope for the initial dataset cache)

FRED, NOAA Climate Data Online, USDA NASS Quick Stats, U.S. Census API, National Park Service Visitor Use Statistics. No research has been done on these yet. Revisit only if the approved-priority sources prove insufficient.
