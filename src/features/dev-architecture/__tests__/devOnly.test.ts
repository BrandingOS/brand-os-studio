/**
 * Production-safety invariants.
 *
 * The tool must add nothing to the production bundle. Three separate mechanisms
 * enforce that, and each is asserted here so removing one is a test failure
 * rather than a silent regression:
 *
 *  1. the /__architecture route is registered inside an `import.meta.env.DEV`
 *     guard, so Vite drops the route AND tree-shakes the lazy chunk;
 *  2. the Vite plugin that serves the data is `apply: 'serve'`, so the endpoint
 *     cannot exist in a build or a preview server;
 *  3. no browser-reachable module imports the Node-only generator, so neither
 *     the TypeScript compiler nor any source text it reads gets bundled.
 *
 * Mechanism 3 is the one that bit the older /_dev/product-map tool, which reads
 * router source via `import.meta.glob(…, '?raw')` and consequently ships the
 * full text of App.tsx to production.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

describe('route registration is dev-gated', () => {
  const app = read('src/App.tsx');

  it('registers /__architecture only behind import.meta.env.DEV', () => {
    const index = app.indexOf('path="/__architecture"');
    expect(index, '/__architecture route not found in App.tsx').toBeGreaterThan(-1);

    // Walk back to the enclosing JSX expression and require the DEV guard in it.
        const guardStart = app.lastIndexOf('{import.meta.env.DEV', index);
    const blockStart = app.lastIndexOf('{', index);
    expect(
      guardStart,
      '/__architecture must be wrapped in {import.meta.env.DEV && ( … )}',
    ).toBeGreaterThan(-1);
    // The nearest preceding `{` should belong to the guard's own expression
    // block (allowing for the `&& (` between them).
    expect(app.slice(guardStart, blockStart)).not.toContain('<Route');
  });

  it('gates the lazy import itself, not just the <Route>', () => {
    // Verified against a real `npm run build`: guarding only the <Route> leaves
    // the top-level `lazy(() => import(...))` reachable, so Rollup still emits a
    // chunk for the page. The import has to sit in a branch Vite can constant-fold
    // away. This assertion is the regression guard for that mistake.
    const declaration = app.match(
      /const DevArchitecturePage\s*=([\s\S]{0,200}?);\n/,
    );
    expect(declaration, 'DevArchitecturePage declaration not found').not.toBeNull();
    const initializer = declaration?.[1] ?? '';
    expect(initializer).toContain('import.meta.env.DEV');
    expect(
      initializer.indexOf('import.meta.env.DEV'),
      'the DEV check must come BEFORE the dynamic import so the import lands in the dead branch',
    ).toBeLessThan(initializer.indexOf('import('));
  });

  it('does not link the tool from product navigation', () => {
    // A dev tool that shows up in the product is no longer dev-only in practice.
    const navFiles = [
      'src/shared/layouts/AppRail.tsx',
      'src/shared/layouts/WorkspaceShell.tsx',
    ];
    for (const file of navFiles) {
      expect(read(file), `${file} must not link /__architecture`).not.toContain('/__architecture');
    }
  });
});

describe('data endpoint is dev-server only', () => {
  const config = read('vite.config.ts');

  it('declares the architecture-map plugin as apply: "serve"', () => {
    const pluginStart = config.indexOf('name: "architecture-map"');
    expect(pluginStart, 'architecture-map plugin not found in vite.config.ts').toBeGreaterThan(-1);
    // `apply` must appear in the same plugin object, before configureServer.
    const configureAt = config.indexOf('configureServer', pluginStart);
    const applyAt = config.indexOf('apply: "serve"', pluginStart);
    expect(applyAt).toBeGreaterThan(-1);
    expect(applyAt).toBeLessThan(configureAt);
  });
});

describe('the Node-only generator is unreachable from the browser', () => {
  /** Every .ts/.tsx file under src/, excluding tests and the generator itself. */
  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__' || entry === 'node_modules') continue;
        sourceFiles(full, acc);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) continue;
      if (entry.endsWith('.node.ts')) continue;
      acc.push(full);
    }
    return acc;
  }

  const files = sourceFiles(resolve(ROOT, 'src'));

  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('is imported by no browser-reachable module', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // Any import of a `.node` module, or of the generator directory.
      if (/from\s+['"][^'"]*\.node['"]/.test(text) || /from\s+['"][^'"]*dev-architecture\/generator/.test(text)) {
        offenders.push(file.replace(`${ROOT}/`, ''));
      }
    }

    expect(
      offenders,
      `these browser modules import the Node-only generator, which would bundle the TypeScript compiler and router source into the app:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('never reads source text through import.meta.glob raw in browser code', () => {
    const offenders = files
      .filter((file) => file.includes('dev-architecture'))
      .filter((file) => /import\.meta\.glob/.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(`${ROOT}/`, ''));

    expect(
      offenders,
      `import.meta.glob is compile-time — using it here would inline source text into the production bundle:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
