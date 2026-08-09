/**
 * Product Surface Explorer — staleness gate.
 *
 * Parses the REAL router sources (the same parser the dev page uses) and
 * enforces bidirectional agreement with the metadata registry:
 *   1. every discovered route has a registry entry (no undocumented surfaces);
 *   2. every registry route still exists in the router (no stale metadata).
 * If a route is added/removed in App.tsx without updating the registry, THIS
 * test fails — the explorer cannot silently rot.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRoutesFromSource, normalizeRoute } from '../discovery';
import { SURFACE_REGISTRY } from '../registry';

const ROOT = resolve(__dirname, '../../../..');
const SOURCES = [
  ['src/App.tsx', resolve(ROOT, 'src/App.tsx')],
  ['src/features/logo-maker/flow/routes.tsx', resolve(ROOT, 'src/features/logo-maker/flow/routes.tsx')],
] as const;

function discoveredPaths(): Set<string> {
  const out = new Set<string>();
  for (const [name, abs] of SOURCES) {
    const src = readFileSync(abs, 'utf8');
    for (const r of parseRoutesFromSource(src, name)) out.add(normalizeRoute(r.path));
  }
  return out;
}

describe('product-surface registry ↔ router cross-check', () => {
  const discovered = discoveredPaths();
  const registryRoutes = new Set(
    SURFACE_REGISTRY.filter((e) => e.route).map((e) => normalizeRoute(e.route as string)),
  );

  it('parses a realistic number of routes from the real router', () => {
    expect(discovered.size).toBeGreaterThan(80);
  });

  it('every discovered route has registry metadata', () => {
    const missing = [...discovered].filter((p) => !registryRoutes.has(p));
    expect(missing, `routes with no registry entry:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every registry route still exists in the router (no stale metadata)', () => {
    const stale = [...registryRoutes].filter((p) => !discovered.has(p));
    expect(stale, `registry entries pointing at dead routes:\n${stale.join('\n')}`).toEqual([]);
  });

  it('registry ids are unique (review decisions key on them)', () => {
    const ids = SURFACE_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('non-route surfaces carry an entryHint so the owner can find them', () => {
    const missingHint = SURFACE_REGISTRY.filter((e) => !e.route && !e.entryHint);
    expect(missingHint.map((e) => e.id)).toEqual([]);
  });

  it('duplicate groups have at least two members', () => {
    const counts = new Map<string, number>();
    for (const e of SURFACE_REGISTRY) {
      if (e.duplicateGroup) counts.set(e.duplicateGroup, (counts.get(e.duplicateGroup) ?? 0) + 1);
    }
    const singletons = [...counts.entries()].filter(([, n]) => n < 2).map(([g]) => g);
    expect(singletons).toEqual([]);
  });
});

describe('route parser (unit)', () => {
  it('composes nested + index + self-closing routes', () => {
    const src = `
      <Routes>
        <Route path="/top" element={<A />} />
        <Route path="/parent" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="child" element={<C to="/decoy" />} />
          <Route path="deep/:id" element={<D />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>`;
    const paths = parseRoutesFromSource(src, 't').map((r) => r.path).sort();
    expect(paths).toEqual(['/*', '/parent', '/parent', '/parent/child', '/parent/deep/:id', '/top'].sort());
  });

  it('flags redirect-looking elements', () => {
    const src = `<Route path="/old" element={<OldToNewRedirect />} />`;
    expect(parseRoutesFromSource(src, 't')[0].looksLikeRedirect).toBe(true);
  });
});
