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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { createEdgeFunctionAgent } from '@/features/editor/ai/applyCommand';
import { useMemo as useReactMemo } from 'react';

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

export function TemplatesPanel() {
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

  const [tab, setTab] = useState<'browse' | 'my-designs'>('browse');
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

  // Phase 4.3 — production agent for AI generation surface.
  const aiAgent = useReactMemo(() => {
    if (!brandKit) return null;
    return createEdgeFunctionAgent({ brandKit });
  }, [brandKit]);

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
      {designs.map((d) => (
        <button
          key={d.id}
          type="button"
          data-my-design-card
          data-design-id={d.id}
          onClick={() => onOpen(d.id)}
          disabled={!brandSlug}
          className="group rounded-md border overflow-hidden bg-background hover:shadow-md transition-all text-left"
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
