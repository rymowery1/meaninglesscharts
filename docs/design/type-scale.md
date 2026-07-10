# Type Scale

Baseline provided by the user, with sizing options added for roles the site actually needed.
Implemented as CSS custom properties in `src/styles/global.css`.

## Fonts

- **Sans / display**: Epilogue, loaded via Google Fonts CDN link in `Layout.astro`.
- **Serif**: real Baskerville isn't available as a webfont, so the stack tries the system font
  first (`Baskerville`, present on macOS/iOS), then falls back to Libre Baskerville (the open
  equivalent, loaded via the same Google Fonts link) before further fallbacks.
- `--font-sans` and `--font-serif` are the existing custom property names — repointing their
  values (rather than renaming) meant most components inherited the new fonts without edits.

## Ramp

| Role | Font | Size | Line height | Letter spacing | Custom properties |
|---|---|---|---|---|---|
| Display XL | Epilogue | 100px (clamps down on narrow viewports) | 95px | -4px | `--text-display-xl-*` |
| Display L | Epilogue | 56px (clamps) | 56px | -3px | `--text-display-l-*` |
| Headline M | Epilogue | 30px (clamps) | 33px | -1px | `--text-headline-m-*` |
| Body Sans | Epilogue | 16px | normal | 0 | `--text-body-sans-size` |
| Label / Eyebrow | Epilogue | 13px | normal | 0 | `--text-label-size` |
| Serif Body L | Baskerville | 20px | normal | 0 | `--text-serif-l-size` |
| Serif Body M | Baskerville | 16px | normal | 0 | `--text-serif-m-size` |
| Serif Body S | Baskerville | 13px | normal | 0 | `--text-serif-s-size` |

Color for every role is `--color-text` (`#000000`), per the original spec.

## Added sizes (not in the original 8-row ramp)

The rollout across the existing site surfaced sizes the 8-row ramp didn't cover:

- **Display M** (`--text-display-m-*`, 28–40px clamp) — reserved for a future in-between size;
  not yet used by any shipped element.
- **Headline S** (`--text-headline-s-*`, 22px) — chart card titles (`ChartCard.astro`) and the
  site wordmark (`.site-title`). Headline M (30px) was too large for a two-dataset chart title
  that can wrap to two lines.
- **Body Sans S** (`--text-body-sans-s-size`, 14px) — consolidates what were six slightly
  different secondary-text sizes (0.8rem–0.9rem) across nav, footer, source panel, methodology
  note, reveal panel, and example gallery into one consistent size.
- **Label S** (`--text-label-s-size`, 11px) — dataset domain badges (`DatasetBadge.astro`), which
  needed to read as smaller than section-header eyebrows.

## Deliberate deviations from the literal spec

- **Body copy line-height stays 1.5**, not "normal." The base `body` rule (long-form paragraph
  text throughout the site) keeps the existing 1.5 line-height for readability; "normal" (browser
  default, ~1.15–1.3) is used for the type-scale utility classes themselves, matching the spec
  literally for headings/labels where tight leading is intentional.
- **Utility classes, not a full component rewrite.** `h1`/`h2`/`h3` get sensible ramp defaults in
  `global.css` (Display L / Headline M / Label-eyebrow respectively) so most markup didn't need
  new classes; `.text-display-xl`, `.text-headline-s`, etc. exist for the specific elements that
  need a different role than their tag's default.

## Where it's used

- `h1` → Display L on every page except the homepage, which uses `.text-display-xl` for the
  "Meaningless Charts" hero title.
- `h2` → Headline M (methodology step headings).
- `h3` → Label/Eyebrow, uppercase, muted (`SourcePanel`'s "Sources", `ExampleGallery`'s
  "In rotation").
- `.chart-title` (`ChartCard.astro`) → Headline S.
- `.fake-insight` (`RevealPanel.astro`) → Serif Body L, for emphasis on the punchline.
- `.source-label` (`SourcePanel.astro`) → Serif Body M, bold (bold weight kept as an intentional
  exception — the ramp specifies Regular everywhere, but dataset names in the source panel need
  visual weight to separate from their metadata).
- Secondary UI text (nav, footer, tagline, source panel `dl`, methodology note, reveal details,
  example gallery, sources page dataset list) → Body Sans S.
- `.dataset-badge` → Label S.
