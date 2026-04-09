/**
 * VariantStudio — the main component, mounted by both the in-app and
 * public routes.
 *
 * Owns the session payload via `useToolSession` (which persists to
 * localStorage so reloads are non-destructive). All edits go through
 * `resolveVariant` so ids and labels stay consistent.
 *
 * In-app mode wires up `useAutoSave` to persist `logoAssets` patches
 * back to the brand. Public mode skips that — its persistence is the
 * anonymous session, with the claim flow turning that into a brand
 * on signup.
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
  renderKey,
} from '../engine/generate';
import type {
  ExportFormat,
  PaletteContext,
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

const IN_APP_GATES: GateMap = {}; // all features free in-app

interface VariantStudioProps {
  mode: ToolMode;
  /** In-app: the brand we're working in. Public: undefined. */
  brand?: Brand;
  /** In-app back link. Public falls back to /tools. */
  backTo?: string;
  /** Optional initial source — provided when entering from a brand asset
   *  or from the public landing's upload card. */
  initialSource?: SourceLogo | null;
}

export function VariantStudio({ mode, brand, backTo, initialSource }: VariantStudioProps) {
  const meta = TOOL_REGISTRY[TOOL_SLUG];
  const gates = mode === 'in-app' ? IN_APP_GATES : PUBLIC_GATES;

  const initialPayload = useMemo<VariantSessionPayload>(() => {
    const palette = brand ? paletteFromBrand(brand) : emptyPalette();
    const source = initialSource ?? sourceFromBrand(brand);
    const variants = source ? seedDefaultVariants(source, palette) : [];
    return {
      source,
      palette,
      variants,
      pinned: variants.slice(0, 3).map((v) => v.id),
      selectedVariantId: variants[0]?.id ?? null,
    };
  }, [brand, initialSource]);

  const { session, patchPayload } = useToolSession<VariantSessionPayload>({
    slug: TOOL_SLUG,
    mode,
    initialPayload,
  });

  // If we entered with an explicit source (e.g. from the landing
  // upload card or from a brand asset click) and the persisted session
  // has no source yet, hydrate it. We compare by source.id to avoid
  // overwriting a session the user is mid-edit on.
  useEffect(() => {
    if (initialSource && (!session.payload.source || session.payload.source.id !== initialSource.id)) {
      patchPayload({
        source: initialSource,
        variants: seedDefaultVariants(initialSource, session.payload.palette),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource]);

  // SVG-URL hydrator: when the source has a raster URL ending in .svg
  // and no inline svg field yet, fetch the file and inline it. This
  // upgrade lets the renderer manipulate the source (color filters,
  // mono modes, inline embeds) instead of relying on `<image href>`
  // which can't be color-filtered reliably across browsers.
  useEffect(() => {
    const src = session.payload.source;
    if (!src) return;
    if (src.original.svg) return; // already inline
    const url = src.original.raster;
    if (!url) return;
    const isSvgUrl =
      url.endsWith('.svg') ||
      url.includes('.svg?') ||
      url.startsWith('data:image/svg');
    if (!isSvgUrl) return;

    let cancelled = false;
    (async () => {
      try {
        const text = await (await fetch(url)).text();
        if (cancelled) return;
        if (!text.trim().startsWith('<svg') && !text.trim().startsWith('<?xml')) return;
        // Try to read the intrinsic viewBox so the layout can size the
        // icon with the correct aspect.
        const vbMatch = text.match(/viewBox="([\d.\s-]+)"/);
        let width = src.original.width;
        let height = src.original.height;
        if (vbMatch) {
          const parts = vbMatch[1].split(/\s+/).map(Number);
          if (parts.length === 4) {
            width = parts[2];
            height = parts[3];
          }
        }
        patchPayload({
          source: {
            ...src,
            original: { ...src.original, svg: text, width, height },
          },
        });
      } catch (err) {
        console.warn('[variant-studio] could not hydrate SVG source', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.payload.source?.id]);

  // Stale-session migration: a persisted session may have variants
  // that were generated under the older logic (when monolithic
  // sources still produced icon-only / wordmark-only / stacked
  // duplicates). Run the dedupe pipeline once on load and rewrite
  // the session if anything was filtered. Also catches "fg = bg"
  // invisible variants the user may have manually constructed.
  useEffect(() => {
    const src = session.payload.source;
    if (!src) return;
    const cleaned = dedupeVariants(session.payload.variants, src, session.payload.palette);
    if (cleaned.length === session.payload.variants.length) return;
    const surviving = new Set(cleaned.map((v) => v.id));
    patchPayload({
      variants: cleaned,
      pinned: session.payload.pinned.filter((id) => surviving.has(id)),
      selectedVariantId:
        session.payload.selectedVariantId && surviving.has(session.payload.selectedVariantId)
          ? session.payload.selectedVariantId
          : (cleaned[0]?.id ?? null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.payload.source?.id, session.payload.source?.original.svg]);

  const { source, palette, variants, pinned, selectedVariantId } = session.payload;

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null,
    [variants, selectedVariantId],
  );

  // ── Mutators ────────────────────────────────────────────────

  const updateSelectedSpec = useCallback(
    (patch: Partial<VariantSpec>) => {
      if (!source || !selectedVariant) return;
      // Re-resolve via the engine so id, label, and color map stay in sync.
      const next = resolveVariant({
        source,
        palette,
        composition: patch.composition ?? selectedVariant.composition,
        layout: patch.layout ?? selectedVariant.layout,
        colorMode: patch.colorMode ?? selectedVariant.colorMode,
        background: patch.background ?? selectedVariant.background,
        colorOverride: patch.colorMap ?? selectedVariant.colorMap,
      });
      // If the new spec would render identically to an existing
      // variant in the list (different from the one we're editing),
      // just point selection at the existing one — don't create a
      // duplicate. Compare via renderKey, not content-hashed id, so
      // monolithic-source equivalences collapse.
      const nextKey = renderKey(next, source);
      const collider = variants.find(
        (v) => v.id !== selectedVariant.id && renderKey(v, source) === nextKey,
      );
      if (collider) {
        patchPayload({ selectedVariantId: collider.id });
        return;
      }
      patchPayload({
        variants: variants.map((v) => (v.id === selectedVariant.id ? next : v)),
        selectedVariantId: next.id,
        // pin tracking moves to the new id
        pinned: pinned.map((p) => (p === selectedVariant.id ? next.id : p)),
      });
    },
    [source, palette, selectedVariant, variants, pinned, patchPayload],
  );

  const handleAddCustomColor = useCallback(
    (hex: string) => {
      patchPayload({ palette: addCustomColor(palette, hex) });
    },
    [palette, patchPayload],
  );

  const handleAddBlank = useCallback(() => {
    if (!source) return;
    const next = resolveVariant({ source, palette, composition: 'lockup', layout: 'horizontal' });
    const result = tryAddVariant(variants, next, source, palette);
    if (result.collidedWith === 'invisible') {
      toast.info('That variant would be invisible (logo color matches background).');
      return;
    }
    if (result.collidedWith) {
      patchPayload({ selectedVariantId: result.addedId });
      toast.info('That variant already exists.');
      return;
    }
    patchPayload({ variants: result.variants, selectedVariantId: result.addedId });
  }, [source, palette, variants, patchPayload]);

  const handleGenerateMissing = useCallback(
    (spec: VariantSpec) => {
      if (!source) return;
      const result = tryAddVariant(variants, spec, source, palette);
      if (result.collidedWith === 'invisible') {
        toast.info('That variant would be invisible.');
        return;
      }
      if (result.collidedWith) {
        patchPayload({ selectedVariantId: result.addedId });
        toast.info('That variant already exists.');
        return;
      }
      patchPayload({
        variants: result.variants,
        selectedVariantId: result.addedId,
        pinned: [...pinned, result.addedId],
      });
      toast.success('Variant generated');
    },
    [source, palette, variants, pinned, patchPayload],
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      patchPayload({
        pinned: pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id],
      });
    },
    [pinned, patchPayload],
  );

  const handlePickFile = useCallback(
    async (file: File) => {
      const next = await fileToSourceLogo(file);
      const palette2 = palette;
      patchPayload({
        source: next,
        variants: seedDefaultVariants(next, palette2),
        pinned: [],
        selectedVariantId: null,
      });
    },
    [palette, patchPayload],
  );

  // ── Export ──────────────────────────────────────────────────

  const doExport = useCallback(
    async (format: ExportFormat) => {
      if (!source || !selectedVariant) return;
      try {
        const svg = renderSvg({
          source,
          spec: selectedVariant,
          palette,
          width: 1024,
          height: 1024,
        });
        const slug = brand?.slug ?? 'logo';
        const filename = `${deriveFilename(slug, selectedVariant)}.${format}`;
        const blob = await exportSingle(svg, { format, density: selectedVariant.density, filename });
        triggerDownload(blob, filename);
        toast.success(`${format.toUpperCase()} exported`);
      } catch (err) {
        console.error(err);
        toast.error('Export failed');
      }
    },
    [source, palette, selectedVariant, brand],
  );

  const doExportKit = useCallback(async () => {
    if (!source) return;
    const items: KitItem[] = pinned
      .map((id) => variants.find((v) => v.id === id))
      .filter((v): v is VariantSpec => !!v)
      .map((v) => ({
        spec: v,
        svg: renderSvg({ source, spec: v, palette, width: 1024, height: 1024 }),
        filename: deriveFilename(brand?.slug ?? 'logo', v),
      }));
    if (items.length === 0) return;
    try {
      const blob = await exportKit(items, `${brand?.name ?? 'Logo'} variants`);
      triggerDownload(blob, `${brand?.slug ?? 'logo'}-variants.zip`);
      toast.success(`Kit exported (${items.length} variants)`);
    } catch (err) {
      console.error(err);
      toast.error('Kit export failed');
    }
  }, [source, palette, pinned, variants, brand]);

  // ── Render ──────────────────────────────────────────────────

  if (!source || !selectedVariant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No source logo loaded.</p>
          <Button className="mt-3" onClick={() => (window.location.href = '/tools/logo-variant-generator')}>
            Upload a logo
          </Button>
        </div>
      </div>
    );
  }

  // Centralized gate runner. For free features in public mode and
  // everything in in-app mode this calls the action immediately;
  // otherwise it routes to signup with the action carried in `next`.
  function runGated(feature: keyof typeof PUBLIC_GATES, action: () => void) {
    const requirement = gates[feature] ?? 'free';
    if (mode === 'in-app' || requirement === 'free') {
      action();
      return;
    }
    const next = encodeURIComponent(`/claim?slug=${TOOL_SLUG}&feature=${feature}`);
    window.location.href = `/?signup=1&next=${next}`;
  }

  // ── Layout: one rail (brand context + edit) + gallery ────

  const left = (
    <BrandContextRail
      source={source}
      palette={palette}
      brandName={brand?.name ?? source.wordmark?.text ?? 'My brand'}
      variants={variants}
      onPickFile={handlePickFile}
      onAddCustomColor={handleAddCustomColor}
      onGenerateMissing={handleGenerateMissing}
      selectedSpec={selectedVariant}
      pinnedCount={pinned.length}
      onChangeSpec={updateSelectedSpec}
      onExport={(format) => {
        const featureKey: keyof typeof PUBLIC_GATES =
          format === 'svg'
            ? 'export-svg'
            : format === 'pdf'
              ? 'export-pdf'
              : 'export-png-1x';
        runGated(featureKey, () => doExport(format));
      }}
      onExportKit={() => runGated('export-kit', doExportKit)}
    />
  );

  const center = (
    <VariantGallery
      source={source}
      palette={palette}
      variants={variants}
      pinnedIds={new Set(pinned)}
      selectedId={selectedVariant.id}
      onSelect={(id) => patchPayload({ selectedVariantId: id })}
      onTogglePin={handleTogglePin}
      onAddBlank={handleAddBlank}
    />
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
              Export kit
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

function sourceFromBrand(brand: Brand | undefined): SourceLogo | null {
  if (!brand?.logo) return null;
  // Only INLINE SVG markup (literally `<svg ...>`) goes into the svg
  // field. Everything else — URLs, file paths, data URLs, raster
  // images — goes into raster. The SVG `<image>` tag in the renderer
  // handles all of those uniformly. (The async hydrator below will
  // upgrade SVG URLs into the inline svg field once fetched, so the
  // renderer can apply color filters properly.)
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
    id: `upload-${Date.now()}`,
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
