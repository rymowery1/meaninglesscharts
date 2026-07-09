# CLAUDE.md

## Project

This is the Meaningless Charts website.

Meaningless Charts is a humorous data-literacy experiment where two unrelated real datasets are plotted together in the same chart, making it look like they might be related.

Core line:

"The data is real. The relationship is not."

## Primary Outcome

A live, polished site that:
- Generates chart pairings from real, sourced datasets
- Shows two unrelated time series on a shared normalized chart
- Presents a fake-serious insight
- Reveals why the interpretation is meaningless
- Shows dataset sources, date range, units, frequency, and normalization method
- Clearly states that shared movement does not imply relationship, influence, or causation
- Works well on mobile

## Stack

Use:
- Astro
- TypeScript
- Local JSON dataset metadata
- Local cached time-series JSON
- Chart.js
- Minimal dependencies

Do not build:
- Backend
- Database
- User accounts
- CMS
- Complex live API infrastructure
- Scrapers
- Stock trading tools
- Health, crime, or sensitive demographic joke charts

## Source of Truth

Before changing dataset metadata, chart logic, methodology copy, or public-facing interpretation copy, read:

- docs/source-of-truth/launch-scope.md
- docs/data/approved-sources.md
- docs/data/dataset-catalog.md
- docs/data/dataset-reality-sheet.md
- docs/data/data-methodology.md
- docs/data/normalization-rules.md
- docs/data/pairing-rules.md
- docs/content/chart-copy.md
- docs/content/fake-insight-templates.md
- docs/content/reveal-templates.md

## Anti-Hallucination Rules

Never invent:
- Dataset values
- Dataset source names
- Source URLs
- API behavior
- Methodology claims
- Licensing claims
- Date ranges
- Units
- Statistical meaning
- Causal claims
- Correlation claims

If something is unknown, write:
NEEDS_USER_DECISION

If a source needs verification, write:
NEEDS_SOURCE

If something might be true but has not been checked, write:
NEEDS_VERIFICATION

## Data Acquisition Model

This is the most important operational rule in the project.

Division of labor:
- Claude writes the fetcher script.
- The user runs the fetcher script.
- The fetcher script writes the series file.
- Claude validates the series file.
- Claude never writes a numeric value into a series file by hand.
- Claude never edits a series file except to delete it.

If Claude cannot reach the network, that is expected and correct. Claude's job is to produce a working script and then stop.

Every file in `src/data/series/` must be written by a script in `scripts/fetch-data/`, and must record a `provenance` field:
- `script` — produced by a fetcher script. Eligible for launch.
- `manual-download` — the user downloaded and converted a file. Eligible for launch, but requires a note in `docs/data/source-verification-log.md` recording the download URL and date.
- `placeholder` — structure only, no points. Never eligible for launch. Must have `launchReady: false` and `verificationStatus: "needs-source"`.

There is no fourth option. If Claude produces a series file with values and cannot name the script or download that produced it, that file is fabricated and must be deleted.

Fetcher scripts in `scripts/fetch-data/` must never contain hardcoded arrays of numbers, `Math.random()`, synthetic gap-filling, silent try/catch that swallows a failed request, or "sample"/"demo"/"mock" data of any kind. They must fail loudly on a missing key or a non-200 response rather than falling back to sample data.

Never write a real API key into any file, including `.env.example`. Never commit `.env`.

## Data Integrity

Meaningless Charts uses real public datasets from reputable, free, and transparent sources.

The project does not fabricate source data.

The meaningless part is the pairing and interpretation, not the numbers.

Every launch-ready chart must show:
- Dataset A name
- Dataset A source
- Dataset B name
- Dataset B source
- Date range
- Frequency
- Unit notes
- Normalization method
- Normalization baseline date and both baseline values
- Non-causal disclaimer

Required disclaimer:
"Shared movement does not imply relationship, influence, or causation."

## Approved Source Priorities

Prioritize (no API key required):
- World Bank Indicators API
- NASA POWER
- USGS Earthquake API
- Wikimedia Analytics / Pageviews API

Prioritize (API key required):
- U.S. Bureau of Labor Statistics
- OpenAQ

Defer:
- FRED
- NOAA Climate Data Online
- USDA NASS Quick Stats
- U.S. Census API
- National Park Service Visitor Use Statistics

Avoid:
- Random Kaggle datasets
- Google Trends
- Stock prices
- Health outcomes
- Crime data
- Political persuasion data
- Sensitive demographic datasets
- Scraped social media
- Private/personal data

## Pairing Rules

Do:
- Pair across unrelated domains
- Pair only identical frequencies (no aggregation/resampling/interpolation in MVP)
- Require overlapping dates
- Normalize both series to 100 at the first shared date
- Show original units and baseline values in the source panel
- Explain that the relationship is non-causal

Do not:
- Pair datasets that plausibly influence each other (see `BLOCKED_DOMAIN_PAIRS`)
- Pair two datasets from the same source organization
- Hide units
- Hide sources
- Use private or scraped data
- Make sensitive human outcomes the punchline
- Suggest the relationship is real
- Choose a different baseline date, add an offset, clamp, or drop points to make a series normalize cleanly — reject the pairing instead

## Tone

The site should feel:
- Editorial
- Clean
- Slightly academic
- Calmly absurd
- Serious in presentation
- Dry in humor
- Transparent in methodology

Avoid:
- Meme language
- Cartoonish UI
- Fake scientific confidence
- Overstated conclusions
- Dark patterns
- Misleading source presentation

## MVP Pages

Build only:
- Home / generator
- Methodology
- Sources
- About

Defer:
- User-submitted charts
- Accounts
- Saved charts
- Full public API
- Admin dashboard
- Custom dataset upload
- Social posting automation

## QA Requirements

Before launch, verify:
- All pages load
- Generator works
- Chart updates without reload
- Dataset metadata is complete
- Every chart has source panel
- Every chart has non-causal disclaimer
- Pairing rules are enforced
- Normalization is correct
- No fabricated data remains
- No unsupported causal claims remain
- No placeholder content remains
- Links to source docs work
- Mobile layout is usable
- Basic accessibility is acceptable
- Metadata exists for key pages

## Development Commands

```bash
npm install
npm run dev
npm run build
npm run check
npm run test
npm run validate:data
npm run validate:pairings
npm run audit:claims
```

If a command does not exist yet, add it to package.json instead of pretending it ran.

When starting the dev server for a long-running session, use `astro dev --background` and manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.

## Working Style

Before implementing, create a short plan.

After implementing, summarize:
- Files changed
- Decisions made
- Open questions
- Tests run
- Known issues

Do not mark work complete without running available checks.
