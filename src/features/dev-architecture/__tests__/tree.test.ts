/**
 * Tree derivation tests.
 *
 * The load-bearing one is "Tree and Search cannot diverge": the tree is built by
 * a pure function over the same `RouteNode[]` the Search view renders, and this
 * asserts the two cover an identical route set. If someone ever introduces a
 * filter, a second data source, or a hand-written node, that test fails.
 */
import { describe, expect, it } from 'vitest';

import { buildArchitectureMap } from '../generator/buildMap.node';
import { searchRoutes } from '../search';
import {
  allNodeIds,
  ancestorIdsFor,
  badgesFor,
  branchNodeIds,
  buildTree,
  defaultExpandedIds,
  nodeForRoute,
  primaryRoute,
  segmentKeys,
  treeRoutes,
  walkTree,
  type TreeNode,
} from '../tree';
import type { RouteNode } from '../types';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');
const map = buildArchitectureMap(ROOT);
const tree = buildTree(map.routes);

/** Finds a node by its label under a given area. */
function findNode(root: TreeNode, predicate: (node: TreeNode) => boolean): TreeNode | undefined {
  let found: TreeNode | undefined;
  walkTree(root, (node) => {
    if (!found && predicate(node)) found = node;
  });
  return found;
}

const nodeAtPath = (path: string) => findNode(tree, (node) => node.path === path);
const area = (label: string) => tree.children.find((child) => child.label === label);

describe('Tree and Search cannot diverge', () => {
  it('covers exactly the same routes as the Search view', () => {
    // Search with an empty query is the full route set — the same input the tree
    // is built from. Both must describe the same application.
    const searchIds = searchRoutes(map.routes, '').map((hit) => hit.route.id).sort();
    const treeIds = treeRoutes(tree).map((route) => route.id).sort();

    const missingFromTree = searchIds.filter((id) => !treeIds.includes(id));
    const extraInTree = treeIds.filter((id) => !searchIds.includes(id));

    expect(
      missingFromTree,
      `routes reachable in Search but absent from the Tree:\n${missingFromTree.join('\n')}`,
    ).toEqual([]);
    expect(
      extraInTree,
      `routes present in the Tree that Search does not know about:\n${extraInTree.join('\n')}`,
    ).toEqual([]);
    expect(treeIds).toEqual(searchIds);
  });

  it('places every route exactly once', () => {
    const ids = treeRoutes(tree).map((route) => route.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates, `routes appearing in more than one tree node:\n${duplicates.join('\n')}`)
      .toEqual([]);
    expect(ids).toHaveLength(map.routes.length);
  });

  it('reports a subtree count equal to the routes it contains', () => {
    walkTree(tree, (node) => {
      const actual = treeRoutes(node).length;
      expect(node.routeCount, `${node.kind} "${node.label}" count`).toBe(actual);
    });
  });

  it('keeps every route in the product area the map assigned it', () => {
    for (const areaNode of tree.children) {
      for (const route of treeRoutes(areaNode)) {
        expect(route.group, `${route.path} sits under ${areaNode.label}`).toBe(areaNode.label);
      }
    }
  });

  it('gives every node a unique id', () => {
    const ids = allNodeIds(tree);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the canonical case', () => {
  it('reads Brand Workspace → Setup → /b/:slug/setup → BrandSetupPageV2 → source', () => {
    const studio = area('Brand Workspace (Studio)');
    expect(studio, 'Brand Workspace (Studio) area missing').toBeDefined();

    // Real nesting is preserved: the six Studio sections hang off one /b/:slug
    // branch rather than appearing as unrelated flat records.
    const branch = studio?.children.find((child) => child.path === '/b/:slug');
    expect(branch, '/b/:slug branch missing').toBeDefined();
    expect(branch?.label).toBe('/b/:slug');

    const setup = branch?.children.find((child) => child.path === '/b/:slug/setup');
    expect(setup, 'Setup node missing under /b/:slug').toBeDefined();
    expect(setup?.label).toBe('Setup');

    const route = primaryRoute(setup?.routes ?? []);
    expect(route?.path).toBe('/b/:slug/setup');
    expect(route?.component).toBe('BrandSetupPageV2');
    expect(route?.sourceFile).toBe('src/pages/b/[slug]/setup.tsx');
  });

  it('reaches Setup from the tree root by expanding its ancestors', () => {
    const setupRoute = map.routes.find((route) => route.path === '/b/:slug/setup') as RouteNode;
    const ancestors = ancestorIdsFor(tree, setupRoute.id);

    expect(ancestors[0]).toBe('root');
    expect(ancestors).toContain('area:Brand Workspace (Studio)');
    expect(ancestors).toContain('path:/b/:slug');
    expect(ancestors[ancestors.length - 1]).toBe('path:/b/:slug/setup');
  });
});

describe('real route nesting is preserved', () => {
  it('nests the design editor under Design', () => {
    const design = nodeAtPath('/b/:slug/design');
    expect(design?.label).toBe('Design');
    expect(design?.children.map((child) => child.path)).toContain('/b/:slug/design/:designSlug');
  });

  it('nests the four brand tools under Tools', () => {
    const tools = nodeAtPath('/b/:slug/tools');
    expect(tools?.label).toBe('Tools');
    const childPaths = tools?.children.map((child) => child.path) ?? [];
    expect(childPaths).toContain('/b/:slug/tools/variant-studio');
    expect(childPaths).toContain('/b/:slug/tools/ui-color-system');
    expect(childPaths).toContain('/b/:slug/tools/typescale');
    expect(childPaths).toContain('/b/:slug/tools/mockup-studio');
  });

  it('nests admin and settings sub-pages under their parents', () => {
    expect(nodeAtPath('/admin')?.children.length).toBeGreaterThan(5);
    expect(nodeAtPath('/settings')?.children.map((c) => c.path)).toContain('/settings/account');
  });

  it('collapses structural prefixes that own no route', () => {
    // `b` and `:slug` are separate URL segments but only `/b/:slug` is a real
    // level, so the tree must not show a lone "b" node.
    const stray = findNode(tree, (node) => node.path === '/b');
    expect(stray, 'the /b prefix should have been collapsed into /b/:slug').toBeUndefined();
  });

  it('collapses a prefix that owns nothing but a redirect', () => {
    // /b owns one route now — the doormat that sends a slug-less URL to the
    // dashboard. It renders no page, so it must not become a level: letting it
    // stand would bury the entire Studio surface one row deeper behind a node
    // with nothing in it. The route itself is not lost; it rides on /b/:slug.
    const doormat = tree.children
      .flatMap((area) => area.children)
      .flatMap((branch) => branch.routes)
      .find((route) => route.path === '/b');

    expect(doormat, 'the /b redirect must still appear in the tree').toBeDefined();
    expect(doormat?.kind).toBe('redirect');
    expect(doormat?.redirectTo).toBe('/dashboard');
  });

  it('keeps a layout and the route at its index position on one node', () => {
    // /b/:slug mounts two things at the same URL: BrandRouteLayout (the shell)
    // and its index element StudioToClassicFallback. The index element is
    // classified `redirect` rather than `index` because that says more about what
    // it does — the tree just has to keep both on the one node.
    //
    // The third is the `/b` doormat that collapsed into this node: a slug-less
    // /b renders nothing and forwards to the dashboard, so it earns no level of
    // its own but must still appear somewhere.
    const branch = nodeAtPath('/b/:slug');
    expect(branch?.routes.length).toBe(3);
    expect(branch?.routes.map((route) => route.component).sort()).toEqual([
      'BrandRouteLayout',
      'Navigate',
      'StudioToClassicFallback',
    ]);
    expect(branch?.routes.map((route) => route.kind).sort()).toEqual([
      'layout',
      'redirect',
      'redirect',
    ]);
  });

  it('keeps a plain layout + Navigate index pair on one node too', () => {
    const settings = nodeAtPath('/settings');
    expect(settings?.routes.map((route) => route.component).sort()).toEqual([
      'Navigate',
      'SettingsLayout',
    ]);
  });
});

describe('labels are derived, never declared', () => {
  it('names a leaf after its route', () => {
    expect(nodeAtPath('/b/:slug/brand-kit')?.label).toBe('Brand Kit');
    expect(nodeAtPath('/login')?.label).toBe('Login');
  });

  it('names a branch after the URL segment it owns', () => {
    expect(nodeAtPath('/settings')?.label).toBe('Settings');
    expect(nodeAtPath('/b/:slug/case-study')?.label).toBe('Case Study');
  });

  it('falls back to the raw prefix when a branch segment is dynamic', () => {
    expect(nodeAtPath('/a/:slug')?.label).toBe('/a/:slug');
    expect(nodeAtPath('/brand/:slug')?.label).toBe('/brand/:slug');
  });

  it('lists product areas in the documented order', () => {
    const labels = tree.children.map((child) => child.label);
    expect(labels.indexOf('Public')).toBeLessThan(labels.indexOf('Authentication'));
    expect(labels.indexOf('Brand Workspace (Studio)')).toBeLessThan(
      labels.indexOf('Brand Workspace (Classic)'),
    );
    expect(labels[labels.length - 1]).toBe('Development');
  });
});

describe('badges', () => {
  const badgesForPath = (path: string) => {
    const route = primaryRoute(nodeAtPath(path)?.routes ?? []);
    return route ? badgesFor(route) : [];
  };

  it('marks a plain page as a route', () => {
    expect(badgesForPath('/b/:slug/setup')).toContain('ROUTE');
  });

  it('marks redirects, splats and dev-only routes', () => {
    expect(badgesForPath('/a/:slug/kit')).toContain('REDIRECT');
    expect(badgesForPath('/b/:slug/*')).toContain('SPLAT');
    expect(badgesForPath('/__architecture')).toContain('DEV');
  });

  it('marks the superseded /dashboard/brand URL space as legacy', () => {
    expect(badgesForPath('/dashboard/brand/:slug/*')).toContain('LEGACY');
  });

  it('does not put DYNAMIC on routes that merely inherit :slug', () => {
    // Every route under /b/:slug has a param; badging them all would make the
    // badge meaningless. Only a route whose OWN tail is dynamic earns it.
    expect(badgesForPath('/b/:slug/setup')).not.toContain('DYNAMIC');
    expect(badgesForPath('/b/:slug/design/:designSlug')).toContain('DYNAMIC');
  });

  it('does not badge Classic as legacy — it is a supported alternate UI', () => {
    expect(badgesForPath('/a/:slug/identity')).not.toContain('LEGACY');
  });
});

describe('expansion semantics', () => {
  const expanded = defaultExpandedIds(tree);

  it('opens the root and every product area', () => {
    expect(expanded.has('root')).toBe(true);
    for (const areaNode of tree.children) {
      expect(expanded.has(areaNode.id), `${areaNode.label} should start expanded`).toBe(true);
    }
  });

  it("opens each area's branch children so real pages are visible on arrival", () => {
    // Without this the entire Studio surface hides behind one /b/:slug row.
    expect(expanded.has('path:/b/:slug')).toBe(true);
    expect(expanded.has('path:/a/:slug')).toBe(true);
    expect(expanded.has('path:/dashboard')).toBe(true);
    expect(expanded.has('path:/admin')).toBe(true);
  });

  it('leaves deeper branches closed so the first screen stays readable', () => {
    expect(expanded.has('path:/b/:slug/tools')).toBe(false);
    expect(expanded.has('path:/b/:slug/design')).toBe(false);
    expect(expanded.has('path:/templates/builder')).toBe(false);
  });

  it('never expands a leaf page by default', () => {
    // On a leaf, "expanded" opens the technical drill-down. Including leaves here
    // floods the tree with route/component/source/imports rows and destroys the
    // structure the view exists to show — a real regression caught in review.
    const leafIds: string[] = [];
    walkTree(tree, (node) => {
      if (node.children.length === 0 && node.routes.length > 0) leafIds.push(node.id);
    });

    expect(leafIds.length).toBeGreaterThan(80);
    const wronglyOpen = leafIds.filter((id) => expanded.has(id));
    expect(
      wronglyOpen,
      `these leaf pages would render their drill-down on first paint:\n${wronglyOpen.join('\n')}`,
    ).toEqual([]);
  });

  it('restricts Expand all to structural nodes', () => {
    const branches = branchNodeIds(tree);
    for (const id of branches) {
      const node = findNode(tree, (candidate) => candidate.id === id);
      expect(node?.children.length, `${id} should have children`).toBeGreaterThan(0);
    }
    // Every branch, and nothing but branches.
    const branchSet = new Set(branches);
    walkTree(tree, (node) => {
      expect(branchSet.has(node.id)).toBe(node.children.length > 0);
    });
  });
});

describe('helpers', () => {
  it('maps a route back to its containing node', () => {
    const setupRoute = map.routes.find((route) => route.path === '/b/:slug/setup') as RouteNode;
    expect(nodeForRoute(tree, setupRoute.id)?.path).toBe('/b/:slug/setup');
  });

  it('returns no ancestors for an unknown route', () => {
    expect(ancestorIdsFor(tree, 'does-not-exist')).toEqual([]);
  });

  it('splits paths into trie keys', () => {
    expect(segmentKeys('/')).toEqual(['/']);
    expect(segmentKeys('/b/:slug/setup')).toEqual(['b', ':slug', 'setup']);
    expect(segmentKeys('/*')).toEqual(['*']);
  });
});

describe('dynamic behaviour', () => {
  it('places a brand-new Studio route without any manual registration', () => {
    // Simulates adding <Route path="/b/:slug/campaigns" …> to App.tsx. Nothing
    // about the tree is configured per route, so it must simply appear.
    const existing = map.routes.find((route) => route.path === '/b/:slug/setup') as RouteNode;
    const campaigns: RouteNode = {
      ...existing,
      id: '/b/:slug/campaigns::CampaignsPage',
      path: '/b/:slug/campaigns',
      name: 'Campaigns',
      component: 'CampaignsPage',
      sourceFile: 'src/pages/b/[slug]/campaigns.tsx',
    };

    const nextTree = buildTree([...map.routes, campaigns]);
    const studio = nextTree.children.find(
      (child) => child.label === 'Brand Workspace (Studio)',
    );
    const branch = studio?.children.find((child) => child.path === '/b/:slug');
    const node = branch?.children.find((child) => child.path === '/b/:slug/campaigns');

    expect(node, 'a new /b/:slug/campaigns route should appear under /b/:slug').toBeDefined();
    expect(node?.label).toBe('Campaigns');
    expect(primaryRoute(node?.routes ?? [])?.sourceFile).toBe('src/pages/b/[slug]/campaigns.tsx');
    expect(nextTree.routeCount).toBe(map.routes.length + 1);
  });

  it('drops a route from the tree when it leaves the router', () => {
    const without = map.routes.filter((route) => route.path !== '/b/:slug/setup');
    const nextTree = buildTree(without);
    expect(findNode(nextTree, (node) => node.path === '/b/:slug/setup')).toBeUndefined();
    expect(nextTree.routeCount).toBe(map.routes.length - 1);
  });

  it('builds an empty tree from no routes without throwing', () => {
    const empty = buildTree([]);
    expect(empty.children).toEqual([]);
    expect(empty.routeCount).toBe(0);
  });
});
