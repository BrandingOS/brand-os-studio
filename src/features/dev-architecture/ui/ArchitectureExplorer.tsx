/**
 * Code Navigator / Architecture Explorer — the /__architecture surface.
 *
 * Orientation, not documentation. Two peer views over ONE generated data source:
 *
 *   Tree    browse top-down when you don't know what to search for
 *   Search  jump straight there when you know one fact about the page
 *
 * Both read the same `RouteNode[]` from `useArchitectureMap`. The tree is a pure
 * derivation (`tree.ts`) of that same array — there is no second scanner and no
 * registry, so neither view can drift from the router or from each other. A test
 * asserts the two cover an identical route set.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DsButton, DsEmptyState, DsEyebrow, LoadingPill } from '@/shared/ds';

import {
  ancestorIdsFor,
  branchNodeIds,
  buildTree,
  defaultExpandedIds,
} from '../tree';
import { useArchitectureMap } from '../useArchitectureMap';
import { EXPLORER_VIEWS, normalizeView, viewPath, type ExplorerView } from '../views';
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

  const toggleNode = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          gridTemplateColumns: view === 'tree'
            ? 'minmax(420px, 1fr) minmax(300px, 400px)'
            : 'minmax(280px, 420px) minmax(0, 1fr)',
          gap: 'var(--ds-space-5)',
          alignItems: 'start',
        }}
      >
        <div ref={treeContainerRef} style={{ minWidth: 0 }}>
          {view === 'tree' ? (
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
              onShowInTree={view === 'search' ? () => showInTree(selected.id) : undefined}
              onSearchRelated={
                view === 'tree'
                  ? () => {
                      // "Search related" seeds the query from the page's own name,
                      // which surfaces its namespace twin and anything importing it.
                      setQuery(selected.name);
                      switchView('search');
                    }
                  : undefined
              }
            />
          ) : (
            <DsEmptyState>
              {view === 'tree'
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
