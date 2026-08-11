/**
 * Code Navigator / Architecture Explorer — the /__architecture surface.
 *
 * Orientation, not documentation: type what you know (page name, URL, component,
 * file) and immediately see the other three. Everything rendered here is derived
 * from the real router by the dev-server generator — there is no curated list to
 * maintain, and nothing here is reachable from product navigation.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { DsBadge, DsButton, DsEmptyState, DsEyebrow, DsInput, DsKbd, LoadingPill } from '@/shared/ds';

import { GROUP_ORDER } from '../groups';
import { searchRoutes, type SearchHit } from '../search';
import type { RouteGroup, RouteNode } from '../types';
import { useArchitectureMap } from '../useArchitectureMap';
import { RouteDetail } from './RouteDetail';

/** `?r=<id>` keeps a selection shareable between developers. */
const SELECTION_PARAM = 'r';

const KIND_MARK: Record<RouteNode['kind'], string> = {
  page: '',
  layout: 'layout',
  redirect: '→',
  index: 'index',
  'catch-all': '*',
};

function groupHits(hits: SearchHit[]): Array<{ group: RouteGroup; hits: SearchHit[] }> {
  const byGroup = new Map<RouteGroup, SearchHit[]>();
  for (const hit of hits) {
    byGroup.set(hit.route.group, [...(byGroup.get(hit.route.group) ?? []), hit]);
  }
  return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
    group,
    hits: byGroup.get(group) as SearchHit[],
  }));
}

/**
 * One row: the human name over the raw URL. That pairing is the whole point —
 * you arrive knowing one of them and leave knowing both.
 */
function RouteRow({
  hit,
  isSelected,
  onSelect,
  showGroup = false,
  explainMatch = false,
}: {
  hit: SearchHit;
  isSelected: boolean;
  onSelect: (id: string) => void;
  /** Search mode has no group headers, so each row carries its own area. */
  showGroup?: boolean;
  /** Flags rows that matched via an import rather than the page itself. */
  explainMatch?: boolean;
}) {
  const { route } = hit;
  const viaDependency = explainMatch && hit.matchedOn === 'dependency';

  return (
    <button
      type="button"
      data-route-id={route.id}
      onClick={() => onSelect(route.id)}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'grid',
        gap: 1,
        width: '100%',
        padding: '7px var(--ds-space-3)',
        borderBottom: '1px solid var(--ds-hairline)',
        background: isSelected ? 'var(--ds-surface-hover)' : 'transparent',
        boxShadow: isSelected ? 'inset 2px 0 0 var(--ds-text)' : 'none',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          fontSize: 13,
          fontWeight: isSelected ? 600 : 500,
          color: 'var(--ds-text)',
        }}
      >
        {route.name}
        {KIND_MARK[route.kind] && (
          <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>
            {KIND_MARK[route.kind]}
          </span>
        )}
        {route.devOnly && (
          <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>dev</span>
        )}
        {viaDependency && (
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--ds-text-placeholder)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius-pill)',
              padding: '0 5px',
            }}
            title="Matched something this page imports, not the page itself"
          >
            imports
          </span>
        )}
      </span>
      <span
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'baseline',
          fontSize: 11,
          color: 'var(--ds-text-muted)',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ds-font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {route.path}
        </span>
        {showGroup && (
          <span
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              fontSize: 10,
              color: 'var(--ds-text-placeholder)',
            }}
          >
            {route.group}
          </span>
        )}
      </span>
    </button>
  );
}

export function ArchitectureExplorer() {
  const { state, reload } = useArchitectureMap();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get(SELECTION_PARAM),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Memoized so the array identity is stable across renders — otherwise every
  // render invalidates the search memo below and re-ranks 130 routes.
  const routes = useMemo(
    () => (state.status === 'ready' ? state.map.routes : []),
    [state],
  );
  const isSearching = query.trim().length > 0;

  const hits = useMemo(() => searchRoutes(routes, query), [routes, query]);

  /**
   * Two list modes, because grouping and ranking want opposite orders:
   *  - browsing (empty query) → grouped by product area, so the list reads like
   *    a map of the app;
   *  - searching → one flat list in rank order, so the best match is row one.
   * Grouping a ranked list would bury an exact hit under whichever group sorts
   * first, which is the opposite of what a search box should do.
   */
  const grouped = useMemo(() => (isSearching ? [] : groupHits(hits)), [hits, isSearching]);
  const flat = useMemo(
    () => (isSearching ? hits : grouped.flatMap((section) => section.hits)),
    [isSearching, hits, grouped],
  );

  const selected =
    flat.find((hit) => hit.route.id === selectedId)?.route ??
    routes.find((route) => route.id === selectedId) ??
    flat[0]?.route ??
    null;

  // Keep the URL in step with the selection so a link lands on the same route.
  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(SELECTION_PARAM) === selected.id) return;
    url.searchParams.set(SELECTION_PARAM, selected.id);
    window.history.replaceState(null, '', url);
  }, [selected]);

  // `/` focuses search from anywhere; ↑/↓ move the selection; Esc clears.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const inSearch = event.target === searchRef.current;

      if (event.key === '/' && !inSearch) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === 'Escape') {
        if (query) setQuery('');
        else searchRef.current?.blur();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      event.preventDefault();
      const index = flat.findIndex((hit) => hit.route.id === selected?.id);
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      const target = flat[Math.max(0, Math.min(flat.length - 1, next))];
      if (target) setSelectedId(target.route.id);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flat, selected, query]);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    if (!selected) return;
    listRef.current
      ?.querySelector(`[data-route-id="${CSS.escape(selected.id)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

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
          marginBottom: 'var(--ds-space-4)',
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

      <div style={{ marginBottom: 'var(--ds-space-3)' }}>
        <DsInput
          ref={searchRef}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a page name, URL, component or file…"
          aria-label="Search routes"
          style={{ width: '100%', fontSize: 15 }}
        />
        <div
          style={{
            display: 'flex',
            gap: 'var(--ds-space-4)',
            marginTop: 6,
            fontSize: 11,
            color: 'var(--ds-text-muted)',
            alignItems: 'center',
          }}
        >
          <span>
            <DsKbd>/</DsKbd> search
          </span>
          <span>
            <DsKbd>↑</DsKbd> <DsKbd>↓</DsKbd> move
          </span>
          <span>
            <DsKbd>esc</DsKbd> clear
          </span>
          {isSearching && (
            <span style={{ marginLeft: 'auto' }}>
              {hits.length} {hits.length === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
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
          gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)',
          gap: 'var(--ds-space-5)',
          alignItems: 'start',
        }}
      >
        <div
          ref={listRef}
          style={{
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-panel)',
            background: 'var(--ds-surface)',
            maxHeight: 'calc(100vh - 260px)',
            overflowY: 'auto',
          }}
        >
          {flat.length === 0 ? (
            <div style={{ padding: 'var(--ds-space-6)' }}>
              <DsEmptyState>
                No matching routes. Search covers page names, URLs, component names, file paths and
                the things each page imports.
              </DsEmptyState>
            </div>
          ) : isSearching ? (
            flat.map((hit) => (
              <RouteRow
                key={hit.route.id}
                hit={hit}
                isSelected={hit.route.id === selected?.id}
                onSelect={setSelectedId}
                showGroup
                explainMatch
              />
            ))
          ) : (
            grouped.map(({ group, hits: groupHitList }) => (
              <section key={group}>
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    background: 'var(--ds-surface-subtle)',
                    borderBottom: '1px solid var(--ds-border)',
                    padding: '6px var(--ds-space-3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ds-text-muted)',
                  }}
                >
                  <span>{group}</span>
                  <span>{groupHitList.length}</span>
                </div>
                {groupHitList.map((hit) => (
                  <RouteRow
                    key={hit.route.id}
                    hit={hit}
                    isSelected={hit.route.id === selected?.id}
                    onSelect={setSelectedId}
                  />
                ))}
              </section>
            ))
          )}
        </div>

        <div
          style={{
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-panel)',
            background: 'var(--ds-surface)',
            padding: 'var(--ds-space-5)',
            maxHeight: 'calc(100vh - 260px)',
            overflowY: 'auto',
          }}
        >
          {selected ? (
            <RouteDetail route={selected} />
          ) : (
            <DsEmptyState>Pick a route to see where it lives.</DsEmptyState>
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
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
