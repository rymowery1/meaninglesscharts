# scripts/fetch-data/

Fetcher scripts land here in Phase 4 (one per source: `bls.ts`, `worldbank.ts`, `nasa-power.ts`, `usgs.ts`, `wikimedia.ts`, `openaq.ts`).

`worldbank.ts` is written and type-checked. It has not been run — per CLAUDE.md's Data Acquisition Model, Claude writes fetchers, the user runs them. Run it with `npm run fetch:worldbank`; it will write 5 files into `src/data/series/` (one per World Bank candidate indicator in `docs/data/dataset-catalog.md`) or fail loudly and exit non-zero if any indicator can't be fetched.

Contract every fetcher must follow (see CLAUDE.md "Data Acquisition Model"):
- Read its API key, if any, from `process.env`.
- Fail loudly if the key is missing or the API returns non-200. Never fall back to sample data.
- Write exactly one series file per dataset into `src/data/series/`, with `provenance: "script"` and a real `fetchedAt` timestamp.
- Print a one-line summary: dataset id, point count, date range, output path.
- No hardcoded number arrays, no `Math.random()`, no silent try/catch, no "sample"/"demo"/"mock" data.
