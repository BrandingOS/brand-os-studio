import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { ColorPickerHSV } from '@/features/setup/components/ColorPickerHSV';
import { hexToName } from '@/features/setup/data/colorNames';
import type { BrandColor, MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import { createTemplateInstanceDocument } from '@/features/editor/renderers/template-instance/createDocument';
import { defaultContentFor, contentKindForTemplateType } from '@/features/brandkit/content';
import { ensureMasterDesign, instanceFromMaster } from './kit/masterTemplates';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
import { renderCosmosTemplate as renderTemplateDesign } from './renderers';
import { BrandAssetPhotoRenderer } from './renderers/BrandAssetsRenderers';
import {
  rendererBindsContent,
  NO_CONTENT_BINDING_REASON,
} from './renderers/contentBinding';
import { type KitSectionKey } from './components/BrandKitSidebar';
import { KitSidebar } from './components/KitSidebar';
import { KitSection } from './components/KitSection';
import { EntryGrid, buildEditorTarget } from './components/sections';
import {
  getEntryFor,
  visibleGroups,
  type KitEntry,
} from './catalog/catalog';
import { useKitViewer } from './catalog/useKitViewer';
import { StrategyView } from './systems/StrategyView';
import { SocialSystemView } from './systems/SocialSystemView';
import { PresentationSystemView } from './systems/PresentationSystemView';
import { BrandBoardView } from './systems/BrandBoardView';
import {
  BrandKitCardEditor,
  type EditorTarget,
} from './components/BrandKitCardEditor';
import { ExportKitDialog } from './components/ExportKitDialog';
import type { DownloadChoice } from './components/DownloadMenu';
import { downloadOptionsFor, type DownloadOption } from './data/exportFormats';
import { IconPickerModal } from './components/IconPickerModal';
import { ColorsEditor } from './components/assets/ColorsEditor';
import { TypographyEditor } from './components/assets/TypographyEditor';
import { IconsEditor } from './components/assets/IconsEditor';
import { LogosEditor } from './components/assets/LogosEditor';
import { PhotosEditor } from './components/assets/PhotosEditor';
import { StrategyEditor } from './components/assets/StrategyEditor';
import { TemplatePickerModal } from './components/TemplatePickerModal';
import { TileActions, type TileMenuAction } from './components/TileActions';
import {
  KitFilterRow,
  KitFilterEmpty,
  useKitFilter,
} from './components/KitFilterRow';
import { getDeliverable, type DeliverableDef } from './kit/registry';
import { variantsForCard } from './data/legacy-mapping';
import { suggestIconsForBrand } from './data/suggestIcons';
import {
  ICON_WEIGHTS,
  type IconWeightId,
  detectIconWeight,
  withIconWeight,
} from './data/iconWeights';
import { contrastRatio } from './data/recolorLogo';
import {
  buildAllColorsZip,
  triggerBlobDownload,
  type PaletteColor,
} from './data/colorPaletteExport';
import { downloadIconsBundle, type IconExportEntry } from './data/iconExport';
import { downloadFontsBundle } from './data/fontExport';
import { contentForTemplate, loadBrandCustomizations } from './data/savedContent';
import {
  DEFAULT_FEATURED_IDS_BY_LABEL,
  PICKER_ASPECT_BY_LABEL,
  PICKER_LABELS,
  aspectForLabel,
  featuredTemplates,
} from './data/cardPresentation';
import {
  cardCustomizationKey,
  loadCardCustomization,
  loadFeaturedVariants,
  saveCardCustomization,
  saveFeaturedVariants,
} from './data/cardCustomizations';
import {
  snapshotElementPng,
  snapshotTemplatePng,
  withOffscreenMounts,
} from './data/templateSnapshot';
import {
  downloadLogosZip,
  paletteOf,
  slugifyName,
} from './data/kitExport';
import {
  downloadEntry,
  downloadEverything,
  type KitExportFormats,
} from './data/exportEverything';
import { isCancelled } from './data/exportScheduler';

// Rounded weight family from Flaticon UICONS — Regular drives the
// picker grid + default class names; Thin/Bold/Solid let the editor
// retint a single icon's weight without changing the underlying name.
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import '@flaticon/flaticon-uicons/css/thin/rounded.css';
import '@flaticon/flaticon-uicons/css/bold/rounded.css';
import '@flaticon/flaticon-uicons/css/solid/rounded.css';
import './brand-kit.css';

/**
 * BrandKitCosmosPage — single-scroll Brand Kit at /b/:slug/brand-kit.
 *
 * Two views, same route:
 *   • Sections list (default) — every section with a small grid of cards.
 *   • Drilldown view — the entire board area is replaced by a header
 *     plus a long grid of variants for one card. Sidebar stays put.
 *
 * Picking a card swaps to drilldown; back arrow / sidebar jump returns
 * to the sections list. Right-click "Edit" opens the editor directly,
 * skipping the drilldown — same behaviour the old context menu had.
 *
 * Transition: only the cover images fade in (top-to-bottom stagger);
 * the tile frames switch instantly. We tried a dual-layer cross-fade
 * earlier so the previous view's covers showed through during the
 * fade, but the two grids never aligned perfectly (subpixel drift +
 * different surrounding structures), which made the rectangles look
 * like they'd doubled up. Single-layer + cover-only fade keeps things
 * visually clean.
 */
type Origin = { x: number; y: number };
type ViewState = 'sections' | 'drilldown';

/** Per-tile fade duration (must match the CSS transition value). */
const TILE_FADE_MS = 280;
/** Cap on the staggered delay so far tiles still fade in finite time. */
const MAX_DELAY_MS = 500;
/** ms-per-pixel speed for the radial wipe. */
const WIPE_SPEED = 0.4;

/**
 * The brand-asset cards that own a dedicated editor, by STORAGE label.
 *
 * These five are not templates and never were — editing them means
 * editing the brand, so they open their own panel instead of the generic
 * Quick Edit. `Fonts` (not `Typography`) because the catalog renames the
 * card and a rename must never cost anyone their editor.
 */
const ASSET_EDITOR_LABELS = new Set(['Logos', 'Colors', 'Fonts', 'Icons', 'Photos', 'About']);

/**
 * How much of the stage the sticky top bar would cover. Measured, not
 * assumed: below 720px the bar wraps its tab strip onto a second row, so a
 * constant would leave the drilldown's header under it.
 */
function topBarHeight(): number {
  const bar = document.querySelector<HTMLElement>('.top-nav-wrap');
  return bar ? Math.round(bar.getBoundingClientRect().height) : 80;
}

/**
 * The document scroll position that puts the stage under the top bar.
 *
 * On a two-column viewport this is 0 (the board starts right below the
 * chrome), which is exactly what the enter transition used to hard-code. In
 * one column the sidebar sits above the board, so 0 means "look at the
 * navigation" — and a card that opens something you cannot see has not
 * visibly opened anything.
 */
function stageScrollTop(stage: HTMLElement | null): number {
  if (!stage) return 0;
  const top = stage.getBoundingClientRect().top + window.scrollY - topBarHeight();
  // Anything within a hair of the top IS the top. Two columns leave the
  // stage a few pixels below the bar, and scrolling by five pixels where
  // the approved transition scrolled to zero is a visible jitter for no
  // gain.
  return top < 24 ? 0 : Math.round(top);
}

export function BrandKitCosmosPage({
  brand,
  sourceBrand,
}: {
  brand: MockBrand;
  /** Canonical Brand object — needed by the legacy template
   *  renderers (BusinessCardRenderer, MockupRenderer, etc.) so the
   *  drilldown can paint live, brand-aware previews of every
   *  template variant. Optional: when absent (e.g. the standalone
   *  setup mock), the drilldown falls back to the placeholder
   *  cover for every tile. */
  sourceBrand?: Brand;
}) {
  const navigate = useNavigate();
  // Defensive lookup — some test harnesses render this page without
  // booting the DI container. `handleUseTemplate` treats a null service
  // as "can't do this yet" rather than crashing the page.
  const designStorage = serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)
    ? serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE)
    : null;
  // Which capabilities this viewer may see. Nothing here can be granted
  // from the address bar — see `catalog/useKitViewer`.
  const viewer = useKitViewer();
  const groups = useMemo(() => visibleGroups(viewer), [viewer]);
  // Page 2's content target. Once set on the first click, page 2
  // stays mounted in the DOM forever — only the target's content
  // (covers + label) updates on subsequent clicks. Mounting page 2
  // exactly once means the transition fires reliably (CSS
  // transitions need a prior state to interpolate from).
  const [drilldownTarget, setDrilldownTarget] = useState<EditorTarget | null>(null);
  // Which page is currently active. Drives data-active on the
  // stage, which flips the opacity rules for both layers.
  const [view, setView] = useState<ViewState>('sections');
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  // Card-editor persistence key: the canonical brand id when available,
  // falling back to the mock's name (standalone /setup preview).
  const customizationBrandId = sourceBrand?.id ?? brand.name;
  // Saved customization for the card being edited — re-read on every
  // open so a Save → reopen round-trip reflects the stored state.
  const editorCustomization = useMemo(
    () =>
      editorTarget
        ? loadCardCustomization(customizationBrandId, cardCustomizationKey(editorTarget))
        : null,
    [editorTarget, customizationBrandId],
  );
  // Every Quick Edit this brand has saved, read once. The covers paint from
  // it, so a card's face says what the user wrote — `savedRevision` is
  // bumped on save because the store is localStorage, which nothing
  // subscribes to.
  const [savedRevision, setSavedRevision] = useState(0);
  const savedContent = useMemo(
    () => loadBrandCustomizations(customizationBrandId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customizationBrandId, savedRevision],
  );
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  // Which template-picker is open (by card label), or null when none.
  // A single state replaces the per-label `*PickerOpen` flags.
  const [pickerLabel, setPickerLabel] = useState<string | null>(null);
  // Featured variant IDs per card label. Initialized from the curated
  // defaults (Stationery only); other labels resolve at render time
  // by taking the first 3 templates from the live drilldown target.
  // Picker appends per-label; persists for the session only.
  const [featuredIdsByLabel, setFeaturedIdsByLabel] = useState<
    Record<string, string[]>
  >({ ...DEFAULT_FEATURED_IDS_BY_LABEL });
  // Hydrate picker-added variants (persisted per brand + card label) so
  // a "+"-added variant survives navigation and refresh. Saved lists
  // win over the curated defaults for their label; brands without saves
  // render the defaults unchanged.
  useEffect(() => {
    const saved = loadFeaturedVariants(customizationBrandId);
    if (Object.keys(saved).length > 0) {
      setFeaturedIdsByLabel({ ...DEFAULT_FEATURED_IDS_BY_LABEL, ...saved });
    }
  }, [customizationBrandId]);
  // User-added icons override `brand.icons` for this session. Starts
  // null so we render the brand's seed set unchanged; the first add
  // (or removal) clones into a mutable list. Persistence back to the
  // brand store is a separate follow-up.
  const [iconsOverride, setIconsOverride] = useState<string[] | null>(null);
  // Global tint applied to every icon in the drilldown — null means
  // each icon uses the brand-primary fallback baked into the
  // renderer. Surfaced via the `--bk-icon-tint` CSS variable so we
  // don't have to thread state through each tile.
  const [iconTintOverride, setIconTintOverride] = useState<string | null>(null);

  // Colors added via the drilldown's "+" picker. Append-only for the
  // session — persistence back to the canonical Brand is a follow-up,
  // mirroring how `iconsOverride` works.
  const [colorAddsOverride, setColorAddsOverride] = useState<{
    core: BrandColor[];
    accent: BrandColor[];
  }>({ core: [], accent: [] });

  // When the brand has no icons of its own, auto-seed with 50 picks
  // suggested from its text fields (audience, tone, strategy, about).
  // Empty brands fall back to a curated starter pack inside the
  // suggester. Computed lazily and only when actually needed — once
  // the user adds via the picker, iconsOverride takes precedence.
  const suggestedIcons = useMemo<string[] | null>(() => {
    if (brand.icons.length > 0) return null;
    const text = [
      brand.name,
      sourceBrand?.audience,
      sourceBrand?.tone,
      sourceBrand?.guidelines?.strategy?.positioning,
      sourceBrand?.guidelines?.strategy?.vision,
      sourceBrand?.guidelines?.strategy?.mission,
      ...brand.about.map((a) => `${a.title} ${a.content}`),
    ]
      .filter((s): s is string => Boolean(s && s.trim()))
      .join(' ');
    return suggestIconsForBrand(text, 50);
  }, [brand, sourceBrand]);

  const baseBrand = useMemo<MockBrand>(() => {
    let next = brand;
    if (iconsOverride) {
      next = { ...next, icons: iconsOverride };
    } else if (brand.icons.length === 0 && suggestedIcons) {
      next = { ...next, icons: suggestedIcons };
    }
    if (colorAddsOverride.core.length || colorAddsOverride.accent.length) {
      next = {
        ...next,
        colors: {
          ...next.colors,
          core: [...next.colors.core, ...colorAddsOverride.core],
          accent: [...next.colors.accent, ...colorAddsOverride.accent],
        },
      };
    }
    return next;
  }, [brand, iconsOverride, suggestedIcons, colorAddsOverride]);

  /**
   * Which brand-asset editor is open, addressed by the card's STORAGE
   * label (`Fonts`, not `Typography`) so a renamed card still opens the
   * right one. `null` when none is.
   *
   * The five editors existed, were tested, and had no caller: the Edit
   * pencil on Logos / Colors / Typography / Icons / Photos opened the
   * generic Quick Edit over a stock cover instead, so the only way to
   * change a brand's palette from the kit was to leave the kit.
   */
  const [assetEditor, setAssetEditor] = useState<string | null>(null);
  /**
   * The editor's live draft, shown by the kit BEHIND the open panel.
   *
   * It shadows `baseBrand` rather than replacing it: an editor writes for
   * real through the Setup chain (`mockBrandToPatch` → `brandStore`), so
   * once the panel closes the saved brand must be what paints. Keeping
   * the draft would silently show an abandoned edit as the brand.
   *
   * The editors are fed `baseBrand`, never this — a preview that fed back
   * into the editor's own seed would recompute the draft from the draft.
   */
  const [brandPreview, setBrandPreview] = useState<MockBrand | null>(null);
  const closeAssetEditor = useCallback(() => {
    setAssetEditor(null);
    setBrandPreview(null);
  }, []);
  const effectiveBrand = brandPreview ?? baseBrand;

  const handleAddColor = useCallback(
    (group: 'core' | 'accent', hex: string) => {
      const norm = hex.trim().toLowerCase();
      const existingHexes = new Set([
        ...brand.colors.core.map((c) => c.hex.toLowerCase()),
        ...brand.colors.accent.map((c) => c.hex.toLowerCase()),
        ...brand.colors.grey.map((c) => c.hex.toLowerCase()),
        ...colorAddsOverride.core.map((c) => c.hex.toLowerCase()),
        ...colorAddsOverride.accent.map((c) => c.hex.toLowerCase()),
      ]);
      if (existingHexes.has(norm)) {
        toast(`${hex.toUpperCase()} is already in your palette`);
        return;
      }
      setColorAddsOverride((prev) => {
        const taken = new Set([
          ...brand.colors.core.map((c) => c.name),
          ...brand.colors.accent.map((c) => c.name),
          ...brand.colors.grey.map((c) => c.name),
          ...prev.core.map((c) => c.name),
          ...prev.accent.map((c) => c.name),
        ]);
        const base = hexToName(hex);
        let name = base;
        let n = 2;
        while (taken.has(name)) {
          name = `${base} ${n}`;
          n += 1;
        }
        return { ...prev, [group]: [...prev[group], { hex, name }] };
      });
    },
    [brand.colors, colorAddsOverride],
  );

  const handleAddIcon = useCallback(
    (className: string) => {
      setIconsOverride((prev) => {
        // Promote the suggested seed into the override on first add
        // so the user's pick lands on top of the auto-seeded set,
        // not on the (now ignored) original empty brand.icons.
        const base = prev ?? (brand.icons.length === 0 && suggestedIcons ? suggestedIcons : brand.icons);
        if (base.includes(className)) return base;
        return [...base, className];
      });
    },
    [brand.icons, suggestedIcons],
  );

  const handleUpdateIconAt = useCallback(
    (index: number, newClassName: string) => {
      setIconsOverride((prev) => {
        const base = prev ?? (brand.icons.length === 0 && suggestedIcons ? suggestedIcons : brand.icons);
        if (index < 0 || index >= base.length) return base;
        if (base[index] === newClassName) return base;
        const next = base.slice();
        next[index] = newClassName;
        return next;
      });
    },
    [brand.icons, suggestedIcons],
  );

  // Real card downloads (KIT-03). Brand-asset cards route to their
  // dedicated bundle builders; template cards rasterize their first
  // featured variant offscreen and download the PNG.
  // One colors export at a time — the bundle takes a moment even in
  // vector form, and a second click used to silently queue a duplicate
  // multi-minute job with zero feedback.
  const colorsExportBusyRef = useRef(false);
  const runColorsExport = useCallback(async (palette: PaletteColor[], brandName: string) => {
    if (colorsExportBusyRef.current) {
      toast('Colors export already running…', { id: 'bk-colors-export' });
      return;
    }
    colorsExportBusyRef.current = true;
    toast.loading(`Preparing colors bundle… 0/${palette.length}`, { id: 'bk-colors-export' });
    try {
      const blob = await buildAllColorsZip(palette, brandName, (done, total, name) => {
        toast.loading(`Preparing colors bundle… ${done}/${total}`, {
          id: 'bk-colors-export',
          description: name,
        });
      });
      triggerBlobDownload(blob, `${slugifyName(brandName)}-colors.zip`);
      const mb = blob.size / (1024 * 1024);
      toast.success('Colors bundle downloaded', {
        id: 'bk-colors-export',
        description: `${palette.length} colors · ${mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(blob.size / 1024))} KB`}`,
      });
    } catch (err) {
      toast.error('Colors export failed', {
        id: 'bk-colors-export',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      colorsExportBusyRef.current = false;
    }
  }, []);

  /**
   * Download one card — or, when `templateId` is given, ONE VARIANT of it.
   *
   * A tile's ⬇ has to download the design under the cursor, not the card's
   * first featured one (`.audit/OURS.md` D53). Rather than a second export
   * path, the variant is expressed as a one-entry featured list: the shared
   * writer already ships "the variants the card SHOWS", so narrowing that
   * list to a single id makes the bundle exactly this design, through the
   * same code the card, the group and Export Kit all use.
   *
   * Brand-asset cards are the exception, and deliberately: Logos, Colors,
   * Fonts, Icons and Photos export as BUNDLES of the brand's own files, not
   * as rasterised template variants. A tile there rasterises itself.
   */
  const handleDownloadCard = useCallback(
    async (
      t: EditorTarget,
      choice: DownloadChoice = { format: 'png' },
      templateId?: string,
    ) => {
      const b = effectiveBrand;
      const slug = slugifyName(b.name);
      const one = templateId
        ? (t.templates ?? []).find((tpl) => tpl.id === templateId)
        : undefined;
      try {
        if (templateId && t.sectionKey === 'brand-assets') {
          // A brand-asset tile is its own artifact — rasterise THIS tile.
          if (!one || !sourceBrand) {
            toast(`Nothing to export for ${t.displayLabel ?? t.label} yet`);
            return;
          }
          const blob = await snapshotTemplatePng(
            renderTemplateDesign(one, sourceBrand, b),
            260,
            aspectForLabel(t.label),
          );
          if (!blob) throw new Error('Rasterization produced no image');
          triggerBlobDownload(blob, `${slug}-${slugifyName(one.name)}.png`);
          return;
        }
        if (templateId) {
          const entry = getEntryFor(t.sectionKey, t.label);
          if (entry) {
            const id = toast.loading(`Preparing ${one?.name ?? t.label}…`);
            const result = await downloadEntry(
              entry,
              {
                brand: b,
                sourceBrand,
                entries: [entry],
                saved: loadBrandCustomizations(customizationBrandId),
                // The whole point: this card shows exactly one design here.
                featuredIdsByLabel: { ...featuredIdsByLabel, [t.label]: [templateId] },
              },
              choice,
            );
            if (result.added) toast.success(`${one?.name ?? t.label} downloaded`, { id });
            else {
              toast.error(`Couldn't download ${one?.name ?? t.label}`, {
                id,
                description: result.skipped[0]?.reason,
              });
            }
            return;
          }
        }
        switch (t.label) {
          case 'Logos': {
            const count = await downloadLogosZip(b);
            if (count === 0) toast('No logos yet', { description: 'Add a logo in Setup first.' });
            return;
          }
          case 'Colors': {
            await runColorsExport(paletteOf(b), b.name);
            return;
          }
          case 'Fonts': {
            const result = await downloadFontsBundle(
              b.fonts.map((f) => ({ name: f.family, files: f.files })),
              `${slug}-fonts`,
            );
            if (result.missing.length > 0) {
              toast(`Couldn't bundle ${result.missing.join(', ')}`, {
                description: 'Upload the font in Setup → Typography to include it next time.',
              });
            }
            return;
          }
          case 'Icons': {
            const templates = (t.templates ?? []).slice(0, b.icons.length);
            if (templates.length === 0) {
              toast('No icons yet', { description: 'Add icons from the Icons drilldown first.' });
              return;
            }
            await withOffscreenMounts(
              templates.map((tpl) => (
                <span key={tpl.id} className="brand-asset-render--icon-host">
                  {renderTemplateDesign(tpl, sourceBrand ?? ({} as Brand), b)}
                </span>
              )),
              96,
              96,
              async (hosts) => {
                const entries: IconExportEntry[] = hosts.map((el, i) => ({
                  name: templates[i]?.name ?? `Icon ${i + 1}`,
                  source: b.icons[i] ?? '',
                  element: el,
                }));
                await downloadIconsBundle(entries, `${slug}-icons`);
              },
            );
            return;
          }
          case 'Photos': {
            const photos = b.photos.filter((p) => p.src);
            if (photos.length === 0) {
              toast('No photos yet', { description: 'Add photos in Setup first.' });
              return;
            }
            const { default: JSZip } = await import('jszip');
            const zip = new JSZip();
            for (let i = 0; i < photos.length; i += 1) {
              const res = await fetch(photos[i].src).catch(() => null);
              const blob = res ? await res.blob() : null;
              if (blob) zip.file(`photo-${i + 1}.${blob.type.split('/')[1] || 'png'}`, blob);
            }
            triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${slug}-photos.zip`);
            return;
          }
          // 'About' (the Strategy card) is deliberately NOT special-cased
          // any more: it used to ship about.md alone, which is the free-form
          // sections and none of the eleven strategy answers. It falls
          // through to the shared writer, which gives strategy.pdf +
          // strategy.md + about.md — the same three files the kit ships.
          default: {
            // Everything that is not one of the brand's own asset
            // bundles goes through the SAME writer the Export Kit uses,
            // so a card can never answer "Nothing to export" for
            // something the kit ships. That is exactly what Social Media
            // System, Presentation System and Brand Board did: the card
            // path looked for a TEMPLATE, and a composed view has none.
            const entry = getEntryFor(t.sectionKey, t.label);
            // EVERY deliverable goes through the shared writer now — not
            // only the composed views — so the format menu (web · print ·
            // flattened · custom) has one implementation.
            if (entry) {
              const id = toast.loading(`Preparing ${t.displayLabel ?? t.label}…`);
              const result = await downloadEntry(
                entry,
                {
                  brand: b,
                  sourceBrand,
                  entries: [entry],
                  saved: loadBrandCustomizations(customizationBrandId),
                  featuredIdsByLabel,
                },
                choice,
              );
              if (result.added) toast.success(`${t.displayLabel ?? t.label} downloaded`, { id });
              else {
                toast.error(`Couldn't download ${t.displayLabel ?? t.label}`, {
                  id,
                  description: result.skipped[0]?.reason,
                });
              }
              return;
            }
            // Template deliverable — rasterize the first variant.
            const tpl = t.template ?? t.templates?.[0];
            if (!tpl || !sourceBrand) {
              toast(`Nothing to export for ${t.label} yet`);
              return;
            }
            const aspect = PICKER_ASPECT_BY_LABEL[t.label] ?? 1.6;
            // Export what the user SAVED, not the brand defaults. The
            // editor's own Download snapshots the live DOM; every other
            // export path rasterises the renderer offscreen and has to be
            // handed the content explicitly.
            const saved = loadBrandCustomizations(customizationBrandId);
            const blob = await snapshotTemplatePng(
              renderTemplateDesign(tpl, sourceBrand, b, contentForTemplate(saved, tpl, b)),
              260,
              aspect,
            );
            if (!blob) throw new Error('Rasterization produced no image');
            triggerBlobDownload(
              blob,
              `${slug}-${slugifyName(t.label)}-${slugifyName(tpl.name)}.png`,
            );
            return;
          }
        }
      } catch (err) {
        toast.error(`Download failed`, {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [effectiveBrand, sourceBrand, runColorsExport, customizationBrandId, featuredIdsByLabel],
  );

  /**
   * Copy a tile's vector, from the tile.
   *
   * Read off the RENDERED tile rather than reconstructed from the model:
   * what the user is looking at is the answer, and the brand-asset
   * renderers are being reworked family by family — a copy that rebuilt the
   * artwork itself would drift from the artwork on screen.
   *
   * A design that is not drawn as an SVG (a Flaticon glyph is a font, a
   * recoloured logo is a CSS mask) says so rather than copying nothing.
   */
  const handleCopySvg = useCallback(async (templateId: string, name: string) => {
    const tile = document.querySelector<HTMLElement>(
      `.bk-stage-layer--page2 [data-template-id="${templateId}"]`,
    );
    const svg = tile?.querySelector('svg');
    if (!svg) {
      toast(`${name} has no vector artwork`, {
        description: 'This design is drawn as a font glyph or a mask — download a PNG instead.',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(svg.outerHTML);
      toast.success('SVG copied to your clipboard');
    } catch (err) {
      toast.error("Couldn't copy the SVG", {
        description: err instanceof Error ? err.message : 'Clipboard access was refused.',
      });
    }
  }, []);

  /**
   * Promote a variant to the front of its card's featured list.
   *
   * "Featured" is one list with three readers — the card's cover, the
   * drilldown's showcase, and what a download ships when nobody named a
   * variant. Moving an id to the FRONT is therefore the visible act: the
   * card's face changes, and so does what Export Kit puts in the zip. An id
   * that is not in the list yet is added by the same move, which is what
   * makes this work from the picker as well as from the showcase.
   */
  const handleSetFeatured = useCallback(
    (label: string, templateId: string, templates?: ReadonlyArray<BrandKitTemplate>) => {
      setFeaturedIdsByLabel((prev) => {
        const current =
          prev[label] ??
          DEFAULT_FEATURED_IDS_BY_LABEL[label] ??
          (templates ?? []).slice(0, 3).map((t) => t.id);
        const next = [templateId, ...current.filter((id) => id !== templateId)];
        saveFeaturedVariants(customizationBrandId, label, next);
        return { ...prev, [label]: next };
      });
      toast.success('Set as featured', {
        description: 'It is now this card’s cover and its default download.',
      });
    },
    [customizationBrandId],
  );

  /**
   * `Use Template` — hands a fresh, INDEPENDENT snapshot of this
   * variant to the global Design editor. Spec §7.2: this COPIES, it
   * does not subscribe — editing the Brand Kit master later must never
   * reach a Design created here. Only deliverables with a registered
   * `contentTypeId` (Invoice, for this slice) are usable this way; the
   * caller gates the affordance so this only fires for those.
   *
   * The copy is taken from the brand's MASTER for this variant when one
   * exists — that is the whole point of `Edit Template`: tune the invoice
   * once, and every invoice started afterwards begins from the tuned one.
   * With no master (nobody has ever tuned this variant) it starts from
   * the brand's defaults, exactly as before.
   *
   * It deliberately does NOT seed a master. Masters stay lazily created
   * by `Edit Template` alone, so merely using a template never mints
   * brand-level state the user did not ask for.
   */
  const handleUseTemplate = useCallback(
    async (template: BrandKitTemplate, deliverable: DeliverableDef) => {
      const contentTypeId = deliverable.contentTypeId;
      if (!contentTypeId) {
        toast.error('This deliverable cannot be used yet');
        return;
      }
      const kind = contentKindForTemplateType(template.type);
      if (!kind) {
        toast.error('This deliverable cannot be used yet');
        return;
      }
      if (!sourceBrand) {
        toast.error('Use Template needs a saved brand');
        return;
      }
      if (!designStorage) {
        toast.error('Design storage is unavailable');
        return;
      }
      const designId = crypto.randomUUID();
      const doc =
        (await instanceFromMaster({
          storage: designStorage,
          brandId: sourceBrand.id,
          contentType: contentTypeId,
          templateId: template.id,
          designId,
        })) ??
        createTemplateInstanceDocument({
          designId,
          brandId: sourceBrand.id,
          contentType: contentTypeId,
          templateId: template.id,
          content: defaultContentFor(kind, effectiveBrand),
          design: {},
          sourceTemplateId: template.id,
        });
      try {
        await designStorage.saveDesign(sourceBrand.id, designId, doc, {
          name: `${deliverable.label} — ${template.name}`,
          contentType: contentTypeId,
          isTemplate: false,
          sourceTemplateId: template.id,
        });
      } catch (err) {
        toast.error('Could not create design', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        return;
      }
      navigate(`/b/${sourceBrand.slug}/design/${designId}`);
    },
    [sourceBrand, designStorage, effectiveBrand, navigate],
  );

  /**
   * `Edit Template` — opens the CANONICAL MASTER for this variant, not a
   * new instance. Brand-level template tuning, never client data. The
   * master is seeded lazily on first use (`ensureMasterDesign`) and reused
   * on every later call — same (contentType, templateId) always resolves
   * to the same design id.
   */
  const handleEditTemplate = useCallback(
    async (template: BrandKitTemplate, deliverable: DeliverableDef) => {
      const contentTypeId = deliverable.contentTypeId;
      if (!contentTypeId) {
        toast.error('This deliverable cannot be used yet');
        return;
      }
      const kind = contentKindForTemplateType(template.type);
      if (!kind) {
        toast.error('This deliverable cannot be used yet');
        return;
      }
      if (!sourceBrand) {
        toast.error('Edit Template needs a saved brand');
        return;
      }
      if (!designStorage) {
        toast.error('Design storage is unavailable');
        return;
      }
      let masterId: string;
      try {
        masterId = await ensureMasterDesign({
          storage: designStorage,
          brandId: sourceBrand.id,
          contentType: contentTypeId,
          templateId: template.id,
          label: `${deliverable.label} — ${template.name}`,
          seedContent: defaultContentFor(kind, effectiveBrand),
        });
      } catch (err) {
        toast.error('Could not open master template', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        return;
      }
      navigate(`/b/${sourceBrand.slug}/design/${masterId}`);
    },
    [sourceBrand, designStorage, effectiveBrand, navigate],
  );

  // Section-level download (the small icon in each section header).
  // Brand Assets → the full kit bundle; template sections → a zip with
  // one rasterized PNG per card (its first variant).
  /**
   * Run an export and keep the page usable while it runs.
   *
   * One job at a time, driven by CATALOG ENTRIES — the whole kit is every
   * visible entry, a group is that group's entries, and both go through
   * the same walker. A progress toast names the unit being worked on and
   * carries a Cancel that is honoured between units, and anything that
   * could not be included is reported rather than quietly missing.
   */
  const [exportingKit, setExportingKit] = useState(false);
  const exportAbortRef = useRef<AbortController | null>(null);

  const runKitExport = useCallback(
    async (
      entries: ReadonlyArray<KitEntry>,
      title: string,
      fileSuffix: string,
      allVariants = false,
      formats?: KitExportFormats,
    ) => {
      if (exportAbortRef.current) {
        toast('An export is already running');
        return;
      }
      const controller = new AbortController();
      exportAbortRef.current = controller;
      setExportingKit(true);
      const cancel = { label: 'Cancel', onClick: () => controller.abort() };
      const id = toast.loading(`Exporting ${title}…`, { duration: Infinity, action: cancel });
      try {
        const result = await downloadEverything({
          brand: effectiveBrand,
          sourceBrand,
          entries,
          saved: loadBrandCustomizations(customizationBrandId),
          featuredIdsByLabel,
          allVariants,
          formats,
          signal: controller.signal,
          fileName: `${slugifyName(effectiveBrand.name)}-${fileSuffix}.zip`,
          onProgress: (p) => {
            toast.loading(
              p.phase === 'zipping' ? p.label : `${p.label} — ${p.done + 1} of ${p.total}`,
              { id, duration: Infinity, action: cancel },
            );
          },
        });
        if (result.added === 0) {
          toast.error(`Nothing to export for ${title} yet`, { id, duration: 5000 });
          return;
        }
        const missed = result.skipped;
        toast.success(`${title} exported`, {
          id,
          duration: 6000,
          description:
            missed.length > 0
              ? `Left out: ${missed.slice(0, 3).map((m) => m.label).join(', ')}${
                  missed.length > 3 ? ` and ${missed.length - 3} more` : ''
                }.`
              : undefined,
        });
      } catch (err) {
        if (isCancelled(err)) {
          toast('Export cancelled', { id, duration: 3000 });
        } else {
          toast.error('Export failed', {
            id,
            duration: 6000,
            description: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      } finally {
        exportAbortRef.current = null;
        setExportingKit(false);
      }
    },
    [effectiveBrand, sourceBrand, customizationBrandId, featuredIdsByLabel],
  );

  // Section-level download (the small icon in each group header).
  const handleDownloadGroup = useCallback(
    (entries: ReadonlyArray<KitEntry>, groupName: string) =>
      runKitExport(entries, groupName, slugifyName(groupName)),
    [runKitExport],
  );

  // Top-right "Export kit" — asks first. Everything is ticked, so the
  // default is still "the whole kit"; the sheet exists so the user can
  // take less than that without giving up the button.
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  const allEntries = useMemo(() => groups.flatMap((g) => g.entries), [groups]);
  const handleExportKit = useCallback(() => setExportPickerOpen(true), []);
  const handleExportChosen = useCallback(
    (chosen: KitEntry[], allVariants: boolean, formats: KitExportFormats) => {
      setExportPickerOpen(false);
      const whole = chosen.length === allEntries.length;
      runKitExport(chosen, whole ? 'Brand kit' : 'Your selection', 'brand-kit', allVariants, formats);
    },
    [runKitExport, allEntries.length],
  );

  // Apply a single rounded weight to every icon in the kit. Re-prefixes
  // each class name (camera → fi-{weight}-camera) and writes back into
  // the override so the drilldown re-renders with the new weight.
  const handleSetGlobalIconWeight = useCallback(
    (weight: IconWeightId) => {
      setIconsOverride((prev) => {
        const base = prev ?? (brand.icons.length === 0 && suggestedIcons ? suggestedIcons : brand.icons);
        const next = base.map((c) => withIconWeight(c, weight));
        const changed = next.some((v, i) => v !== base[i]);
        return changed ? next : base;
      });
    },
    [brand.icons, suggestedIcons],
  );

  // Captured at click time on the trigger element (a card or the
  // Back button). Read by the post-mount useLayoutEffect to assign
  // each tile a distance-based animation-delay so the fade ripples
  // outward from the click point.
  const originRef = useRef<Origin | null>(null);
  // Captured at the moment the user enters the drilldown. Restored
  // on Back so the user lands at the exact section they clicked
  // from, not at the top of the sections list.
  const enterScrollYRef = useRef<number>(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // The two stage layers. Both stay mounted for the crossfade, so
  // whichever one is not the current view has to be made INERT —
  // `pointer-events: none` stops the mouse and nothing else, and Tab
  // walked straight through the Overview sitting behind an open
  // drilldown (QA Q18).
  const page1Ref = useRef<HTMLDivElement | null>(null);
  const page2Ref = useRef<HTMLDivElement | null>(null);
  // The card that opened the drilldown, so Back returns focus to it
  // instead of dropping the keyboard at the top of the document.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Carries the in-app Back button's click origin across the
  // history.back() → popstate hop so the radial wipe still
  // radiates from the button. Stays null for browser/mouse-driven
  // pops where we have no origin point.
  const pendingExitOriginRef = useRef<Origin | null>(null);

  // anchor: drilldown-anchor-v1 — user-approved baseline (2026-04-27).
  // Don't change handlePickCard / exitDrilldown / wipe useLayoutEffect
  // semantics without confirming first.
  const handlePickCard = useCallback(
    (target: EditorTarget, origin?: Origin) => {
      // Capture current scroll so Back can restore it.
      enterScrollYRef.current = window.scrollY;
      // Wipe origin = the clicked tile's center, captured in
      // DOCUMENT coords (viewport y + scrollY at click time). Doc
      // coords stay stable while the page smooth-scrolls to the
      // top, so the layoutEffect computes per-tile delays based on
      // where each tile actually IS in the document — and the
      // wipe radiates outward from the tile the user actually
      // clicked, not from a fixed anchor.
      if (origin) {
        originRef.current = { x: origin.x, y: origin.y + window.scrollY };
      } else {
        originRef.current = null;
      }
      // Two-phase commit so the CSS opacity transition has a prior
      // state to interpolate from on every click. Without this the
      // first-click fade silently no-ops because the browser only
      // sees the final opacity (1) with no prior state. flushSync
      // forces React to commit phase A immediately; rAF defers
      // phase B to the next frame so they paint separately.
      flushSync(() => {
        setDrilldownTarget(target);
      });
      // Push a history entry so the browser/mouse back button (or
      // a trackpad swipe-back) can dismiss the drilldown the same
      // way the in-app Back button does. URL stays unchanged — only
      // the history stack grows by one. The popstate listener
      // (effective while view === 'drilldown') runs the actual exit.
      window.history.pushState({ bkDrilldown: true }, '');
      // Smooth scroll to the STAGE — runs in parallel with the wipe so
      // the user sees tiles fading in WHILE they scroll, not before
      // arrival (would look "ready") and not after (would lag).
      //
      // Not `top: 0`: in the one-column layout the sidebar is ABOVE the
      // board, so scrolling to the document top parked the user on the
      // navigation and opening a card looked like it did nothing at all
      // (QA Q8). The stage's own top is 0 on a two-column viewport, so
      // the desktop behaviour is unchanged.
      window.scrollTo({ top: stageScrollTop(stageRef.current), behavior: 'smooth' });
      // Where Back should put the keyboard again — the card if the click
      // landed on one (normalised from whichever inner control took the
      // focus), otherwise whatever had it, which is the sidebar row when
      // the item was opened from there.
      const active = document.activeElement;
      returnFocusRef.current =
        active instanceof HTMLElement && active !== document.body
          ? ((active.closest('.bk-card') as HTMLElement | null) ?? active)
          : null;
      requestAnimationFrame(() => setView('drilldown'));
    },
    [],
  );

  // In-app exit path: stash origin so the popstate handler can
  // forward it to the wipe, then pop the history entry pushed on
  // enter. Routing through history.back() keeps the back stack in
  // sync — the user can press the in-app Back, the browser button,
  // or swipe-back interchangeably and the page state stays correct.
  const requestExitDrilldown = useCallback((origin?: Origin) => {
    pendingExitOriginRef.current = origin ?? null;
    window.history.back();
  }, []);

  const exitDrilldown = useCallback((origin?: Origin) => {
    // Convert the Back button's viewport center to DOCUMENT coords
    // so the wipe radiates from where Back is in the document — not
    // from a viewport y that becomes stale once we restore scroll.
    if (origin) {
      originRef.current = { x: origin.x, y: origin.y + window.scrollY };
    } else {
      originRef.current = null;
    }
    const targetY = enterScrollYRef.current;
    setView('sections');
    // Don't clear drilldownTarget — page 2 stays mounted for the
    // fade-out, and for any future re-entry to skip the rAF dance.
    // Restore the scroll position the user was at when they entered
    // the drilldown, so they land back on the exact section they
    // clicked from. rAF defers until page 1 is visible and the
    // wipe has started, so the scroll feels native.
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'auto' });
    });
  }, []);

  // Escape exits the drilldown view (mirrors how the modal used to
  // close on Escape). Skipped while the editor is open — the editor
  // owns Escape so closing it doesn't also collapse drilldown.
  useEffect(() => {
    if (view !== 'drilldown' || editorTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestExitDrilldown();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, editorTarget, requestExitDrilldown]);

  // Browser/mouse back support. While the drilldown is open we
  // listen for popstate — which fires whether the user clicked the
  // browser back button, used a mouse back button, swiped back on
  // a trackpad, OR called history.back() ourselves from the in-app
  // Back button. The handler runs the actual exit transition.
  //
  // If the editor is open on top of the drilldown, the first back
  // closes the editor and re-pushes the drilldown entry so a
  // subsequent back can still dismiss the drilldown — matching the
  // layered "back peels off the topmost overlay" behaviour users
  // expect from native macOS swipe-back.
  useEffect(() => {
    if (view !== 'drilldown') return;
    const onPop = () => {
      if (editorTarget) {
        setEditorTarget(null);
        window.history.pushState({ bkDrilldown: true }, '');
        return;
      }
      // If the in-app Back button drove this pop, it stashed its
      // click position. For a browser/mouse/swipe back we have no
      // event point — fall back to the on-screen position of the
      // Back button itself so the radial wipe still radiates from
      // the same spot, matching the in-app exit pixel-for-pixel.
      let origin = pendingExitOriginRef.current;
      pendingExitOriginRef.current = null;
      if (!origin) {
        const backEl = document.querySelector<HTMLElement>('.bk-drilldown-back');
        if (backEl) {
          const r = backEl.getBoundingClientRect();
          origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      exitDrilldown(origin ?? undefined);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [view, editorTarget, exitDrilldown]);

  /**
   * The item page 2 is CURRENTLY BUILT FROM, resolved from the drilldown
   * target's storage key. Derived rather than stored so the heading and
   * the body can never disagree about which item they are showing.
   *
   * Deliberately not gated on `view`: page 2 is populated a frame before
   * the view flips (the two-phase commit the enter transition needs), and
   * a composed item whose body waited for that frame would flash the
   * variants grid on the way in.
   */
  const targetEntry: KitEntry | null = useMemo(
    () =>
      drilldownTarget
        ? getEntryFor(drilldownTarget.sectionKey, drilldownTarget.label) ?? null
        : null,
    [drilldownTarget],
  );

  /** The registry definition for the open drilldown, if it is one of
   *  the generatable deliverables (Brand Assets cards have none). Only
   *  a deliverable with `contentTypeId` set can offer `Use Template`. */
  const drilldownDeliverable: DeliverableDef | undefined = useMemo(
    () =>
      drilldownTarget
        ? getDeliverable(drilldownTarget.sectionKey, drilldownTarget.label)
        : undefined,
    [drilldownTarget],
  );

  /** Same lookup as `drilldownDeliverable`, but for whichever card is
   *  open in the editor modal — the two can differ, since the editor
   *  also opens directly from a section-page card (right-click Edit)
   *  without going through the drilldown at all. Drives the modal's
   *  `Use Template` / `Edit Template` footer. */
  const editorDeliverable: DeliverableDef | undefined = useMemo(
    () =>
      editorTarget ? getDeliverable(editorTarget.sectionKey, editorTarget.label) : undefined,
    [editorTarget],
  );

  /**
   * The item the user is actually looking at — what the sidebar
   * highlights. This one IS gated on `view`, because exiting deliberately
   * leaves `drilldownTarget` mounted for the fade-out, and a highlighted
   * row on the Overview would be a lie.
   */
  const openEntry: KitEntry | null = view === 'drilldown' ? targetEntry : null;

  /**
   * Open an item from the sidebar.
   *
   * This is the navigation change. From the Overview it runs the normal
   * enter transition. From INSIDE another item it swaps the content in
   * place — no exit, no re-enter, no history push, no scroll to top —
   * so going from Business Card to Invoice is one click rather than a
   * round trip out through the board. The approved enter/exit transition
   * is untouched; it simply is not what switching between two open items
   * uses, because there is nothing to transition away from.
   */
  const handleSelectEntry = useCallback(
    (entry: KitEntry) => {
      const target = buildEditorTarget(
        entry.sectionKey,
        entry.storageLabel,
        effectiveBrand,
        entry.label,
      );
      if (view === 'drilldown') {
        originRef.current = null;
        setDrilldownTarget(target);
        return;
      }
      handlePickCard(target);
    },
    [view, effectiveBrand, handlePickCard],
  );

  /** Back to the whole kit. Runs the approved exit transition. */
  const handleSelectOverview = useCallback(() => {
    if (view === 'drilldown') requestExitDrilldown();
  }, [view, requestExitDrilldown]);

  // Radial wipe — runs synchronously after every view change but
  // BEFORE the browser paints, so the CSS opacity transition fires
  // with the correct per-tile delay from frame 0.
  //
  // Distances are computed in DOCUMENT space (viewport y + scrollY)
  // so the wipe is invariant of any in-flight smooth-scroll animation.
  // Without this, an enter that triggers a smooth scroll-to-top would
  // measure tile rects while they're still off-screen above the
  // viewport, every distance saturates MAX_DELAY_MS, and the whole
  // grid fades in together once scroll completes — losing the
  // staggered top-to-bottom reveal we want.
  //
  //   • Enter (sections → drilldown): delay = distance × speed.
  //     Tiles near the wipe origin (top of page after scroll) fade
  //     first, the cascade flows downward through the grid in time
  //     with the smooth scroll-to-top.
  //   • Exit  (drilldown → sections): delay = distance × speed,
  //     origin = the Back button's document position.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const tiles = Array.from(
      stage.querySelectorAll<HTMLElement>('.bk-card, .bk-variant-card'),
    );
    if (tiles.length === 0) return;

    const origin = originRef.current;
    if (!origin) {
      tiles.forEach((el) => el.style.setProperty('--bk-d', '0ms'));
      return;
    }

    // Read all rects first, write all delays after — avoids forcing
    // layout once per tile.
    const rects = tiles.map((el) => el.getBoundingClientRect());
    const scrollY = window.scrollY;

    tiles.forEach((el, i) => {
      const r = rects[i];
      const cx = r.left + r.width / 2;
      // Document Y instead of viewport Y so the distance is stable
      // while the page is mid-smooth-scroll.
      const cy = r.top + r.height / 2 + scrollY;
      const d = Math.hypot(cx - origin.x, cy - origin.y);
      const finalDelay = Math.min(d * WIPE_SPEED, MAX_DELAY_MS);
      el.style.setProperty('--bk-d', `${Math.round(finalDelay)}ms`);
    });
  }, [view, drilldownTarget]);

  /**
   * One layer at a time — for the mouse AND for the keyboard.
   *
   * Both stage layers stay mounted so the crossfade has something to fade
   * between, and the CSS only ever took the mouse away from the inactive
   * one. So with a drilldown open, Tab walked the Overview BEHIND it —
   * "Edit Logos", "Download Logos", "Edit Colors" — and the drilldown's own
   * tiles and their ⬇ / ✎ / ⋯ could not be reached at all (QA Q18).
   *
   * `inert` is the whole answer: it removes a subtree from the tab order,
   * from the accessibility tree and from hit-testing, and it survives
   * anything the layer contains. It is set imperatively rather than as a
   * JSX prop because React 18 does not know the attribute.
   *
   * Focus then MOVES with the view: into the drilldown when it opens (the
   * Back button, which is its first control), back to the card that opened
   * it when it closes.
   */
  useEffect(() => {
    const page1 = page1Ref.current;
    const page2 = page2Ref.current;
    const inactive = view === 'drilldown' ? page1 : page2;
    const activeLayer = view === 'drilldown' ? page2 : page1;
    inactive?.setAttribute('inert', '');
    activeLayer?.removeAttribute('inert');

    // Only move focus when the keyboard is what is driving — an
    // editor/modal open above the stage owns focus and must keep it.
    if (editorTarget || assetEditor) return;
    if (view === 'drilldown') {
      const back = page2?.querySelector<HTMLElement>('.bk-drilldown-back');
      if (back && !page2?.contains(document.activeElement)) {
        back.focus({ preventScroll: true });
      }
    } else if (returnFocusRef.current?.isConnected) {
      const back = returnFocusRef.current;
      returnFocusRef.current = null;
      // Never restore into the layer that has just gone inert, and never
      // fight a focus the user has already moved somewhere real.
      const stranded = !document.activeElement || document.activeElement === document.body;
      if (!back.closest('[inert]') && (stranded || page2?.contains(document.activeElement))) {
        back.focus({ preventScroll: true });
      }
    }
  }, [view, drilldownTarget, editorTarget, assetEditor]);

  return (
    <WorkspaceShell
      rightActions={
        <button
          type="button"
          className="pill-btn pill-btn--primary"
          onClick={handleExportKit}
          disabled={exportingKit}
        >
          <span>{exportingKit ? 'Exporting…' : 'Export kit'}</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    >
      <div className="shell">
        <KitSidebar
          brand={effectiveBrand}
          groups={groups}
          activeKey={openEntry?.key ?? null}
          onSelectOverview={handleSelectOverview}
          onSelectEntry={handleSelectEntry}
        />
        <div className="board-wrap bk-cosmos-board" data-workspace-main>
          <div ref={stageRef} className="bk-stage" data-active={view}>
            {/* Page 1 — the Overview. One band per catalog group, each
                holding only the items this viewer may see. Always
                mounted, always visible (modulo the per-tile wipe). */}
            <div ref={page1Ref} className="bk-stage-layer bk-stage-layer--page1">
              {groups.map((group) => (
                <KitSection
                  key={group.id}
                  dataKey={group.id}
                  title={group.label}
                  // Every group is exportable now: a composed view
                  // rasterises as a page body and Strategy writes the
                  // about document, so there is no group whose Download
                  // can only answer "nothing to export".
                  onDownload={() => handleDownloadGroup(group.entries, group.label)}
                >
                  <EntryGrid
                    entries={group.entries}
                    brand={effectiveBrand}
                    sourceBrand={sourceBrand}
                    featuredIdsByLabel={featuredIdsByLabel}
                    savedContent={savedContent}
                    onPickCard={handlePickCard}
                    onEditCard={(t) => {
                      // A brand asset has its own editor. Editing Colors
                      // means editing the PALETTE, not retouching one
                      // swatch tile's stock artwork.
                      if (t.sectionKey === 'brand-assets' && ASSET_EDITOR_LABELS.has(t.label)) {
                        setAssetEditor(t.label);
                        return;
                      }
                      setEditorTarget(t);
                    }}
                    onDownloadCard={handleDownloadCard}
                  />
                </KitSection>
              ))}
            </div>
            {/* Page 2 — drilldown. Mounted on the first card click
                and stays in the DOM forever after (target updates
                in place). Lives behind page 1 with opacity 0 until
                the wipe reveals it. */}
            {drilldownTarget !== null && (
              <div ref={page2Ref} className="bk-stage-layer bk-stage-layer--page2">
                <BrandKitDrilldown
                  target={drilldownTarget}
                  entry={targetEntry}
                  sourceBrand={sourceBrand}
                  mockBrand={effectiveBrand}
                  onBack={requestExitDrilldown}
                  onUseTemplate={
                    drilldownDeliverable?.contentTypeId
                      ? (template) => handleUseTemplate(template, drilldownDeliverable)
                      : undefined
                  }
                  onEditTemplate={
                    drilldownDeliverable?.contentTypeId
                      ? (template) => handleEditTemplate(template, drilldownDeliverable)
                      : undefined
                  }
                  onPickVariant={(template) =>
                    setEditorTarget({ ...drilldownTarget, template })
                  }
                  downloadOptions={targetEntry ? downloadOptionsFor(targetEntry) : undefined}
                  onDownloadVariant={(template, choice) =>
                    handleDownloadCard(drilldownTarget, choice, template.id)
                  }
                  onSetFeatured={
                    PICKER_LABELS.has(drilldownTarget.label)
                      ? (template) =>
                          handleSetFeatured(
                            drilldownTarget.label,
                            template.id,
                            drilldownTarget.templates,
                          )
                      : undefined
                  }
                  onAddIcon={() => setIconPickerOpen(true)}
                  onSetGlobalIconWeight={handleSetGlobalIconWeight}
                  iconTintOverride={iconTintOverride}
                  onSetGlobalIconTint={setIconTintOverride}
                  featuredIds={
                    PICKER_LABELS.has(drilldownTarget.label)
                      ? featuredIdsByLabel[drilldownTarget.label] ??
                        (drilldownTarget.templates ?? [])
                          .slice(0, 3)
                          .map((t) => t.id)
                      : undefined
                  }
                  onAddVariants={
                    PICKER_LABELS.has(drilldownTarget.label)
                      ? () => setPickerLabel(drilldownTarget.label)
                      : undefined
                  }
                  onAddColor={handleAddColor}
                  onDownload={async () => {
                    // Colors drilldown bundles every core/accent/grey
                    // swatch into one zip, each color in its own
                    // folder with svg/png/jpg/ai for both the base
                    // tile and the shades stack. Other drilldowns
                    // still toast — their export flows aren't built
                    // out yet.
                    if (drilldownTarget.label === 'Fonts') {
                      // Bulk Fonts download. Bytes come straight from
                      // whatever the user uploaded in Setup
                      // (round-tripped through Brand.typography.files).
                      // No file picker — if a family was uploaded it's
                      // already on the mock; Google Fonts fills in
                      // anything that wasn't.
                      try {
                        const families = effectiveBrand.fonts.map((f) => ({
                          name: f.family,
                          files: f.files,
                        }));
                        const zipBase = `${effectiveBrand.name.toLowerCase().replace(/\s+/g, '-')}-fonts`;
                        const result = await downloadFontsBundle(
                          families,
                          zipBase,
                        );
                        if (result.missing.length > 0) {
                          toast(`Couldn't bundle ${result.missing.join(', ')}`, {
                            description:
                              "Upload the font in Setup → Typography to include it next time.",
                          });
                        }
                      } catch (err) {
                        toast.error('Download failed', {
                          description:
                            err instanceof Error ? err.message : 'Unknown error',
                        });
                      }
                      return;
                    }
                    if (drilldownTarget.label === 'Icons') {
                      // Snapshot every rendered icon tile in the
                      // drilldown grid, paired with its template name
                      // (already derived from the icon class name in
                      // legacy-mapping). Rasterizing live DOM lets
                      // the export inherit the user-picked tint and
                      // weight without re-implementing them.
                      // Capture the icon's wrapper, not the inner
                      // `<i>` — Flaticon glyphs render via `::before`
                      // and html2canvas measures the host's
                      // bounding box. The host can collapse to 0×0
                      // with `display: flex` + auto sizing, which
                      // crashes `drawImage` downstream.
                      const tiles = stageRef.current?.querySelectorAll<HTMLElement>(
                        '.bk-stage-layer--page2 .brand-asset-render--icon',
                      );
                      const tplNames = (drilldownTarget.templates ?? []).map((t) => t.name);
                      const iconSources = effectiveBrand.icons;
                      const entries: IconExportEntry[] = [];
                      tiles?.forEach((el, i) => {
                        entries.push({
                          name: tplNames[i] ?? `Icon ${i + 1}`,
                          source: iconSources[i] ?? '',
                          element: el,
                        });
                      });
                      try {
                        await downloadIconsBundle(
                          entries,
                          `${effectiveBrand.name.toLowerCase().replace(/\s+/g, '-')}-icons`,
                        );
                      } catch (err) {
                        toast.error('Download failed', {
                          description:
                            err instanceof Error ? err.message : 'Unknown error',
                        });
                      }
                      return;
                    }
                    if (drilldownTarget.label === 'Colors') {
                      // One palette vocabulary. Position is not a role
                      // ("Core 4" told a customer nothing, D40) and the
                      // generated grey ladder is not the brand's palette
                      // (it is most of why this download was 320 files,
                      // D37) — `paletteOf` settles both.
                      await runColorsExport(paletteOf(effectiveBrand), effectiveBrand.name);
                      return;
                    }
                    // Template drilldowns (stationery / social / web /
                    // guides / presentations / animations): bundle a
                    // rasterized PNG of every visible variant.
                    {
                      const templates = drilldownTarget.templates ?? [];
                      if (templates.length === 0) {
                        // A composed view — Strategy, the two Systems, the
                        // Board. No template library to bundle, but very
                        // much something to download.
                        const entry = getEntryFor(
                          drilldownTarget.sectionKey,
                          drilldownTarget.label,
                        );
                        if (entry) {
                          const id = toast.loading(`Preparing ${entry.label}…`);
                          const result = await downloadEntry(entry, {
                            brand: effectiveBrand,
                            sourceBrand,
                            entries: [entry],
                            saved: loadBrandCustomizations(customizationBrandId),
                            featuredIdsByLabel,
                          });
                          if (result.added) toast.success(`${entry.label} downloaded`, { id });
                          else {
                            toast.error(`Couldn't download ${entry.label}`, {
                              id,
                              description: result.skipped[0]?.reason,
                            });
                          }
                          return;
                        }
                      }
                      if (templates.length === 0 || !sourceBrand) {
                        toast(`Nothing to export for ${drilldownTarget.label} yet`);
                        return;
                      }
                      const id = toast.loading(
                        `Preparing ${drilldownTarget.label} download…`,
                      );
                      try {
                        const aspect =
                          PICKER_ASPECT_BY_LABEL[drilldownTarget.label] ?? 1.6;
                        const { default: JSZip } = await import('jszip');
                        const zip = new JSZip();
                        for (const tpl of templates) {
                          const blob = await snapshotTemplatePng(
                            renderTemplateDesign(tpl, sourceBrand, effectiveBrand),
                            260,
                            aspect,
                          );
                          if (blob) zip.file(`${slugifyName(tpl.name)}.png`, blob);
                        }
                        triggerBlobDownload(
                          await zip.generateAsync({ type: 'blob' }),
                          `${slugifyName(effectiveBrand.name)}-${slugifyName(drilldownTarget.label)}.zip`,
                        );
                        toast.success(`${drilldownTarget.label} exported`, { id });
                      } catch (err) {
                        toast.error('Download failed', {
                          id,
                          description:
                            err instanceof Error ? err.message : 'Unknown error',
                        });
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <BrandKitCardEditor
        brand={effectiveBrand}
        sourceBrand={sourceBrand}
        target={editorTarget}
        initialCustomization={editorCustomization}
        onClose={() => setEditorTarget(null)}
        onSave={(t, customization) => {
          const ok = saveCardCustomization(
            customizationBrandId,
            cardCustomizationKey(t),
            customization,
          );
          if (ok) {
            toast.success(`Saved ${t.label}`, {
              description: 'Your customization is stored with this brand.',
            });
          } else {
            toast.error(`Couldn't save ${t.label}`, {
              description: 'Storage write failed — try again.',
            });
          }
          setEditorTarget(null);
        }}
        onDownload={async (t) => {
          // The editor preview already renders the user's live overrides
          // — snapshot that DOM so the download matches what they see.
          const host = document.querySelector<HTMLElement>('.bk-preview-host');
          if (host) {
            // Top-centre, deliberately: the editor's Cancel · Download ·
            // Save bar sits bottom-right, exactly where a toast lands by
            // default. "Business Card exported" used to cover Save, and the
            // click after a download went to the toast instead.
            const where = { position: 'top-center' as const };
            const id = toast.loading(`Exporting ${t.label}…`, where);
            try {
              const blob = await snapshotElementPng(host, 4);
              if (!blob) throw new Error('Rasterization produced no image');
              triggerBlobDownload(
                blob,
                `${slugifyName(effectiveBrand.name)}-${slugifyName(t.label)}.png`,
              );
              toast.success(`${t.label} exported`, { id, ...where });
            } catch (err) {
              toast.error('Download failed', {
                id,
                ...where,
                description: err instanceof Error ? err.message : 'Unknown error',
              });
            }
            return;
          }
          // No live preview (cover-image cards) — fall back to the
          // same offscreen path the card download uses.
          await handleDownloadCard(t);
        }}
        onUpdateIconAt={handleUpdateIconAt}
        onUseTemplate={
          editorDeliverable?.contentTypeId
            ? (template) => handleUseTemplate(template, editorDeliverable)
            : undefined
        }
        onEditTemplate={
          editorDeliverable?.contentTypeId
            ? (template) => handleEditTemplate(template, editorDeliverable)
            : undefined
        }
      />
      <ExportKitDialog
        open={exportPickerOpen}
        onClose={() => setExportPickerOpen(false)}
        entries={allEntries}
        onExport={handleExportChosen}
      />
      {/* The brand-asset editors. Each writes to the BRAND through the
          Setup chain and confirms first; `onBrandChange` is the live
          preview, so the kit behind the panel repaints as you edit.

          Mounted only while OPEN, never all five behind an `open` flag:
          `PhotosEditor` builds an uploader from the DI container the
          moment it renders, so five always-mounted panels would stand up
          machinery nobody asked for — and take the whole page down on any
          surface that has not booted the container. */}
      {assetEditor !== null && (
        <>
          <LogosEditor
            open={assetEditor === 'Logos'}
            onClose={closeAssetEditor}
            brand={baseBrand}
            sourceBrand={sourceBrand}
            onBrandChange={setBrandPreview}
          />
          <ColorsEditor
            open={assetEditor === 'Colors'}
            onClose={closeAssetEditor}
            brand={baseBrand}
            sourceBrand={sourceBrand}
            onBrandChange={setBrandPreview}
          />
          <TypographyEditor
            open={assetEditor === 'Fonts'}
            onClose={closeAssetEditor}
            brand={baseBrand}
            sourceBrand={sourceBrand}
            onBrandChange={setBrandPreview}
          />
          <IconsEditor
            open={assetEditor === 'Icons'}
            onClose={closeAssetEditor}
            brand={baseBrand}
            sourceBrand={sourceBrand}
            onBrandChange={setBrandPreview}
          />
          {assetEditor === 'Photos' && (
            <PhotosEditor
              open
              onClose={closeAssetEditor}
              brand={baseBrand}
              sourceBrand={sourceBrand}
              onBrandChange={setBrandPreview}
            />
          )}
          {assetEditor === 'About' && (
            <StrategyEditor
              open
              onClose={closeAssetEditor}
              brand={baseBrand}
              sourceBrand={sourceBrand}
              onBrandChange={setBrandPreview}
            />
          )}
        </>
      )}
      <IconPickerModal
        open={iconPickerOpen}
        selected={effectiveBrand.icons}
        onPick={handleAddIcon}
        onClose={() => setIconPickerOpen(false)}
      />
      <TemplatePickerModal
        open={pickerLabel !== null}
        title={pickerLabel ? `Add ${pickerLabel.toLowerCase()} variant` : ''}
        noun={pickerLabel ?? 'variant'}
        tileAspect={pickerLabel ? PICKER_ASPECT_BY_LABEL[pickerLabel] ?? 1.6 : 1.6}
        templates={
          pickerLabel && drilldownTarget?.label === pickerLabel
            ? drilldownTarget.templates ?? []
            : []
        }
        excludedIds={
          pickerLabel
            ? featuredIdsByLabel[pickerLabel] ??
              (drilldownTarget?.templates ?? []).slice(0, 3).map((t) => t.id)
            : []
        }
        sourceBrand={sourceBrand}
        mockBrand={effectiveBrand}
        onPick={(tpl) => {
          if (!pickerLabel) return;
          setFeaturedIdsByLabel((prev) => {
            const current =
              prev[pickerLabel] ??
              (drilldownTarget?.templates ?? []).slice(0, 3).map((t) => t.id);
            if (current.includes(tpl.id)) return prev;
            const next = [...current, tpl.id];
            saveFeaturedVariants(customizationBrandId, pickerLabel, next);
            return { ...prev, [pickerLabel]: next };
          });
        }}
        onClose={() => setPickerLabel(null)}
      />
    </WorkspaceShell>
  );
}

type DrilldownProps = {
  target: EditorTarget;
  /** The catalog entry being shown. Decides the heading the user reads
   *  and which view paints — a variants grid, or a composed one. */
  entry?: KitEntry | null;
  sourceBrand?: Brand;
  /** Setup-shaped brand data — required for brand-asset variants
   *  whose renderers live in a MockBrand world. */
  mockBrand?: MockBrand;
  onBack: (origin?: Origin) => void;
  onPickVariant: (template?: BrandKitTemplate) => void;
  /** Optional — when provided, the Icons drilldown shows an "Add"
   *  button in its header that opens the picker. */
  onAddIcon?: () => void;
  /** Optional — when provided, the Icons drilldown shows an "Edit"
   *  button next to "+" and Download. Picking a weight here applies
   *  it to every icon in the kit at once (brand-consistent set). */
  onSetGlobalIconWeight?: (weight: IconWeightId) => void;
  /** Current global icon tint hex, or null when each icon uses the
   *  renderer's per-tile fallback (brand primary). Used to highlight
   *  the active swatch in the Edit popover. */
  iconTintOverride?: string | null;
  /** Pass a hex to set the global tint, or null to clear it and
   *  fall back to the per-tile default. */
  onSetGlobalIconTint?: (hex: string | null) => void;
  /** Curated variant IDs for the current drilldown's card. When
   *  defined, the grid renders only these tiles in this order — the
   *  rest of the library is reachable via the "+" picker. Undefined
   *  means render all of `target.templates` (used for cards with no
   *  designed picker pattern, e.g. Brand Assets). */
  featuredIds?: string[];
  /** Opens the per-card variants picker (more variants from the
   *  library). When defined alongside `featuredIds`, the drilldown
   *  shows a "+" in its header. */
  onAddVariants?: () => void;
  /** Optional — when provided, the Colors drilldown shows a "+"
   *  button that pops the inline HSV color picker (Setup parity). */
  onAddColor?: (group: 'core' | 'accent', hex: string) => void;
  onDownload: () => void;
  /** Optional — when provided, right-clicking a variant tile offers
   *  "Use Template" alongside "Edit". Only deliverables promoted to a
   *  real Design content type pass this down; every other card's tile
   *  stays a plain click-only button, unchanged. */
  onUseTemplate?: (template: BrandKitTemplate) => void;
  /** Optional — when provided, right-clicking a variant tile also offers
   *  "Edit Template", which opens the CANONICAL MASTER (brand-level
   *  tuning) instead of a fresh independent instance. Gated identically
   *  to `onUseTemplate` — same deliverables, same content-type check. */
  onEditTemplate?: (template: BrandKitTemplate) => void;
  /** Download ONE variant — the design under the cursor, never the card's
   *  first. The page narrows its shared writer to this id. */
  onDownloadVariant?: (template: BrandKitTemplate, choice: DownloadChoice) => void;
  /** The five download words this card can honour. */
  downloadOptions?: DownloadOption[];
  /** Promote a variant to the card's face. Only offered where the card
   *  really has a featured list to promote into. */
  onSetFeatured?: (template: BrandKitTemplate) => void;
};

/**
 * Drilldown — Page 2 = a folder view of what's inside the picked
 * card. ONE header at the top (Back · card title · download) and
 * ONE continuous 3-column grid of variant tiles flowing
 * top-to-bottom with no section breaks. Reads as a single folder
 * the user opened by clicking the card.
 *
 * Variants come from the legacy brandkit library via
 * `legacy-mapping.ts`: each cosmos card resolves to a moduleId,
 * and the drilldown shows that module's real templates. When
 * a `sourceBrand` is supplied each tile renders the template's
 * live design (BusinessCardRenderer / MockupRenderer / etc.)
 * — the same render the legacy `/b/:slug/brandkit/<id>` page
 * uses, just framed in our cosmos shell. Cards with no legacy
 * counterpart fall back to the shared cover image.
 */
function BrandKitDrilldown({
  target,
  entry,
  sourceBrand,
  mockBrand,
  onBack,
  onPickVariant,
  onAddIcon,
  onSetGlobalIconWeight,
  iconTintOverride,
  onSetGlobalIconTint,
  featuredIds,
  onAddVariants,
  onAddColor,
  onDownload,
  onUseTemplate,
  onEditTemplate,
  onDownloadVariant,
  downloadOptions,
  onSetFeatured,
}: DrilldownProps) {
  // Right-click menu for a variant tile — only ever populated when
  // `onUseTemplate` is provided, so cards without it never gain a
  // context menu they didn't have before.
  const [tileMenu, setTileMenu] = useState<ContextMenuState | null>(null);
  const openTileMenu = useCallback(
    (e: React.MouseEvent, tpl: BrandKitTemplate) => {
      if (!onUseTemplate) return;
      e.preventDefault();
      e.stopPropagation();
      // Not every design in a wired family was retrofitted onto the
      // content model. Handing an unbound one to Design would give the
      // user a properties panel that accepts edits over artwork that
      // never changes — so the actions are offered with a reason instead
      // of a silent no-op. See `renderers/contentBinding.ts`.
      const editable = rendererBindsContent(tpl);
      const hint = editable ? undefined : NO_CONTENT_BINDING_REASON;
      setTileMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'Edit', onSelect: () => onPickVariant(tpl) },
          {
            label: 'Use Template',
            onSelect: () => onUseTemplate(tpl),
            disabled: !editable,
            hint,
          },
          ...(onEditTemplate
            ? [
                {
                  label: 'Edit Template',
                  onSelect: () => onEditTemplate(tpl),
                  disabled: !editable,
                  hint,
                },
              ]
            : []),
        ],
      });
    },
    [onUseTemplate, onEditTemplate, onPickVariant],
  );
  // For the Icons card we re-derive templates from the live brand on
  // every render so user-added icons surface immediately. The
  // snapshot stored on `target.templates` is captured at click time
  // and would otherwise miss anything added during the session.
  // Updating target.templates instead would re-trigger the radial
  // wipe on every add — deriving here keeps the wipe firing only on
  // enter/exit.
  const isIcons = target.label === 'Icons' && target.sectionKey === 'brand-assets';
  const isColors = target.label === 'Colors' && target.sectionKey === 'brand-assets';
  const isPhotos = target.label === 'Photos' && target.sectionKey === 'brand-assets';
  const templates = useMemo(() => {
    if (isIcons && mockBrand) {
      return variantsForCard(target.sectionKey, target.label, mockBrand);
    }
    if (isColors && mockBrand) {
      // Re-derive on every render so a color added via the "+"
      // popover surfaces a new tile immediately. Same trick the
      // Icons drilldown uses.
      return variantsForCard(target.sectionKey, target.label, mockBrand);
    }
    if (featuredIds) {
      // Filter the full library down to the curated/picked IDs in
      // their stored order. Drives the "3 featured + picker" pattern
      // for Stationery, Social, Web, Brand Guides, Presentations,
      // Animations.
      const all = target.templates ?? [];
      return featuredIds
        .map((id) => all.find((t) => t.id === id))
        .filter((t): t is typeof all[number] => Boolean(t));
    }
    return target.templates ?? [];
  }, [
    isIcons,
    isColors,
    featuredIds,
    mockBrand,
    target.sectionKey,
    target.label,
    target.templates,
  ]);
  /**
   * Chips + search — the same row the picker uses, so a design is found
   * the same way wherever the wall of them is (`KitFilterRow`).
   */
  const filter = useKitFilter(templates, `${target.sectionKey}::${target.label}`);
  const visible = filter.visible;

  /**
   * The ⋯ menu for one variant.
   *
   * Everything here acts on the design under the cursor. Before this the
   * only per-variant route was a right-click offering two items on the few
   * families wired to Design; the CARD's own actions silently acted on its
   * FIRST variant instead (`.audit/OURS.md` D53).
   *
   * An action a family cannot honour is SHOWN AND DISABLED with the reason
   * (spec §1), never hidden — a menu with one shape everywhere is a menu
   * people learn once.
   */
  const canCopySvg = target.label === 'Logos' || target.label === 'Icons';
  const tileActionsFor = useCallback(
    (tpl: BrandKitTemplate): TileMenuAction[] => {
      const out: TileMenuAction[] = [];
      if (onUseTemplate) {
        // Not every design in a wired family was retrofitted onto the
        // content model; handing an unbound one to Design would give the
        // user a properties panel over artwork that never changes.
        const editable = rendererBindsContent(tpl);
        const hint = editable ? undefined : NO_CONTENT_BINDING_REASON;
        out.push({
          label: 'Use Template',
          onSelect: () => onUseTemplate(tpl),
          disabledReason: hint,
        });
        if (onEditTemplate) {
          out.push({
            label: 'Edit Template',
            onSelect: () => onEditTemplate(tpl),
            disabledReason: hint,
          });
        }
      }
      if (onSetFeatured) {
        out.push({
          label: 'Set as featured',
          onSelect: () => onSetFeatured(tpl),
          separated: out.length > 0,
        });
      }
      if (canCopySvg) {
        out.push({
          label: 'Copy SVG',
          separated: out.length > 0,
          // The tile paints the real renderer, so the vector on screen IS
          // the vector to copy — no second export path to keep in step.
          // A tile with no <svg> in it (an icon drawn from a webfont) has
          // nothing to hand over, and says so rather than copying nothing.
          onSelect: () => {
            const svg = document
              .querySelector(`.bk-variant-card[data-template-id="${CSS.escape(tpl.id)}"]`)
              ?.querySelector('svg');
            if (!svg) {
              toast('Nothing to copy', {
                description: `${tpl.name} is not drawn as a vector.`,
              });
              return;
            }
            navigator.clipboard
              ?.writeText(svg.outerHTML)
              .then(() => toast.success(`${tpl.name} SVG copied`))
              .catch(() => toast.error('Could not copy the SVG'));
          },
        });
      }
      return out;
    },
    [onUseTemplate, onEditTemplate, onSetFeatured, canCopySvg],
  );

  const hasTemplates = templates.length > 0;

  /**
   * Composed views.
   *
   * Most items are a grid of variants and always were. Four are not:
   * Strategy reads Setup's answers, the two Systems explain the brand and
   * then show it applied, and the Brand Board is a single poster. Each is
   * a body — the drilldown's own head (Back, title, download) is shared,
   * so opening one of these feels exactly like opening any other item.
   */
  const composed = (() => {
    if (!entry || !mockBrand) return null;
    switch (entry.view) {
      case 'strategy':
        return <StrategyView brand={mockBrand} sourceBrand={sourceBrand} />;
      case 'social-system':
        return <SocialSystemView brand={mockBrand} sourceBrand={sourceBrand} />;
      case 'presentation-system':
        return <PresentationSystemView brand={mockBrand} sourceBrand={sourceBrand} />;
      case 'brand-board':
        return <BrandBoardView brand={sourceBrand} />;
      default:
        return null;
    }
  })();

  // Weight-popover state for the Icons drilldown's Edit button. Anchor
  // ref drives popover positioning; outside-click + Escape dismiss it.
  const [weightOpen, setWeightOpen] = useState(false);
  const weightAnchorRef = useRef<HTMLButtonElement | null>(null);
  const weightPopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!weightOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        weightAnchorRef.current?.contains(t) ||
        weightPopoverRef.current?.contains(t)
      )
        return;
      setWeightOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWeightOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [weightOpen]);

  // Highlight whichever weight is currently applied to the kit. Read
  // from the first icon — the global switcher keeps the whole set in
  // sync, so the first one is representative.
  const currentWeight: IconWeightId | null =
    isIcons && mockBrand?.icons[0]
      ? detectIconWeight(mockBrand.icons[0])
      : null;
  // Pick a "preview" icon name for the popover swatches. Prefer the
  // first icon in the brand; if there isn't one, fall back to a
  // generic catalog stand-in.
  const popoverPreviewBare = (() => {
    const first = mockBrand?.icons[0];
    if (!first) return 'star';
    return first.replace(/^fi-(rr|br|sr|rs|bs|ss|tr|ts|brands)-/, '');
  })();
  // Brand colors available as global tint options in the Edit popover.
  const brandPalette = mockBrand
    ? [...mockBrand.colors.core, ...mockBrand.colors.accent, ...mockBrand.colors.grey]
    : [];
  const activeTint = (iconTintOverride ?? mockBrand?.colors.core[0]?.hex ?? '').toLowerCase();

  // Watch the workspace's theme attribute so we can flip the icon
  // tile's bg when the chosen tint vanishes against the theme surface
  // (e.g. black tint in dark mode, white in light mode).
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const ws = document.querySelector('[data-workspace]');
    const read = () =>
      setTheme(ws?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    read();
    if (!ws) return;
    const ob = new MutationObserver(read);
    ob.observe(ws, { attributes: true, attributeFilter: ['data-theme'] });
    return () => ob.disconnect();
  }, []);

  // Add-color popover state — only meaningful for the Colors
  // drilldown. Tracks which palette (Core / Accent) the new color
  // lands in, the live HSV draft, and whether the popover is open.
  // Outside-click + Escape close it; we listen on `click` (not
  // `mousedown`) so a drag inside the HSV canvas that ends outside
  // the popover doesn't dismiss it.
  const [colorOpen, setColorOpen] = useState(false);
  const [colorTarget, setColorTarget] = useState<'core' | 'accent'>('core');
  const [colorDraft, setColorDraft] = useState('#4F46E5');
  const colorAnchorRef = useRef<HTMLButtonElement | null>(null);
  const colorPopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!colorOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (colorAnchorRef.current?.contains(t)) return;
      if (colorPopoverRef.current?.contains(t)) return;
      setColorOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColorOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [colorOpen]);

  // Decide whether to flip each icon tile's background. We compare the
  // chosen tint's WCAG contrast against the theme surface — if it's
  // below ~2 the icon would visually disappear, so we paint the tile
  // in the opposite of the surface to restore contrast. Returns null
  // when the natural surface already provides enough contrast.
  const iconBgFlip = useMemo<string | null>(() => {
    if (!isIcons) return null;
    const tint = iconTintOverride ?? mockBrand?.colors.core[0]?.hex ?? null;
    if (!tint) return null;
    // Approximate the workspace surface with a single hex per theme —
    // good enough for the visibility heuristic without coupling to
    // the design-token tree.
    const surface = theme === 'dark' ? '#111113' : '#ffffff';
    const inverse = theme === 'dark' ? '#ffffff' : '#111113';
    return contrastRatio(tint, surface) < 2 ? inverse : null;
  }, [isIcons, iconTintOverride, mockBrand, theme]);

  return (
    <div className="bk-drilldown">
      <div className="bk-drilldown-head">
        <div className="bk-drilldown-pill">
          <button
            type="button"
            className="bk-drilldown-back"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onBack({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            aria-label="Back to the Brand Kit overview"
            title="Back to the Brand Kit overview"
          >
            <BackArrow />
            <span>Back</span>
          </button>
          <h1 className="bk-drilldown-title">
            {entry?.label ?? target.displayLabel ?? target.label}
          </h1>
        </div>
        <div className="bk-drilldown-actions">
          {isIcons && onAddIcon && (
            <button
              type="button"
              className="section-add"
              onClick={onAddIcon}
              aria-label="Add icons"
              title="Add icons"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
          {onAddVariants && (
            <button
              type="button"
              className="section-add"
              onClick={onAddVariants}
              aria-label={`Browse more ${target.label.toLowerCase()} variants`}
              title="More variants"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
          {isColors && onAddColor && (
            <div className="bk-drilldown-color">
              <button
                ref={colorAnchorRef}
                type="button"
                className={`section-add${colorOpen ? ' is-active' : ''}`}
                onClick={() => setColorOpen((v) => !v)}
                aria-label="Add a new color"
                aria-expanded={colorOpen}
                title="Add a color"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              {colorOpen && (
                <div
                  ref={colorPopoverRef}
                  className="bk-color-popover"
                  role="dialog"
                  aria-label="Add a new color"
                >
                  <ColorPickerHSV
                    hex={colorDraft}
                    compact
                    commitLabel="Add"
                    paletteOptions={[
                      { key: 'core', label: 'Core' },
                      { key: 'accent', label: 'Accent' },
                    ]}
                    selectedPalette={colorTarget}
                    onSelectPalette={(k) => setColorTarget(k as 'core' | 'accent')}
                    onChange={(hex) => setColorDraft(hex)}
                    onCommit={(hex) => {
                      onAddColor(colorTarget, hex);
                      setColorOpen(false);
                    }}
                    onCancel={() => setColorOpen(false)}
                  />
                </div>
              )}
            </div>
          )}
          {isIcons && onSetGlobalIconWeight && (
            <div className="bk-drilldown-weight">
              <button
                ref={weightAnchorRef}
                type="button"
                className={`section-add${weightOpen ? ' is-active' : ''}`}
                onClick={() => setWeightOpen((v) => !v)}
                aria-label="Edit icon weight"
                aria-expanded={weightOpen}
                title="Icon weight"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              {weightOpen && (
                <div ref={weightPopoverRef} className="bk-weight-popover" role="menu">
                  <span className="bk-weight-popover-title">Icon weight</span>
                  <div className="bk-weight-popover-grid">
                    {ICON_WEIGHTS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className={`bk-weight-popover-cell${currentWeight === w.id ? ' is-selected' : ''}`}
                        onClick={() => onSetGlobalIconWeight(w.id)}
                        role="menuitemradio"
                        aria-checked={currentWeight === w.id}
                      >
                        <i className={`fi fi-${w.id}-${popoverPreviewBare}`} aria-hidden />
                        <span>{w.label}</span>
                      </button>
                    ))}
                  </div>
                  {onSetGlobalIconTint && brandPalette.length > 0 && (
                    <>
                      <span className="bk-weight-popover-title">Icon color</span>
                      <div className="bk-weight-popover-swatches">
                        {brandPalette.map((c) => {
                          const isOn = activeTint === c.hex.toLowerCase();
                          return (
                            <button
                              key={`tint-${c.hex}-${c.name}`}
                              type="button"
                              className={`bk-weight-popover-swatch${isOn ? ' is-selected' : ''}`}
                              style={{ background: c.hex }}
                              onClick={() => onSetGlobalIconTint(c.hex)}
                              title={`${c.name} — ${c.hex.toUpperCase()}`}
                              aria-pressed={isOn}
                              aria-label={`Icon color ${c.name} ${c.hex}`}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {!composed && (
          <button
            type="button"
            className="section-add section-download"
            onClick={onDownload}
            aria-label={`Download ${entry?.label ?? target.label}`}
            title={`Download ${entry?.label ?? target.label}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          )}
        </div>
      </div>
      {!composed && hasTemplates && (
        <KitFilterRow
          filter={filter}
          total={templates.length}
          noun={entry?.label ?? target.label}
        />
      )}
      {composed ?? (
      <div
        className="bk-drilldown-grid"
        style={
          isIcons
            ? ({
                ...(iconTintOverride ? { '--bk-icon-tint': iconTintOverride } : {}),
                ...(iconBgFlip ? { '--bk-icon-bg': iconBgFlip } : {}),
              } as CSSProperties)
            : undefined
        }
      >
        {hasTemplates ? (
          visible.length === 0 ? (
            <KitFilterEmpty onClear={filter.clear} />
          ) : (
          visible.map((tpl) => (
            <figure key={tpl.id} className="bk-variant-card" data-template-id={tpl.id}>
              <button
                type="button"
                className="bk-variant-tile"
                style={{ aspectRatio: String(aspectForLabel(target.label)) }}
                onClick={() => onPickVariant(tpl)}
                onContextMenu={onUseTemplate ? (e) => openTileMenu(e, tpl) : undefined}
                aria-label={`Open ${tpl.name}`}
              >
                {sourceBrand ? (
                  <span className="bk-variant-tile-render" aria-hidden>
                    {renderTemplateDesign(tpl, sourceBrand, mockBrand)}
                  </span>
                ) : (
                  <span
                    className="bk-variant-tile-cover"
                    style={{ backgroundImage: `url(${target.cover})` }}
                    aria-hidden
                  />
                )}
              </button>
              {/* A SIBLING of the tile, not a child: the tile is a <button>
                  and a button inside a button is not a button, and the tile
                  clips its own overflow so a menu inside it could not
                  escape. The card holds both, and hovering either raises
                  the pair (`.bk-variant-card:hover`). */}
              <TileActions
                name={tpl.name}
                downloadOptions={downloadOptions}
                onDownload={
                  onDownloadVariant ? (choice) => onDownloadVariant(tpl, choice) : undefined
                }
                onEdit={() => onPickVariant(tpl)}
                actions={tileActionsFor(tpl)}
              />
              <figcaption className="bk-variant-label">{tpl.name}</figcaption>
            </figure>
          ))
          )
        ) : isPhotos && mockBrand ? (
          /* A brand with no photography. The generic fallback below paints
             TWELVE tiles of the card's own stock cover — which is exactly
             the "twelve identical photographs" defect, and it lies twice:
             the pictures are not the brand's, and there are not twelve of
             them. The photo renderer's first tile says so in words instead
             (`PhotoEmptyTile`), and it is the same tile the drilldown shows
             once real photography arrives. */
          <figure className="bk-variant-card">
            <div
              className="bk-variant-tile bk-variant-tile--static"
              style={{ aspectRatio: String(aspectForLabel(target.label)) }}
            >
              <span className="bk-variant-tile-render" aria-hidden>
                <BrandAssetPhotoRenderer brand={mockBrand} templateIndex={0} />
              </span>
            </div>
          </figure>
        ) : isIcons && onAddIcon ? (
          // Icons drilldown empty state — the brand has no icons yet,
          // so the placeholder grid would just be 12 misleading boxes.
          // Surface a dedicated CTA into the picker instead.
          <button type="button" className="bk-drilldown-empty" onClick={onAddIcon}>
            <span className="bk-drilldown-empty-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="bk-drilldown-empty-title">Add icons to your kit</span>
            <span className="bk-drilldown-empty-sub">
              Browse 3,500+ Flaticon UICONS — search by name, click to add.
            </span>
          </button>
        ) : (
          // Fallback for cards with no legacy counterpart yet (e.g. some
          // web/qr-code cards): keep the placeholder shape so the
          // drilldown always renders something.
          Array.from({ length: 12 }, (_, i) => {
            const label = `${target.label} ${String(i + 1).padStart(2, '0')}`;
            return (
              <figure key={i} className="bk-variant-card">
                <button
                  type="button"
                  className="bk-variant-tile"
                style={{ aspectRatio: String(aspectForLabel(target.label)) }}
                  onClick={() => onPickVariant()}
                  aria-label={`Open ${label}`}
                >
                  <span
                    className="bk-variant-tile-cover"
                    style={{ backgroundImage: `url(${target.cover})` }}
                    aria-hidden
                  />
                </button>
                <figcaption className="bk-variant-label">{label}</figcaption>
              </figure>
            );
          })
        )}
      </div>
      )}
      {tileMenu && (
        <ContextMenu
          x={tileMenu.x}
          y={tileMenu.y}
          items={tileMenu.items}
          onClose={() => setTileMenu(null)}
        />
      )}
    </div>
  );
}

function BackArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default BrandKitCosmosPage;
