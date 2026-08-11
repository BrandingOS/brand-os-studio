/**
 * Code Navigator / Architecture Explorer — the /__architecture surface.
 *
 * Orientation, not documentation. Three peer views over ONE generated data source:
 *
 *   Diagram  how does the system connect and flow?   (graph.ts + React Flow/ELK)
 *   Tree     what exists?                            (tree.ts)
 *   Search   where is X?                             (search.ts)
 *
 * All three read the same `RouteNode[]` from `useArchitectureMap`, and the tree
 * and graph are pure derivations of that one array — no second scanner, no
 * registry. They share one `expanded` set, so opening Brand Workspace in any view
 * opens it in the others. Tests assert all three cover an identical route set.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DsButton, DsEmptyState, DsEyebrow, LoadingPill } from '@/shared/ds';

import {
  buildArchitectureGraph,
  DEFAULT_RELATION_FILTERS,
  expandAllAreas,
  type RelationFilters,
} from '../graph';
import {
  ancestorIdsFor,
  branchNodeIds,
  buildTree,
  defaultExpandedIds,
  nodeForRoute,
} from '../tree';
import type { RelationKind } from '../types';
import { useArchitectureMap } from '../useArchitectureMap';
import { EXPLORER_VIEWS, normalizeView, viewPath, type ExplorerView } from '../views';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import type { LayoutDirection } from './elkLayout';
import { ArchitectureTree } from './ArchitectureTree';
import { RouteDetail } from './RouteDetail';
import { SearchView } from './SearchView';

/** `?r=<id>` keeps a selection shareable between developers. */
const SELECTION_PARAM = 'r';

export function ArchitectureExplorer() {
  const { state, reload } = useArchitectureMap();
  const navigate = useNavigate();
  const { view: viewParam } = useParams<{ view?: string }>();
  const view = normalizeView(viewParam);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get(SELECTION_PARAM),
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlightRouteId, setHighlightRouteId] = useState<string | null>(null);
  /**
   * The Diagram keeps its own expansion state, deliberately.
   *
   * The two views mean different things by a sensible starting point: the Tree
   * wants each area's pages listed on arrival, the Diagram must start at the
   * product level or it opens as 122 boxes. Sharing one set forced one of them to
   * be wrong. Selection, focus hand-off and "Show in Tree" keep the views
   * connected, which is what synchronization actually needs to mean here.
   */
  const [diagramExpanded, setDiagramExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [technical, setTechnical] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<RelationFilters>(DEFAULT_RELATION_FILTERS);
  /**
   * Left→Right by default. A hierarchy fans out wide, and a landscape viewport
   * has far more width than height to spare only in the OTHER direction: eleven
   * product areas side by side forces a ~0.35 zoom, while the same eleven stacked
   * in a column read at full size. Each drill-down then adds a column, which is
   * also how sitemaps and architecture diagrams conventionally read.
   */
  const [direction, setDirection] = useState<LayoutDirection>('RIGHT');
  const [focusId, setFocusId] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const didInitExpansion = useRef(false);

  // Memoized so the array identity is stable across renders — otherwise every
  // render invalidates the search and tree memos below.
  const routes = useMemo(
    () => (state.status === 'ready' ? state.map.routes : []),
    [state],
  );

  /** The tree is derived from exactly the routes Search sees. */
  const tree = useMemo(() => buildTree(routes), [routes]);

  const selected = useMemo(
    () => routes.find((route) => route.id === selectedId) ?? null,
    [routes, selectedId],
  );

  /** The graph is derived from exactly the routes Tree and Search see. */
  const graph = useMemo(
    () =>
      buildArchitectureGraph(routes, {
        expanded: diagramExpanded,
        technical,
        revealed,
        relations: filters,
        focusId,
      }),
    [routes, diagramExpanded, technical, revealed, filters, focusId],
  );

  // Seed expansion once the map arrives; afterwards it is the user's to control.
  useEffect(() => {
    if (didInitExpansion.current || routes.length === 0) return;
    didInitExpansion.current = true;
    setExpanded(defaultExpandedIds(tree));
  }, [routes.length, tree]);

  // Keep the URL in step with the selection so a link lands on the same route.
  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(SELECTION_PARAM) === selected.id) return;
    url.searchParams.set(SELECTION_PARAM, selected.id);
    window.history.replaceState(null, '', url);
  }, [selected]);

  const switchView = useCallback(
    (next: ExplorerView) => {
      navigate(viewPath(next, selectedId));
    },
    [navigate, selectedId],
  );

  /** Flips membership of `id` in a set-valued state. */
  const toggled = (current: Set<string>, id: string) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const toggleNode = useCallback((id: string) => {
    setExpanded((current) => toggled(current, id));
  }, []);

  const toggleDiagramNode = useCallback((id: string) => {
    setDiagramExpanded((current) => toggled(current, id));
  }, []);
  const revealOverflow = useCallback((parentId: string) => {
    setRevealed((current) => new Set([...current, parentId]));
  }, []);

  /**
   * Search → Tree hand-off: expand every ancestor of the route, switch view,
   * then scroll to it and tint it briefly so the eye lands in the right place.
   */
  const showInTree = useCallback(
    (routeId: string) => {
      const ancestors = ancestorIdsFor(tree, routeId);
      setExpanded((current) => new Set([...current, ...ancestors]));
      setSelectedId(routeId);
      setHighlightRouteId(routeId);
      switchView('tree');
    },
    [tree, switchView],
  );

  // Scroll to the highlighted row once the tree has rendered it, then fade the tint.
  useEffect(() => {
    if (!highlightRouteId || view !== 'tree') return;
    const frame = window.requestAnimationFrame(() => {
      treeContainerRef.current
        ?.querySelector(`[data-route-id="${CSS.escape(highlightRouteId)}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    const timer = window.setTimeout(() => setHighlightRouteId(null), 2200);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [highlightRouteId, view]);

  /** Diagram → detail panel: focus is a graph concern, selection is shared. */
  const focusNode = useCallback((graphNodeId: string | null) => {
    setFocusId(graphNodeId);
  }, []);

  /** Detail-panel "Focus" jumps into the Diagram centred on this route. */
  const focusRouteInDiagram = useCallback(
    (routeId: string) => {
      const node = nodeForRoute(tree, routeId);
      if (!node) return;
      // Focus needs the node emitted, so open its ancestors in the DIAGRAM's own
      // expansion set and lift any sibling cap that would hide it.
      const ancestors = ancestorIdsFor(tree, routeId);
      setDiagramExpanded((current) => new Set([...current, ...ancestors]));
      setRevealed((current) => new Set([...current, ...ancestors]));
      setSelectedId(routeId);
      setFocusId(`node:${node.id}`);
      switchView('diagram');
    },
    [tree, switchView],
  );

  const setFilter = useCallback((kind: RelationKind, value: boolean) => {
    setFilters((current) => ({ ...current, [kind]: value }));
  }, []);

  /**
   * Incoming / outgoing relationships for the detail panel.
   *
   * Computed from the route data directly rather than the current graph, so the
   * panel tells the truth even when the other end is collapsed out of view or
   * filtered off. Labels come from the same node labels the diagram uses.
   */
  const relationsFor = useCallback(
    (routeId: string) => {
      const route = routes.find((entry) => entry.id === routeId);
      if (!route) return { incoming: [], outgoing: [] };

      const labelFor = (path: string) => {
        const match = routes.find((entry) => entry.path === path);
        return match ? `${match.name} · ${path}` : path;
      };

      const outgoing: Array<{ kind: RelationKind; label: string }> = [];
      if (route.parentPath) {
        outgoing.push({ kind: 'hierarchy', label: `nested under ${route.parentPath}` });
      }
      if (route.redirectTo) {
        outgoing.push({ kind: 'redirect', label: `redirects to ${labelFor(route.redirectTo)}` });
      }
      for (const navigation of route.analysis?.navigations ?? []) {
        if (!navigation.toPath) continue;
        outgoing.push({
          kind: 'navigation',
          label: `${navigation.via} → ${labelFor(navigation.toPath)}`,
        });
      }

      const incoming: Array<{ kind: RelationKind; label: string }> = [];
      for (const other of routes) {
        if (other.id === route.id) continue;
        if (other.redirectTo === route.path) {
          incoming.push({ kind: 'redirect', label: `${other.name} · ${other.path}` });
        }
        for (const navigation of other.analysis?.navigations ?? []) {
          if (navigation.toPath !== route.path) continue;
          incoming.push({
            kind: 'navigation',
            label: `${other.name} · ${other.path} (${navigation.via})`,
          });
        }
      }

      const dedupe = (list: Array<{ kind: RelationKind; label: string }>) => {
        const seen = new Set<string>();
        return list.filter((entry) => {
          const key = `${entry.kind}:${entry.label}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      return { incoming: dedupe(incoming), outgoing: dedupe(outgoing) };
    },
    [routes],
  );

  if (state.status === 'loading') {
    return (
      <Shell>
        <div style={{ padding: 'var(--ds-space-16) 0', display: 'grid', placeItems: 'center' }}>
          <LoadingPill label="Reading the router…" />
        </div>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <DsEmptyState actions={<DsButton onClick={() => void reload()}>Try again</DsButton>}>
          <strong>Architecture map unavailable</strong>
          <br />
          {state.message}. This tool reads a dev-server endpoint, so it only works under{' '}
          <code style={{ fontFamily: 'var(--ds-font-mono)' }}>npm run dev</code> — it has no
          production mode by design.
        </DsEmptyState>
      </Shell>
    );
  }

  const { map } = state;

  return (
    <Shell>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--ds-space-4)',
          flexWrap: 'wrap',
          marginBottom: 'var(--ds-space-3)',
        }}
      >
        <div>
          <DsEyebrow>Developer tool</DsEyebrow>
          <h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 600, color: 'var(--ds-text)' }}>
            Code Navigator
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-muted)' }}>
            {map.routes.length} routes from {map.sources.length} router{' '}
            {map.sources.length === 1 ? 'file' : 'files'}
          </span>
          <DsButton tone="tertiary" onClick={() => void reload()}>
            Regenerate
          </DsButton>
        </div>
      </header>

      {/* View switch — also reachable directly at /__architecture/tree|search. */}
      <div
        role="tablist"
        aria-label="Explorer view"
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 'var(--ds-space-3)',
          borderBottom: '1px solid var(--ds-border)',
        }}
      >
        {EXPLORER_VIEWS.map((entry) => {
          const isActive = entry.id === view;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={entry.hint}
              onClick={() => switchView(entry.id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 450,
                color: isActive ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--ds-text)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {map.warnings.length > 0 && (
        <div
          style={{
            border: '1px solid var(--ds-warning-border)',
            background: 'var(--ds-warning-bg)',
            color: 'var(--ds-warning-fg)',
            borderRadius: 'var(--ds-radius-panel)',
            padding: 'var(--ds-space-3)',
            marginBottom: 'var(--ds-space-3)',
            fontSize: 12,
            display: 'grid',
            gap: 4,
          }}
        >
          <strong style={{ fontWeight: 600 }}>
            {map.warnings.length} generator warning{map.warnings.length === 1 ? '' : 's'}
          </strong>
          {map.warnings.map((warning) => (
            <span key={warning.message}>{warning.message}</span>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            view === 'search'
              ? 'minmax(280px, 420px) minmax(0, 1fr)'
              : 'minmax(460px, 1fr) minmax(300px, 380px)',
          gap: 'var(--ds-space-5)',
          alignItems: 'start',
        }}
      >
        <div ref={treeContainerRef} style={{ minWidth: 0 }}>
          {view === 'diagram' ? (
            <ArchitectureDiagram
              graph={graph}
              direction={direction}
              filters={filters}
              selectedRouteId={selectedId}
              focusId={focusId}
              onToggle={toggleDiagramNode}
              onReveal={revealOverflow}
              onFocus={focusNode}
              onSelectRoute={setSelectedId}
              onDirectionChange={setDirection}
              onFilterChange={setFilter}
              // "Expand areas" opens every area at once (Level 2 app-wide);
              // regions inside them stay summarized, which keeps it readable.
              onExpandBranch={() =>
                setDiagramExpanded((current) => new Set([...current, ...expandAllAreas(routes)]))
              }
              onCollapseBranch={() => {
                setDiagramExpanded(new Set());
                setRevealed(new Set());
                setTechnical(new Set());
                setFocusId(null);
              }}
            />
          ) : view === 'tree' ? (
            <ArchitectureTree
              tree={tree}
              expanded={expanded}
              selectedRouteId={selectedId}
              highlightRouteId={highlightRouteId}
              onToggle={toggleNode}
              onSelect={setSelectedId}
              // Additive: opens all structure without closing a drill-down the
              // user deliberately opened.
              onExpandAll={() =>
                setExpanded((current) => new Set([...current, ...branchNodeIds(tree)]))
              }
              onCollapseAll={() => setExpanded(new Set([tree.id]))}
            />
          ) : (
            <SearchView
              routes={routes}
              query={query}
              onQueryChange={setQuery}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <div
          style={{
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-panel)',
            background: 'var(--ds-surface)',
            padding: 'var(--ds-space-5)',
            maxHeight: 'calc(100vh - 290px)',
            overflowY: 'auto',
            minWidth: 0,
          }}
        >
          {selected ? (
            <RouteDetail
              route={selected}
              relations={relationsFor(selected.id)}
              onShowInTree={view !== 'tree' ? () => showInTree(selected.id) : undefined}
              onFocusInDiagram={
                view !== 'diagram' ? () => focusRouteInDiagram(selected.id) : undefined
              }
              onSearchRelated={
                view !== 'search'
                  ? () => {
                      // "Search related" seeds the query from the page's own name,
                      // which surfaces its namespace twin and anything importing it.
                      setQuery(selected.name);
                      switchView('search');
                    }
                  : undefined
              }
              onShowTechnical={
                view === 'diagram'
                  ? () => {
                      const node = nodeForRoute(tree, selected.id);
                      if (!node) return;
                      setTechnical((current) => {
                        const next = new Set(current);
                        if (next.has(node.id)) next.delete(node.id);
                        else next.add(node.id);
                        return next;
                      });
                    }
                  : undefined
              }
            />
          ) : (
            <DsEmptyState>
              {view === 'diagram'
                ? 'Click a node to see where it lives and what it connects to.'
                : view === 'tree'
                  ? 'Pick a page in the tree to see where it lives.'
                  : 'Pick a route to see where it lives.'}
            </DsEmptyState>
          )}
        </div>
      </div>

      <footer
        style={{
          marginTop: 'var(--ds-space-4)',
          fontSize: 11,
          color: 'var(--ds-text-muted)',
          display: 'flex',
          gap: 'var(--ds-space-4)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          Generated {new Date(map.generatedAt).toLocaleTimeString()} by walking the router AST — no
          hand-maintained list.
        </span>
        {map.sources.map((source) => (
          <span key={source.file} style={{ fontFamily: 'var(--ds-font-mono)' }}>
            {source.file} ({source.routeCount})
          </span>
        ))}
      </footer>
    </Shell>
  );
}

/** Plain page frame — deliberately no product chrome on a dev tool. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ds-bg)',
        color: 'var(--ds-text)',
        fontFamily: 'var(--ds-font)',
        padding: 'var(--ds-space-6)',
      }}
    >
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
