# Data Methodology

This is the internal source of truth for how Meaningless Charts handles data. The public-facing Methodology page (Phase 8 content pass) is a simplified, friendlier version of this document — it must not contradict it.

## What's real and what isn't

The underlying dataset values are always real, fetched from the sources in `docs/data/approved-sources.md` via scripts in `scripts/fetch-data/`. Nothing in a launch-ready chart is fabricated.

What's manufactured is the *pairing* — two real datasets, chosen from unrelated domains, displayed together in a way that invites a false pattern-match. The "insight" text is intentionally overconfident and is immediately undercut by a reveal explaining why the comparison means nothing.

## Pipeline

1. **Fetch** — a script pulls real data from an approved source and writes a `SeriesFile` with full provenance (see `docs/data/source-verification-log.md` and CLAUDE.md's Data Acquisition Model).
2. **Validate** — the series is checked for missing/invalid values, and the dataset's metadata is checked against `DatasetMeta`'s required fields (`scripts/validate-datasets.ts`).
3. **Pair** — two launch-ready datasets are selected according to `docs/data/pairing-rules.md`. Invalid pairings (same domain, blocked domain pair, same source org, mismatched frequency, insufficient overlap) are rejected outright, not worked around.
4. **Normalize** — both series in the shared date window are indexed to 100 at the first shared date, per `docs/data/normalization-rules.md`. A series that fails the eligibility check (zero/negative baseline, negative values, zero-crossing) makes the pairing invalid; the app tries another pairing rather than distorting the data to make it render.
5. **Present** — the chart, fake insight, reveal, source panel (with both datasets' names, sources, date ranges, units, baseline values, and the shared window), and the required disclaimer are shown together. None of these five may be shown without the others.

## Language rules

Fake insights and any interpretive copy must avoid causal/statistical-authority language (`proves`, `causes`, `drives`, `predicts`, `explains`, `responsible for`, `significant relationship`, `evidence that`, `linked to`, `associated with`) except inside an explicit disclaimer negating it. Safer language: `appears to`, `seems to`, `visually resembles`, `creates the impression of`, `invites a misleading comparison`, `gives the feeling of`. Enforced by `/interpretation-audit` and, eventually, `npm run audit:claims`.

## Required disclaimer

Every launch-ready chart must display, verbatim:

> Shared movement does not imply relationship, influence, or causation.

## What this document does not cover yet

Exact fetcher implementations, the specific dataset catalog, and the correlation-score feature (explicitly out of MVP scope — see `.claude/agents/methodology-pairing.md`). Those live in `docs/data/dataset-catalog.md` and later phases.
