import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * The landing page, built INTO the main app's `dist/`.
 *
 * The landing stays a separate Vite app on purpose: its `index.css`
 * redefines the very same shadcn tokens the product paints with
 * (`--background`, `--foreground`, `--primary`, `--radius`, …) and its
 * Tailwind config renames the type scale. Importing it into the SPA
 * would repaint the whole product. Two documents, one deploy, zero
 * collision.
 *
 * Output lands in the app's `dist/` with `base: '/'` intact, so every
 * URL the landing emits is absolute and stays correct no matter where
 * its HTML file ends up. Two settings keep the two builds apart:
 *   · `assetsDir: 'landing-assets'` — the SPA owns `assets/`.
 *   · `emptyOutDir: false`          — the SPA has already written there.
 *
 * `scripts/build-landing.mjs` then moves the emitted `index.html` to
 * `dist/landing/index.html` and gives `dist/index.html` back to the SPA;
 * `functions/_middleware.ts` is what actually serves the landing at `/`.
 *
 * The standalone `vite.config.ts` beside this file is untouched — it is
 * what brandingos.ai still builds.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    assetsDir: 'landing-assets',
    emptyOutDir: false,
  },
});
