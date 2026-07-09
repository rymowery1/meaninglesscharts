---
name: qa-launch
description: Run launch QA for Meaningless Charts.
---

Run the full launch check.

Review:
- CLAUDE.md
- docs/qa/launch-checklist.md
- docs/data/approved-sources.md
- docs/data/dataset-catalog.md
- docs/data/data-methodology.md
- src/data/datasets.json
- src/data/series/
- src/pages/
- src/components/
- src/utils/

Check:
- Build passes
- All launch pages exist
- No placeholder content
- Dataset metadata is complete
- Source links exist
- Chart generator works
- Pairing rules are enforced
- Normalization works
- Every chart has a source panel
- Every chart has a non-causal disclaimer
- No fabricated data remains
- No unsupported claims remain
- Metadata exists
- Mobile layout is usable
- Basic accessibility is acceptable

Run:
- npm run build
- npm run check, if available
- npm run test, if available
- npm run validate:data, if available
- npm run validate:pairings, if available
- npm run audit:claims, if available

Update:
docs/qa/qa-report.md
docs/qa/launch-checklist.md

Return:
- Pass / Fail
- Blockers
- High-priority fixes
- Medium-priority fixes
- Launch recommendation
