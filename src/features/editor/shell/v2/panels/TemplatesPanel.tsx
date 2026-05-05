// TemplatesPanel — Phase 4.1 Content Universe panel.
//
// Replaces the "Coming in Phase 4" placeholder. Lists categories,
// filters (source + mood), search, template grid with thumbnails,
// load-more pagination. Click a template → opens it in the unified
// editor at /b/:slug/design/:newSlug, seeded with the active brand.
//
// Reads from ITemplatesService (LocalTemplatesService in dev).
// Writes to IDesignStorage on open (creates a fresh design from the
// template's BrandOSDocument with applyBrandToDocument).
//
// Phase B Templates port — `mode` prop discriminates between two
// mount contexts:
//   • mode='editor' (default) — mounted inside the unified editor's
//     secondary panel. AI-generated images can be placed onto the
//     active adapter via the `onPlaceImage` callback.
//   • mode='browser' — mounted as a standalone page at
//     /b/:slug/templates inside WorkspaceShell. No active adapter;
//     AI images clipboard-fallback. Template clicks behave the same
//     in both modes (seed doc → save → navigate to /b/:slug/design/:id).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { ITemplatesService } from '@/core/services/ITemplatesService';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';
import type {
  Template,
  TemplateCategory,
  TemplateMood,
  TemplateSource,
} from '@/features/templates/types';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandKit } from '@/features/editor/brand/useBrandKit';
import { applyBrandToDocument } from '@/features/editor/brand/applyBrandToDocument';
import { GenerateWithAiSection } from './GenerateWithAiSection';
import { useAiAgent } from '@/features/editor/ai/useAiAgent';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Layer } from '@/features/editor/schema';

interface TemplatesPanelProps {
  /** Where the panel is mounted. Defaults to 'editor' for backward
   *  compatibility with existing in-editor mounts. Pass 'browser' from
   *  the standalone /b/:slug/templates Studio page. The behavior split
   *  is documented in the file header. */
  mode?: 'editor' | 'browser';
  /** Phase 5 — passed by EditorSecondaryPanel for the AI image
   *  place-on-canvas flow. Optional so test mounts can omit. Only
   *  consulted when `mode === 'editor'`. */
  adapter?: EditorAdapter;
  /** Phase 5 — page id where image-as-layer lands. Only consulted
   *  when `mode === 'editor'`. */
  activePageId?: string;
}

const PAGE_SIZE = 24;

const SOURCE_LABELS: Record<TemplateSource, string> = {
  curated: 'Curated',
  ai_editable: 'AI',
  ai_rasterized: 'AI image',
  ai_prompt_preset: 'Preset',
  user_uploaded: 'Community',
};

const MOOD_OPTIONS: TemplateMood[] = [
  'professional', 'minimal', 'modern', 'bold', 'elegant', 'playful',
  'vintage', 'natural', 'tech', 'maximalist',
];

export function TemplatesPanel({ mode = 'editor', adapter, activePageId }: TemplatesPanelProps = {}) {
  // Defensive lookup — some test harnesses + dev mounts clear the
  // container without re-registering all services. Render a graceful
  // "service unavailable" placeholder instead of crashing.
  const templates = serviceContainer.has(SERVICE_KEYS.TEMPLATES)
    ? serviceContainer.get<ITemplatesService>(SERVICE_KEYS.TEMPLATES)
    : null;
  const designStorage = serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)
    ? serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE)
    : null;
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { brand } = useBrandBySlug(slug);
  const brandKit = useBrandKit(brand);

  // Phase 5.3a — tab persists in `?tab=` so deep links land users on
  // the right tab. The "View" toast action from the variants generator
  // (and any future inbound link to /b/:slug/templates?tab=my-designs)
  // now opens My Designs directly. Falls back to 'browse' if the param
  // is absent or malformed.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: 'browse' | 'my-designs' =
    searchParams.get('tab') === 'my-designs' ? 'my-designs' : 'browse';
  const setTab = useCallback(
    (next: 'browse' | 'my-designs') => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          if (next === 'browse') out.delete('tab');
          else out.set('tab', next);
          return out;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState('');
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<TemplateSource | null>(null);
  const [activeMoods, setActiveMoods] = useState<Set<TemplateMood>>(new Set());
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Template[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  // Phase 4.2 — My Designs tab state.
  const [myDesigns, setMyDesigns] = useState<DesignSummary[]>([]);
  const [myDesignsLoading, setMyDesignsLoading] = useState(false);

  // Load categories once.
  useEffect(() => {
    if (!templates) return;
    void templates.listCategories().then(setCategories);
  }, [templates]);

  // Refetch when filters change.
  useEffect(() => {
    if (!templates) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const moodFilter = activeMoods.size > 0 ? Array.from(activeMoods) : undefined;
    const promise = query.trim().length > 0
      ? templates.searchTemplates({
          query, categoryId: activeCategoryId ?? undefined,
          source: activeSource ?? undefined, mood: moodFilter,
        })
      : templates.listTemplates({
          categoryId: activeCategoryId ?? undefined,
          source: activeSource ?? undefined, mood: moodFilter,
        });
    void promise.then((rows) => {
      if (cancelled) return;
      setItems(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [templates, activeCategoryId, activeSource, activeMoods, query]);

  // Reset pagination on filter change.
  useEffect(() => { setLimit(PAGE_SIZE); }, [activeCategoryId, activeSource, activeMoods, query]);

  // Phase 4.2 — load My Designs when tab activates / brand changes.
  useEffect(() => {
    if (tab !== 'my-designs' || !designStorage || !brand) return;
    let cancelled = false;
    setMyDesignsLoading(true);
    void designStorage.listDesigns(brand.id).then((rows) => {
      if (cancelled) return;
      setMyDesigns(rows);
      setMyDesignsLoading(false);
    });
    return () => { cancelled = true; };
  }, [tab, designStorage, brand]);

  const visibleItems = useMemo(() => items.slice(0, limit), [items, limit]);
  const hasMore = items.length > limit;

  const toggleMood = useCallback((m: TemplateMood) => {
    setActiveMoods((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  }, []);

  // Phase 5 — pull the shared agent (DI override > brandKit-based
  // construction). All AI surfaces in the editor share one agent
  // identity per render.
  const aiAgent = useAiAgent(brandKit);

  const onUseTemplate = useCallback(async (template: Template) => {
    // Phase 4.3 — clicking an AI prompt preset card prefills the
    // generator instead of opening a doc (presets have no doc).
    if (template.source === 'ai_prompt_preset' && template.promptText) {
      setGeneratorPrompt(template.promptText);
      setGeneratorOpen(true);
      return;
    }
    if (!templates || !designStorage) {
      toast.error('Templates service is not available right now.');
      return;
    }
    if (!brand) {
      toast.error('Open this from inside a brand to use templates.');
      return;
    }
    if (!template.document) {
      toast.error('This template has no document body — Phase 4.3 will surface AI generation here.');
      return;
    }
    setOpening(template.id);
    try {
      // Resolve SlotRefs against the active brand's BrandKit so the
      // opened design is brand-bound on first paint.
      const seeded = brandKit
        ? applyBrandToDocument(template.document, brandKit, { mode: 'apply' })
        : template.document;
      const newDesignId = crypto.randomUUID();
      const next = { ...seeded, id: newDesignId };
      await designStorage.saveDesign(brand.id, newDesignId, next, {
        id: newDesignId,
        name: template.name,
        thumbnailUrl: template.thumbnailUrl,
        contentType: next.contentType,
        width: next.pages[0]?.width,
        height: next.pages[0]?.height,
        sourceTemplateId: template.id,
      });
      void templates.incrementUseCount(template.id);
      navigate(`/b/${brand.slug}/design/${newDesignId}`);
    } catch (err) {
      console.error('[TemplatesPanel] failed to open template:', err);
      toast.error('Could not open template — please try again.');
      setOpening(null);
    }
  }, [brand, brandKit, designStorage, navigate, templates]);

  // Service-unavailable graceful state.
  if (!templates) {
    return (
      <div data-templates-panel data-templates-unavailable
        className="text-[12px] text-muted-foreground"
        style={{ padding: '12px 14px' }}>
        Templates service not configured.
      </div>
    );
  }

  return (
    <div data-templates-panel className="flex flex-col gap-3" style={{ padding: '10px 12px' }}>
      {/* Tabs — Browse vs My Designs (Phase 4.2). */}
      <div className="flex gap-1" data-templates-tabs>
        <TabButton label="Browse" active={tab === 'browse'} onClick={() => setTab('browse')} dataTab="browse" />
        <TabButton label="My designs" active={tab === 'my-designs'} onClick={() => setTab('my-designs')} dataTab="my-designs" />
      </div>

      {tab === 'my-designs' ? (
        <MyDesignsGrid
          designs={myDesigns} loading={myDesignsLoading}
          brandSlug={brand?.slug ?? ''}
          onOpen={(id) => brand && navigate(`/b/${brand.slug}/design/${id}`)}
        />
      ) : (<>
      {/* Phase 4.3 — Generate with AI surface */}
      {generatorOpen ? (
        <GenerateWithAiSection
          agent={aiAgent}
          brand={brand ?? null}
          brandKit={brandKit ?? null}
          designStorage={designStorage}
          initialPrompt={generatorPrompt}
          onClose={() => setGeneratorOpen(false)}
          onPlaceImage={
            mode === 'editor' && adapter && activePageId
              ? (imageUrl, dims) => {
                  // Phase 5 — place AI-generated image as a layer on
                  // the active page, sized to fit ~60% of the page
                  // dimensions. The user can resize / position from
                  // there. Adapter wraps in batch so undo reverts
                  // the placement as one step.
                  const doc = adapter.getDocument();
                  const page = doc.pages.find((p) => p.id === activePageId);
                  const pageW = page?.width ?? 1080;
                  const pageH = page?.height ?? 1080;
                  const aspect = dims.width / dims.height;
                  let w = pageW * 0.6;
                  let h = w / aspect;
                  if (h > pageH * 0.6) {
                    h = pageH * 0.6;
                    w = h * aspect;
                  }
                  const layer: Layer = {
                    id: crypto.randomUUID(),
                    kind: 'image',
                    name: 'AI image',
                    src: imageUrl,
                    fit: 'cover',
                    transform: {
                      x: (pageW - w) / 2, y: (pageH - h) / 2,
                      width: w, height: h,
                      rotation: 0, scaleX: 1, scaleY: 1,
                    },
                    opacity: 1, visible: true, locked: false, brandLocked: false,
                  };
                  adapter.batch('AI: place image', () => {
                    adapter.addLayer(activePageId, layer);
                  });
                  toast.success('Image placed on canvas.');
                }
              : undefined
          }
        />
      ) : (
        <button
          type="button"
          data-generate-with-ai-trigger
          onClick={() => { setGeneratorPrompt(''); setGeneratorOpen(true); }}
          className="text-[11px] py-1.5 rounded-md border bg-primary/5 hover:bg-primary/10 text-primary font-medium flex items-center justify-center gap-1.5"
          style={{ borderColor: 'var(--border)' }}
        >
          ✨ Generate with AI
        </button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <input
          type="text"
          data-templates-search
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates…"
          className="w-full pl-8 pr-7 py-1.5 rounded-lg border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ borderColor: 'var(--border)' }}
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Categories */}
      <div data-templates-categories className="flex flex-wrap gap-1">
        <CategoryChip label="All" active={activeCategoryId === null}
          onClick={() => setActiveCategoryId(null)} />
        {categories.map((c) => (
          <CategoryChip key={c.id} label={c.name}
            active={activeCategoryId === c.id}
            onClick={() => setActiveCategoryId(c.id)} />
        ))}
      </div>

      {/* Source + mood filters (compact) */}
      <details className="text-[11px]" open>
        <summary className="cursor-pointer text-muted-foreground select-none">Filters</summary>
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            <FilterChip label="Any source" active={activeSource === null}
              onClick={() => setActiveSource(null)} />
            {(Object.keys(SOURCE_LABELS) as TemplateSource[]).map((s) => (
              <FilterChip key={s} label={SOURCE_LABELS[s]} active={activeSource === s}
                onClick={() => setActiveSource(s)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {MOOD_OPTIONS.map((m) => (
              <FilterChip key={m} label={m} active={activeMoods.has(m)}
                onClick={() => toggleMood(m)} />
            ))}
          </div>
        </div>
      </details>

      {/* Grid */}
      {loading ? (
        <SkeletonGrid />
      ) : visibleItems.length === 0 ? (
        <div data-templates-empty className="text-center py-12 text-[12px] text-muted-foreground">
          No templates match. Try a different search or filter.
        </div>
      ) : (
        <div data-templates-grid className="grid grid-cols-2 gap-2">
          {visibleItems.map((t) => (
            <TemplateCard key={t.id} template={t}
              busy={opening === t.id}
              onUse={() => void onUseTemplate(t)} />
          ))}
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          data-templates-load-more
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="text-[11px] py-1.5 rounded-md border bg-background hover:bg-muted/30"
          style={{ borderColor: 'var(--border)' }}
        >
          Load more ({items.length - limit} remaining)
        </button>
      ) : null}
      </>)}
    </div>
  );
}

function TabButton({ label, active, onClick, dataTab }: { label: string; active: boolean; onClick: () => void; dataTab: string }) {
  return (
    <button
      type="button"
      data-templates-tab={dataTab}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'text-[11px] px-2 py-1 rounded-md transition-colors flex-1',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/30 text-foreground hover:bg-muted/50',
      )}
    >
      {label}
    </button>
  );
}

function MyDesignsGrid({
  designs, loading, brandSlug, onOpen,
}: {
  designs: DesignSummary[];
  loading: boolean;
  brandSlug: string;
  onOpen: (id: string) => void;
}) {
  // Phase 5.3a — family-aware ordering. Designs that share a familyId
  // cluster together; the source (no sourceDesignId) renders first,
  // then its variants. Lone designs (no familyId at all) sort last.
  // Ordering inside each cluster preserves the underlying list order
  // (which is updatedAt-desc from listDesigns).
  const orderedDesigns = useMemo(() => {
    return groupByFamily(designs);
  }, [designs]);

  if (loading) return <SkeletonGrid />;
  if (designs.length === 0) {
    return (
      <div data-my-designs-empty className="text-center py-12 text-[12px] text-muted-foreground">
        No saved designs yet. Open a template — your edits auto-save here.
      </div>
    );
  }
  return (
    <div data-my-designs-grid className="grid grid-cols-2 gap-2">
      {orderedDesigns.map(({ design: d, role, familySize }) => (
        <button
          key={d.id}
          type="button"
          data-my-design-card
          data-design-id={d.id}
          data-family-id={d.familyId ?? undefined}
          data-family-role={role}
          onClick={() => onOpen(d.id)}
          disabled={!brandSlug}
          className="group relative rounded-md border overflow-hidden bg-background hover:shadow-md transition-all text-left"
          style={{ borderColor: 'var(--border)' }}
          title={d.name ?? d.id}
        >
          <div
            className="relative w-full bg-muted/20"
            style={{ aspectRatio: d.width && d.height ? `${d.width}/${d.height}` : '1/1' }}
          >
            {d.thumbnailUrl ? (
              <img src={d.thumbnailUrl} alt={d.name ?? 'Design'} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                no preview
              </div>
            )}
            {role === 'source' && familySize > 1 ? (
              <span
                data-family-badge="source"
                className="absolute top-1 left-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm font-semibold"
                style={{
                  background: 'var(--accent, #111)',
                  color: 'var(--accent-contrast, #fff)',
                }}
              >
                Source · {familySize}
              </span>
            ) : null}
            {role === 'variant' ? (
              <span
                data-family-badge="variant"
                className="absolute top-1 left-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm font-medium"
                style={{
                  background: 'var(--surface-elevated, #fff)',
                  color: 'var(--text-secondary, #555)',
                  border: '1px solid var(--border, rgba(0,0,0,0.1))',
                }}
              >
                Variant
              </span>
            ) : null}
          </div>
          <div className="p-1.5">
            <p className="text-[11px] font-medium leading-tight truncate">{d.name ?? 'Untitled'}</p>
            {d.contentType ? (
              <p className="text-[10px] text-muted-foreground">{d.contentType}</p>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Family grouping (Phase 5.3a) ─────────────────────────────────────

type FamilyRole = 'source' | 'variant' | 'lone';

export interface OrderedDesignEntry {
  design: DesignSummary;
  role: FamilyRole;
  /** Total cluster size for the family this design belongs to. 1 for
   *  lone designs. Used by the badge to show "Source · 3" etc. */
  familySize: number;
}

/**
 * Re-order a flat list of design summaries so family members cluster
 * together with the source first, variants after. Designs without a
 * familyId render in their original relative order at the end.
 *
 * Edge cases:
 *  - Multiple sources sharing a familyId (shouldn't happen but defensive):
 *    the first one wins as the cluster head; the others demote to variants.
 *  - Variants whose source isn't in the list (filtered out, deleted,
 *    different brand): the variant cluster is treated as a lone group
 *    headed by the first variant.
 */
export function groupByFamily(designs: DesignSummary[]): OrderedDesignEntry[] {
  const families = new Map<string, DesignSummary[]>();
  const lone: DesignSummary[] = [];
  const familyOrder: string[] = [];

  for (const d of designs) {
    if (!d.familyId) {
      lone.push(d);
      continue;
    }
    if (!families.has(d.familyId)) {
      families.set(d.familyId, []);
      familyOrder.push(d.familyId);
    }
    families.get(d.familyId)!.push(d);
  }

  const out: OrderedDesignEntry[] = [];
  for (const familyId of familyOrder) {
    const members = families.get(familyId)!;
    // Find the source — the entry without sourceDesignId. If multiple,
    // first one wins.
    const sourceIdx = members.findIndex((m) => !m.sourceDesignId);
    const source = sourceIdx >= 0 ? members[sourceIdx] : null;
    const variants = members.filter((_, i) => i !== sourceIdx);
    const familySize = members.length;

    if (source) {
      out.push({ design: source, role: 'source', familySize });
    }
    for (const v of variants) {
      out.push({
        design: v,
        // If we couldn't find a source the cluster has no anchor;
        // surface its members as 'variant' anyway so the badge still
        // tells the user this is part of a family.
        role: 'variant',
        familySize,
      });
    }
  }

  for (const d of lone) {
    out.push({ design: d, role: 'lone', familySize: 1 });
  }

  return out;
}

// ─── Subcomponents ─────────────────────────────────────────────────────

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[11px] px-2 py-1 rounded-md border transition-colors',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted/30',
      )}
      style={{ borderColor: active ? undefined : 'var(--border)' }}
      data-templates-category-chip={label.toLowerCase().replace(/\s+/g, '-')}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full border transition-colors',
        active ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted/30',
      )}
      style={{ borderColor: active ? undefined : 'var(--border)' }}
      data-templates-filter-chip={label.toLowerCase().replace(/\s+/g, '-')}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function TemplateCard({ template, busy, onUse }: { template: Template; busy: boolean; onUse: () => void }) {
  const aspect = `${template.width}/${template.height}`;
  return (
    <div
      data-template-card
      data-template-id={template.id}
      className="group relative rounded-md border overflow-hidden bg-background hover:shadow-md transition-all"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="relative w-full bg-muted/20"
        style={{ aspectRatio: aspect }}
      >
        <img
          src={template.thumbnailUrl}
          alt={template.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {/* Hover overlay with Use button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            type="button"
            data-template-use
            onClick={onUse}
            disabled={busy}
            className="text-[11px] px-2.5 py-1 rounded-md bg-white text-black font-medium shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? 'Opening…' : 'Use this template'}
          </button>
        </div>
      </div>
      <div className="p-1.5">
        <p className="text-[11px] font-medium leading-tight truncate" title={template.name}>{template.name}</p>
        {template.mood ? (
          <p className="text-[10px] text-muted-foreground capitalize">{template.mood}</p>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2" data-templates-skeleton>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-md border bg-muted/20 animate-pulse" style={{ borderColor: 'var(--border)', aspectRatio: '1/1' }} />
      ))}
    </div>
  );
}
