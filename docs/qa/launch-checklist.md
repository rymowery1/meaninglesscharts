# Launch Checklist

Status as of 2026-07-09. Full detail in `docs/qa/qa-report.md` and `docs/qa/interpretation-review.md`.

- [x] Build passes (`npm run build`)
- [x] Typecheck passes (`npm run check`)
- [x] Tests pass (`npm run test`, 40/40)
- [x] Dataset validation passes (`npm run validate:data`, 8/8 launchReady)
- [x] Pairing validation passes (`npm run validate:pairings`, 3/3 valid)
- [x] Claims audit script exists and passes (`npm run audit:claims`)
- [x] All MVP pages exist and render real content (home, methodology, sources, about)
- [x] 404 page exists
- [x] No placeholder/fabricated data remains
- [x] Every chart has a source panel and non-causal disclaimer
- [x] Pairing rules enforced end-to-end (blocked domains, same-org, frequency match)
- [x] No unsupported causal/statistical claims in shipped copy
- [x] Basic accessibility acceptable (semantic HTML, aria-labels, native disclosure widget, aria-live on chart switch)
- [ ] Mobile layout verified on a real device/viewport (`NEEDS_VERIFICATION` — CSS reviewed only, see `docs/source-of-truth/open-questions.md`)
- [ ] OG image is placeholder-quality SVG, not final branding — fine for now, revisit before a real public launch
- [ ] Deploy target chosen (`NEEDS_USER_DECISION` — user has said work locally only, no rush)
- [ ] BLS / OpenAQ key registration decision, if expanding past 3 pairings (`NEEDS_USER_DECISION`, optional)

## Launch recommendation

Ready to launch for the MVP scope once a deploy target is chosen. Nothing found in this audit
blocks working locally or committing further changes.
