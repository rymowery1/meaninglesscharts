# Open Questions

These block later phases and require a user decision, a source lookup, or verification. Do not resolve these by inventing an answer — see CLAUDE.md's Anti-Hallucination Rules.

## Resolved (2026-07-08 – 2026-07-09)

- `nasa-power-temp-annual`'s geography — defaulted to a single point (Washington, D.C.), disclosed as such, not presented as a global average. Flagged in `decision-log.md` as an unprompted default the user can override.
- Whether NASA POWER's annual frequency is natively available — confirmed live, native `YYYY13` key.
- Whether `usgs-quakes-m5-5-monthly-count`'s monthly counts require forbidden aggregation — resolved as legitimate; counting raw catalog events per month isn't resampling an existing series (there's no other native frequency for a point-event catalog).
- Whether World Bank, NASA POWER, USGS, and Wikimedia are keyless — confirmed live, all 4, all returned real data.
- License/reuse terms for all 4 sources — confirmed via WebFetch against the actual terms pages (not recalled): World Bank CC-BY 4.0, NASA general public-domain policy, USGS U.S. Public Domain, Wikimedia CC0 (Analytics datasets specifically).
- All 8 candidate datasets now have real fetched data, real methodology/license notes, and are `verificationStatus: "approved"`, `launchReady: true`. `src/data/pairings.json` has 3 real, validated pairings.

## Resolved (2026-07-09, continued)

- Phase 6/7 (chart generator UI) is built and verified working in a real browser: all 3 pairings render, reveal toggle works, "Generate another" swaps charts, Sources/Methodology pages show real content. A real timezone-related date-display bug was found and fixed during this verification.

## NEEDS_USER_DECISION

- Deploy target (Vercel / Netlify / Cloudflare Pages / other) — not chosen yet. This is now the main thing standing between the current state and an actual public launch.
- Whether to register for BLS and OpenAQ API keys to expand past the current 3 pairings, or ship with what exists now.
- OG image (`public/og/`) is still empty — needed before launch per the checklist.
- No 404 page exists yet.

## NEEDS_VERIFICATION

- Mobile layout — verified only by CSS review (relative units, real breakpoints), not an actual mobile-width screenshot; the browser automation's resize tool didn't produce a visibly different capture in this environment. Re-check with a real device or a working responsive viewport before launch.
- Whether BLS API v1 vs v2 and OpenAQ v3 key requirements described in `docs/data/approved-sources.md` are current — not yet tested live (no fetchers written for either).
