# QA Report

Run 2026-07-09 (see `/qa-launch` in `.claude/skills/qa-launch/SKILL.md`).

## Checklist

| Item | Status | Notes |
|---|---|---|
| All launch pages exist (home/generator, methodology, sources, about, 404) | Pass | `src/pages/index.astro`, `methodology.astro`, `sources.astro`, `about.astro`, `404.astro` all present and render real content. |
| No placeholder/"coming soon" content remains | Pass | The only `placeholder` hits are legitimate: the `SeriesProvenance` type value, pairing/validation logic that *rejects* placeholder provenance, and `ChartGenerator.astro`'s genuine empty-state message (real error state, not a stub). |
| Dataset metadata is complete (8 datasets) | Pass | All 8 entries in `src/data/datasets.json` have concrete `sourceUrl`, `unit`, `dateRange`, `methodologyNotes`, `licenseOrReuseNotes` — no `NEEDS_SOURCE` remaining. |
| Source links look real | Pass | Real World Bank / NASA POWER / USGS / Wikimedia API endpoints, no placeholder URLs. |
| Pairing rules enforced | Pass | All 3 entries in `src/data/pairings.json` checked against `BLOCKED_DOMAIN_PAIRS` and same-source-org rule in `src/data/types.ts` — none blocked, all same-frequency. Confirmed independently by `npm run validate:pairings`. |
| Every chart has a source panel and non-causal disclaimer | Pass | `ChartCard.astro` always renders `SourcePanel`; `SourcePanel.astro` always renders `chart.disclaimer`. `buildGeneratedChart()` throws if `checkPairing()` fails, so an invalid chart can't reach a page. |
| No fabricated data remains | Pass | All 8 files in `src/data/series/*.json` have `provenance: "script"` with a matching `fetchedBy` script path. |
| No unsupported causal/statistical claims remain | Pass | See `docs/qa/interpretation-review.md` — none found. |
| Basic accessibility acceptable | Pass, with one open note | Semantic headings, native `<details>/<summary>` reveal, `role="img"` + `aria-label` on chart canvas, `aria-label` on source panel, `rel="noopener noreferrer"` on external links. Open: "Generate another meaningless chart" swaps the active card without an `aria-live` announcement or focus move — fixed same session, see Decisions below. |

## Commands run

```
npm run build           → PASS (5 pages built, no errors)
npm run check            → PASS (0 errors, 0 warnings, 0 hints)
npm run test              → PASS (40/40 tests)
npm run validate:data     → PASS (8/8 launchReady, 0 errors)
npm run validate:pairings → PASS (3/3 pairings valid)
```

`npm run audit:claims` did not exist at audit time — see Decisions below.

## Blockers

None.

## High-priority fixes

- `docs/data/dataset-catalog.md` was stale (said pairings.json was empty and datasets were still
  license-gated, both no longer true). **Fixed same session** — see decision-log.md.

## Medium-priority fixes

- `npm run audit:claims` was referenced by `CLAUDE.md` and `docs/data/data-methodology.md` but
  didn't exist in `package.json`. **Fixed same session**: added `scripts/audit-claims.ts`, a real
  (non-fabricated) grep-based scanner over the same risk-word list this audit used, so the command
  now does real work instead of being aspirational text.
- `ChartGenerator.astro`'s chart-switch had no `aria-live` announcement for screen-reader users.
  **Fixed same session.**

## Launch recommendation

**Ready to launch** for the MVP scope defined in `CLAUDE.md`. No data-integrity, interpretation, or
build blockers. Deploy target is still an open `NEEDS_USER_DECISION` (see
`docs/source-of-truth/open-questions.md`) — the user has said not yet, working locally only.
