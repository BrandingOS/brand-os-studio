/**
 * /_dev/product-map — Product Surface Explorer (developer/owner-only).
 *
 * ONE page that inventories every meaningful surface in BrandingOS —
 * routed pages, tabs, modals, editors, flow steps — classified and openable,
 * with local-only KEEP / REMOVE / REVIEW / MERGE decisions and a Markdown
 * export. Route definitions are cross-checked live against the real router
 * source (see discovery.ts) so the inventory warns instead of going stale.
 *
 * Gated like /_dev/features: import.meta.env.DEV, or ?dev=1 on a deployed
 * internal build. Never linked from product navigation.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SURFACE_REGISTRY, AREA_ORDER } from '@/features/dev-product-map/registry';
import { discoverRoutes, normalizeRoute } from '@/features/dev-product-map/discovery';
import { useSurfaceReviewStore } from '@/features/dev-product-map/reviewStore';
import { buildMarkdownReport } from '@/features/dev-product-map/exportReport';
import type {
  DiscoveredRoute,
  ReviewDecision,
  SurfaceEntry,
  SurfaceStatus,
} from '@/features/dev-product-map/types';

function isDevEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('dev') === '1';
  } catch {
    return false;
  }
}

/* ─── badges ──────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<SurfaceStatus, string> = {
  CURRENT: 'bg-emerald-100 text-emerald-800',
  LEGACY: 'bg-amber-100 text-amber-800',
  REDIRECT: 'bg-slate-200 text-slate-600',
  DEV: 'bg-violet-100 text-violet-800',
  EXPERIMENTAL: 'bg-fuchsia-100 text-fuchsia-800',
  DEFERRED: 'bg-sky-100 text-sky-800',
  UNKNOWN: 'bg-red-100 text-red-700',
};

const DECISION_STYLE: Record<ReviewDecision, string> = {
  keep: 'bg-emerald-600 text-white',
  remove: 'bg-red-600 text-white',
  review: 'bg-amber-500 text-white',
  merge: 'bg-indigo-600 text-white',
  undecided: 'bg-gray-200 text-gray-600',
};

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className ?? 'bg-gray-100 text-gray-600'}`}>
      {children}
    </span>
  );
}

/* ─── open-url resolution ─────────────────────────────────────────── */

function openUrlFor(entry: SurfaceEntry, testSlug: string): string | null {
  if (!entry.route) return null;
  let url = entry.route.replace(/\/\*$/, '');
  if (url.includes(':slug')) url = url.replace(/:slug/g, testSlug || 'raqm');
  if (url.includes(':')) return null; // other params we can't guess
  return url || '/';
}

/* ─── the page ────────────────────────────────────────────────────── */

type ViewMode = 'list' | 'map';

export default function ProductMapPage() {
  const [discovered, setDiscovered] = useState<DiscoveredRoute[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SurfaceStatus | 'ALL'>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<ReviewDecision | 'ALL'>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [testSlug, setTestSlug] = useState('raqm');
  const decisions = useSurfaceReviewStore((s) => s.decisions);
  const setDecision = useSurfaceReviewStore((s) => s.setDecision);
  const clearAll = useSurfaceReviewStore((s) => s.clearAll);

  useEffect(() => {
    discoverRoutes().then(setDiscovered).catch(() => setDiscovered([]));
  }, []);

  // ── staleness cross-check ──
  const { missingMetadata, staleMetadata } = useMemo(() => {
    if (!discovered) return { missingMetadata: [] as DiscoveredRoute[], staleMetadata: [] as SurfaceEntry[] };
    const registryRoutes = new Set(
      SURFACE_REGISTRY.filter((e) => e.route).map((e) => normalizeRoute(e.route as string)),
    );
    const discoveredSet = new Set(discovered.map((d) => normalizeRoute(d.path)));
    const seen = new Set<string>();
    const missing = discovered.filter((d) => {
      const p = normalizeRoute(d.path);
      if (registryRoutes.has(p) || seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    const stale = SURFACE_REGISTRY.filter(
      (e) => e.route && !discoveredSet.has(normalizeRoute(e.route)),
    );
    return { missingMetadata: missing, staleMetadata: stale };
  }, [discovered]);

  // ── filtering ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SURFACE_REGISTRY.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (areaFilter !== 'ALL' && e.area !== areaFilter) return false;
      if (decisionFilter !== 'ALL' && (decisions[e.id] ?? 'undecided') !== decisionFilter) return false;
      if (orphansOnly && e.reachability !== 'DIRECT URL ONLY' && e.reachability !== 'UNREACHABLE / ORPHAN') return false;
      if (q) {
        const hay = `${e.name} ${e.route ?? ''} ${e.description} ${e.source} ${e.area}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, statusFilter, areaFilter, decisionFilter, orphansOnly, decisions]);

  // ── summary counts ──
  const counts = useMemo(() => {
    const by = (f: (e: SurfaceEntry) => boolean) => SURFACE_REGISTRY.filter(f).length;
    const dec = (d: ReviewDecision) => Object.values(decisions).filter((v) => v === d).length;
    return {
      total: SURFACE_REGISTRY.length,
      current: by((e) => e.status === 'CURRENT'),
      legacy: by((e) => e.status === 'LEGACY'),
      dev: by((e) => e.status === 'DEV' || e.status === 'EXPERIMENTAL'),
      redirects: by((e) => e.status === 'REDIRECT'),
      orphans: by((e) => e.reachability === 'DIRECT URL ONLY' || e.reachability === 'UNREACHABLE / ORPHAN'),
      keep: dec('keep'),
      remove: dec('remove'),
      review: dec('review') + dec('merge'),
    };
  }, [decisions]);

  // ── duplicate-group lookup ──
  const dupGroups = useMemo(() => {
    const m = new Map<string, SurfaceEntry[]>();
    for (const e of SURFACE_REGISTRY) {
      if (!e.duplicateGroup) continue;
      m.set(e.duplicateGroup, [...(m.get(e.duplicateGroup) ?? []), e]);
    }
    return m;
  }, []);

  const handleExport = async () => {
    const md = buildMarkdownReport(SURFACE_REGISTRY, decisions);
    try {
      await navigator.clipboard.writeText(md);
      toast.success('Review report copied to clipboard as Markdown');
    } catch {
      const blob = new Blob([md], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'brandingos-surface-review.md';
      a.click();
      toast.success('Review report downloaded');
    }
  };

  if (!isDevEnabled()) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-500">
        Developer tool — available in dev builds (or append ?dev=1).
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Product Surface Explorer</h1>
            <p className="text-sm text-gray-500">
              Every meaningful surface in BrandingOS — cross-checked against the real router. Decisions persist locally; nothing is deleted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
              Export Markdown
            </button>
            <button onClick={() => { if (confirm('Clear all review decisions?')) clearAll(); }} className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
              Reset decisions
            </button>
          </div>
        </div>

        {/* summary */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-9">
          {[
            ['Total', counts.total, 'bg-white'],
            ['Current', counts.current, 'bg-emerald-50'],
            ['Legacy', counts.legacy, 'bg-amber-50'],
            ['Dev/Exp', counts.dev, 'bg-violet-50'],
            ['Redirects', counts.redirects, 'bg-slate-100'],
            ['URL-only', counts.orphans, 'bg-sky-50'],
            ['Keep', counts.keep, 'bg-emerald-100'],
            ['Remove', counts.remove, 'bg-red-100'],
            ['Review', counts.review, 'bg-amber-100'],
          ].map(([label, n, bg]) => (
            <div key={label as string} className={`rounded-lg border p-2 text-center ${bg}`}>
              <div className="text-lg font-bold">{n as number}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* staleness warnings */}
        {discovered && (missingMetadata.length > 0 || staleMetadata.length > 0) && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
            <div className="font-semibold text-red-800">Registry drift detected</div>
            {missingMetadata.length > 0 && (
              <div className="mt-1 text-red-700">
                Routes with NO metadata ({missingMetadata.length}):{' '}
                {missingMetadata.map((d) => <code key={d.path} className="mr-2">{d.path}</code>)}
              </div>
            )}
            {staleMetadata.length > 0 && (
              <div className="mt-1 text-red-700">
                Metadata pointing at routes that no longer exist ({staleMetadata.length}):{' '}
                {staleMetadata.map((e) => <code key={e.id} className="mr-2">{e.route}</code>)}
              </div>
            )}
          </div>
        )}

        {/* filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, route, description…"
            className="w-64 rounded-lg border px-3 py-1.5 text-sm"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SurfaceStatus | 'ALL')} className="rounded-lg border px-2 py-1.5 text-sm">
            <option value="ALL">All statuses</option>
            {(['CURRENT', 'LEGACY', 'REDIRECT', 'DEV', 'EXPERIMENTAL', 'DEFERRED', 'UNKNOWN'] as SurfaceStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm">
            <option value="ALL">All areas</option>
            {AREA_ORDER.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value as ReviewDecision | 'ALL')} className="rounded-lg border px-2 py-1.5 text-sm">
            <option value="ALL">All decisions</option>
            {(['undecided', 'keep', 'remove', 'review', 'merge'] as ReviewDecision[]).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" checked={orphansOnly} onChange={(e) => setOrphansOnly(e.target.checked)} />
            URL-only / orphans
          </label>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-500">test :slug</label>
            <input value={testSlug} onChange={(e) => setTestSlug(e.target.value)} className="w-24 rounded-lg border px-2 py-1 text-sm" />
            <div className="flex overflow-hidden rounded-lg border">
              {(['list', 'map'] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setView(m)} className={`px-3 py-1.5 text-sm capitalize ${view === m ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* main views */}
        {view === 'list' ? (
          <ListView entries={filtered} decisions={decisions} setDecision={setDecision} dupGroups={dupGroups} testSlug={testSlug} />
        ) : (
          <MapView entries={filtered} decisions={decisions} testSlug={testSlug} />
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          {filtered.length} of {SURFACE_REGISTRY.length} surfaces shown · decisions stored in localStorage only · marking REMOVE deletes nothing
        </p>
      </div>
    </div>
  );
}

/* ─── list view ───────────────────────────────────────────────────── */

function ListView({
  entries, decisions, setDecision, dupGroups, testSlug,
}: {
  entries: SurfaceEntry[];
  decisions: Record<string, ReviewDecision>;
  setDecision: (id: string, d: ReviewDecision) => void;
  dupGroups: Map<string, SurfaceEntry[]>;
  testSlug: string;
}) {
  return (
    <div className="mt-6 space-y-8">
      {AREA_ORDER.map((area) => {
        const group = entries.filter((e) => e.area === area);
        if (group.length === 0) return null;
        return (
          <section key={area}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              {area} <span className="font-normal">({group.length})</span>
            </h2>
            <div className="space-y-2">
              {group.map((e) => {
                const decision = decisions[e.id] ?? 'undecided';
                const openUrl = openUrlFor(e, testSlug);
                const dups = e.duplicateGroup
                  ? (dupGroups.get(e.duplicateGroup) ?? []).filter((d) => d.id !== e.id)
                  : [];
                return (
                  <div key={e.id} className={`rounded-lg border bg-white p-3 ${decision === 'remove' ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_COLORS[e.status]}>{e.status}</Badge>
                      <Badge>{e.type}</Badge>
                      <Badge className="bg-blue-50 text-blue-700">{e.namespace}</Badge>
                      <span className="font-semibold">{e.name}</span>
                      {e.route ? (
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{e.route}</code>
                      ) : (
                        <span className="text-xs italic text-gray-400">{e.entryHint}</span>
                      )}
                      {decision !== 'undecided' && (
                        <Badge className={DECISION_STYLE[decision]}>{decision}</Badge>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        {openUrl && (
                          <a href={openUrl} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100">
                            Open ↗
                          </a>
                        )}
                        {(['keep', 'remove', 'review'] as ReviewDecision[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDecision(e.id, decision === d ? 'undecided' : d)}
                            className={`rounded px-2 py-1 text-xs font-medium capitalize ${decision === d ? DECISION_STYLE[d] : 'border text-gray-600 hover:bg-gray-100'}`}
                          >
                            {d}
                          </button>
                        ))}
                        {e.duplicateGroup && (
                          <button
                            onClick={() => setDecision(e.id, decision === 'merge' ? 'undecided' : 'merge')}
                            className={`rounded px-2 py-1 text-xs font-medium ${decision === 'merge' ? DECISION_STYLE.merge : 'border text-indigo-600 hover:bg-indigo-50'}`}
                          >
                            merge
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{e.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                      <span>{e.reachability}</span>
                      <code>{e.source}</code>
                      {dups.length > 0 && (
                        <span className="text-indigo-600">
                          ⚠ POSSIBLE DUPLICATE of: {dups.map((d) => d.name).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ─── map (tree) view ─────────────────────────────────────────────── */

function MapView({ entries, decisions, testSlug }: {
  entries: SurfaceEntry[];
  decisions: Record<string, ReviewDecision>;
  testSlug: string;
}) {
  return (
    <div className="mt-6 rounded-lg border bg-white p-4 font-mono text-[13px] leading-6">
      <div className="font-bold">App</div>
      {AREA_ORDER.map((area) => {
        const group = entries.filter((e) => e.area === area);
        if (group.length === 0) return null;
        const routed = [...group].sort((a, b) => (a.route ?? '~').localeCompare(b.route ?? '~'));
        return (
          <div key={area} className="mt-1">
            <div className="text-gray-800">├── <span className="font-semibold">{area}</span></div>
            {routed.map((e) => {
              const decision = decisions[e.id] ?? 'undecided';
              const openUrl = openUrlFor(e, testSlug);
              const label = e.route ?? `· ${e.name}`;
              return (
                <div key={e.id} className="flex items-center gap-2 pl-6 text-gray-600">
                  <span className="text-gray-300">│</span>
                  {openUrl ? (
                    <a href={openUrl} target="_blank" rel="noreferrer" className="hover:underline">{label}</a>
                  ) : (
                    <span>{label}</span>
                  )}
                  {!e.route && <span className="text-[10px] text-gray-400">({e.type})</span>}
                  {e.status !== 'CURRENT' && <Badge className={STATUS_COLORS[e.status]}>{e.status}</Badge>}
                  {decision !== 'undecided' && <Badge className={DECISION_STYLE[decision]}>{decision}</Badge>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
