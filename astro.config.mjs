// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Deploy target is deliberately undecided (see docs/source-of-truth/open-questions.md);
// this is a placeholder using the reserved .example TLD and must be replaced with the
// real domain before deploying, since `site` is required for sitemap/canonical URLs.
const SITE_URL = 'https://meaninglesscharts.example';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
});
