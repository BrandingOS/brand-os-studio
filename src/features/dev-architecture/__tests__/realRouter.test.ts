/**
 * ANTI-STALENESS GATE for the Code Navigator.
 *
 * The explorer is generated per request, so its *data* cannot go stale — but the
 * generator that produces it can silently start missing things (a new routing
 * pattern it doesn't understand, a moved page, a rename). These tests run the
 * real generator against the real repo and fail when that happens.
 *
 * The strongest check here is the cross-check against
 * `features/dev-product-map/discovery.ts` — an INDEPENDENT text scanner written
 * for a different tool. Two implementations with nothing in common agreeing on
 * the route set is much better evidence than either one being self-consistent.
 * If they diverge, one of them regressed and CI says so.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  normalizeRoute,
  parseRoutesFromSource,
} from '@/features/dev-product-map/discovery';

import { buildArchitectureMap, ROUTER_ENTRY } from '../generator/buildMap.node';

const ROOT = resolve(__dirname, '../../../..');
const map = buildArchitectureMap(ROOT);

describe('generated map ↔ real router', () => {
  it('finds a realistic number of routes', () => {
    // The router had 131 routes when this tool was built. A big drop means the
    // parser broke; this floor is deliberately loose so normal churn is fine.
    expect(map.routes.length).toBeGreaterThan(100);
  });

  it('reads the router entry and follows imported route fragments', () => {
    const files = map.sources.map((source) => source.file);
    expect(files).toContain(ROUTER_ENTRY);
    // The logo-maker flow is mounted as `{logoMakerFlowRoutes}` through a barrel.
    // Reaching it proves fragment-following works without a configured file list.
    expect(files).toContain('src/features/logo-maker/flow/routes.tsx');
    expect(map.sources.length).toBeGreaterThanOrEqual(2);
  });

  it('generates without warnings', () => {
    expect(map.warnings.map((warning) => warning.message)).toEqual([]);
  });

  it('agrees with the independent product-map scanner on which routes exist', () => {
    const independent = new Set<string>();
    for (const file of ['src/App.tsx', 'src/features/logo-maker/flow/routes.tsx']) {
      const source = readFileSync(resolve(ROOT, file), 'utf8');
      for (const route of parseRoutesFromSource(source, file)) {
        independent.add(normalizeRoute(route.path));
      }
    }

    const ours = new Set(map.routes.map((route) => normalizeRoute(route.path)));

    const missingFromOurs = [...independent].filter((path) => !ours.has(path));
    const missingFromTheirs = [...ours].filter((path) => !independent.has(path));

    expect(
      missingFromOurs,
      `the AST generator missed routes the text scanner found:\n${missingFromOurs.join('\n')}`,
    ).toEqual([]);
    expect(
      missingFromTheirs,
      `the AST generator invented routes the text scanner did not find:\n${missingFromTheirs.join('\n')}`,
    ).toEqual([]);
  });
});

describe('every route resolves to real code', () => {
  it('points every source file at a file that exists on disk', () => {
    const broken = map.routes
      .filter((route) => route.sourceFile && !existsSync(resolve(ROOT, route.sourceFile)))
      .map((route) => `${route.path} → ${route.sourceFile}`);

    expect(
      broken,
      `routes pointing at files that no longer exist (page moved or renamed?):\n${broken.join('\n')}`,
    ).toEqual([]);
  });

  it('resolves a source file for every route', () => {
    const unresolved = map.routes
      .filter((route) => !route.sourceFile)
      .map((route) => `${route.path} (component: ${route.component ?? 'none'})`);

    expect(
      unresolved,
      `routes with no resolvable source file:\n${unresolved.join('\n')}`,
    ).toEqual([]);
  });

  it('names a component for every page route', () => {
    const anonymous = map.routes
      .filter((route) => route.kind === 'page' && !route.component)
      .map((route) => route.path);

    expect(anonymous, `page routes with no component:\n${anonymous.join('\n')}`).toEqual([]);
  });

  it('points every route definition at a line inside its router file', () => {
    for (const route of map.routes) {
      const lines = readFileSync(resolve(ROOT, route.routeFile), 'utf8').split('\n').length;
      expect(route.routeLine, `${route.path} in ${route.routeFile}`).toBeGreaterThan(0);
      expect(route.routeLine, `${route.path} in ${route.routeFile}`).toBeLessThanOrEqual(lines);
    }
  });

  it('gives every route a unique id', () => {
    const ids = map.routes.map((route) => route.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });
});

describe('canonical lookups a developer actually performs', () => {
  const byPath = (path: string) => map.routes.filter((route) => route.path === path);

  it('answers "what renders /b/:slug/setup?"', () => {
    // The example from the tool's spec — if this breaks, the tool has failed.
    const [setup] = byPath('/b/:slug/setup');
    expect(setup).toBeDefined();
    expect(setup.name).toBe('Setup');
    expect(setup.component).toBe('BrandSetupPageV2');
    expect(setup.sourceFile).toBe('src/pages/b/[slug]/setup.tsx');
    expect(setup.routeFile).toBe('src/App.tsx');
    expect(setup.group).toBe('Brand Workspace (Studio)');
    expect(setup.wrappers).toContain('ProtectedRoute');
    expect(setup.params).toEqual(['slug']);
  });

  it('answers "where is Brand Kit?" for both namespaces', () => {
    const [studio] = byPath('/b/:slug/brand-kit');
    const [classic] = byPath('/a/:slug/brand-kit');

    expect(studio.sourceFile).toBe('src/pages/b/[slug]/brand-kit.tsx');
    expect(studio.group).toBe('Brand Workspace (Studio)');
    expect(classic.group).toBe('Brand Workspace (Classic)');
    // The Studio page is a thin wrapper; the real implementation shows up as a
    // dependency, which is what makes it findable by component name.
    const deps = studio.analysis?.imports?.map((ref) => ref.specifier) ?? [];
    expect(deps).toContain('@/features/brand-kit/BrandKitCosmosPage');
  });

  it('classifies the dev-only tools as dev-only', () => {
    const architecture = map.routes.find((route) => route.path === '/__architecture');
    expect(architecture?.devOnly, '/__architecture must stay behind an import.meta.env.DEV guard')
      .toBe(true);
    expect(architecture?.group).toBe('Development');
  });

  it('records where a redirect forwards to when it is statically knowable', () => {
    const kit = map.routes.find((route) => route.path === '/a/:slug/kit');
    expect(kit?.kind).toBe('redirect');
    expect(kit?.redirectTo).toBe('/a/:slug/brand-kit');
  });
});
