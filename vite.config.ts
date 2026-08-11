import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Dev-only endpoint for the DS Controller (/_dev/design-system):
 * POST /__ds-tokens/apply with a draft {light?, dark?, global?} of --ds-*
 * overrides. Validates names+values against src/shared/ds/tokens.json
 * (existing tokens only — the endpoint can change values, never mint
 * tokens), merges, writes tokens.json atomically, regenerates tokens.css +
 * tokens.ts via scripts/gen-ds-tokens.mjs, and lets HMR pick up the change.
 *
 * `apply: 'serve'` means the plugin object is dropped for builds, so the
 * endpoint cannot exist in production output or preview servers.
 */
function dsTokensApplyPlugin(): Plugin {
  return {
    name: "ds-tokens-apply",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__ds-tokens/apply", (req, res) => {
        const json = (status: number, body: object) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });
        const chunks: Buffer[] = [];
        let size = 0;
        req.on("data", (c: Buffer) => {
          size += c.length;
          if (size > 256 * 1024) {
            json(413, { ok: false, error: "payload too large" });
            req.destroy();
            return;
          }
          chunks.push(c);
        });
        req.on("end", async () => {
          if (res.writableEnded) return;
          try {
            const draft = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            const gen = await import("./scripts/gen-ds-tokens.mjs");
            const tokens = gen.readTokens();
            const tokenErrors = gen.validateTokens(tokens);
            if (tokenErrors.length) {
              return json(500, { ok: false, error: `tokens.json invalid: ${tokenErrors[0]}` });
            }
            const draftErrors = gen.validateDraft(draft, tokens);
            if (draftErrors.length) {
              return json(400, { ok: false, error: draftErrors.join("; ") });
            }
            const next = gen.applyDraft(tokens, draft);
            gen.writeFileAtomic(gen.TOKENS_JSON_PATH, gen.serializeTokens(next));
            gen.writeGenerated(next);
            const applied =
              Object.keys(draft.light ?? {}).length +
              Object.keys(draft.dark ?? {}).length +
              Object.keys(draft.global ?? {}).length;
            server.config.logger.info(`[ds-tokens] applied ${applied} token(s) → tokens.json + codegen`);
            return json(200, { ok: true, applied });
          } catch (e) {
            return json(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        });
      });
    },
  };
}

/**
 * Dev-only data source for the Code Navigator (/__architecture):
 * GET /__architecture-map.json returns the route→component→file map, generated
 * by walking the real router's TypeScript AST on every request.
 *
 * Generating per-request (rather than emitting a committed JSON artifact) is the
 * anti-staleness design: there is no second copy of the truth to drift. Adding,
 * moving, renaming or deleting a route changes the response immediately.
 *
 * `apply: 'serve'` drops this plugin for builds, so neither the endpoint nor the
 * generator (nor any source text it reads) can reach production output. The
 * /__architecture route itself is separately gated behind `import.meta.env.DEV`
 * in App.tsx, so the page and its chunk are tree-shaken out of the build.
 */
function architectureMapPlugin(): Plugin {
  return {
    name: "architecture-map",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__architecture-map.json", async (req, res) => {
        res.setHeader("content-type", "application/json");
        // Always fresh — a cached map is a stale map.
        res.setHeader("cache-control", "no-store");
        try {
          // Imported lazily so a generator error can't break dev-server startup.
          const { buildArchitectureMap } = await server.ssrLoadModule(
            "/src/features/dev-architecture/generator/buildMap.node.ts",
          );
          const map = buildArchitectureMap(process.cwd());
          res.statusCode = 200;
          res.end(JSON.stringify(map));
        } catch (error) {
          server.config.logger.error(
            `[architecture-map] generation failed: ${
              error instanceof Error ? error.stack ?? error.message : String(error)
            }`,
          );
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              schemaVersion: 1,
              generatedAt: new Date().toISOString(),
              routes: [],
              sources: [],
              warnings: [
                {
                  message: `Generator threw: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
              ],
            }),
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    dsTokensApplyPlugin(),
    architectureMapPlugin(),
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
          // Browser test files share a single Chromium instance; running
          // them in parallel races the browser connection and triggers
          // "Browser connection was closed" flakes. Serial keeps the run
          // ~deterministic at the cost of a few extra seconds.
          fileParallelism: false,
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
