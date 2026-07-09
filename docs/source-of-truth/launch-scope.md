# Launch Scope

Core line: "The data is real. The relationship is not."

## Primary outcome

A live, polished site that:
- Generates chart pairings from real, sourced datasets
- Shows two unrelated time series on a shared normalized chart
- Presents a fake-serious insight, then reveals why the interpretation is meaningless
- Shows dataset sources, date range, units, frequency, and normalization method for every chart
- States clearly that shared movement does not imply relationship, influence, or causation
- Works well on mobile

## Stack

Astro, TypeScript, local JSON dataset metadata, local cached time-series JSON, Chart.js, minimal dependencies, static hosting.

## MVP pages

Home / generator, Methodology, Sources, About. Nothing else.

## Explicitly out of scope for launch

Backend, database, user accounts, CMS, user-submitted charts, saved charts, full public API, admin dashboard, custom dataset upload, social posting automation, live browser-side API calls, scrapers, correlation scoring.

## Success criteria (from the original build plan)

- The website is live
- The site feels intentional and polished
- The chart generator works
- The underlying datasets are real, sourced, and auditable
- The site clearly explains that the relationships are intentionally meaningless
- The site does not fabricate data, sources, or causal claims

## Explicitly not required for success

A large dataset library, perfect statistical rigor, virality, monetization.

## Status

Phases 1, 2, 4, 5, and 6/7 complete as of 2026-07-09. All 4 keyless sources (World Bank, NASA POWER, USGS, Wikimedia) have real fetched data; all 8 datasets are `verificationStatus: "approved"`, `launchReady: true` with verified license terms. `src/data/pairings.json` has 3 real, validated pairings, and the chart generator UI is built and verified working in a real browser (chart renders, reveal toggle, "Generate another," Sources/Methodology pages all show real content). What's left before an actual public launch: pick a deploy target, add an OG image and 404 page, verify mobile layout on a real device, and run the remaining QA/audit skills (`/interpretation-audit`, `/qa-launch`) — see docs/source-of-truth/open-questions.md.
