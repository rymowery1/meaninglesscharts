# Pairing Rules

Source: build plan §12, revised in additions. "Pair across unrelated domains" alone isn't sufficient — some cross-domain pairs are genuinely, plausibly causally related (weather and air quality; economy and agriculture), and the whole premise of the site fails if a pairing turns out to be real.

## Frequency compatibility — exact match only

Two datasets are frequency-compatible only if their frequencies are identical: `daily+daily`, `monthly+monthly`, `annual+annual`. No aggregation, resampling, or interpolation in the MVP — if a dataset only exists at one frequency, it can only pair with datasets at that frequency. This is deliberately restrictive; it removes an entire class of quiet methodological error. Adding aggregation later requires a written rule here, a visible source-panel note, and explicit user approval.

## Blocked domain pairs

A pairing is invalid if the two domains appear together here, regardless of what the data shows — see `BLOCKED_DOMAIN_PAIRS` in `src/data/types.ts`, which is the enforced version of this table:

| Domain A | Domain B | Why |
|---|---|---|
| weather | environment | temperature plausibly affects air quality |
| weather | agriculture | weather plausibly affects crop yields |
| weather | parks | weather plausibly affects visitation |
| weather | physical-events | both are geophysical systems |
| environment | agriculture | shared land-use and climate drivers |
| economy | agriculture | commodity prices and production |
| economy | global-indicators | both measure economic activity |
| economy | culture-attention | economic events drive search and pageview attention |
| physical-events | environment | eruptions and quakes affect air quality |
| parks | culture-attention | attention plausibly drives visitation |

Any pairing involving the `other` domain requires `NEEDS_USER_DECISION` before it can be marked launch-ready — `other` is a staging area, not a real domain.

## Same-organization block

Two datasets from the same `sourceOrganization` may not be paired, even across permitted domains — shared collection methodology is a hidden common cause.

## Full invalidity conditions

A generated pairing is invalid if any of the following hold:
- Dataset A and Dataset B have the same domain
- Dataset A and Dataset B appear in `BLOCKED_DOMAIN_PAIRS`, in either order
- Either dataset has domain `other` and hasn't been explicitly approved
- Dataset A and Dataset B have the same `sourceOrganization`
- Dataset A and Dataset B have different frequencies
- Dataset A and Dataset B have no overlapping dates
- Either dataset is not `launchReady`
- Either dataset has `verificationStatus` other than `approved`
- Either dataset has `provenance` `placeholder`
- The shared window has fewer than the minimum points for that frequency
- Either series fails the normalization eligibility check (`docs/data/normalization-rules.md`)
- The generated chart doesn't include source panel data
- The generated chart doesn't include the non-causal disclaimer

## Minimum shared points

| Frequency | Minimum |
|---|---|
| Daily | 14 |
| Monthly | 6 |
| Annual | 6 |

`tests/pairing-rules.test.ts` must assert every `BLOCKED_DOMAIN_PAIRS` entry is rejected in both orders, and that an `other`-domain pairing is never launch-ready without explicit approval.
