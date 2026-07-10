# Chart Style

Conventions for `ChartCard.astro` / `ChartGenerator.astro`, informed by a Bloomberg Markets–
inspired data-visualization style guide the user supplied 2026-07-10 (colors and chart styling
only — the guide's table/sparkline/heatmap/candlestick sections don't apply, this site has none of
those). See `docs/design/color-scale.md` for the color reversal this guide prompted.

## Colors

- Series A: `var(--color-text)` (`#111111`, near-black)
- Series B: `var(--color-muted)` (`#7a7a7a`, muted gray)
- Gridlines, axis borders, tooltip border: `var(--color-border)` (`#d9d9d6`)
- Axis ticks, legend labels: `var(--color-muted)`
- Tooltip background: `var(--color-bg)`; tooltip text: `var(--color-text)`

Deliberately neutral, not the divergent scale — see `docs/design/color-scale.md` for why.

## Line style

- Stroke width: 2px (within the style guide's 1.5–2px recommendation)
- No point markers (`pointRadius: 0`), slight curve (`tension: 0.15`)
- Legend shown (this site always has exactly 2 series per chart, so a legend is warranted per
  the guide's "use legends only when there are multiple series" rule)
- Tooltip is compact and shows exact values to 1 decimal place, not just a hover highlight

## What we didn't adopt

The source style guide is written for a financial terminal (tickers, candlesticks, sparklines,
heatmaps, time-range tabs, multi-security tables). None of that exists in Meaningless Charts —
one line chart per generated pairing, no live/intraday data, no multi-security scanning — so those
sections were intentionally not built. Scope for this rollout was colors, borders, and chart
styling only, per an explicit decision with the user; the type scale, spacing, and the homepage's
large Display XL hero were left untouched.
