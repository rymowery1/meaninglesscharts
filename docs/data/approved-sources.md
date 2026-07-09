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
