/**
 * Diagram (graph projection) tests.
 *
 * The six proofs the Diagram has to carry:
 *   1. it covers the same canonical route set as Search and Tree;
 *   2. a newly discovered route becomes available automatically;
 *   3. a deleted route disappears;
 *   4. redirect edges point at the DETECTED target;
 *   5. there is no manually maintained per-route graph registry;
 *   6. it stays dev-only (see also `devOnly.test.ts` for the bundle guarantees).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildArchitectureMap } from '../generator/buildMap.node';
import {
  allGraphRouteIds,
  buildArchitectureGraph,
  DEFAULT_RELATION_FILTERS,
  expandAllAreas,
  focusNeighborhood,
} from '../graph';
import { searchRoutes } from '../search';
import { buildTree, treeRoutes, walkTree } from '../tree';
import type { RouteNode } from '../types';

const ROOT = resolve(__dirname, '../../../..');
const map = buildArchitectureMap(ROOT);
const tree = buildTree(map.routes);

/** Expansion set that opens everything, for "what can the graph reach" checks. */
function everything(routes: RouteNode[]): Set<string> {
  const ids = new Set<string>();
  walkTree(buildTree(routes), (node) => ids.add(node.id));
  return ids;
}

const fullGraph = (routes: RouteNode[]) =>
  buildArchitectureGraph(routes, {
    expanded: everything(routes),
    revealed: everything(routes),
    maxSiblings: Number.POSITIVE_INFINITY,
  });

// ── 1. Same canonical route set as the other two views ─────────────────────

describe('1. Diagram, Tree and Search describe the same application', () => {
  it('reaches exactly the routes Search lists', () => {
    const searchIds = searchRoutes(map.routes, '').map((hit) => hit.route.id).sort();
    const graphIds = allGraphRouteIds(map.routes).sort();

    const missing = searchIds.filter((id) => !graphIds.includes(id));
    const extra = graphIds.filter((id) => !searchIds.includes(id));

    expect(missing, `routes in Search but unreachable in the Diagram:\n${missing.join('\n')}`)
      .toEqual([]);
    expect(extra, `routes in the Diagram that Search does not know about:\n${extra.join('\n')}`)
      .toEqual([]);
  });

  it('reaches exactly the routes the Tree contains', () => {
    const treeIds = treeRoutes(tree).map((route) => route.id).sort();
    expect(allGraphRouteIds(map.routes).sort()).toEqual(treeIds);
  });

  it('takes its hierarchy from the Tree, so nesting cannot disagree', () => {
    const graph = fullGraph(map.routes);
    const hierarchy = graph.edges.filter((edge) => edge.kind === 'hierarchy');

    // Every hierarchy edge between two route nodes must mirror a real tree
    // parent/child relationship.
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const edge of hierarchy) {
      const parent = nodeById.get(edge.source);
      const child = nodeById.get(edge.target);
      if (!parent?.path || !child?.path) continue;
      if (child.kind === 'detail' || child.kind === 'technical') continue;
      expect(
        child.path.startsWith(parent.path === '/' ? '/' : `${parent.path}/`),
        `${child.path} is drawn under ${parent.path} but is not beneath it`,
      ).toBe(true);
    }
  });

  it('starts at the product level, not with every route', () => {
    // Level 1 is the application plus its areas — nothing inside them.
    const graph = buildArchitectureGraph(map.routes, { expanded: new Set() });
    expect(graph.nodes).toHaveLength(1 + tree.children.length);
    expect(graph.nodes.filter((node) => node.kind === 'route')).toEqual([]);
    expect(graph.nodes[0].kind).toBe('root');
  });

  it('summarizes a large collapsed region instead of drawing all of it', () => {
    const graph = buildArchitectureGraph(map.routes, { expanded: expandAllAreas(map.routes) });
    const studio = graph.nodes.find((node) => node.path === '/b/:slug');
    expect(studio?.kind).toBe('summary');
    expect(studio?.routeCount).toBeGreaterThan(30);
    expect(studio?.sublabel).toMatch(/\d+ routes/);
  });
});

// ── 2 & 3. Dynamic guarantee ───────────────────────────────────────────────

describe('2. A newly discovered route becomes available automatically', () => {
  const existing = map.routes.find((route) => route.path === '/b/:slug/setup') as RouteNode;
  const campaigns: RouteNode = {
    ...existing,
    id: '/b/:slug/campaigns::CampaignsPage',
    path: '/b/:slug/campaigns',
    name: 'Campaigns',
    component: 'CampaignsPage',
    sourceFile: 'src/pages/b/[slug]/campaigns.tsx',
    analysis: undefined,
  };
  const withCampaigns = [...map.routes, campaigns];

  it('places it under the right Brand Workspace structure with no manual node', () => {
    const graph = buildArchitectureGraph(withCampaigns, {
      expanded: everything(withCampaigns),
      revealed: everything(withCampaigns),
      maxSiblings: Number.POSITIVE_INFINITY,
    });

    const node = graph.nodes.find((candidate) => candidate.path === '/b/:slug/campaigns');
    expect(node, 'a new route must appear without anyone creating a diagram node').toBeDefined();
    expect(node?.label).toBe('Campaigns');
    expect(node?.group).toBe('Brand Workspace (Studio)');

    // And it must hang off /b/:slug, not float at the top level.
    const parentEdge = graph.edges.find(
      (edge) => edge.kind === 'hierarchy' && edge.target === node?.id,
    );
    const parent = graph.nodes.find((candidate) => candidate.id === parentEdge?.source);
    expect(parent?.path).toBe('/b/:slug');
  });

  it('exposes its component and source through L3 expansion', () => {
    const graph = buildArchitectureGraph(withCampaigns, {
      expanded: everything(withCampaigns),
      revealed: everything(withCampaigns),
      maxSiblings: Number.POSITIVE_INFINITY,
    });
    const details = graph.nodes.filter((node) => node.id.startsWith(`detail:${campaigns.id}:`));
    expect(details.map((node) => node.label).sort()).toEqual(['Component', 'Route', 'Source']);
    expect(details.find((node) => node.label === 'Source')?.sublabel).toBe(
      'src/pages/b/[slug]/campaigns.tsx',
    );
  });

  it('counts it in every ancestor total', () => {
    const graph = buildArchitectureGraph(withCampaigns, { expanded: new Set() });
    expect(graph.nodes[0].routeCount).toBe(map.routes.length + 1);
  });
});

describe('3. A deleted route disappears', () => {
  const without = map.routes.filter((route) => route.path !== '/b/:slug/brand-kit');

  it('drops its node', () => {
    const graph = fullGraph(without);
    expect(graph.nodes.find((node) => node.path === '/b/:slug/brand-kit')).toBeUndefined();
  });

  it('drops every edge that touched it', () => {
    const before = fullGraph(map.routes);
    const after = fullGraph(without);
    const goneNodeId = before.nodes.find((node) => node.path === '/b/:slug/brand-kit')?.id;
    expect(goneNodeId).toBeDefined();
    expect(
      after.edges.filter((edge) => edge.source === goneNodeId || edge.target === goneNodeId),
    ).toEqual([]);
  });

  it('stops counting it', () => {
    expect(allGraphRouteIds(without)).toHaveLength(map.routes.length - 1);
  });
});

// ── 4. Redirect edges point at the detected target ─────────────────────────

describe('4. Redirect edges point at the detected target', () => {
  const graph = fullGraph(map.routes);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  it('draws an edge to the route the generator actually detected', () => {
    const redirects = map.routes.filter((route) => route.redirectTo);
    expect(redirects.length).toBeGreaterThan(4);

    for (const route of redirects) {
      const source = graph.nodes.find((node) => node.routeIds?.includes(route.id));
      if (!source) continue;
      const edge = graph.edges.find(
        (candidate) => candidate.kind === 'redirect' && candidate.source === source.id,
      );
      expect(edge, `no redirect edge drawn for ${route.path}`).toBeDefined();

      const target = nodeById.get(edge?.target as string);
      expect(
        target?.path,
        `${route.path} should redirect to ${route.redirectTo}, edge landed on ${target?.path}`,
      ).toBe(route.redirectTo);
    }
  });

  it('follows a specific detected redirect end to end', () => {
    // /a/:slug/kit → /a/:slug/brand-kit, read out of the helper component's own
    // <Navigate> — not from a list anyone maintains.
    const kit = map.routes.find((route) => route.path === '/a/:slug/kit') as RouteNode;
    expect(kit.redirectTo).toBe('/a/:slug/brand-kit');

    const source = graph.nodes.find((node) => node.routeIds?.includes(kit.id));
    const edge = graph.edges.find(
      (candidate) => candidate.kind === 'redirect' && candidate.source === source?.id,
    );
    expect(nodeById.get(edge?.target as string)?.path).toBe('/a/:slug/brand-kit');
  });

  it('omits a redirect edge when the target is computed at runtime', () => {
    // StudioToClassicFallback builds its destination from the current URL, so
    // there is nothing to point at and we must not invent one.
    const fallback = map.routes.find((route) => route.path === '/b/:slug/*') as RouteNode;
    expect(fallback.redirectTo).toBeUndefined();

    const source = graph.nodes.find((node) => node.routeIds?.includes(fallback.id));
    expect(
      graph.edges.filter(
        (edge) => edge.kind === 'redirect' && edge.source === source?.id,
      ),
    ).toEqual([]);
  });

  it('lands an edge on the nearest visible ancestor when the target is collapsed', () => {
    // Only Classic expanded: /a/:slug/kit's target is visible, but a redirect into
    // a collapsed region must still visibly point at that region rather than vanish.
    const graphPartial = buildArchitectureGraph(map.routes, {
      expanded: new Set(['area:Brand Workspace (Classic)']),
    });
    const redirectEdges = graphPartial.edges.filter((edge) => edge.kind === 'redirect');
    for (const edge of redirectEdges) {
      expect(graphPartial.nodes.some((node) => node.id === edge.target)).toBe(true);
    }
  });
});

// ── 5. No manually maintained per-route graph registry ─────────────────────

describe('5. No manually maintained per-route registry exists', () => {
  /** Source of the feature, comments stripped, excluding tests. */
  function featureSources(): Array<{ file: string; code: string }> {
    const base = resolve(ROOT, 'src/features/dev-architecture');
    const out: Array<{ file: string; code: string }> = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === '__tests__') continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        const raw = readFileSync(full, 'utf8');
        const code = raw
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
        out.push({ file: full.replace(`${ROOT}/`, ''), code });
      }
    };

    walk(base);
    return out;
  }

  const sources = featureSources();

  it('has sources to inspect', () => {
    expect(sources.length).toBeGreaterThan(8);
  });

  it('names no individual page anywhere in the feature', () => {
    // Top-level prefixes in groups.ts (`/dashboard`, `/admin`, …) are the one
    // explicit layer the design allows, and only for product areas. What must NOT
    // exist is any literal naming a specific page — that would be the registry.
    const multiSegmentRoutes = map.routes
      .map((route) => route.path)
      .filter((path) => path.split('/').filter(Boolean).length >= 2);

    const offenders: string[] = [];
    for (const { file, code } of sources) {
      for (const path of multiSegmentRoutes) {
        if (code.includes(`'${path}'`) || code.includes(`"${path}"`)) {
          offenders.push(`${file} names ${path}`);
        }
      }
    }

    expect(
      offenders,
      `individual routes are hard-coded — this is the per-route registry the design forbids:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('writes no route path at all in the graph projection', () => {
    const graph = sources.find((entry) => entry.file.endsWith('graph.ts'));
    expect(graph).toBeDefined();
    const literals = (graph?.code.match(/['"]\/[a-z][\w:/-]*['"]/g) ?? []).filter(
      (literal) => literal !== "'/'" && literal !== '"/"',
    );
    expect(
      literals,
      `graph.ts should derive everything; it names:\n${literals.join(', ')}`,
    ).toEqual([]);
  });

  it('enumerates nothing close to the real route count', () => {
    // A registry would need ~132 literals. A rules layer needs a handful.
    const all = new Set<string>();
    for (const { code } of sources) {
      for (const literal of code.match(/['"]\/[a-z][\w:/-]*['"]/g) ?? []) all.add(literal);
    }
    expect(all.size).toBeLessThan(Math.floor(map.routes.length / 4));
  });
});

// ── Focus mode + filters ───────────────────────────────────────────────────

describe('focus mode answers "where does this come from and where does it go?"', () => {
  const expanded = everything(map.routes);
  const graph = buildArchitectureGraph(map.routes, {
    expanded,
    revealed: expanded,
    maxSiblings: Number.POSITIVE_INFINITY,
  });
  const setupNode = graph.nodes.find((node) => node.path === '/b/:slug/setup');

  it('keeps the node, its direct neighbours and its ancestors — and drops the rest', () => {
    const focused = focusNeighborhood(graph.nodes, graph.edges, setupNode?.id as string);

    expect(focused.nodes.length).toBeLessThan(graph.nodes.length / 4);
    expect(focused.nodes.some((node) => node.id === setupNode?.id)).toBe(true);
    // Ancestor chain, so the node keeps its place in the application.
    expect(focused.nodes.some((node) => node.kind === 'root')).toBe(true);
    expect(focused.nodes.some((node) => node.path === '/b/:slug')).toBe(true);

    // Every retained edge must connect two retained nodes.
    const kept = new Set(focused.nodes.map((node) => node.id));
    for (const edge of focused.edges) {
      expect(kept.has(edge.source) && kept.has(edge.target)).toBe(true);
    }
  });

  it('reports when the focused node is not in the graph rather than showing nothing', () => {
    const focused = focusNeighborhood(graph.nodes, graph.edges, 'node:does-not-exist');
    expect(focused.focusMissing).toBe(true);
    expect(focused.nodes).toHaveLength(graph.nodes.length);
  });
});

describe('relationship filters', () => {
  const expanded = everything(map.routes);

  it('defaults to structure and flow, with deep imports off', () => {
    expect(DEFAULT_RELATION_FILTERS).toEqual({
      hierarchy: true,
      navigation: true,
      redirect: true,
      import: false,
    });
  });

  it('omits a relationship kind entirely when filtered off', () => {
    const graph = buildArchitectureGraph(map.routes, {
      expanded,
      relations: { hierarchy: true, navigation: false, redirect: false, import: false },
    });
    expect(graph.edges.filter((edge) => edge.kind === 'navigation')).toEqual([]);
    expect(graph.edges.filter((edge) => edge.kind === 'redirect')).toEqual([]);
    expect(graph.edges.some((edge) => edge.kind === 'hierarchy')).toBe(true);
  });

  it('only draws import edges for routes whose technical detail was requested', () => {
    const setupTreeId = 'path:/b/:slug/setup';
    const graph = buildArchitectureGraph(map.routes, {
      expanded,
      revealed: expanded,
      technical: new Set([setupTreeId]),
      relations: { hierarchy: true, navigation: false, redirect: false, import: true },
      maxSiblings: Number.POSITIVE_INFINITY,
    });

    const technicalNodes = graph.nodes.filter((node) => node.kind === 'technical');
    expect(technicalNodes.length).toBeGreaterThan(0);
    // Nothing else got dependency nodes just because the filter was on.
    for (const node of technicalNodes) {
      expect(node.routeId).toContain('/b/:slug/setup');
    }
  });
});

// ── Canonical verification ─────────────────────────────────────────────────

describe('canonical verification', () => {
  it('reads Brand Workspace → Setup → /b/:slug/setup → BrandSetupPageV2 → source', () => {
    const expanded = everything(map.routes);
    const graph = buildArchitectureGraph(map.routes, {
      expanded,
      revealed: expanded,
      maxSiblings: Number.POSITIVE_INFINITY,
    });

    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const setup = graph.nodes.find((node) => node.path === '/b/:slug/setup');
    expect(setup?.label).toBe('Setup');

    // Walk the hierarchy up from Setup and expect the Brand Workspace chain.
    const parentOf = new Map(
      graph.edges
        .filter((edge) => edge.kind === 'hierarchy')
        .map((edge) => [edge.target, edge.source]),
    );
    const chain: string[] = [];
    let cursor = setup?.id;
    while (cursor && parentOf.has(cursor)) {
      cursor = parentOf.get(cursor);
      if (cursor) chain.push(nodeById.get(cursor)?.label as string);
    }
    expect(chain).toEqual(['/b/:slug', 'Brand Workspace (Studio)', 'BrandingOS']);

    // And the three facts hang off it.
    const details = graph.nodes.filter((node) => node.id.startsWith('detail:') && node.routeId === setup?.routeId);
    const byLabel = new Map(details.map((node) => [node.label, node.sublabel]));
    expect(byLabel.get('Route')).toBe('/b/:slug/setup');
    expect(byLabel.get('Component')).toBe('BrandSetupPageV2');
    expect(byLabel.get('Source')).toBe('src/pages/b/[slug]/setup.tsx');
  });
});
