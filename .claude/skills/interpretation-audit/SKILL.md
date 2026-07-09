---
name: interpretation-audit
description: Find unsupported causal, statistical, scientific, financial, or social claims before launch.
---

Search the repo for risky language, including:
- proves
- causes
- drives
- predicts
- explains
- responsible for
- significant relationship
- evidence that
- linked to
- associated with
- correlation
- causation
- statistically significant
- trend indicates
- data shows
- data proves

Compare against:
- docs/content/chart-copy.md
- docs/content/fake-insight-templates.md
- docs/content/reveal-templates.md
- docs/data/data-methodology.md
- docs/data/pairing-rules.md

Write results to:
docs/qa/interpretation-review.md

For each issue, return:
- Claim
- Location
- Status
- Recommended fix

Allowed statuses:
- Approved as disclaimer
- Rewrite safer
- Needs source
- Remove
