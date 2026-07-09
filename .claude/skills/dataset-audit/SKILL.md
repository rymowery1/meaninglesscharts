---
name: dataset-audit
description: Audit dataset metadata and local series files for missing fields, fabricated values, source gaps, and launch blockers.
---

Review:
- docs/data/dataset-catalog.md
- docs/data/dataset-reality-sheet.md
- src/data/datasets.json
- src/data/series/

Check each dataset for:
- id
- label
- source organization
- source URL
- source type
- domain
- frequency
- unit
- geography
- date range
- access type
- cost
- bias-risk note
- methodology note
- fetchedAt timestamp
- local series file
- launch readiness

Flag:
- Missing fields
- Unverified source details
- Missing values
- Suspicious fabricated-looking values
- Date-range mismatch
- Frequency mismatch
- Unit mismatch
- Datasets that should not launch

Write results to:
docs/qa/dataset-audit.md
