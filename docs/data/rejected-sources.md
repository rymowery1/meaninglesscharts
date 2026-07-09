# Rejected Sources

These categories are rejected as a matter of project policy (per CLAUDE.md), not because the data itself is fake. A specific dataset can be proposed for reconsideration only with an explicit `NEEDS_USER_DECISION` and a stated reason it's an exception — the default is no.

| Category | Reason |
|---|---|
| Random Kaggle datasets | Provenance and licensing are often unclear or unverifiable; undermines the "auditable" claim in the project goal |
| Google Trends | Not a stable, directly-queryable time series API; values are relative/normalized by Google in ways that are hard to audit |
| Stock prices / trading data | High risk of being read as financial advice or a real signal; explicitly excluded by the original build plan |
| Health outcomes | Sensitive human-outcome data; making it the punchline of a joke chart is explicitly disallowed by CLAUDE.md |
| Crime data | Same sensitivity concern as health outcomes; also frequently has significant reporting bias across jurisdictions |
| Political persuasion data | Sensitive, easily misread as a real signal, and the project explicitly avoids political content |
| Sensitive demographic datasets | Risk of the "meaningless pairing" premise reading as making light of real disparities |
| Scraped social media | No stable API/license, provenance is weak, terms-of-service risk |
| Private or personal data | Out of scope entirely — the project only uses public, aggregate data |

No specific sources have been proposed and rejected individually yet. This file will grow if a specific candidate source is evaluated and turned down (e.g., "considered X, rejected because Y").
