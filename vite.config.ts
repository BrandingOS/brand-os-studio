import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI primitives (Radix + Shadcn)
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
          ],
          // State & data
          'vendor-data': ['zustand', '@tanstack/react-query', '@supabase/supabase-js'],
          // Charts (only loaded on analytics pages)
          'vendor-charts': ['recharts'],
          // Animation
          'vendor-motion': ['framer-motion'],
          // Heavy export libs (lazy-loaded per feature)
          'vendor-export': ['jspdf', 'jszip', 'html2canvas'],
          // Date utilities
          'vendor-date': ['date-fns'],
        },
      },
    },
  },
  test: {
    // Three coverage layers in one `npm run test`:
    //
    //   • unit (jsdom)    — pure logic, schemas, math, hooks, state machines.
    //                       Adapter integration tests use a mocked `fabric`
    //                       module since jsdom has no real Canvas 2D context.
    //   • browser (chromium) — real DOM, real canvas, real Fabric.js. Catches
    //                       data-flow regressions where a panel input must
    //                       reach the canvas. Files: `*.browser.test.tsx`.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            'node_modules/**',
            'src/**/*.browser.{test,spec}.{ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          globals: true,
          include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
}));
