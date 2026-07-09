---
name: source-check
description: Audit approved data sources for access model, bias risk, documentation, and launch suitability.
---

Review:
- docs/data/approved-sources.md
- docs/data/rejected-sources.md
- docs/data/source-verification-log.md
- docs/data/dataset-catalog.md

Check each source for:
- source organization
- official documentation URL
- access type
- cost
- API key or token requirement
- rate-limit note, if known
- reuse/license note
- bias-risk note
- methodology note
- status

Allowed source statuses:
- approved
- proposed
- needs-source
- needs-verification
- rejected

Write results to:
docs/qa/source-review.md
