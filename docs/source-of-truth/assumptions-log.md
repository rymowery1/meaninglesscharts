# Assumptions Log

Assumptions made during Phase 1 scaffolding that should be revisited if they cause problems:

- Astro `create-astro` installed Astro ^7.0.7 and TypeScript ^7.0.2 (latest versions available at scaffold time, 2026-07-08). The original build plan didn't pin versions.
- `@astrojs/check` was installed for `npm run check`; it declared a peer dependency on TypeScript ^5 or ^6, while ^7 got installed — npm resolved this with an overridden peer warning, not a hard failure. Revisit if `astro check` misbehaves.
- Chart.js ^4.5.1 and vitest ^4.1.10 were installed as the latest available versions.
- Node v24.18.0 (via nvm) was used for scaffolding; package.json's `engines` field (inherited from the Astro template) requests >=22.12.0.
