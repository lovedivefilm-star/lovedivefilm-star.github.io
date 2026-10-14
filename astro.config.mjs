// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
// v4(2026-10-14): React 섬은 작업 벽(React Bits DomeGallery) 하나뿐 — docs/v4-redesign.md 1절.
export default defineConfig({
  site: 'https://lovedivefilm-star.github.io',
  integrations: [react()],
});
