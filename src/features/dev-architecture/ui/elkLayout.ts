/**
 * Automatic hierarchical layout via ELK.
 *
 * No node position is ever assigned by hand — positions are computed from the
 * graph every time it changes, so adding or removing a route reorganizes the
 * diagram on its own.
 *
 * ELK's `layered` algorithm is the right family here (Sugiyama-style layering):
 * it assigns nodes to layers by edge direction and then minimizes crossings,
 * which is what makes a route hierarchy legible. The options below are tuned for
 * readability over compactness, per the layout-quality requirement.
 *
 * elkjs is a large GWT-compiled bundle, so it is imported DYNAMICALLY and only
 * when the Diagram view actually mounts. It lives in devDependencies and this
 * whole feature is dev-only, so its size never reaches a production build.
 */
import type { GraphEdge, GraphNode } from '../graph';

export type LayoutDirection = 'DOWN' | 'RIGHT';

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  width: number;
  height: number;
}

/** Cached ELK instance — constructing it spins up a worker-ish runtime. */
let elkPromise: Promise<{ layout: (graph: unknown) => Promise<unknown> }> | null = null;

async function getElk() {
  if (!elkPromise) {
    elkPromise = import('elkjs/lib/elk.bundled.js').then((module) => {
      const Elk = (module.default ?? module) as new (options?: unknown) => {
        layout: (graph: unknown) => Promise<unknown>;
      };
      return new Elk();
    });
  }
  return elkPromise;
}

function layoutOptions(direction: LayoutDirection): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': direction,
    // Crossing minimization is the single biggest readability win on a route
    // graph, and worth the extra passes at these node counts.
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.thoroughness': '12',
    // NETWORK_SIMPLEX gives balanced, non-jagged layers.
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    // Generous spacing: this diagram is for reading, not for fitting on a slide.
    'elk.spacing.nodeNode': '28',
    'elk.layered.spacing.nodeNodeBetweenLayers': direction === 'DOWN' ? '76' : '96',
    'elk.spacing.edgeNode': '20',
    'elk.spacing.edgeEdge': '12',
    'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    // Orthogonal routing reads as an architecture diagram rather than a web.
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  };
}

/**
 * Positions every node. Edges are passed to ELK for layering/crossing purposes
 * but their routing is left to React Flow, which draws smoother curves than
 * replaying ELK's bend points.
 */
export async function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: LayoutDirection,
): Promise<LayoutResult> {
  if (nodes.length === 0) return { nodes: [], width: 0, height: 0 };

  const elk = await getElk();
  const known = new Set(nodes.map((node) => node.id));

  const result = (await elk.layout({
    id: 'root',
    layoutOptions: layoutOptions(direction),
    children: nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
    })),
    // A dangling edge makes ELK throw, so only edges between present nodes go in.
    edges: edges
      .filter((edge) => known.has(edge.source) && known.has(edge.target))
      .map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  })) as {
    width?: number;
    height?: number;
    children?: Array<{ id: string; x?: number; y?: number }>;
  };

  const positionById = new Map(
    (result.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]),
  );

  return {
    nodes: nodes.map((node) => ({
      ...node,
      ...(positionById.get(node.id) ?? { x: 0, y: 0 }),
    })),
    width: result.width ?? 0,
    height: result.height ?? 0,
  };
}
