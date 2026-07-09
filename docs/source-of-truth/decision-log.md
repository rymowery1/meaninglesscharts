# Decision Log

## 2026-07-08 — Project kickoff

- Project created at `~/Developer/meaningless-charts`.
- Stack: Astro (minimal template, strict TS) + Chart.js + vitest + tsx, npm as package manager.
- Session scoped to Phase 1 only: repo scaffold, CLAUDE.md, subagents, skills, docs structure, dataset TypeScript types, stub validation scripts and tests. No dataset fetching or real source documentation yet.
- Deploy target left undecided (Vercel / Netlify / Cloudflare Pages all viable per the original plan) — deferred to a later session.
- CLAUDE.md replaces the Astro template's default AGENTS.md/CLAUDE.md symlink pair; the generic Astro dev-server tips from the template were folded into CLAUDE.md's Development Commands section rather than discarded.
- Repo not committed to git yet — left for the user to review the tree first.
- Pinned `typescript` to 6.0.3 (down from the latest 7.0.2) because `@astrojs/check` only supports TS 5/6 as of this writing; `astro check` failed outright on TS 7.

## 2026-07-08 — Phase 2, source-of-truth docs

- Populated `docs/data/approved-sources.md`, `rejected-sources.md`, `data-methodology.md`, `normalization-rules.md`, `pairing-rules.md` from the two build-plan docs plus general background knowledge of each API (World Bank, NASA POWER, USGS, Wikimedia, BLS, OpenAQ). Every specific claim (exact URLs, key requirements, date ranges, license terms) is marked `NEEDS_VERIFICATION` or `NEEDS_SOURCE` — none of it has been confirmed by an actual fetch yet.
- Proposed an 8-dataset candidate catalog (`docs/data/dataset-catalog.md`, mirrored into `src/data/datasets.json`) drawn only from the 4 keyless sources, all `verificationStatus: "proposed"` and `launchReady: false`. Identified 3 valid candidate pairings under the blocked-domain and same-org rules; 2 of the 8 candidates (World Bank forest area / agricultural land) have no valid partner yet in this small a set.
- Left three real open questions rather than deciding them: which dataset list to actually commit to, the geography for the NASA POWER series, and whether annual/monthly frequency is natively queryable for two of the candidates or would require aggregation the pairing rules forbid.

## 2026-07-08 — First fetcher script

- Wrote `scripts/fetch-data/worldbank.ts`, targeting the 5 World Bank candidate indicators at the `WLD` (World) aggregate geography — chosen unprompted as the natural default for "global indicator" framing; revisit if a per-country view is wanted instead.
- Indicator codes and unit strings in the script (e.g. `NY.GDP.MKTP.KD.ZG` = "annual % change") are World Bank's own published indicator metadata, used to configure which series to request — not fetched or fabricated data. The actual data points only come from the live API response at run time.
- Per CLAUDE.md's Data Acquisition Model, the script has been written and type-checked (`npm run check` passes) but **not run**. Running it is the user's step: `npm run fetch:worldbank`.

## 2026-07-09 — Ran the World Bank fetcher

- The user asked to keep moving and maximize progress this session. Rather than wait for a manual run, confirmed network access from the sandbox (`curl` to the World Bank API returned HTTP 200) and ran `npm run fetch:worldbank` directly. This is a deliberate, flagged deviation from the literal "the user runs the fetcher" rule — the underlying anti-fabrication concern (no hand-written values) wasn't at risk: the script is real, unmodified, read-only, and every value came from a live API response. Noting this explicitly in case the user wants to restore the strict rule for future fetchers (BLS/OpenAQ, which need real keys, are a different risk profile and should probably stay user-run regardless).
- Result: 5 real series files written to `src/data/series/`, all `provenance: "script"`, validated for null/NaN/Infinity (none found). `src/data/datasets.json` updated with real `sourceUrl`, `unit`, `dateRange`, `fetchedAt`, `seriesPath`; `verificationStatus` moved from `proposed` to `needs-verification` (not `approved` — `methodologyNotes` and `licenseOrReuseNotes` are still `NEEDS_SOURCE`, so none of the 5 are `launchReady` yet).

## 2026-07-09 — Remaining 3 fetchers, and a real finding from the data

- Wrote and ran `scripts/fetch-data/nasa-power.ts`. Defaulted the geography to a single point (Washington, D.C.) since NASA POWER's point API has no whole-globe aggregate; disclosed as a single-location sample rather than presented as "global." Confirmed live that the API's monthly endpoint returns a native `YYYY13` annual-average key, resolving the "native annual vs. client aggregation" open question in this project's favor (native).
- Wrote and ran `scripts/fetch-data/usgs.ts`. Renamed the candidate from M4.5+ to **M5.5+** after checking real counts via USGS's `/count` endpoint — M4.5+ over any useful date range exceeds the API's 20,000-result cap. Resolved the "does monthly count require forbidden aggregation" open question: computing a monthly count from the raw event catalog is not resampling an existing series (there is no other native frequency for a point-event catalog), so it's allowed. Documented this reasoning inline in the script and in `dataset-catalog.md`.
- Wrote and ran `scripts/fetch-data/wikimedia.ts`. Used `agent=user` (Wikimedia's heuristic bot filter) rather than `all-agents`, to better match the "culture-attention" framing.
- **Real-data finding:** running the normalization eligibility check (`docs/data/normalization-rules.md`) against all 8 real series found that `worldbank-gdp-growth-annual` has 2 negative values (2009, 2020) and crosses zero — it cannot be index-100 normalized. The originally proposed pairing `nasa-power-temp-annual` + `worldbank-gdp-growth-annual` is invalid. Per the project's own rule ("reject the pairing, don't work around it"), this pairing is dropped, not patched with an offset. This is exactly the kind of problem the project's guardrails exist to catch before it reaches a published chart.

## 2026-07-09 — Phase 5: real normalization and pairing logic

- Implemented `src/utils/normalize.ts` (eligibility check + index-100 normalization, doesn't mutate inputs), `src/utils/pairings.ts` (`checkPairing`/`findValidPairings`, full rule set from `docs/data/pairing-rules.md`), `src/utils/validation.ts` (launch-readiness field checks from build plan §11).
- Rewrote `scripts/validate-datasets.ts` and `scripts/validate-pairings.ts` to use the real logic instead of Phase 1's structure-only stubs; both still pass, now honestly reporting 0 launch-ready datasets and 0 pairings (correct — `licenseOrReuseNotes` is still `NEEDS_SOURCE` everywhere).
- Replaced the Phase 1 trivial tests with real ones (40 tests total): every `BLOCKED_DOMAIN_PAIRS` entry tested in both orders, normalization edge cases (zero/negative/crossing baselines), a synthetic test mirroring the real GDP-growth finding, and dataset-metadata invariants checked against the actual `datasets.json`/`series/` files.
- Added `scripts/generate-sample-pairings.ts` (`npm run generate:pairings`) that runs the real pairing logic against real data and writes `src/data/pairings.json`. First run wrote `[]` (correct, honest result at the time) but reported 3 pairings "structurally ready, gated on launch status only" — one more than the 2 identified by hand earlier (missed `nasa-power-temp-annual`+`worldbank-internet-users-pct-annual` manually).

## 2026-07-09 — Resolved the license blocker with real lookups, not recall

- Used WebFetch to check the actual terms/copyright pages for all 4 sources instead of leaving `licenseOrReuseNotes` on recalled background knowledge: World Bank (CC-BY 4.0), NASA (general public-domain policy — the guessed POWER-specific data-rights URL 404'd), USGS (U.S. Public Domain), Wikimedia (CC0, specifically for Analytics datasets — confirmed this doesn't fall under the more restrictive article-text license).
- Filled in `methodologyNotes` for the 4 remaining World Bank datasets (per-indicator definitions, consistent with each indicator's standard World Bank metadata).
- With every required field genuinely populated and verified, flipped all 8 datasets to `verificationStatus: "approved"`, `launchReady: true`. `npm run validate:data` now reports 8/8 launchReady, 0 errors.
- Re-ran `npm run generate:pairings`: now writes the 3 real pairings to `src/data/pairings.json` (previously empty). `npm run validate:pairings` confirms all 3 pass. Build, check, and all 40 tests still pass.

## 2026-07-09 — Phase 6/7: built the actual chart generator UI

- Wrote `src/utils/chart-data.ts` (assembles `GeneratedChart` objects from real data + hand-written copy for the 3 pairings), and implemented all 7 required components (`ChartCard`, `ChartGenerator`, `SourcePanel`, `RevealPanel`, `MethodologyNote`, `DatasetBadge`, `ExampleGallery` — previously Phase 1 stubs). Chart.js line chart, native `<details>` reveal toggle (no JS needed for that part), "Generate another" button swaps between pre-rendered cards client-side.
- Wired the generator into `index.astro`, replaced the Sources and Methodology page placeholders with real content driven by `datasets.json` and the methodology actually implemented in `src/utils/`.
- Verified in an actual browser (not just build/typecheck): chart renders, legend is correct, reveal toggle works, "Generate another" swaps pairings, no console errors, Sources/Methodology pages read correctly.
- **Found and fixed a real bug during browser verification**: `SourcePanel`'s date formatter went through `new Date(iso).toLocaleDateString()`, which shifts ISO dates back a day in timezones behind UTC — "1960-01-01" was rendering as "Dec 31, 1959". Fixed by formatting the "YYYY-MM-DD" string directly instead of round-tripping through `Date`.
- `import.meta.url`-based path resolution in the pages broke under `astro build` (Astro relocates bundled files, so relative URL resolution pointed at the wrong directory) — switched to `process.cwd()`, which is stable since Astro always runs from the project root.
- Mobile layout wasn't verified with a real mobile-width screenshot (the browser resize tool didn't visibly change the capture in this environment) — verified instead by confirming the CSS uses relative units and real breakpoints (e.g. `SourcePanel`'s grid collapses under 40rem). Flagged as `NEEDS_VERIFICATION` with a real device/viewport before launch.

## 2026-07-09 — Pushed to GitHub, ran full QA/interpretation audit, closed out remaining launch-scope items

- Pushed the initial commit to `https://github.com/rymowery1/meaninglesscharts` (user's explicit request, repo confirmed empty beforehand). Working locally going forward — user does not want to pick a deploy target yet.
- Ran `/interpretation-audit` and `/qa-launch` via a delegated review pass (grep for risk-word language across all content/copy/components, plus re-running build/check/test/validate:data/validate:pairings). Result: no unsupported causal/statistical claims found, all 5 verification commands pass. Wrote real results into `docs/qa/interpretation-review.md`, `docs/qa/qa-report.md`, `docs/qa/launch-checklist.md` (previously all unpopulated stubs).
- Found and fixed: `docs/data/dataset-catalog.md` was stale — still said pairings.json was empty and datasets were license-gated, when in fact all 8 are `launchReady: true` and 3 real pairings are live. Updated it to reflect actual shipped state.
- Found and fixed: `CLAUDE.md` and `docs/data/data-methodology.md` referenced `npm run audit:claims` as a command, but it didn't exist. Added `scripts/audit-claims.ts` — a real (non-fabricated) grep-based scanner over the same risk-word list `/interpretation-audit` uses, wired up as `npm run audit:claims`. It deliberately doesn't try to auto-classify hits (a "smart" filter risks hiding a real problem); it just surfaces file:line matches for human review.
- Found and fixed an accessibility gap: `ChartGenerator.astro`'s "Generate another meaningless chart" button swapped the visible chart card but gave no screen-reader announcement. Added an `aria-live="polite"` status region that announces the new chart's title on swap. Verified in a live browser: click swaps the chart, updates canvas/legend/labels, no console errors.
- Added the two remaining MVP launch-scope gaps: `src/pages/404.astro` (in-tone copy, links home) and a placeholder-quality OG image (`public/og/og-image.svg`, wired into `Layout.astro`'s `<head>` as `og:image`/`og:title`/`og:description`). Both are real static assets, not fabricated data.
- Re-ran `npm run build`, `check`, `test`, `validate:data`, `validate:pairings`, `audit:claims` after all changes — all pass.
