import { useMemo, useState } from 'react';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import {
  FEATURE_REGISTRY,
  FEATURE_STATUS_LABELS,
  FEATURE_TAB_LABELS,
  FEATURE_TAB_ORDER,
  type FeatureEntry,
  type FeatureStatus,
  type FeatureTab,
} from '@/features/dev-features/features-registry';
import '@/features/dev-features/dev-features.css';

/**
 * /_dev/features — dev-only feature inventory page.
 *
 * Surfaces every routed surface in BrandOS (plus cross-cutting services)
 * with its current route + entry file, so the IA redesign can be planned
 * without pulling up a grep for each feature. Strictly static — no
 * feature components are imported here.
 *
 * Gated behind `import.meta.env.DEV`; also accepts `?dev=1` as an
 * override for preview / staging builds. Production requests fall
 * through to a minimal "not available" fallback.
 */

const TAB_FILTERS: Array<FeatureTab | 'all'> = ['all', ...FEATURE_TAB_ORDER];
const STATUS_FILTERS: Array<FeatureStatus | 'all'> = ['all', 'active', 'planned', 'dead'];

/** Substitute a `:slug` placeholder with the current brand (if any).
 *  The page reads the brand from the URL — if the user is already inside
 *  `/b/<slug>/*`, we swap that in so the "Open" links are clickable. */
function resolveRoute(route: string, currentSlug: string | null): string {
  if (!route.includes(':slug')) return route;
  if (!currentSlug) return route;
  return route.replace(/:slug/g, currentSlug);
}

function extractCurrentSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/b\/([^/]+)/);
  return match ? match[1] : null;
}

function isDevEnabled(): boolean {
  const envDev = import.meta.env.DEV;
  if (envDev) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('dev') === '1';
  } catch {
    return false;
  }
}

function isOpenable(entry: FeatureEntry): boolean {
  // Dead routes and no-route globals shouldn't link.
  if (entry.status === 'dead') return false;
  if (entry.route.startsWith('—')) return false;
  return true;
}

function DevFeaturesPage() {
  // All hooks run unconditionally, even in the "not available" fallback
  // path — rules-of-hooks. `enabled` is computed once per mount; the
  // dev flag can't flip mid-session in a way we'd care about.
  const enabled = useMemo(() => isDevEnabled(), []);
  const currentSlug = useMemo(() => extractCurrentSlug(), []);

  const [query, setQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<FeatureTab | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | 'all'>('all');

  // Pre-compute per-tab / per-status totals so the chips can show counts.
  const countsByTab = useMemo(() => {
    const acc: Record<string, number> = { all: FEATURE_REGISTRY.length };
    for (const f of FEATURE_REGISTRY) acc[f.tab] = (acc[f.tab] ?? 0) + 1;
    return acc;
  }, []);

  const countsByStatus = useMemo(() => {
    const acc: Record<string, number> = { all: FEATURE_REGISTRY.length };
    for (const f of FEATURE_REGISTRY) acc[f.status] = (acc[f.status] ?? 0) + 1;
    return acc;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FEATURE_REGISTRY.filter((f) => {
      if (tabFilter !== 'all' && f.tab !== tabFilter) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.route.toLowerCase().includes(q) ||
        f.entry.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    });
  }, [query, tabFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<FeatureTab, FeatureEntry[]>();
    for (const tab of FEATURE_TAB_ORDER) map.set(tab, []);
    for (const entry of filtered) {
      const list = map.get(entry.tab);
      if (list) list.push(entry);
    }
    return map;
  }, [filtered]);

  if (!enabled) {
    return (
      <div className="dfx-fallback" role="main">
        <h1>Not available</h1>
        <p>
          This page is only available in development. Append <code>?dev=1</code> to force-enable.
        </p>
      </div>
    );
  }

  return (
    <CosmosWorkspaceShell tabs={[]}>
      <div data-dev-features>
        <header className="dfx-header">
          <span className="dfx-eyebrow">Dev</span>
          <h1 className="dfx-title">All features</h1>
          <p className="dfx-sub">
            <strong>{filtered.length}</strong> of {FEATURE_REGISTRY.length} features shown — every
            routed surface in BrandOS, tagged with the tab it belongs to in the post-redesign shell.
          </p>
        </header>

        <div className="dfx-filters">
          <div className="dfx-filter-row">
            <input
              type="search"
              className="dfx-search"
              placeholder="Search by name, route, entry, or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search features"
            />
          </div>
          <div className="dfx-filter-row">
            <span className="dfx-filter-label">Tab</span>
            {TAB_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                className={`dfx-chip${tabFilter === t ? ' is-active' : ''}`}
                onClick={() => setTabFilter(t)}
              >
                <span>{t === 'all' ? 'All' : FEATURE_TAB_LABELS[t]}</span>
                <span className="dfx-chip-count">{countsByTab[t] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="dfx-filter-row">
            <span className="dfx-filter-label">Status</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                className={`dfx-chip${statusFilter === s ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                <span>{s === 'all' ? 'All' : FEATURE_STATUS_LABELS[s]}</span>
                <span className="dfx-chip-count">{countsByStatus[s] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="dfx-empty">No features match the current filters.</div>
        ) : (
          FEATURE_TAB_ORDER.map((tab) => {
            const items = grouped.get(tab) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={tab} className="dfx-section">
                <div className="dfx-section-head">
                  <h2 className="dfx-section-title">{FEATURE_TAB_LABELS[tab]}</h2>
                  <span className="dfx-section-count">
                    {items.length} {items.length === 1 ? 'feature' : 'features'}
                  </span>
                </div>
                <div className="dfx-grid">
                  {items.map((entry) => {
                    const openable = isOpenable(entry);
                    const href = resolveRoute(entry.route, currentSlug);
                    return (
                      <article key={entry.id} className="dfx-card">
                        <div className="dfx-card-top">
                          <h3 className="dfx-card-name">{entry.name}</h3>
                          <span className={`dfx-badge dfx-badge--${entry.status}`}>
                            {FEATURE_STATUS_LABELS[entry.status]}
                          </span>
                        </div>
                        <p className="dfx-card-route">{entry.route}</p>
                        <p className="dfx-card-entry">{entry.entry}</p>
                        <p className="dfx-card-desc">{entry.description}</p>
                        <div className="dfx-card-foot">
                          <span className="dfx-card-entry" aria-hidden="true">
                            {entry.tab}
                          </span>
                          {openable ? (
                            <a className="dfx-card-open" href={href} target="_blank" rel="noreferrer">
                              Open →
                            </a>
                          ) : (
                            <span className="dfx-card-open is-disabled">Not routable</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </CosmosWorkspaceShell>
  );
}

export default DevFeaturesPage;
