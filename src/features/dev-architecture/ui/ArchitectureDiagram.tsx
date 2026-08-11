/**
 * Diagram view — "how does the system connect and flow?"
 *
 * The third rendering of the same architecture model. Search answers "where is
 * X?", Tree answers "what exists?", this answers how the pieces relate: what
 * belongs under what, what redirects where, and where a page sends the user.
 *
 * Nodes are positioned entirely by ELK (see `elkLayout.ts`) — nothing is placed
 * by hand, so the diagram reorganizes itself when routes change. Edges are typed,
 * not uniform: hierarchy, navigation, redirect and import each read differently
 * and can be filtered independently.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DsButton } from '@/shared/ds';

import type { ArchitectureGraph, GraphNode, RelationFilters } from '../graph';
import type { RelationKind } from '../types';
import { layoutGraph, type LayoutDirection } from './elkLayout';
import { RELATION_STYLE } from './relationStyle';

/** Node chrome per kind — the visual hierarchy of the diagram. */
const NODE_STYLE: Record<
  GraphNode['kind'],
  { bg: string; border: string; fg: string; weight: number; size: number; radius: number }
> = {
  root: { bg: 'var(--ds-text)', border: 'var(--ds-text)', fg: 'var(--ds-bg)', weight: 600, size: 14, radius: 10 },
  area: { bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border-strong)', fg: 'var(--ds-text)', weight: 600, size: 12.5, radius: 9 },
  branch: { bg: 'var(--ds-surface)', border: 'var(--ds-border-strong)', fg: 'var(--ds-text)', weight: 550, size: 12.5, radius: 8 },
  summary: { bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border)', fg: 'var(--ds-text-secondary)', weight: 500, size: 12.5, radius: 8 },
  route: { bg: 'var(--ds-surface)', border: 'var(--ds-border)', fg: 'var(--ds-text)', weight: 500, size: 12.5, radius: 7 },
  detail: { bg: 'var(--ds-bg)', border: 'var(--ds-hairline)', fg: 'var(--ds-text-secondary)', weight: 450, size: 11, radius: 6 },
  technical: { bg: 'var(--ds-bg)', border: 'var(--ds-hairline)', fg: 'var(--ds-text-muted)', weight: 450, size: 11, radius: 6 },
};

interface ArchNodeData extends Record<string, unknown> {
  graphNode: GraphNode;
  isSelected: boolean;
  isFocused: boolean;
  direction: LayoutDirection;
  onToggle: (treeNodeId: string) => void;
  onReveal: (parentId: string) => void;
  onFocus: (graphNodeId: string) => void;
}

/** One box. Expand and focus are on the node itself, where the reader is looking. */
function ArchNode({ data }: NodeProps<Node<ArchNodeData>>) {
  const { graphNode, isSelected, isFocused, direction, onToggle, onReveal, onFocus } = data;
  const style = NODE_STYLE[graphNode.kind];
  const isVertical = direction === 'DOWN';

  return (
    <div
      style={{
        width: graphNode.width,
        height: graphNode.height,
        boxSizing: 'border-box',
        background: style.bg,
        border: `1px solid ${isFocused ? 'var(--ds-text)' : style.border}`,
        outline: isSelected ? '2px solid var(--ds-text)' : 'none',
        outlineOffset: 1,
        borderRadius: style.radius,
        color: style.fg,
        padding: '6px 9px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 1,
        boxShadow: graphNode.kind === 'root' ? 'var(--ds-shadow-md)' : 'var(--ds-shadow-xs)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Handle
        type="target"
        position={isVertical ? Position.Top : Position.Left}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span
          style={{
            fontSize: style.size,
            fontWeight: style.weight,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {graphNode.label}
        </span>
        {graphNode.badges?.slice(0, 2).map((badge) => (
          <span
            key={badge}
            style={{
              fontSize: 8,
              letterSpacing: '0.04em',
              padding: '0 3px',
              borderRadius: 3,
              border: '1px solid var(--ds-border)',
              color: 'var(--ds-text-muted)',
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        ))}
      </div>

      {graphNode.sublabel && (
        <span
          style={{
            fontFamily: 'var(--ds-font-mono)',
            fontSize: 10,
            opacity: graphNode.kind === 'root' ? 0.75 : 0.62,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {graphNode.sublabel}
        </span>
      )}

      {/* Controls sit on the node; they appear on hover via the wrapper class. */}
      <span
        className="arch-node-actions"
        style={{
          position: 'absolute',
          top: 3,
          right: 3,
          display: 'inline-flex',
          gap: 2,
        }}
      >
        {graphNode.overflowParentId ? (
          <NodeAction
            label="+"
            title="Show the remaining routes here"
            onClick={() => onReveal(graphNode.overflowParentId as string)}
          />
        ) : (
          graphNode.expandable && graphNode.treeNodeId && (
            <NodeAction
              label={graphNode.expanded ? '−' : '+'}
              title={graphNode.expanded ? 'Collapse' : 'Expand'}
              onClick={() => onToggle(graphNode.treeNodeId as string)}
            />
          )
        )}
        {graphNode.kind !== 'root' && (
          <NodeAction label="◎" title="Focus on this node" onClick={() => onFocus(graphNode.id)} />
        )}
      </span>

      <Handle
        type="source"
        position={isVertical ? Position.Bottom : Position.Right}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

function NodeAction({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="nodrag nopan"
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 15,
        height: 15,
        lineHeight: '13px',
        textAlign: 'center',
        fontSize: 11,
        borderRadius: 3,
        border: '1px solid var(--ds-border)',
        background: 'var(--ds-surface)',
        color: 'var(--ds-text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

const NODE_TYPES = { arch: ArchNode };

const DIAGRAM_CSS = `
.arch-node-actions { opacity: 0; transition: opacity 120ms ease; }
.react-flow__node:hover .arch-node-actions { opacity: 1; }
.react-flow__attribution { display: none; }
`;

export interface ArchitectureDiagramProps {
  graph: ArchitectureGraph;
  direction: LayoutDirection;
  filters: RelationFilters;
  selectedRouteId: string | null;
  focusId: string | null;
  onToggle: (treeNodeId: string) => void;
  onReveal: (parentId: string) => void;
  onFocus: (graphNodeId: string | null) => void;
  onSelectRoute: (routeId: string | null) => void;
  onDirectionChange: (direction: LayoutDirection) => void;
  onFilterChange: (kind: RelationKind, value: boolean) => void;
  onExpandBranch: () => void;
  onCollapseBranch: () => void;
}

function DiagramCanvas({
  graph,
  direction,
  selectedRouteId,
  focusId,
  onToggle,
  onReveal,
  onFocus,
  onSelectRoute,
}: Pick<
  ArchitectureDiagramProps,
  | 'graph'
  | 'direction'
  | 'selectedRouteId'
  | 'focusId'
  | 'onToggle'
  | 'onReveal'
  | 'onFocus'
  | 'onSelectRoute'
>) {
  const [layout, setLayout] = useState<{ nodes: Node<ArchNodeData>[]; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  const runId = useRef(0);

  // Re-layout whenever the graph or direction changes. The id guard drops results
  // from a superseded run so a slow layout can't overwrite a newer one.
  useEffect(() => {
    const id = ++runId.current;
    let cancelled = false;

    void layoutGraph(graph.nodes, graph.edges, direction)
      .then((result) => {
        if (cancelled || id !== runId.current) return;
        setError(null);
        setLayout({
          key: `${direction}:${graph.nodes.length}:${graph.edges.length}:${focusId ?? ''}`,
          nodes: result.nodes.map((node) => ({
            id: node.id,
            type: 'arch',
            position: { x: node.x, y: node.y },
            data: {
              graphNode: node,
              isSelected: Boolean(node.routeIds?.includes(selectedRouteId ?? '')),
              isFocused: node.id === focusId,
              direction,
              onToggle,
              onReveal,
              onFocus: (graphNodeId: string) => onFocus(graphNodeId),
            },
            draggable: false,
          })),
        });
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [graph, direction, focusId, selectedRouteId, onToggle, onReveal, onFocus]);

  // Frame the graph after each new layout.
  useEffect(() => {
    if (!layout) return;
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.12, duration: 320, maxZoom: 1 });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [layout?.key, fitView, layout]);

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((edge) => {
        const style = RELATION_STYLE[edge.kind];
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: Boolean(style.animated),
          style: {
            stroke: style.color,
            strokeWidth: edge.kind === 'hierarchy' ? 1.4 : 1.6,
            strokeDasharray: style.dash,
          },
          markerEnd: {
            type: 'arrowclosed' as const,
            color: style.color,
            width: 14,
            height: 14,
          },
          label: edge.kind === 'redirect' ? '→' : undefined,
        };
      }),
    [graph.edges],
  );

  if (error) {
    return (
      <div style={{ padding: 'var(--ds-space-6)', color: 'var(--ds-danger-fg)', fontSize: 13 }}>
        Layout failed: {error}
      </div>
    );
  }

  if (!layout) {
    return (
      <div
        style={{
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ds-text-muted)',
          fontSize: 12,
        }}
      >
        Laying out {graph.nodes.length} nodes…
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={layout.nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodeClick={(_event, node) => {
        const graphNode = (node.data as ArchNodeData).graphNode;
        onSelectRoute(graphNode.routeId ?? null);
      }}
      onPaneClick={() => onSelectRoute(null)}
      fitView
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--ds-dash)" />
      <Controls showInteractive={false} />
      {/* A minimap only helps once the graph is bigger than the viewport. */}
      {layout.nodes.length > 24 && (
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) =>
            NODE_STYLE[(node.data as ArchNodeData).graphNode.kind].border
          }
          style={{ background: 'var(--ds-surface)' }}
        />
      )}
    </ReactFlow>
  );
}

export function ArchitectureDiagram(props: ArchitectureDiagramProps) {
  const {
    graph,
    direction,
    filters,
    focusId,
    onFocus,
    onDirectionChange,
    onFilterChange,
    onExpandBranch,
    onCollapseBranch,
  } = props;

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-2)' }}>
      <style>{DIAGRAM_CSS}</style>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-2)',
          flexWrap: 'wrap',
        }}
      >
        <DsButton tone="tertiary" onClick={onExpandBranch}>
          Expand areas
        </DsButton>
        <DsButton tone="tertiary" onClick={onCollapseBranch}>
          Collapse all
        </DsButton>

        <span
          style={{
            display: 'inline-flex',
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-control)',
            overflow: 'hidden',
          }}
        >
          {(['DOWN', 'RIGHT'] as LayoutDirection[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onDirectionChange(value)}
              title={value === 'DOWN' ? 'Top → Bottom' : 'Left → Right'}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '3px 9px',
                fontSize: 11,
                background: direction === value ? 'var(--ds-text)' : 'transparent',
                color: direction === value ? 'var(--ds-bg)' : 'var(--ds-text-muted)',
              }}
            >
              {value === 'DOWN' ? '↓ T→B' : '→ L→R'}
            </button>
          ))}
        </span>

        {focusId && (
          <DsButton tone="secondary" onClick={() => onFocus(null)}>
            ← Back from focus
          </DsButton>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ds-text-muted)' }}>
          {focusId
            ? `focused — ${graph.nodes.length} of ${graph.totalNodesBeforeFocus} nodes`
            : `${graph.nodes.length} nodes · ${graph.edges.length} edges`}
        </span>
      </div>

      {/* Legend doubles as the relationship filters. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-4)',
          flexWrap: 'wrap',
          padding: '6px 10px',
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-control)',
          background: 'var(--ds-surface-subtle)',
        }}
      >
        {(Object.keys(RELATION_STYLE) as RelationKind[]).map((kind) => {
          const style = RELATION_STYLE[kind];
          const active = filters[kind];
          return (
            <label
              key={kind}
              title={style.hint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                cursor: 'pointer',
                color: active ? 'var(--ds-text)' : 'var(--ds-text-placeholder)',
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => onFilterChange(kind, event.target.checked)}
                style={{ margin: 0, accentColor: 'var(--ds-text)' }}
              />
              <svg width="26" height="8" aria-hidden style={{ flexShrink: 0 }}>
                <line
                  x1="0"
                  y1="4"
                  x2="26"
                  y2="4"
                  stroke={active ? style.color : 'var(--ds-border)'}
                  strokeWidth="1.8"
                  strokeDasharray={style.dash}
                />
              </svg>
              {style.label}
            </label>
          );
        })}
      </div>

      <div
        style={{
          height: 'calc(100vh - 296px)',
          minHeight: 520,
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-panel)',
          background: 'var(--ds-bg)',
          overflow: 'hidden',
        }}
      >
        <ReactFlowProvider>
          <DiagramCanvas {...props} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
