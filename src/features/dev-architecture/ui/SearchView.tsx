/**
 * Search view — you know one fact about a page, get the other three.
 *
 * Extracted unchanged in behaviour when the Tree view was added; both views read
 * the same `RouteNode[]` from the same generated map.
 */
import { useEffect, useMemo, useRef } from 'react';

import { DsEmptyState, DsInput, DsKbd } from '@/shared/ds';

import { GROUP_ORDER } from '../groups';
import { searchRoutes, type SearchHit } from '../search';
import type { RouteGroup, RouteNode } from '../types';

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
        {route.devOnly && <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>dev</span>}
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

export interface SearchViewProps {
  routes: RouteNode[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SearchView({
  routes,
  query,
  onQueryChange,
  selectedId,
  onSelect,
}: SearchViewProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isSearching = query.trim().length > 0;
  const hits = useMemo(() => searchRoutes(routes, query), [routes, query]);

  /**
   * Two list modes, because grouping and ranking want opposite orders:
   *  - browsing (empty query) → grouped by product area;
   *  - searching → one flat list in rank order, so the best match is row one.
   * Grouping a ranked list would bury an exact hit under whichever group sorts
   * first, which is the opposite of what a search box should do.
   */
  const grouped = useMemo(() => (isSearching ? [] : groupHits(hits)), [hits, isSearching]);
  const flat = useMemo(
    () => (isSearching ? hits : grouped.flatMap((section) => section.hits)),
    [isSearching, hits, grouped],
  );

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
        if (query) onQueryChange('');
        else searchRef.current?.blur();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      event.preventDefault();
      const index = flat.findIndex((hit) => hit.route.id === selectedId);
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      const target = flat[Math.max(0, Math.min(flat.length - 1, next))];
      if (target) onSelect(target.route.id);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flat, selectedId, query, onQueryChange, onSelect]);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector(`[data-route-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return (
    <div>
      <div style={{ marginBottom: 'var(--ds-space-3)' }}>
        <DsInput
          ref={searchRef}
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
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

      <div
        ref={listRef}
        style={{
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-panel)',
          background: 'var(--ds-surface)',
          maxHeight: 'calc(100vh - 290px)',
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
              isSelected={hit.route.id === selectedId}
              onSelect={onSelect}
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
                  isSelected={hit.route.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
