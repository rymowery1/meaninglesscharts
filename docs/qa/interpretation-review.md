# Interpretation Review

Run 2026-07-09 (see `/interpretation-audit` in `.claude/skills/interpretation-audit/SKILL.md`).

## Method

Grepped the full repo for risky language (`proves`, `causes`, `drives`, `predicts`, `explains`,
`responsible for`, `significant relationship`, `evidence that`, `linked to`, `associated with`,
`correlation`, `causation`, `statistically significant`, `trend indicates`, `data shows`,
`data proves`), then read every hit in context against:

- `docs/content/chart-copy.md`
- `docs/content/fake-insight-templates.md`
- `docs/content/reveal-templates.md`
- `docs/data/data-methodology.md`
- `docs/data/pairing-rules.md`
- every `.astro` component/page and `src/utils/chart-data.ts`

## Findings

None. Every hit was one of:

- A policy statement describing what language is *forbidden* (e.g. `docs/data/data-methodology.md`,
  `docs/data/pairing-rules.md`, `fake-insight-templates.md`).
- The disclaimer itself, verbatim, correctly negating causation — "Shared movement does not imply
  relationship, influence, or causation." (`src/data/types.ts`, `src/components/Footer.astro`,
  `src/pages/methodology.astro`, `docs/data/data-methodology.md`).

The three shipped fake-insight/reveal pairs (`worldbank-population-total-annual` +
`nasa-power-temp-annual`, `nasa-power-temp-annual` + `worldbank-internet-users-pct-annual`,
`usgs-quakes-m5-5-monthly-count` + `wikimedia-enwiki-pageviews-monthly`) consistently use hedged
language ("seems to", "inviting the eye to", "as if") and every reveal explicitly states the two
series are unrelated. No claim asserts a real relationship.

| Claim | Location | Status | Recommended fix |
|---|---|---|---|
| — | — | — | No entries. Nothing required a rewrite, source, or removal. |

## Next audit

Re-run this whenever `docs/content/*.md` or `src/utils/chart-data.ts`'s `CHART_COPY` changes, or a
new pairing is added.
