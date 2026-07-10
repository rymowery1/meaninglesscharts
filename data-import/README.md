# Manual-download data imports

Raw source files for **manual-download** datasets live here. A converter script in
`scripts/fetch-data/` reads a file from this folder and writes a series file to
`src/data/series/` with `provenance: "manual-download"`. Per the project's rules, the
**numbers must come from these user-provided files** — never typed by hand into code or a
series file. After importing, record the source URL + date in
`docs/data/source-verification-log.md`.

The raw data files (`*.csv`) are **git-ignored** (unconfirmed license / bulk source data);
only this README and the `*.template.csv` files are committed.

## 1. iPhone units sold per fiscal year → `apple-iphone-units.csv`

1. Copy the template: `cp apple-iphone-units.template.csv apple-iphone-units.csv`
2. Fill one row per fiscal year (FY2007–FY2018) from **Apple's own 10-K filings** on
   SEC EDGAR: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-K
   - `fiscalYear` — the 4-digit Apple fiscal year (fiscal year ends late September).
   - `unitsMillions` — iPhone units sold that year, in millions (as reported in the 10-K).
   - `source10kUrl` — the exact SEC EDGAR URL for the 10-K the number came from (required — it
     keeps the value auditable; the converter rejects rows without it).
   - Apple stopped disclosing unit sales after FY2018, so the series ends there.
3. Run: `npm run fetch:iphone`

## 2. RIAA U.S. recorded-music revenue by format → `riaa-us-sales.csv`

1. Go to the RIAA U.S. Sales Database: https://www.riaa.com/u-s-sales-database/
2. Export / download the underlying data as CSV into `data-import/riaa-us-sales.csv`
   (revenue by format, by year — inflation-adjusted preferred). If no CSV export is offered,
   paste the table into a CSV with at least `Format`, `Year`, and a value/revenue column
   (a `Metric` column is fine too — the converter detects columns by name).
3. Run: `npm run fetch:riaa`
   - If a format group doesn't match, the converter prints the **actual** format labels found;
     tell Claude and it will adjust `FORMAT_GROUPS` in `scripts/fetch-data/riaa-revenue.ts`.
   - RIAA reuse license is unconfirmed — these datasets stay `launchReady:false` until verified.
