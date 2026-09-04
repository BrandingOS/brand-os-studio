import { defineConfig } from 'vitest/config';

/**
 * A standalone runner for the Code -> Figma pipeline suites.
 *
 * These modules are plain TypeScript with no DOM, no Figma globals and no
 * React, so they need neither jsdom nor `src/test/setup.ts`. The root
 * `vite.config.ts` still includes them in the `unit` project — that stays the
 * gate. This config exists so the pipeline can be verified on a machine where
 * the shared jsdom install fails to initialise, which is unrelated to anything
 * under test here.
 *
 *   npx vitest run --config scripts/figma/vitest.config.ts
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/figma/**/*.test.ts'],
  },
});
