/**
 * Architecture graph — a third PROJECTION of the same model.
 *
 * Search, Tree and Diagram are three renderings of one `ArchitectureMap`. This
 * module is a pure function from `RouteNode[]` + view state to nodes and edges;
 * it holds no route data of its own, and there is deliberately not a single
 * route path written down in this file. Hierarchy is taken from `buildTree`, so
 * the Diagram's nesting is the Tree's nesting by construction.
 *
 * Progressive disclosure, because 131 routes and ~1000 imports at once is not a
 * diagram, it's a hairball:
 *
 *   L1  root + product areas                    (always)
 *   L2  the pages inside an expanded area       (expand an area)
 *   L3  route / component / source of a page     (expand a page)
 *   L4  the modules a page pulls in              (explicit "technical" toggle)
 *
 * Relationships are semantic, never uniform: `hierarchy` from route nesting,
 * `redirect` from a proven redirect target, `navigation` from statically
 * provable Link/navigate targets, `import` from level-1 dependencies. Nothing is
 * inferred from mere co-existence of two routes.
 *
 * Browser-safe and pure. Tested in `__tests__/graph.test.ts`.
 */
import { GROUP_ORDER } from './groups';
import {
  badgesFor,
  buildTree,
  primaryRoute,
  walkTree,
  type RouteBadge,
  type TreeNode,
} from './tree';
import type { ImportKind, RelationKind, RouteGroup, RouteNode } from './types';

export type GraphNodeKind =
  /** The application itself. */
  | 'root'
  /** A product area (Authentication, Brand Workspace…). */
  | 'area'
  /** An expanded URL region with its children shown. */
  | 'branch'
  /** A page. */
  | 'route'
  /** A collapsed region, standing in for everything beneath it. */
  | 'summary'
  /** L3: the route / component / source facts of one page. */
  | 'detail'
  /** L4: a module the page depends on. */
  | 'technical';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Secondary line — a URL, a file path, a count. */
  sublabel?: string;
  /**
   * The URL this node represents. Undefined on the root, areas, and the L3/L4
   * detail nodes, which stand for concepts rather than addresses.
   */
  path?: string;
  /** The most representative route on this node, used for its label and L3 facts. */
  routeId?: string;
  /**
   * EVERY route mounted at this node's URL, not just the primary. A layout and
   * its index route share one URL and therefore one node — counting only the
   * primary loses the other, and with it any redirect it declares (the
   * `/a/:slug` index redirect to `/a/:slug/setup` was invisible until this
   * existed).
   */
  routeIds?: string[];
  /** The tree node this came from, for expansion state shared with the Tree view. */
  treeNodeId?: string;
  group?: RouteGroup;
  badges?: RouteBadge[];
  /** Routes represented by this node's subtree. */
  routeCount?: number;
  /** Set on a "+N more" node: the parent whose sibling cap it lifts. */
  overflowParentId?: string;
  expandable: boolean;
  expanded: boolean;
  /** Layout hints for ELK; the renderer uses the same numbers. */
  width: number;
  height: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: RelationKind;
  label?: string;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Set when a focus was requested but the node isn't in the graph. */
  focusMissing?: boolean;
  /** Nodes hidden by the current focus, for the "showing N of M" readout. */
  totalNodesBeforeFocus: number;
}

export type RelationFilters = Record<RelationKind, boolean>;

/**
 * Defaults favour product comprehension: structure and flow on, code
 * dependencies off. Deep imports are opt-in because they outnumber every other
 * relationship by an order of magnitude.
 */
export const DEFAULT_RELATION_FILTERS: RelationFilters = {
  hierarchy: true,
  navigation: true,
  redirect: true,
  import: false,
};

export interface GraphOptions {
  /**
   * Expanded node ids — SHARED with the Tree view, so expanding Brand Workspace
   * in one view expands it in the other. On a branch this reveals children; on a
   * page it reveals the L3 facts, matching what "expanded" means in the Tree.
   */
  expanded: Set<string>;
  /** Tree node ids showing L4 technical dependencies. */
  technical?: Set<string>;
  /**
   * Parent ids whose sibling cap has been lifted by clicking their "+N more"
   * node. Without this you cannot open a page the cap is hiding — the summary
   * would be a dead end.
   */
  revealed?: Set<string>;
  relations?: RelationFilters;
  /** Graph node id to focus on; null shows the whole graph. */
  focusId?: string | null;
  /**
   * Above this many children, an expanded branch shows the first N and one
   * overflow node. Keeps a 35-child region from becoming an unreadable row.
   */
  maxSiblings?: number;
}

const DEFAULT_MAX_SIBLINGS = 16;

/** L4 buckets — the technical layers a reader actually asks about. */
const TECHNICAL_BUCKETS: Array<{ label: string; kinds: ImportKind[] }> = [
  { label: 'Components', kinds: ['feature', 'component', 'ds'] },
  { label: 'State', kinds: ['store'] },
  { label: 'Services', kinds: ['service', 'domain'] },
  { label: 'Shared', kinds: ['shared'] },
];

// ── Node sizing ────────────────────────────────────────────────────────────
// ELK needs concrete sizes and the renderer must use the same ones, or edges
// land off-centre. Estimated from label length rather than measured, which is
// stable and good enough at these font sizes.

const CHAR_WIDTH = 7.1;
const SUBLABEL_CHAR_WIDTH = 6.2;

function sizeFor(kind: GraphNodeKind, label: string, sublabel?: string) {
  const labelWidth = label.length * CHAR_WIDTH;
  const subWidth = sublabel ? sublabel.length * SUBLABEL_CHAR_WIDTH : 0;
  const content = Math.max(labelWidth, subWidth);

  const min = kind === 'root' ? 150 : kind === 'area' ? 170 : 130;
  const max = kind === 'technical' || kind === 'detail' ? 300 : 260;
  const width = Math.round(Math.min(max, Math.max(min, content + 34)));
  const height = sublabel ? (kind === 'area' || kind === 'root' ? 56 : 50) : 38;

  return { width, height };
}

function makeNode(
  partial: Omit<GraphNode, 'width' | 'height'>,
): GraphNode {
  const { width, height } = sizeFor(partial.kind, partial.label, partial.sublabel);
  return { ...partial, width, height };
}

const ROOT_ID = 'root';
const areaId = (group: RouteGroup) => `area:${group}`;

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Builds the graph for the current view state.
 *
 * Emission is top-down: a node is only emitted when its parent is expanded, so
 * the graph size is bounded by what the reader has actually opened.
 */
export function buildArchitectureGraph(
  routes: RouteNode[],
  options: GraphOptions,
): ArchitectureGraph {
  const {
    expanded,
    technical = new Set<string>(),
    revealed = new Set<string>(),
    relations = DEFAULT_RELATION_FILTERS,
    focusId = null,
    maxSiblings = DEFAULT_MAX_SIBLINGS,
  } = options;

  const tree = buildTree(routes);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  /** Visible node id for a URL, used to land redirect/navigation edges. */
  const nodeIdByPath = new Map<string, string>();
  /** Area of each route path, so an edge can fall back to the area node. */
  const groupByPath = new Map<string, RouteGroup>();
  for (const route of routes) groupByPath.set(route.path, route.group);

  /** True when this subtree holds anything the reader has opened. */
  const containsExpanded = (node: TreeNode): boolean => {
    let hit = false;
    walkTree(node, (candidate) => {
      if (expanded.has(candidate.id) || technical.has(candidate.id)) hit = true;
    });
    return hit;
  };

  const pushEdge = (source: string, target: string, kind: RelationKind, label?: string) => {
    if (!relations[kind]) return;
    if (source === target) return;
    const id = `${kind}:${source}→${target}`;
    // Two Link calls to the same place are one relationship.
    if (edges.some((edge) => edge.id === id)) return;
    edges.push({ id, source, target, kind, label });
  };

  // ── L1: the application and its product areas ────────────────────────────
  nodes.push(
    makeNode({
      id: ROOT_ID,
      kind: 'root',
      label: 'BrandingOS',
      sublabel: plural(tree.routeCount, 'route'),
      expandable: false,
      expanded: true,
      routeCount: tree.routeCount,
    }),
  );

  for (const area of tree.children) {
    const isExpanded = expanded.has(area.id);
    const id = areaId(area.group as RouteGroup);

    nodes.push(
      makeNode({
        id,
        kind: 'area',
        label: area.label,
        sublabel: plural(area.routeCount, 'route'),
        treeNodeId: area.id,
        group: area.group,
        routeCount: area.routeCount,
        expandable: area.children.length > 0,
        expanded: isExpanded,
      }),
    );
    pushEdge(ROOT_ID, id, 'hierarchy');

    if (isExpanded) {
      emitChildren(area, id);
    }
  }

  /**
   * Emits the visible children of an expanded node.
   *
   * A child with children of its own renders as an expanded `branch` (recursing)
   * or a collapsed `summary` carrying its route count — that summary is what
   * keeps "Admin, 16 routes" from becoming 16 nodes before anyone asked.
   */
  function emitChildren(parent: TreeNode, parentGraphId: string) {
    const children = parent.children;

    // The cap must never hide something the reader has opened. Children that are
    // expanded (or contain an expanded descendant) are always shown; the rest
    // fill the remaining slots in tree order. Without this, expanding Setup — the
    // 18th of 35 siblings alphabetically — silently did nothing.
    let shown = children;
    let overflow = 0;
    if (children.length > maxSiblings && !revealed.has(parent.id)) {
      const required = new Set(children.filter(containsExpanded));
      const remaining = Math.max(0, maxSiblings - required.size);
      const filler = new Set(
        children.filter((child) => !required.has(child)).slice(0, remaining),
      );
      shown = children.filter((child) => required.has(child) || filler.has(child));
      overflow = children.length - shown.length;
    }

    for (const child of shown) {
      const route = primaryRoute(child.routes);
      const hasChildren = child.children.length > 0;
      const isExpanded = expanded.has(child.id);
      const id = `node:${child.id}`;

      const kind: GraphNodeKind = hasChildren
        ? isExpanded
          ? 'branch'
          : 'summary'
        : 'route';

      nodes.push(
        makeNode({
          id,
          kind,
          label: child.label,
          sublabel: hasChildren && !isExpanded
            ? plural(child.routeCount, 'route')
            : child.path,
          path: child.path,
          routeId: route?.id,
          routeIds: child.routes.map((entry) => entry.id),
          treeNodeId: child.id,
          group: child.group,
          badges: route ? badgesFor(route).filter((badge) => badge !== 'ROUTE') : undefined,
          routeCount: child.routeCount,
          expandable: hasChildren || Boolean(route),
          expanded: isExpanded,
        }),
      );
      pushEdge(parentGraphId, id, 'hierarchy');

      if (child.path) nodeIdByPath.set(child.path, id);

      if (hasChildren && isExpanded) {
        emitChildren(child, id);
      }

      // L3 — a page's own facts, when the page is expanded.
      if (!hasChildren && isExpanded && route) {
        emitRouteDetail(route, id);
      }

      // L4 — dependencies, only on explicit request.
      if (route && technical.has(child.id)) {
        emitTechnical(route, id);
      }
    }

    if (overflow > 0) {
      const hidden = children.filter((child) => !shown.includes(child));
      const id = `overflow:${parent.id}`;
      nodes.push(
        makeNode({
          id,
          kind: 'summary',
          label: `+${overflow} more`,
          sublabel: plural(
            hidden.reduce((sum, child) => sum + child.routeCount, 0),
            'route',
          ),
          group: parent.group,
          overflowParentId: parent.id,
          expandable: true,
          expanded: false,
        }),
      );
      pushEdge(parentGraphId, id, 'hierarchy');
    }
  }

  /** L3: the three facts the tool exists to surface, as their own nodes. */
  function emitRouteDetail(route: RouteNode, parentGraphId: string) {
    const detail: Array<{ suffix: string; label: string; sublabel: string }> = [
      { suffix: 'route', label: 'Route', sublabel: route.path },
      { suffix: 'component', label: 'Component', sublabel: route.component ?? '—' },
    ];
    if (route.sourceFile) {
      detail.push({ suffix: 'source', label: 'Source', sublabel: route.sourceFile });
    }

    for (const entry of detail) {
      const id = `detail:${route.id}:${entry.suffix}`;
      nodes.push(
        makeNode({
          id,
          kind: 'detail',
          label: entry.label,
          sublabel: entry.sublabel,
          routeId: route.id,
          expandable: false,
          expanded: false,
        }),
      );
      pushEdge(parentGraphId, id, 'hierarchy');
    }
  }

  /** L4: level-1 dependencies, bucketed by architectural layer. */
  function emitTechnical(route: RouteNode, parentGraphId: string) {
    const imports = route.analysis?.imports ?? [];
    if (imports.length === 0) return;

    for (const bucket of TECHNICAL_BUCKETS) {
      const members = imports.filter((ref) => bucket.kinds.includes(ref.kind));
      if (members.length === 0) continue;

      const id = `tech:${route.id}:${bucket.label}`;
      nodes.push(
        makeNode({
          id,
          kind: 'technical',
          label: bucket.label,
          sublabel: members
            .slice(0, 3)
            .map((ref) => ref.specifier.split('/').pop())
            .join(', ') + (members.length > 3 ? `, +${members.length - 3}` : ''),
          routeId: route.id,
          expandable: false,
          expanded: false,
        }),
      );
      pushEdge(parentGraphId, id, 'import', plural(members.length, 'module'));
    }
  }

  // ── Relationship edges between visible nodes ─────────────────────────────
  //
  // A target may be collapsed out of view. Rather than dropping the edge (which
  // hides a real relationship) or forcing the target open (which defeats
  // progressive disclosure), it lands on the nearest visible ancestor — so a
  // redirect into a collapsed region still visibly points at that region.
  function resolveTarget(path: string): string | undefined {
    const direct = nodeIdByPath.get(path);
    if (direct) return direct;

    const segments = path.split('/').filter(Boolean);
    for (let depth = segments.length - 1; depth > 0; depth -= 1) {
      const ancestor = `/${segments.slice(0, depth).join('/')}`;
      const hit = nodeIdByPath.get(ancestor);
      if (hit) return hit;
    }

    const group = groupByPath.get(path);
    if (group && GROUP_ORDER.includes(group)) {
      const id = areaId(group);
      return nodes.some((node) => node.id === id) ? id : undefined;
    }
    return undefined;
  }

  const visibleRoutes = nodes.filter((node) => node.routeIds?.length && node.kind !== 'detail');
  const routeById = new Map(routes.map((route) => [route.id, route]));

  for (const node of visibleRoutes) {
    // Every route on the node contributes its relationships, not just the primary.
    for (const routeId of node.routeIds ?? []) {
      const route = routeById.get(routeId);
      if (!route) continue;

      if (route.redirectTo) {
        const target = resolveTarget(route.redirectTo);
        if (target) pushEdge(node.id, target, 'redirect', 'redirects to');
      }

      for (const navigation of route.analysis?.navigations ?? []) {
        if (!navigation.toPath) continue;
        const target = resolveTarget(navigation.toPath);
        if (target) pushEdge(node.id, target, 'navigation', navigation.via);
      }
    }
  }

  const totalNodesBeforeFocus = nodes.length;

  if (!focusId) {
    return { nodes, edges, totalNodesBeforeFocus };
  }

  return {
    ...focusNeighborhood(nodes, edges, focusId),
    totalNodesBeforeFocus,
  };
}

/**
 * Focus mode: "where does this come from and where does it go?"
 *
 * Keeps the node, everything directly connected to it in either direction, and
 * its ancestor chain so it doesn't float context-free. Everything else is hidden
 * — that is the point.
 */
export function focusNeighborhood(
  nodes: GraphNode[],
  edges: GraphEdge[],
  focusId: string,
): { nodes: GraphNode[]; edges: GraphEdge[]; focusMissing?: boolean } {
  if (!nodes.some((node) => node.id === focusId)) {
    return { nodes, edges, focusMissing: true };
  }

  const keep = new Set<string>([focusId]);

  for (const edge of edges) {
    if (edge.source === focusId) keep.add(edge.target);
    if (edge.target === focusId) keep.add(edge.source);
  }

  // Walk hierarchy edges upward so the focused node keeps its place in the app.
  const parentOf = new Map<string, string>();
  for (const edge of edges) {
    if (edge.kind === 'hierarchy') parentOf.set(edge.target, edge.source);
  }
  let cursor: string | undefined = focusId;
  const guard = new Set<string>();
  while (cursor && parentOf.has(cursor) && !guard.has(cursor)) {
    guard.add(cursor);
    cursor = parentOf.get(cursor);
    if (cursor) keep.add(cursor);
  }

  return {
    nodes: nodes.filter((node) => keep.has(node.id)),
    edges: edges.filter((edge) => keep.has(edge.source) && keep.has(edge.target)),
  };
}

/**
 * Every route id the graph can reach with everything expanded.
 *
 * Used by the divergence test to prove the Diagram covers the same route set as
 * Search and the Tree — the three views must never describe different apps.
 */
export function allGraphRouteIds(routes: RouteNode[]): string[] {
  const tree = buildTree(routes);
  const everything = new Set<string>();
  walkTree(tree, (node) => everything.add(node.id));

  const graph = buildArchitectureGraph(routes, {
    expanded: everything,
    // No sibling cap: an overflow summary would legitimately hide routes, and
    // this function asks what the graph can REACH, not what fits on screen.
    maxSiblings: Number.POSITIVE_INFINITY,
  });

  return [
    ...new Set(
      graph.nodes
        .filter((node) => node.kind !== 'detail')
        .flatMap((node) => node.routeIds ?? []),
    ),
  ];
}

/**
 * Expansion set that opens every product area — the "Expand areas" toolbar
 * action, i.e. Level 2 for the whole app at once.
 *
 * NOT the initial state: the Diagram deliberately starts at Level 1 (the
 * application and its areas, nothing inside them) so the first thing a newcomer
 * sees is the product's shape rather than 130 boxes.
 */
export function expandAllAreas(routes: RouteNode[]): Set<string> {
  const tree = buildTree(routes);
  return new Set(tree.children.map((area) => area.id));
}
