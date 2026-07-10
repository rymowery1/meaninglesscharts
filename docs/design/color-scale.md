# Divergent Color Scale

13-step scale provided by the user, teal-green to red. Defined as `--scale-00` through
`--scale-12` in `src/styles/global.css`.

## Update, 2026-07-10: reverted from badges/chart lines

The table below documented an earlier assignment of this scale to chart lines and dataset domain
badges. That was **reverted** the same day, after the user supplied a data-visualization style
guide whose own color rule states: "Green-to-red scale is reserved for value movement or
performance intensity. Do not use this scale for arbitrary categories." Two problems with the
original assignment:

- **Domain badges** (economy, weather, etc.) are categorical labels, not performance data — using
  this scale for them was exactly the "arbitrary categories" case the rule warns against. Reverted
  to a neutral outlined pill (`--color-border` / `--color-muted`, no fill).
- **Chart lines** (series A/B) are two unrelated, arbitrary datasets with no real "winner." Coloring
  one green and one red borrows gain/loss semantics that don't apply and could misleadingly imply
  one series is "losing" — the opposite of what this site is trying to communicate. Reverted to
  neutral `--color-text` / `--color-muted`.

The scale itself (`--scale-00` through `--scale-12`) stays defined in `global.css`, unused, in case
a future feature genuinely needs a value-movement scale (see `docs/design/chart-style.md`).

## Original 13 steps (for reference)

| Step | Hex |
|---|---|
| 00 | `#00876c` |
| 01 | `#469a72` |
| 02 | `#6eac7a` |
| 03 | `#94be85` |
| 04 | `#b8d092` |
| 05 | `#dce2a2` |
| 06 | `#fff4b6` |
| 07 | `#f9d996` |
| 08 | `#f4bd7b` |
| 09 | `#efa066` |
| 10 | `#e88258` |
| 11 | `#e06152` |
| 12 | `#d43d51` |
