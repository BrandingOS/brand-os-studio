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
import { resolveVariant, seedDefaultVariants } from '../engine/generate';
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
import { SourcePanel } from './SourcePanel';
import { VariantGrid } from './VariantGrid';
import { PreviewCanvas } from './PreviewCanvas';
import { SpecPanel } from './SpecPanel';
import { MissingVariantsRail } from './MissingVariantsRail';

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
      // Replace by old id, but if the new id collapses onto an existing
      // one, just point selection at it.
      const existing = variants.find((v) => v.id === next.id);
      if (existing) {
        patchPayload({ selectedVariantId: existing.id });
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
    if (variants.some((v) => v.id === next.id)) {
      patchPayload({ selectedVariantId: next.id });
      return;
    }
    patchPayload({
      variants: [...variants, next],
      selectedVariantId: next.id,
    });
  }, [source, palette, variants, patchPayload]);

  const handleGenerateMissing = useCallback(
    (spec: VariantSpec) => {
      if (variants.some((v) => v.id === spec.id)) {
        patchPayload({ selectedVariantId: spec.id });
        return;
      }
      patchPayload({
        variants: [...variants, spec],
        selectedVariantId: spec.id,
        pinned: [...pinned, spec.id],
      });
      toast.success('Variant generated');
    },
    [variants, pinned, patchPayload],
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

  const left = (
    <>
      <SourcePanel source={source} brandName={brand?.name} onPickFile={handlePickFile} />
      <MissingVariantsRail
        source={source}
        palette={palette}
        variants={variants}
        onGenerate={handleGenerateMissing}
      />
      <VariantGrid
        source={source}
        palette={palette}
        variants={variants}
        pinnedIds={new Set(pinned)}
        selectedId={selectedVariant.id}
        onSelect={(id) => patchPayload({ selectedVariantId: id })}
        onTogglePin={handleTogglePin}
        onAddBlank={handleAddBlank}
      />
    </>
  );

  const center = (
    <PreviewCanvas source={source} spec={selectedVariant} palette={palette} />
  );

  const right = (
    <SpecPanel
      spec={selectedVariant}
      palette={palette}
      onChange={updateSelectedSpec}
      onAddCustomColor={handleAddCustomColor}
      pinnedCount={pinned.length}
      onExport={(format) => {
        // Wire each format through the appropriate gate.
        const featureKey =
          format === 'svg'
            ? 'export-svg'
            : format === 'pdf'
              ? 'export-pdf'
              : 'export-png-1x';
        // Lazy gate trigger via ToolGate render-prop is heavier here;
        // for buttons inside SpecPanel we just delegate the gate decision
        // through this central wrapper.
        runGated(featureKey, () => doExport(format));
      }}
      onExportKit={() => runGated('export-kit', doExportKit)}
    />
  );

  // Centralized gate runner so SpecPanel doesn't need to know about modes.
  // For free features in public mode and everything in in-app mode, this
  // calls the action immediately. For gated features in public mode, we
  // mount a hidden ToolGate via state — done inline here for brevity.
  function runGated(feature: keyof typeof PUBLIC_GATES, action: () => void) {
    const requirement = gates[feature] ?? 'free';
    if (mode === 'in-app' || requirement === 'free') {
      action();
      return;
    }
    // Public mode + auth required → flag the user toward signup.
    // Use the same modal-less path the ToolGate uses.
    const next = encodeURIComponent(`/claim?slug=${TOOL_SLUG}&feature=${feature}`);
    window.location.href = `/?signup=1&next=${next}`;
  }

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
      center={center}
      right={right}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function sourceFromBrand(brand: Brand | undefined): SourceLogo | null {
  if (!brand?.logo) return null;
  const isSvg = brand.logo.startsWith('data:image/svg') || brand.logo.includes('.svg');
  return {
    id: `brand-${brand.id}`,
    kind: 'brand-asset',
    original: {
      svg: isSvg && brand.logo.startsWith('<svg') ? brand.logo : undefined,
      raster: !isSvg ? brand.logo : undefined,
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
