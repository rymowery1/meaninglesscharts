# Normalization Rules

Source: build plan §12.5. This is binding for `src/utils/normalize.ts` (Phase 5) and its tests.

## Method

Index both series to 100 at the first shared date: `value / baseline * 100`, where `baseline` is each series' own value at the first date both series have data for. This is the only normalization method in the MVP. A future `normalizationMethod` field could allow min-max or z-score scaling for series that fail the eligibility check below, but that requires a deliberate type change to `GeneratedChart` and explicit user approval — not a quiet code path.

## Eligibility check (run before normalizing)

A series is **not eligible** for index-to-100 if, within the shared window:
- the baseline value (value at the first shared date) is exactly 0
- the baseline value is negative
- the series contains any negative value
- the series crosses zero

Reasons: a zero baseline divides by zero. A negative baseline flips the direction of the whole line — a rising series would render as falling. A zero-crossing series has a discontinuity that isn't visible to the reader and silently misrepresents the shape.

Series known to be at risk: temperature anomalies (negative), net migration (negative), current account balance (crosses zero), earthquake counts in a quiet window (zero), air-quality readings after a sensor outage (zero).

## What to do when a series is ineligible

- Do not substitute a different baseline date to make it work.
- Do not add a constant offset to lift the series above zero.
- Do not clamp, floor, or absolute-value the data.
- Do not silently drop the offending points.
- **Reject the pairing.** Try another pairing. If none exists, show the error state.

Choosing a different baseline date to make a chart render is the same "silently change date ranges to make charts look better" failure CLAUDE.md already forbids, wearing a different hat.

## Missing values

- A series may not contain `null`, `undefined`, `NaN`, or `Infinity` — the validator rejects the file outright.
- Gaps are represented by the absence of a date, never by a null value.
- The shared window is the intersection of the two series' actual dates — gaps are never interpolated, forward-filled, or back-filled.
- If the intersection falls below the minimum point count for the frequency (see `docs/data/pairing-rules.md`), the pairing is invalid.
- The chart draws only the shared window; the source panel shows both the dataset's full date range and the shared window actually used.

## Floating point and display

- Normalize in full float precision; round only at render time, to one decimal place.
- The source panel shows original units and original values, never the indexed value alone.
- The baseline date and both series' baseline values (in original units) appear in the source panel.

## Required source panel fields (in addition to the base set in CLAUDE.md)

- Normalization baseline date
- Dataset A baseline value, in original units
- Dataset B baseline value, in original units
- Shared window start and end
- Point count

Without the baseline values, a reader can't reconstruct the original series from the indexed chart, and the site's "auditable" claim isn't true.
