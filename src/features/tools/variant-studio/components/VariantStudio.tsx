/**
 * VariantStudio — the main component, mounted by both the in-app and
 * public routes.
 *
 * Multi-source + draft model:
 *
 *   - The session holds an array of `sources` (uploaded logos), an
 *     `activeSourceId` for the one currently shown in the rail, a
 *     `draft` VariantSpec the user is editing in the rail, and the
 *     committed `variants` shown in the gallery.
 *   - The rail's "Add this variant" CTA commits the draft to the
 *     gallery (with renderKey dedupe + invisible-variant filter).
 *   - Clicking a tile in the gallery loads its spec back into the
 *     draft, so the user can re-edit and re-add a tweaked version.
 *   - Uploading another logo adds it to `sources` and switches it to
 *     active. The next "+" upload slot in the rail adds yet another.
 *
 * The session is persisted to localStorage via `useToolSession`. A
 * migration effect on mount upgrades old single-source sessions to
 * the new multi-source shape so existing users don't lose their work.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ToolShell, ToolGate, useToolSession } from '../../core';
import type { GateMap, ToolMode } from '../../core';
import { TOOL_REGISTRY } from '../../core';
import { Button } from '@/components/ui/button';
import { Download, Sparkles } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import {
  emptyPalette,
  paletteFromBrand,
  addCustomColor,
} from '../engine/palette';
import {
  resolveVariant,
  seedDefaultVariants,
  dedupeVariants,
  tryAddVariant,
  createDraft,
} from '../engine/generate';
import type {
  BrandSlogan,
  ExportFormat,
  SourceLogo,
  VariantSessionPayload,
  VariantSpec,
} from '../engine/types';
import { renderSvg } from '../render/renderSvg';
import {
  exportSingle,
  exportKit,
  triggerDownload,
  deriveFilename,
  type KitItem,
} from '../render/exportPipeline';
import { BrandContextRail } from './BrandContextRail';
import { VariantGallery } from './VariantGallery';
import { DraftPreview } from './DraftPreview';

const DEFAULT_SLOGAN: BrandSlogan = { text: '', alignment: 'center' };

const TOOL_SLUG = 'logo-variant-generator' as const;

const PUBLIC_GATES: GateMap = {
  'export-png-1x': 'free',
  'export-png-2x': 'auth',
  'export-png-3x': 'auth',
  'export-svg': 'auth',
  'export-pdf': 'auth',
  'export-kit': 'auth',
  'save-session': 'auth',
  'add-custom-color': 'auth',
  'add-extra-variant': 'auth',
  'mockup-premium': 'auth',
};

const IN_APP_GATES: GateMap = {};

interface VariantStudioProps {
  mode: ToolMode;
  brand?: Brand;
  backTo?: string;
  initialSource?: SourceLogo | null;
}

export function VariantStudio({ mode, brand, backTo, initialSource }: VariantStudioProps) {
  const meta = TOOL_REGISTRY[TOOL_SLUG];
  const gates = mode === 'in-app' ? IN_APP_GATES : PUBLIC_GATES;

  const initialPayload = useMemo<VariantSessionPayload>(() => {
    const palette = brand ? paletteFromBrand(brand) : emptyPalette();
    const seedSource = initialSource ?? sourceFromBrand(brand);
    const sources = seedSource ? [seedSource] : [];
    const variants = seedSource ? seedDefaultVariants(seedSource, palette) : [];
    const draft = seedSource ? createDraft(seedSource, palette) : null;
    return {
      sources,
      activeSourceId: seedSource?.id ?? null,
      palette,
      slogan: DEFAULT_SLOGAN,
      variants,
      draft,
      pinned: variants.slice(0, 3).map((v) => v.id),
    };
  }, [brand, initialSource]);

  const { session, patchPayload } = useToolSession<VariantSessionPayload>({
    slug: TOOL_SLUG,
    mode,
    initialPayload,
  });

  // ── One-time session migration ─────────────────────────────
  // Old sessions may lack `sources`, `slogan`, or `draft`. Promote
  // those into the new shape on first load.
  useEffect(() => {
    const p = session.payload as unknown as Record<string, unknown>;
    const patch: Partial<VariantSessionPayload> = {};
    if ('source' in p && !('sources' in p)) {
      const oldSource = (p.source as SourceLogo | null) ?? null;
      patch.sources = oldSource ? [oldSource] : [];
      patch.activeSourceId = oldSource?.id ?? null;
      patch.draft = oldSource ? createDraft(oldSource, session.payload.palette) : null;
    }
    if (!('slogan' in p) || !p.slogan) {
      patch.slogan = DEFAULT_SLOGAN;
    }
    if (Object.keys(patch).length > 0) patchPayload(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If we entered with an explicit source and the session has none
  // for it yet, hydrate.
  useEffect(() => {
    if (!initialSource) return;
    const exists = session.payload.sources?.some((s) => s.id === initialSource.id);
    if (exists) return;
    const sources = [...(session.payload.sources ?? []), initialSource];
    patchPayload({
      sources,
      activeSourceId: initialSource.id,
      draft: createDraft(initialSource, session.payload.palette),
      variants: [
        ...session.payload.variants,
        ...seedDefaultVariants(initialSource, session.payload.palette),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource]);

  // SVG-URL hydrator: fetch any source whose original is a remote
  // .svg URL and inline its content. Runs once per source id.
  useEffect(() => {
    const sources = session.payload.sources ?? [];
    const needsFetch = sources.find(
      (s) => !s.original.svg && s.original.raster && /\.svg(\?|$)/i.test(s.original.raster),
    );
    if (!needsFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const text = await (await fetch(needsFetch.original.raster!)).text();
        if (cancelled) return;
        if (!text.trim().startsWith('<svg') && !text.trim().startsWith('<?xml')) return;
        const vbMatch = text.match(/viewBox="([\d.\s-]+)"/);
        let width = needsFetch.original.width;
        let height = needsFetch.original.height;
        if (vbMatch) {
          const parts = vbMatch[1].split(/\s+/).map(Number);
          if (parts.length === 4) {
            width = parts[2];
            height = parts[3];
          }
        }
        const updated = sources.map((s) =>
          s.id === needsFetch.id
            ? { ...s, original: { ...s.original, svg: text, width, height } }
            : s,
        );
        patchPayload({ sources: updated });
      } catch (err) {
        console.warn('[variant-studio] could not hydrate SVG source', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.payload.sources?.map((s) => s.id).join(',')]);

  // Stale-session migration: dedupe variants on load.
  useEffect(() => {
    const sources = session.payload.sources ?? [];
    if (sources.length === 0) return;
    let cleaned = session.payload.variants;
    for (const src of sources) {
      cleaned = dedupeVariants(cleaned, src, session.payload.palette);
    }
    if (cleaned.length === session.payload.variants.length) return;
    const surviving = new Set(cleaned.map((v) => v.id));
    patchPayload({
      variants: cleaned,
      pinned: session.payload.pinned.filter((id) => surviving.has(id)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.payload.sources?.length]);

  const {
    sources = [],
    activeSourceId,
    palette,
    variants,
    draft,
    pinned,
    slogan = DEFAULT_SLOGAN,
  } = session.payload;
  const activeSource = sources.find((s) => s.id === activeSourceId) ?? sources[0] ?? null;

  const handleChangeSlogan = useCallback(
    (next: BrandSlogan) => {
      patchPayload({ slogan: next });
    },
    [patchPayload],
  );

  // ── Source CRUD ────────────────────────────────────────────

  const handlePickSourceFile = useCallback(
    async (file: File) => {
      const next = await fileToSourceLogo(file);
      const updatedSources = [...sources, next];
      patchPayload({
        sources: updatedSources,
        activeSourceId: next.id,
        draft: createDraft(next, palette),
        variants: [...variants, ...seedDefaultVariants(next, palette)],
      });
      toast.success('Logo added');
    },
    [sources, variants, palette, patchPayload],
  );

  const handleSelectSource = useCallback(
    (id: string) => {
      const src = sources.find((s) => s.id === id);
      if (!src) return;
      patchPayload({
        activeSourceId: id,
        draft: createDraft(src, palette),
      });
    },
    [sources, palette, patchPayload],
  );

  const handleRemoveSource = useCallback(
    (id: string) => {
      const remaining = sources.filter((s) => s.id !== id);
      const remainingVariants = variants.filter((v) => v.sourceId !== id);
      const survivingIds = new Set(remainingVariants.map((v) => v.id));
      const nextActive = remaining[0]?.id ?? null;
      patchPayload({
        sources: remaining,
        activeSourceId: nextActive,
        variants: remainingVariants,
        pinned: pinned.filter((p) => survivingIds.has(p)),
        draft: nextActive
          ? createDraft(remaining.find((s) => s.id === nextActive)!, palette)
          : null,
      });
    },
    [sources, variants, pinned, palette, patchPayload],
  );

  // ── Draft editing ──────────────────────────────────────────

  const handleChangeDraft = useCallback(
    (patch: Partial<VariantSpec>) => {
      if (!activeSource || !draft) return;
      const next = resolveVariant({
        source: activeSource,
        palette,
        composition: patch.composition ?? draft.composition,
        layout: patch.layout ?? draft.layout,
        colorMode: patch.colorMode ?? draft.colorMode,
        background: patch.background ?? draft.background,
        colorOverride: patch.colorMap ?? draft.colorMap,
        includeSlogan: patch.includeSlogan ?? draft.includeSlogan,
      });
      patchPayload({ draft: next });
    },
    [activeSource, palette, draft, patchPayload],
  );

  const handleAddDraft = useCallback(() => {
    if (!activeSource || !draft) return;
    const result = tryAddVariant(variants, draft, activeSource, palette);
    if (result.collidedWith === 'invisible') {
      toast.info('That variant would be invisible (logo color matches background).');
      return;
    }
    if (result.collidedWith) {
      toast.info('That variant already exists in the gallery.');
      return;
    }
    patchPayload({
      variants: result.variants,
      pinned: [...pinned, result.addedId],
      // Reset the draft to a fresh starting point so the user can
      // immediately build the next one.
      draft: createDraft(activeSource, palette),
    });
    toast.success('Variant added');
  }, [activeSource, draft, variants, palette, pinned, patchPayload]);

  const handleSelectGalleryTile = useCallback(
    (id: string) => {
      const tile = variants.find((v) => v.id === id);
      if (!tile) return;
      // Loading a tile into the draft means: switch the active source
      // to whichever one this tile was generated from, then copy the
      // tile spec into the draft for editing.
      const src = sources.find((s) => s.id === tile.sourceId) ?? activeSource;
      patchPayload({
        activeSourceId: src?.id ?? activeSourceId,
        draft: { ...tile },
      });
    },
    [variants, sources, activeSource, activeSourceId, patchPayload],
  );

  // ── Other handlers ─────────────────────────────────────────

  const handleAddCustomColor = useCallback(
    (hex: string) => {
      patchPayload({ palette: addCustomColor(palette, hex) });
    },
    [palette, patchPayload],
  );

  const handleGenerateMissing = useCallback(
    (spec: VariantSpec) => {
      if (!activeSource) return;
      const result = tryAddVariant(variants, spec, activeSource, palette);
      if (result.collidedWith) {
        toast.info('Already in your gallery.');
        return;
      }
      patchPayload({
        variants: result.variants,
        pinned: [...pinned, result.addedId],
      });
      toast.success('Variant generated');
    },
    [activeSource, variants, palette, pinned, patchPayload],
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      patchPayload({
        pinned: pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id],
      });
    },
    [pinned, patchPayload],
  );

  // ── Export ─────────────────────────────────────────────────

  function runGated(feature: keyof typeof PUBLIC_GATES, action: () => void) {
    const requirement = gates[feature] ?? 'free';
    if (mode === 'in-app' || requirement === 'free') {
      action();
      return;
    }
    const next = encodeURIComponent(`/claim?slug=${TOOL_SLUG}&feature=${feature}`);
    window.location.href = `/?signup=1&next=${next}`;
  }

  const doExportDraft = useCallback(
    async (format: ExportFormat) => {
      if (!activeSource || !draft) return;
      try {
        const svg = renderSvg({
          source: activeSource,
          spec: draft,
          palette,
          slogan,
          width: 1024,
          height: 1024,
        });
        const slug = brand?.slug ?? 'logo';
        const filename = `${deriveFilename(slug, draft)}.${format}`;
        const blob = await exportSingle(svg, { format, density: draft.density, filename });
        triggerDownload(blob, filename);
        toast.success(`${format.toUpperCase()} exported`);
      } catch (err) {
        console.error(err);
        toast.error('Export failed');
      }
    },
    [activeSource, draft, palette, slogan, brand],
  );

  const doExportKit = useCallback(async () => {
    const items: KitItem[] = pinned
      .map((id) => variants.find((v) => v.id === id))
      .filter((v): v is VariantSpec => !!v)
      .map((v) => {
        const src = sources.find((s) => s.id === v.sourceId);
        if (!src) return null;
        return {
          spec: v,
          svg: renderSvg({ source: src, spec: v, palette, slogan, width: 1024, height: 1024 }),
          filename: deriveFilename(brand?.slug ?? 'logo', v),
        };
      })
      .filter((x): x is KitItem => !!x);
    if (items.length === 0) return;
    try {
      const blob = await exportKit(items, `${brand?.name ?? 'Logo'} variants`);
      triggerDownload(blob, `${brand?.slug ?? 'logo'}-variants.zip`);
      toast.success(`Kit exported (${items.length} variants)`);
    } catch (err) {
      console.error(err);
      toast.error('Kit export failed');
    }
  }, [pinned, variants, sources, palette, slogan, brand]);

  // ── Render ─────────────────────────────────────────────────

  const empty = sources.length === 0;

  const left = (
    <BrandContextRail
      sources={sources}
      activeSourceId={activeSourceId}
      onPickSourceFile={handlePickSourceFile}
      onSelectSource={handleSelectSource}
      onRemoveSource={handleRemoveSource}
      palette={palette}
      brandName={brand?.name ?? activeSource?.wordmark?.text ?? 'My brand'}
      variants={variants}
      slogan={slogan}
      onAddCustomColor={handleAddCustomColor}
      onGenerateMissing={handleGenerateMissing}
      onChangeSlogan={handleChangeSlogan}
      draft={draft}
      onChangeDraft={handleChangeDraft}
      onAddDraft={handleAddDraft}
      onExport={(format) => {
        const featureKey: keyof typeof PUBLIC_GATES =
          format === 'svg'
            ? 'export-svg'
            : format === 'pdf'
              ? 'export-pdf'
              : 'export-png-1x';
        runGated(featureKey, () => doExportDraft(format));
      }}
    />
  );

  const center = empty ? (
    <EmptyState onPickFile={handlePickSourceFile} />
  ) : (
    <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
      {draft && activeSource && (
        <DraftPreview
          source={activeSource}
          draft={draft}
          palette={palette}
          slogan={slogan}
        />
      )}
      <VariantGallery
        sources={sources}
        palette={palette}
        slogan={slogan}
        variants={variants}
        pinnedIds={new Set(pinned)}
        selectedId={null}
        onSelect={handleSelectGalleryTile}
        onTogglePin={handleTogglePin}
        onAddBlank={() => {
          if (activeSource) patchPayload({ draft: createDraft(activeSource, palette) });
        }}
      />
    </div>
  );

  return (
    <ToolShell
      backTo={backTo ?? (brand ? `/dashboard/brand/${brand.slug}/identity?tab=logo` : '/tools')}
      breadcrumb={brand ? [brand.name, 'Identity', 'Logo'] : ['Tools']}
      title={meta.name}
      actions={
        <ToolGate
          mode={mode}
          gates={gates}
          slug={TOOL_SLUG}
          feature="export-kit"
          onAllowed={doExportKit}
        >
          {(trigger) => (
            <Button size="sm" onClick={trigger} disabled={pinned.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export logos
            </Button>
          )}
        </ToolGate>
      }
      banner={
        mode === 'public' ? (
          <div className="flex items-center justify-center gap-2 border-b bg-primary/5 px-4 py-1.5 text-[11px] text-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Free preview · Sign up to export SVG/PDF and save your work
          </div>
        ) : null
      }
      left={left}
      leftWidth={320}
      center={center}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function EmptyState({ onPickFile }: { onPickFile: (file: File) => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <label className="flex max-w-md cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-12 text-center transition-colors hover:border-primary">
        <input
          type="file"
          className="sr-only"
          accept="image/svg+xml,image/png,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
          }}
        />
        <div className="rounded-full bg-primary/10 p-3">
          <Download className="h-6 w-6 rotate-180 text-primary" />
        </div>
        <div>
          <div className="font-semibold">Upload your first logo</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Drop or browse · SVG, PNG, JPG
          </div>
        </div>
      </label>
    </div>
  );
}

function sourceFromBrand(brand: Brand | undefined): SourceLogo | null {
  if (!brand?.logo) return null;
  const isInlineSvg = brand.logo.trim().startsWith('<svg');
  return {
    id: `brand-${brand.id}`,
    kind: 'brand-asset',
    original: {
      svg: isInlineSvg ? brand.logo : undefined,
      raster: isInlineSvg ? undefined : brand.logo,
      width: 512,
      height: 512,
    },
    wordmark: { text: brand.name, fontFamily: brand.fonts?.primary ?? 'Inter, sans-serif' },
    sourceBrandId: brand.id,
    sourceBrandSlug: brand.slug,
  };
}

async function fileToSourceLogo(file: File): Promise<SourceLogo> {
  const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
  const text = isSvg ? await file.text() : null;
  const dataUrl = !isSvg ? await fileToDataUrl(file) : undefined;
  const dims = !isSvg ? await imageDimensions(dataUrl!) : { width: 512, height: 512 };
  return {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'uploaded',
    original: {
      svg: text ?? undefined,
      raster: dataUrl,
      width: dims.width,
      height: dims.height,
    },
    wordmark: { text: file.name.replace(/\.[^.]+$/, ''), fontFamily: 'Inter, sans-serif' },
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function imageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 512, height: 512 });
    img.src = src;
  });
}
