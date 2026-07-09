# Source Verification Log

## 2026-07-09 — World Bank Indicators API

- Confirmed reachable, keyless, returns HTTP 200 for `https://api.worldbank.org/v2/country/WLD/indicator/{code}?format=json&per_page=1000`.
- Confirmed real data for 5 indicators: `NY.GDP.MKTP.KD.ZG`, `SP.POP.TOTL`, `AG.LND.FRST.ZS`, `AG.LND.AGRI.ZS`, `IT.NET.USER.ZS`, all at the `WLD` (World) aggregate.
- Response shape matches what was assumed when the fetcher was written: a 2-element array `[metadata, dataPoints[]]`, with `value: null` for years without data (correctly dropped, not filled).
- Not yet confirmed: exact license terms (World Bank Open Data's CC BY-4.0 license is widely documented but hasn't been checked against the current terms-of-use page), and per-indicator methodology notes beyond the unit label.

## 2026-07-09 — NASA POWER

- Confirmed reachable, keyless, HTTP 200 for `https://power.larc.nasa.gov/api/temporal/monthly/point`.
- Confirmed live (via a direct probe before writing the fetcher) that the monthly endpoint returns a `YYYY13` key per year that is NASA POWER's own native annual average — not derived by resampling in this project.
- Confirmed the API's published data currently ends at 2025 (not yet caught up to the current year); the fetcher handles this by reading the API's own "available to YYYY" error message rather than hardcoding a cutoff year.
- Not yet confirmed: NASA data license/reuse terms.

## 2026-07-09 — USGS Earthquake Catalog

- Confirmed reachable, keyless, HTTP 200 for `https://earthquake.usgs.gov/fdsnws/event/1/query`.
- Confirmed the 20,000-result cap via the API's own `/count` endpoint before writing the fetcher: M4.5+ over 10 years alone is ~74,000 events (too many for one request), M5.5+ since 2000 is ~12,800–13,100 (safe). Raised the magnitude threshold to M5.5+ for this reason.
- Not yet confirmed: USGS data license/reuse terms (expected public domain as U.S. government work, not checked against an actual terms page).

## 2026-07-09 — Wikimedia Pageviews API

- Confirmed reachable, keyless (User-Agent header sent per API etiquette, not because it's required), HTTP 200 for `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/`.
- Confirmed data starts 2015-07 and the monthly endpoint only returns completed months (requesting through today returned data only up to the prior month, no error, no partial-month entry).
- Not yet confirmed: Wikimedia data license/reuse terms (expected CC0-ish, not checked against an actual terms page).

## 2026-07-09 — License verification (all 4 sources)

Fetched the actual terms/copyright pages rather than relying on recalled background knowledge:
- World Bank: `datacatalog.worldbank.org/public-licenses` → CC-BY 4.0, requires attribution.
- NASA: `nasa.gov/nasa-brand-center/images-and-media/` → generally public domain / not copyrighted, attribution requested. The POWER-specific data-rights URL guessed earlier (`power.larc.nasa.gov/docs/methodology/data-rights/`) returned 404 — used NASA's general policy instead, noted as such.
- USGS: `usgs.gov/information-policies-and-instructions/copyrights-and-credits` → U.S. Public Domain, credit requested.
- Wikimedia: `dumps.wikimedia.org/legal.html` → CC0 specifically for Analytics datasets (pageviews included), separate from the more restrictive CC BY-SA/GFDL that applies to article text.

All 8 datasets updated with real `licenseOrReuseNotes` and (for the 4 remaining World Bank entries) real `methodologyNotes`, then flipped to `verificationStatus: "approved"`, `launchReady: true`.
