/**
 * Semantic architecture tree — DERIVED, not declared.
 *
 * This is a pure function over the SAME `ArchitectureMap` the Search view
 * consumes. It adds no data source of its own: every label, grouping and badge
 * here is computed from route paths, component names and the metadata the
 * generator already produced. Add `<Route path="/b/:slug/campaigns" …>` to the
 * router and "Campaigns" appears under Brand Workspace on the next reload with
 * nothing else to update.
 *
 * The shape is a URL trie, not a filesystem tree:
 *
 *   Brand Workspace (Studio)      ← product area (from `groups.ts`)
 *     /b/:slug                    ← shared prefix, collapsed from `b` + `:slug`
 *       Setup                      ← route
 *       Design                     ← route that also has children
 *         Brand Design Editor      ← /b/:slug/design/:designSlug
 *
 * Browser-safe and pure. Tested in `__tests__/tree.test.ts`, which also asserts
 * the tree and Search cover exactly the same route set.
 */
import { GROUP_ORDER } from './groups';
import { humanizeSegment } from './naming';
import type { RouteGroup, RouteNode } from './types';

export type TreeNodeKind = 'root' | 'area' | 'path';

export interface TreeNode {
  /** Stable id for expansion state and deep links. */
  id: string;
  kind: TreeNodeKind;
  /** Human label shown in the tree. */
  label: string;
  /** URL prefix this node represents (undefined for root/area). */
  path?: string;
  /** Product area this node belongs to (undefined for root). */
  group?: RouteGroup;
  /**
   * Routes mounted at exactly this path. Usually 0 (a structural prefix) or 1.
   * More than one happens where a layout and its index route share a URL —
   * `/b/:slug` mounts both `BrandRouteLayout` and `StudioToClassicFallback`.
   */
  routes: RouteNode[];
  children: TreeNode[];
  /** Routes in this whole subtree — what the group counts display. */
  routeCount: number;
  /** Nesting depth, root = 0. */
  depth: number;
}

/** Badges are derived per route; nothing here is hand-assigned. */
export type RouteBadge =
  | 'ROUTE'
  | 'INDEX'
  | 'LAYOUT'
  | 'REDIRECT'
  | 'SPLAT'
  | 'DYNAMIC'
  | 'DEV'
  | 'LEGACY';

/**
 * Legacy is inferred from two mechanical signals documented in CLAUDE.md, not
 * from a curated list:
 *   - `/dashboard/brand/*` is the superseded URL space kept alive by redirects;
 *   - a source file under a `-alt/` folder is the alternate/legacy fork by the
 *     repo's own folder convention.
 * Classic (`/a/:slug`) is deliberately NOT badged legacy — it is a supported
 * alternate UI, and its product area already says so.
 */
function isLegacy(route: RouteNode): boolean {
  if (route.path.startsWith('/dashboard/brand/')) return true;
  return Boolean(route.sourceFile?.includes('-alt/'));
}

function lastSegmentIsDynamic(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return Boolean(last) && last.startsWith(':');
}

export function badgesFor(route: RouteNode): RouteBadge[] {
  const badges: RouteBadge[] = [];

  if (route.kind === 'page') badges.push('ROUTE');
  if (route.kind === 'index') badges.push('INDEX');
  if (route.kind === 'layout') badges.push('LAYOUT');
  if (route.kind === 'redirect') badges.push('REDIRECT');
  if (route.kind === 'catch-all' || route.path.endsWith('*')) badges.push('SPLAT');
  // DYNAMIC flags routes whose OWN last segment is a parameter, not any route
  // that merely inherits `:slug` from its branch — otherwise every one of the 35
  // routes under /b/:slug wears the badge and it stops meaning anything.
  if (lastSegmentIsDynamic(route.path)) badges.push('DYNAMIC');
  if (route.devOnly) badges.push('DEV');
  if (isLegacy(route)) badges.push('LEGACY');

  return badges;
}

/** Path → trie keys. `/` becomes a single `/` key so it can own a node. */
export function segmentKeys(path: string): string[] {
  if (path === '/') return ['/'];
  return path.split('/').filter(Boolean);
}

/** Trie keys → the path they represent, matching `RouteNode.path` exactly. */
function pathFromKeys(keys: string[]): string {
  if (keys.length === 1 && keys[0] === '/') return '/';
  return `/${keys.join('/')}`;
}

const isDynamicKey = (key: string) => key.startsWith(':') || key === '*';

interface Builder {
  keys: string[];
  routes: RouteNode[];
  children: Map<string, Builder>;
}

function emptyBuilder(keys: string[]): Builder {
  return { keys, routes: [], children: new Map() };
}

/**
 * The route that best represents a node when several share its URL. A real page
 * beats an index, which beats a layout, which beats a redirect — so a node is
 * described by the most meaningful thing mounted on it.
 */
export function primaryRoute(routes: RouteNode[]): RouteNode | undefined {
  if (routes.length === 0) return undefined;
  const order: RouteNode['kind'][] = ['page', 'index', 'layout', 'redirect', 'catch-all'];
  for (const kind of order) {
    const match = routes.find((route) => route.kind === kind);
    if (match) return match;
  }
  return routes[0];
}

/**
 * Label for a trie node.
 *
 * A leaf is named after its route (`deriveName` already resolved dynamic tails
 * via the component name, giving "Brand Design Editor" for
 * `/b/:slug/design/:designSlug`).
 *
 * A branch is a URL region, so it is named after the segment it owns —
 * "Design", "Tools", "Case Study". When that segment is dynamic there is no
 * meaningful word to use, so the raw prefix is shown instead: `/b/:slug`.
 */
function labelFor(node: Builder, hasChildren: boolean): string {
  const primary = primaryRoute(node.routes);
  const lastKey = node.keys[node.keys.length - 1];

  if (!hasChildren && primary) return primary.name;

  if (lastKey && !isDynamicKey(lastKey) && lastKey !== '/') {
    return humanizeSegment(lastKey);
  }

  // A dynamic or root-ish branch: the URL is the clearest label.
  if (!hasChildren && primary) return primary.name;
  return pathFromKeys(node.keys);
}

function toTreeNode(
  builder: Builder,
  group: RouteGroup,
  depth: number,
): TreeNode {
  // Collapse structural chains: a prefix that owns no route and has exactly one
  // child is not a level a human needs (`b` → `:slug` becomes `/b/:slug`).
  let current = builder;
  while (current.routes.length === 0 && current.children.size === 1) {
    const [only] = [...current.children.values()];
    current = { ...only, keys: [...current.keys, ...only.keys.slice(current.keys.length)] };
  }

  const childBuilders = [...current.children.values()];
  const children = childBuilders
    .map((child) => toTreeNode(child, group, depth + 1))
    .sort(compareTreeNodes);

  const path = pathFromKeys(current.keys);

  return {
    id: `path:${path}`,
    kind: 'path',
    label: labelFor(current, children.length > 0),
    path,
    group,
    routes: [...current.routes].sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
    ),
    children,
    routeCount: current.routes.length + children.reduce((sum, c) => sum + c.routeCount, 0),
    depth,
  };
}

/** Pages before folders, then alphabetical — the Finder/VS Code convention. */
function compareTreeNodes(a: TreeNode, b: TreeNode): number {
  const aBranch = a.children.length > 0 ? 1 : 0;
  const bBranch = b.children.length > 0 ? 1 : 0;
  if (aBranch !== bBranch) return aBranch - bBranch;
  return a.label.localeCompare(b.label);
}

/**
 * Builds the whole tree from the generated map.
 *
 * Top-level areas come from `groups.ts` — the one small explicit layer, and only
 * for product areas. Everything below is derived from the routes themselves.
 */
export function buildTree(routes: RouteNode[]): TreeNode {
  const byGroup = new Map<RouteGroup, RouteNode[]>();
  for (const route of routes) {
    byGroup.set(route.group, [...(byGroup.get(route.group) ?? []), route]);
  }

  const areas: TreeNode[] = [];

  for (const group of GROUP_ORDER) {
    const groupRoutes = byGroup.get(group);
    if (!groupRoutes || groupRoutes.length === 0) continue;

    // Insert every route into a per-area trie keyed by URL segment.
    const trieRoot = emptyBuilder([]);
    for (const route of groupRoutes) {
      const keys = segmentKeys(route.path);
      let node = trieRoot;
      const accumulated: string[] = [];
      for (const key of keys) {
        accumulated.push(key);
        if (!node.children.has(key)) {
          node.children.set(key, emptyBuilder([...accumulated]));
        }
        node = node.children.get(key) as Builder;
      }
      node.routes.push(route);
    }

    const children = [...trieRoot.children.values()]
      .map((child) => toTreeNode(child, group, 2))
      .sort(compareTreeNodes);

    areas.push({
      id: `area:${group}`,
      kind: 'area',
      label: group,
      group,
      routes: [],
      children,
      routeCount: groupRoutes.length,
      depth: 1,
    });
  }

  return {
    id: 'root',
    kind: 'root',
    label: 'BrandingOS',
    routes: [],
    children: areas,
    routeCount: routes.length,
    depth: 0,
  };
}

/** Depth-first walk, parents before children. */
export function walkTree(node: TreeNode, visit: (node: TreeNode) => void): void {
  visit(node);
  for (const child of node.children) walkTree(child, visit);
}

/** Every route in the tree, in tree order. Used by the divergence test. */
export function treeRoutes(root: TreeNode): RouteNode[] {
  const out: RouteNode[] = [];
  walkTree(root, (node) => out.push(...node.routes));
  return out;
}

/** Every node id in the tree. */
export function allNodeIds(root: TreeNode): string[] {
  const ids: string[] = [];
  walkTree(root, (node) => ids.push(node.id));
  return ids;
}

/**
 * Ids of nodes that have children — i.e. the structural levels.
 *
 * "Expanded" means two different things depending on the node: for a branch it
 * reveals children, for a leaf page it reveals the technical drill-down
 * (route/component/source/imports). Bulk operations must only ever open
 * STRUCTURE, or "Expand all" turns the tree into a wall of metadata and the
 * shape it exists to show disappears.
 */
export function branchNodeIds(root: TreeNode): string[] {
  const ids: string[] = [];
  walkTree(root, (node) => {
    if (node.children.length > 0) ids.push(node.id);
  });
  return ids;
}

/**
 * Ids to expand so `routeId` is visible, INCLUDING the node holding it.
 * Returns [] when the route isn't in the tree.
 */
export function ancestorIdsFor(root: TreeNode, routeId: string): string[] {
  let found: string[] | null = null;

  const walk = (node: TreeNode, trail: string[]) => {
    if (found) return;
    const nextTrail = [...trail, node.id];
    if (node.routes.some((route) => route.id === routeId)) {
      found = nextTrail;
      return;
    }
    for (const child of node.children) walk(child, nextTrail);
  };

  walk(root, []);
  return found ?? [];
}

/** The tree node that holds a given route. */
export function nodeForRoute(root: TreeNode, routeId: string): TreeNode | undefined {
  let found: TreeNode | undefined;
  walkTree(root, (node) => {
    if (!found && node.routes.some((route) => route.id === routeId)) found = node;
  });
  return found;
}

/**
 * Sensible initial expansion: the root, every product area, and each area's
 * immediate BRANCH children.
 *
 * That second level is what makes the view useful on arrival — without it the
 * whole Studio surface hides behind a single `/b/:slug` row, and Studio is the
 * heart of the product. Branches deeper than that (Tools, Design, Case Study…)
 * stay shut so the first screen reads as a map rather than a dump.
 *
 * Leaves are never expanded: on a leaf, "expanded" means the technical
 * drill-down, which must stay opt-in.
 */
export function defaultExpandedIds(root: TreeNode): Set<string> {
  const expanded = new Set<string>([root.id]);

  for (const area of root.children) {
    expanded.add(area.id);
    for (const child of area.children) {
      if (child.children.length > 0) expanded.add(child.id);
    }
  }

  return expanded;
}
