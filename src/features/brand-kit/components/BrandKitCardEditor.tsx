import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { DsButton } from '@/shared/ds';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { renderCosmosTemplate as renderTemplateDesign } from '../renderers';
import {
  contentKindForTemplateType,
  defaultContentFor,
  type ContentKind,
} from '@/features/brandkit/content';
// The editor portals to document.body and is mounted from more than one
// page, so it brings its own styles rather than relying on whichever page
// happened to import them first.
import '../brand-kit.css';
import { toast } from 'sonner';
import { recolorLogoSvg, contrastRatio } from '../data/recolorLogo';
import { FLATICON_RR_NAMES } from '../data/flaticonNames';
import { hexToName } from '@/features/setup/data/colorNames';
import { CopyIcon, type OrganicIconHandle } from '@/features/setup/components/organic-icons';
import {
  ICON_WEIGHTS,
  type IconWeightId,
  detectIconWeight,
  withIconWeight,
} from '../data/iconWeights';
import type { KitSectionKey } from './BrandKitSidebar';
import type { TemplateOverrides } from '../types';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import { ScalingStage } from '@/shared/brand/ScalingStage';
import { aspectForType, defaultOverridesForType, getDeliverable } from '../kit/registry';
import { variantsForCard } from '../data/legacy-mapping';
import { contentFromCustomization } from '../data/savedContent';

const FLATICON_RR_LOOKUP = new Set(FLATICON_RR_NAMES);

/** Resolve any icon source string to a Flaticon class name when one
 *  exists. Mirrors the logic in BrandAssetsRenderers so the editor
 *  preview matches what the drilldown tile shows. */
function resolveFlaticonClass(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^fi-(rr|br|sr|rs|bs|ss|tr|ts|brands)-[a-z0-9-]+$/i.test(trimmed)) {
    return trimmed;
  }
  const candidate = `fi-rr-${trimmed.toLowerCase()}`;
  return FLATICON_RR_LOOKUP.has(candidate) ? candidate : null;
}

/** Sizes used to lay out the brand-asset-font preview's type scale.
 *  Each row's size is paired with one of the font's declared weights
 *  in heaviest → lightest order, so a 4-weight font renders 4 rows
 *  (80 / 60 / 44 / 32) and a 9-weight font fills all 9 slots. */
const FONT_SCALE_SIZES = [80, 60, 48, 38, 30, 24, 20, 18, 16] as const;

/** Standard CSS font-weight keywords keyed by numeric weight. */
const FONT_WEIGHT_LABELS: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

const FONT_WEIGHT_NAME_MAP: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

/** Convert a hex (3 or 6 digit) into [h, s, l] (degrees, %, %). Used
 *  by the color editor to spin out shades by varying L. */
function hexToHsl(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const expanded = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (expanded.length !== 6) return [0, 0, 50];
  const r = parseInt(expanded.slice(0, 2), 16) / 255;
  const g = parseInt(expanded.slice(2, 4), 16) / 255;
  const b = parseInt(expanded.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0));
        break;
      case g:
        hue = ((b - r) / d + 2);
        break;
      default:
        hue = ((r - g) / d + 4);
    }
    hue *= 60;
  }
  return [hue, sat * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Build N shades of a base color, lightest → darkest, by sweeping
 *  the L channel of HSL. The base color sits roughly in the middle
 *  of the resulting list so the user sees both lighter and darker
 *  variants. */
function generateColorShades(baseHex: string, count = 9): string[] {
  const [h, s] = hexToHsl(baseHex);
  // L sweep from 92% (almost white) to 12% (near black) — gives a
  // generous range either side of the base for typical brand hues.
  const stops: number[] = [];
  const top = 92;
  const bottom = 12;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    stops.push(top - t * (top - bottom));
  }
  return stops.map((l) => hslToHex(h, s, l));
}

/** Pick a readable text color (black or white) for a given hex
 *  background using its relative luminance. */
function readableOn(hex: string): '#111113' | '#ffffff' {
  const [, , l] = hexToHsl(hex);
  return l > 60 ? '#111113' : '#ffffff';
}

/** Escape text for embedding inside SVG markup. Keeps the palette
 *  export safe when a future color name contains "&" or quotes. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Parse a BrandFont's `weights` string (e.g. "400 · 500 · 600 · 700"
 *  or "Regular · Bold") into a sorted list of numeric weights. */
function parseFontWeights(weights: string): number[] {
  if (!weights) return [400];
  const parts = weights
    .split(/[·,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = new Set<number>();
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (!isNaN(n) && n >= 100 && n <= 900) {
      out.add(n);
      continue;
    }
    const key = p.toLowerCase().replace(/[\s-]/g, '');
    const mapped = FONT_WEIGHT_NAME_MAP[key];
    if (mapped) out.add(mapped);
  }
  return out.size > 0 ? [...out].sort((a, b) => a - b) : [400];
}

/** Stable empty array — passed to LivePreviewFrame when the renderer
 *  is prop-driven (business-cards) and the DOM-walker text substitution
 *  path needs to stay dormant. Defined at module scope so its identity
 *  doesn't change between renders, which keeps the layout effect's
 *  observed deps stable. */
const EMPTY_REPLACEMENTS: Array<[string, string]> = [];

/** Resolve the template type for a target. Prefers `target.template.type`
 *  (set when the editor opens from a drilldown variant) and falls back
 *  to the deliverable registry for direct-card edits. */
function templateTypeFor(target: EditorTarget): string {
  if (target.template?.type) return target.template.type;
  return (
    getDeliverable(target.sectionKey, target.label)?.templateType ?? target.sectionKey
  );
}

export type EditorTarget = {
  sectionKey: KitSectionKey;
  /**
   * STORAGE label — the half of `${sectionKey}::${label}` that keys saved
   * customizations, kit items and featured-variant lists, and that
   * `coversFor` / `variantsForCard` address data by. Never a display name.
   */
  label: string;
  /**
   * What the user reads, when the catalog renames this card (Fonts →
   * Typography, About → Strategy). Defaults to `label`; present so a
   * rename changes headings without touching a storage key.
   */
  displayLabel?: string;
  /** The card's primary cover — also covers[0]. Kept as a separate
   *  field so the right-click "Download" path doesn't need to know
   *  about the picker. */
  cover: string;
  /** All cover options shown in the editor's image picker. */
  covers: string[];
  /** Real template variants pulled from the legacy brandkit library
   *  via legacy-mapping.ts. Drives the drilldown grid; empty when
   *  the card has no legacy counterpart. */
  templates?: BrandKitTemplate[];
  /** The single template the user picked from the drilldown — set
   *  when the editor opens from a variant tile. Lets the editor
   *  show the legacy renderer's preview alongside the brand
   *  controls. Absent when the editor opens from a card directly
   *  (right-click Edit) — the editor falls back to the cover
   *  image preview in that case. */
  template?: BrandKitTemplate;
  /** Set when editing an OWNED kit item — the page routes Save to
   *  the kit store (item customization) instead of the legacy
   *  per-card store. */
  kit?: { key: string; itemId: string };
};

type Props = {
  brand: MockBrand;
  /** Canonical Brand object — when provided alongside
   *  `target.template`, the preview pane renders the legacy
   *  template's live design (BusinessCardRenderer / etc.) instead
   *  of the static cover image. The selected color, when changed
   *  via the swatches, overrides the brand's primary so the
   *  preview reflects the recolor live. */
  sourceBrand?: Brand;
  target: EditorTarget | null;
  /** Previously saved customization for this card (KIT-01). When
   *  present, seeds the editor state so a saved edit is what the
   *  user sees on reopen — not the brand defaults. */
  initialCustomization?: SavedCardCustomization | null;
  onClose: () => void;
  onSave: (target: EditorTarget, customization: SavedCardCustomization) => void;
  onDownload: (target: EditorTarget) => void;
  /** Persistence hook for the brand-asset-icon editor — when the
   *  user picks a different weight, the page rewrites brand.icons
   *  at this index so the drilldown tile matches on close. */
  onUpdateIconAt?: (index: number, newClassName: string) => void;
  /**
   * `Use Template` / `Edit Template` — Task 9/10's actions, reused rather
   * than duplicated. Present only when the currently-previewed deliverable
   * is one the page has wired to Design (`deliverable.contentTypeId`); the
   * footer disables the corresponding button when a handler is absent
   * rather than calling into a family that isn't wired yet ("Invoice
   * remains the only wired family" for now). Never offered for a
   * brand-asset target — those still Save.
   */
  onUseTemplate?: (template: BrandKitTemplate) => void;
  onEditTemplate?: (template: BrandKitTemplate) => void;
};

/**
 * Full-screen-ish (90vw × 90vh) card editor.
 *
 * Two different jobs behind one shell, split by `isBrandAsset`:
 *
 *   • A brand-asset target (one specific icon, color, or font) is still a
 *     real editor — weight/color/shades/scale — and still Saves, because
 *     that's brand data, not a deliverable.
 *   • A deliverable target (a business card, an invoice, …) is a PREVIEW
 *     of its master template plus a switcher between the deliverable's
 *     other layouts. Nothing here edits its content anymore — the footer
 *     hands off to Design via `onUseTemplate` / `onEditTemplate` instead
 *     of Save.
 *
 * Closes on Escape, backdrop click, or the Cancel button. Renders
 * through a portal so the dialog escapes the workspace's stacking
 * context, with the workspace's data-theme mirrored onto the dialog
 * so light/dark tokens still apply.
 */
export function BrandKitCardEditor({
  brand,
  sourceBrand,
  target,
  initialCustomization,
  onClose,
  onSave,
  onDownload,
  onUpdateIconAt,
  onUseTemplate,
  onEditTemplate,
}: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSecondaryColor, setSelectedSecondaryColor] = useState<string | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [selectedLogoColor, setSelectedLogoColor] = useState<string | null>(null);
  const [selectedFontId, setSelectedFontId] = useState<string | null>(null);
  // Drives the brand-asset-icon preview's tint. Empty initial value
  // is fine — the reset effect below seeds it with the brand's
  // primary on every card open.
  const [selectedIconColor, setSelectedIconColor] = useState<string | null>(null);
  // UICONS weight (Thin/Regular/Bold/Solid) for the icon preview.
  // Initialized from the icon's own current prefix on card open so
  // we don't override an already-chosen weight.
  const [selectedIconWeight, setSelectedIconWeight] = useState<IconWeightId>('rr');
  // Hovered weight from the right rail — when set, the matching row
  // on the left gets a glow highlight. Mouse-only; clearing on
  // mouseleave returns the type scale to its default rendering.
  const [hoveredFontWeight, setHoveredFontWeight] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<TemplateOverrides>({});
  /**
   * Which master template variant is currently PREVIEWED.
   *
   * Seeded from `target.template` (a variant chosen from the drilldown
   * grid) or, absent that (right-click Edit on a card directly), the
   * first of the deliverable's own variants — so the modal always opens
   * on a real preview rather than a static cover. The variant switcher
   * below reassigns this; it is a preview switch, never an edit, and
   * nothing here is ever saved back to a template.
   */
  const [previewTemplate, setPreviewTemplate] = useState<BrandKitTemplate | null>(null);
  // Map of CopyIcon handles, keyed by hex (or 'preview' for the big
  // tile). Lives at the top of the component so the hook count stays
  // stable across renders — the `if (!target) return null` guard
  // below would otherwise turn this useRef into a conditional hook.
  const copyIconRefs = useRef<Map<string, OrganicIconHandle | null>>(new Map());

  const templateType = useMemo(
    () => (target ? templateTypeFor(target) : ''),
    [target],
  );
  /** The content model this deliverable has, or null if it has none yet. */
  const contentKind: ContentKind | null = useMemo(
    () => contentKindForTemplateType(templateType),
    [templateType],
  );
  /** Every master layout for this deliverable — drives the variant
   *  switcher. Brand-asset targets (one specific icon/color/font) don't
   *  use this; each is a single asset, not a family of layouts. */
  const variants = useMemo(
    () => (target ? variantsForCard(target.sectionKey, target.label, brand) : []),
    [target, brand],
  );

  /**
   * Which card the editor is currently loaded for.
   *
   * The seeding effect below must run when a NEW CARD opens and at no
   * other time. It cannot express that through its dependency array,
   * because `brand` is rebuilt by `brandToMockBrand(brand)` inline on
   * every render of the route component — so a parent re-rendering for
   * any reason at all handed this effect a new object, it re-ran, and it
   * threw away whatever the user had typed. Keying on the card's own
   * identity makes the reset mean what it says.
   */
  const loadedCardRef = useRef<string | null>(null);

  // Reset selection + preview whenever a new card opens so state from
  // the previous card doesn't bleed into this one.
  useEffect(() => {
    if (!target) {
      loadedCardRef.current = null;
      return;
    }
    const cardKey = `${target.sectionKey}::${target.label}::${target.template?.id ?? ''}`;
    if (loadedCardRef.current === cardKey) return;
    loadedCardRef.current = cardKey;
    setSelectedCover(target.cover);
    setSelectedColor(brand.colors.core[0]?.hex ?? null);
    setSelectedSecondaryColor(
      brand.colors.core[1]?.hex ?? brand.colors.accent[0]?.hex ?? null,
    );
    setSelectedLogoId(brand.logos[0]?.id ?? null);
    setSelectedLogoColor(brand.colors.core[0]?.hex ?? '#0F1216');
    setSelectedFontId(brand.fonts[0]?.id ?? null);
    setSelectedIconColor(brand.colors.core[0]?.hex ?? '#0F1216');
    setPreviewTemplate(target.template ?? variants[0] ?? null);
    // Seed the weight toggle from the current icon's prefix so a
    // brand that previously saved a Bold variant lands back on Bold,
    // not Regular.
    if (templateType === 'brand-asset-icon' && target.template?.id) {
      const m = target.template.id.match(/-ext-(\d+)$/);
      if (m) {
        const idx = parseInt(m[1], 10) - 1;
        const resolved = resolveFlaticonClass(brand.icons[idx]);
        setSelectedIconWeight(resolved ? detectIconWeight(resolved) : 'rr');
      } else {
        setSelectedIconWeight('rr');
      }
    } else {
      setSelectedIconWeight('rr');
    }
    setHoveredFontWeight(null);
    setOverrides(defaultOverridesForType(templateType, brand));
    // Re-apply the saved customization for this card, when one exists
    // (KIT-01). Saved ids are validated against the current brand so a
    // deleted logo/font falls back to the defaults seeded above. This
    // still matters for brand-asset Save (icon/color/font); a deliverable
    // no longer writes any of these fields, but an OLD save from before
    // this change may still be on disk, and restoring it here keeps that
    // Save round-trip byte-for-byte unchanged for brand-asset targets.
    const saved = initialCustomization;
    if (saved) {
      setOverrides({ ...defaultOverridesForType(templateType, brand), ...saved.overrides });
      if (saved.cover && target.covers.includes(saved.cover)) setSelectedCover(saved.cover);
      if (saved.color) setSelectedColor(saved.color);
      if (saved.secondaryColor) setSelectedSecondaryColor(saved.secondaryColor);
      if (saved.logoId && brand.logos.some((l) => l.id === saved.logoId)) {
        setSelectedLogoId(saved.logoId);
      }
      if (saved.logoColor) setSelectedLogoColor(saved.logoColor);
      if (saved.fontId && brand.fonts.some((f) => f.id === saved.fontId)) {
        setSelectedFontId(saved.fontId);
      }
    }
  }, [target, brand, templateType, initialCustomization, variants]);

  useEffect(() => {
    if (!target) return;
    const ws = document.querySelector('[data-workspace]');
    setTheme(ws?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [target, onClose]);

  // Brand projection used by the legacy renderer — picked swatches
  // override the brand's primary/secondary so recolors preview live.
  const previewBrand = useMemo<Brand | null>(() => {
    if (!sourceBrand) return null;
    const next: Brand = { ...sourceBrand };
    if (selectedColor) next.primaryColor = selectedColor;
    if (selectedSecondaryColor) next.secondaryColor = selectedSecondaryColor;
    return next;
  }, [sourceBrand, selectedColor, selectedSecondaryColor]);

  // Selected font, formatted as a CSS font-family stack. Applied to
  // the preview host so every text node inside the rendered template
  // picks it up — a strong CSS override (`!important` on
  // `.bk-preview-host[data-font-override] *`) wins over Tailwind
  // utilities like `font-mono` / `font-serif` baked into individual
  // designs, so swapping the font is truly global.
  const selectedFontFamily = useMemo<string | null>(() => {
    const f = brand.fonts.find((x) => x.id === selectedFontId);
    if (!f) return null;
    return `${f.family}, ${f.fallback ?? 'sans-serif'}`;
  }, [brand.fonts, selectedFontId]);

  // Picked logo, recolored to the picked logo color, encoded as a
  // data URI. The LivePreviewFrame swaps every <img> inside the
  // rendered template's BrandLogo to this URI on each layout pass —
  // gives live "logo variant + color" without modifying renderers.
  const previewLogoSrc = useMemo<string | null>(() => {
    const logo = brand.logos.find((l) => l.id === selectedLogoId);
    if (!logo) return null;
    const color = selectedLogoColor ?? brand.colors.core[0]?.hex ?? '#0F1216';
    const recolored = recolorLogoSvg(logo.svg, color);
    return `data:image/svg+xml;utf8,${encodeURIComponent(recolored)}`;
  }, [brand.logos, brand.colors.core, selectedLogoId, selectedLogoColor]);

  // Markers we look for inside the rendered preview — drives both
  // the replacement table and the field-presence detection. Each
  // tuple is `[overrides key, literal text in the design]`. Multiple
  // markers can map to the same key (e.g. phone has two spacings).
  const markerTable = useMemo<Array<[keyof TemplateOverrides, string]>>(() => {
    if (!previewBrand) return [];
    const slug = previewBrand.name.toLowerCase();
    return [
      ['title', 'Jane Smith'],
      ['subtitle', 'Vice President'],
      ['email', `jane@${slug}.com`],
      ['website', `${slug}.com`],
      ['phone', '+1 234 567 89'],
      ['phone', '+1 234 56789'],
    ];
  }, [previewBrand]);

  // Replacement table for the LivePreviewFrame DOM walker. Built
  // from `overrides`; an undefined OR empty value skips the swap so
  // the original literal stays — empty input is non-destructive, the
  // user can never blank out a field. Computed before the early-
  // return below so hook order stays stable across renders.
  const previewReplacements = useMemo<Array<[string, string]>>(() => {
    const pairs: Array<[string, string]> = [];
    for (const [key, source] of markerTable) {
      const v = overrides[key];
      if (typeof v === 'string' && v.length > 0) pairs.push([source, v]);
    }
    // Longest source first so overlapping strings (email contains
    // the domain) substitute correctly.
    pairs.sort((a, b) => b[0].length - a[0].length);
    return pairs;
  }, [markerTable, overrides]);

  /**
   * The content a content-model preview paints from.
   *
   * There is no EDITING left here — this modal previews the master, it
   * doesn't hold a draft of it — but a card the user already customized
   * through the (now-retired) Quick Edit still has that customization on
   * disk (`brandos:brand-kit:customizations`), and it is still what the
   * drilldown's Download reads (`contentForTemplate`). A preview that
   * ignored it would show "Acme Co." right next to a grid that downloads
   * "Globex Corp" for the exact same card — the preview's whole job is to
   * show what the card actually says, so it reads the same saved record
   * through the same resolution rule (`contentFromCustomization`),
   * falling back to the brand's defaults only when nothing was saved (or
   * what was saved belongs to a different content kind).
   */
  const previewContent = useMemo(() => {
    if (!contentKind) return undefined;
    return (
      contentFromCustomization(initialCustomization, contentKind, brand) ??
      defaultContentFor(contentKind, brand)
    );
  }, [contentKind, brand, initialCustomization]);

  if (!target) return null;

  const allColors = [...brand.colors.core, ...brand.colors.accent, ...brand.colors.grey];
  // Brand-asset cards (Logos / Colors / Fonts / Icons / Photos /
  // About) render a single piece of real data — their renderers
  // ignore primary/secondary color and font picks, and the icon
  // renderer uses `<img>` for real icons (so the logo-img swap
  // would corrupt them). Hide the rails that don't reach the
  // renderer, and skip the img swap.
  const isBrandAsset = templateType.startsWith('brand-asset-');
  const isIconAsset = templateType === 'brand-asset-icon';
  const isFontAsset = templateType === 'brand-asset-font';
  const isColorAsset = templateType === 'brand-asset-color';
  // Resolve the brand-asset-color target's color + role label by
  // walking the same flat list (core+accent+grey) the legacy mapper
  // builds. Core slots map to Primary/Secondary/Background; accent
  // and grey buckets give role labels of their own.
  let colorPreview: { hex: string; name: string; role: string } | null = null;
  if (isColorAsset && target.template?.id) {
    const m = target.template.id.match(/-ext-(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      const core = brand.colors.core;
      const accent = brand.colors.accent;
      const grey = brand.colors.grey;
      const CORE_ROLES = ['Primary', 'Secondary', 'Background'] as const;
      if (idx < core.length) {
        const c = core[idx];
        colorPreview = {
          hex: c.hex,
          name: c.name,
          role: CORE_ROLES[idx] ?? `Core ${idx + 1}`,
        };
      } else if (idx - core.length < accent.length) {
        const c = accent[idx - core.length];
        colorPreview = { hex: c.hex, name: c.name, role: 'Accent' };
      } else if (idx - core.length - accent.length < grey.length) {
        const c = grey[idx - core.length - accent.length];
        colorPreview = { hex: c.hex, name: c.name, role: 'Neutral' };
      }
    }
  }
  const colorShades = colorPreview ? generateColorShades(colorPreview.hex, 9) : [];
  // Pair each shade with a hex-derived display name. Same logic setup
  // uses (`hexToName`), de-duplicated within the list so two close
  // tones don't both read as "Rose". Plain computation (not useMemo)
  // because we sit AFTER the `if (!target) return null` early return —
  // a hook here would change the call count between renders.
  const usedShadeNames = new Set<string>();
  const colorShadesWithNames = colorShades.map((hex) => {
    const base = hexToName(hex);
    let name = base;
    let n = 2;
    while (usedShadeNames.has(name)) {
      name = `${base} ${n}`;
      n += 1;
    }
    usedShadeNames.add(name);
    return { hex, name };
  });
  const setCopyIconRef = (key: string) => (handle: OrganicIconHandle | null) => {
    if (handle) copyIconRefs.current.set(key, handle);
    else copyIconRefs.current.delete(key);
  };
  const copyHexToClipboard = (hex: string, key: string) => {
    const value = hex.toUpperCase();
    const finish = () => {
      const handle = copyIconRefs.current.get(key);
      handle?.startAnimation();
      window.setTimeout(() => handle?.stopAnimation(), 520);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(finish, finish);
      return;
    }
    // Fallback for environments without async clipboard (older Safari).
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* noop */
    }
    document.body.removeChild(ta);
    finish();
  };

  // SVG of the centered "role / name / hex" block — same composition
  // as the big preview tile the user sees in the editor.
  const buildBaseColorSvg = (hex: string, name: string, role: string): string => {
    const W = 1200;
    const H = 750;
    const fg = readableOn(hex);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
      `<rect width="${W}" height="${H}" fill="${hex}"/>`,
      `<text x="${W / 2}" y="${H / 2 - 80}" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" text-anchor="middle" dominant-baseline="middle">${escapeXml(role.toUpperCase())}</text>`,
      `<text x="${W / 2}" y="${H / 2 + 10}" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="120" font-weight="600" letter-spacing="-1.2" text-anchor="middle" dominant-baseline="middle">${escapeXml(name)}</text>`,
      `<text x="${W / 2}" y="${H / 2 + 110}" fill="${fg}" font-family="JetBrains Mono, ui-monospace, SFMono-Regular, monospace" font-size="22" letter-spacing="2" text-anchor="middle" dominant-baseline="middle">${hex.toUpperCase()}</text>`,
      `</svg>`,
    ].join('');
  };

  // SVG of the shades stack — vertical color bars with name on the
  // left and hex on the right, mirroring the on-screen rail.
  const buildShadesSvg = (rows: { hex: string; name: string }[]): string => {
    const W = 720;
    const ROW_H = 80;
    const PAD_X = 28;
    const totalH = ROW_H * rows.length;
    const svgRows = rows
      .map(({ hex, name }, i) => {
        const fg = readableOn(hex);
        const y = i * ROW_H;
        const labelY = y + ROW_H / 2;
        return [
          `<rect x="0" y="${y}" width="${W}" height="${ROW_H}" fill="${hex}"/>`,
          `<text x="${PAD_X}" y="${labelY}" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="500" dominant-baseline="middle">${escapeXml(name)}</text>`,
          `<text x="${W - PAD_X}" y="${labelY}" fill="${fg}" font-family="JetBrains Mono, ui-monospace, SFMono-Regular, monospace" font-size="20" font-weight="500" letter-spacing="1.2" text-anchor="end" dominant-baseline="middle">${hex.toUpperCase()}</text>`,
        ].join('');
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}">${svgRows}</svg>`;
  };

  // Rasterize an SVG string into PNG + JPG blobs at 2× DPI. Single
  // canvas + two `toBlob` calls so we don't redraw twice.
  const rasterizeSvg = async (
    svg: string,
    width: number,
    height: number,
  ): Promise<{ png: Blob | null; jpg: Blob | null }> => {
    const SCALE = 2;
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.src = svgUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('svg load failed'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = width * SCALE;
      canvas.height = height * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { png: null, jpg: null };
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob | null>((r) =>
        canvas.toBlob((b) => r(b), 'image/png'),
      );
      const jpg = await new Promise<Blob | null>((r) =>
        canvas.toBlob((b) => r(b), 'image/jpeg', 0.92),
      );
      return { png, jpg };
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  // Build an .ai file from an SVG. Real .ai files are PDF-compatible
  // since Illustrator CS2, so we generate a single-page PDF with the
  // SVG embedded as a vector and rename the extension. Illustrator
  // opens this as a fully editable vector document.
  const buildAiBlob = async (
    svg: string,
    width: number,
    height: number,
  ): Promise<Blob | null> => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const orientation = width >= height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [width, height],
      });
      // jsPDF understands SVG via its built-in `svg` import. We feed
      // a parsed DOM node since the string-based path is async-only
      // in newer versions.
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgEl = svgDoc.documentElement as unknown as Element;
      // `svg()` is provided by the optional jspdf SVG plugin — when
      // not present, fall back to embedding a rasterized PNG so the
      // .ai still opens with the artwork (just as a flat layer).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfAny = pdf as any;
      if (typeof pdfAny.svg === 'function') {
        await pdfAny.svg(svgEl, { x: 0, y: 0, width, height });
      } else {
        const { png } = await rasterizeSvg(svg, width, height);
        if (png) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(png);
          });
          pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
        }
      }
      const arrayBuffer = pdf.output('arraybuffer');
      return new Blob([arrayBuffer], { type: 'application/postscript' });
    } catch {
      return null;
    }
  };

  // Wraps an SVG / PNG / JPG / AI bundle for a single artwork into a
  // JSZip subfolder so the final ZIP has two named folders inside.
  const addBundleToZip = async (
    zip: InstanceType<typeof import('jszip').default>,
    folder: string,
    baseName: string,
    svg: string,
    width: number,
    height: number,
  ) => {
    const dir = zip.folder(folder);
    if (!dir) return;
    dir.file(`${baseName}.svg`, svg);
    const { png, jpg } = await rasterizeSvg(svg, width, height);
    if (png) dir.file(`${baseName}.png`, png);
    if (jpg) dir.file(`${baseName}.jpg`, jpg);
    const ai = await buildAiBlob(svg, width, height);
    if (ai) dir.file(`${baseName}.ai`, ai);
  };

  const handleDownloadShades = async () => {
    if (!colorPreview) return;
    const safe = colorPreview.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'palette';
    const svg = buildShadesSvg(colorShadesWithNames);
    const totalH = 80 * colorShadesWithNames.length;
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file(`${safe}-shades.svg`, svg);
    const { png, jpg } = await rasterizeSvg(svg, 720, totalH);
    if (png) zip.file(`${safe}-shades.png`, png);
    if (jpg) zip.file(`${safe}-shades.jpg`, jpg);
    const ai = await buildAiBlob(svg, 720, totalH);
    if (ai) zip.file(`${safe}-shades.ai`, ai);
    triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${safe}-shades.zip`);
  };

  // Footer "Download" handler for color assets. Bundles the base
  // color block + the shades stack into a single zip with two named
  // folders. Each folder contains svg / png / jpg / ai of its
  // artwork. For non-color cards the parent's onDownload still runs.
  const handleDownloadFontBundle = async () => {
    if (!isFontAsset || !fontPreview) return;
    try {
      const { downloadFontsBundle } = await import('../data/fontExport');
      const result = await downloadFontsBundle(
        [{ name: fontPreview.family, files: fontPreview.files }],
        fontPreview.family.toLowerCase().replace(/\s+/g, '-'),
        { flatten: true },
      );
      if (result.ok.length === 0) {
        toast(`Couldn't find ${fontPreview.family}`, {
          description:
            'Upload the font in setup — that font is not on Google Fonts so we have nothing to bundle.',
        });
      }
    } catch (err) {
      toast.error('Download failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleDownloadColorBundle = async () => {
    if (!colorPreview || !target) return;
    const safe = colorPreview.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'palette';
    const baseSvg = buildBaseColorSvg(colorPreview.hex, colorPreview.name, colorPreview.role);
    const shadesSvg = buildShadesSvg(colorShadesWithNames);
    const shadesH = 80 * colorShadesWithNames.length;
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    // Folder names use the actual color name (e.g. "Rose") so the
    // unzipped structure reads as the brand color, not a generic
    // "base" / "shades" pair.
    await addBundleToZip(zip, colorPreview.name, `${safe}`, baseSvg, 1200, 750);
    await addBundleToZip(zip, `${colorPreview.name} Shades`, `${safe}-shades`, shadesSvg, 720, shadesH);
    triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${safe}-palette.zip`);
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  // Resolve which Flaticon class to render in the icon preview, plus
  // the brand-icons index it sits at — needed so Save can persist
  // weight changes to the right slot.
  let iconPreviewClass: string | null = null;
  let iconIndex: number | null = null;
  if (isIconAsset && target.template?.id) {
    const m = target.template.id.match(/-ext-(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      const resolved = resolveFlaticonClass(brand.icons[idx]);
      if (resolved) {
        iconPreviewClass = withIconWeight(resolved, selectedIconWeight);
        iconIndex = idx;
      }
    }
  }
  // Resolve which BrandFont this card is for + its declared weights.
  let fontPreview: typeof brand.fonts[number] | null = null;
  let fontWeightOptions: number[] = [];
  if (isFontAsset && target.template?.id) {
    const m = target.template.id.match(/-ext-(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      fontPreview = brand.fonts[idx] ?? null;
      if (fontPreview) {
        fontWeightOptions = parseFontWeights(fontPreview.weights);
      }
    }
  }
  const fontPreviewStack = fontPreview
    ? `${fontPreview.family}, ${fontPreview.fallback ?? 'sans-serif'}`
    : '';
  // Content-model families (business-cards, invoices, …) paint from
  // `previewContent` as PROPS — the DOM-walker text substitution below is
  // for everything else (still real: it personalises the placeholder
  // literals baked into the design with THIS brand's name/domain, which
  // has always run automatically and isn't something the user edits).
  const isBusinessCard = templateType === 'business-cards';
  const livePreview = previewBrand && previewTemplate
    ? renderTemplateDesign(previewTemplate, previewBrand, brand, previewContent)
    : null;
  const previewAspect = aspectForType(templateType);

  return createPortal(
    <div
      className="bk-editor-backdrop"
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${target.label}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bk-editor" onMouseDown={(e) => e.stopPropagation()}>
        <div className="bk-editor-preview-col">
        {isIconAsset && iconPreviewClass ? (
          // Custom large preview for the icon editor — the workspace-
          // scoped CSS for the brand-asset-icon glyph doesn't reach
          // the editor portal, so we render directly here. Color
          // tracks the picker so the live tint matches.
          //
          // When the chosen tint vanishes against the editor's
          // surface (white tint on light theme, black tint on dark),
          // flip the preview's background to the opposite shade so
          // the glyph stays visible. Same heuristic the drilldown
          // uses, just scoped per-icon.
          (() => {
            const tint = selectedIconColor ?? brand.colors.core[0]?.hex ?? '#111113';
            const surface = theme === 'dark' ? '#111113' : '#ffffff';
            const inverse = theme === 'dark' ? '#ffffff' : '#111113';
            const needsFlip = contrastRatio(tint, surface) < 2;
            return (
              <section
                className="bk-editor-preview-card bk-editor-preview-card--icon"
                aria-label={`${target.label} preview`}
                style={{
                  color: tint,
                  ...(needsFlip ? { backgroundColor: inverse } : {}),
                }}
              >
                <i
                  className={`fi ${iconPreviewClass} bk-editor-icon-glyph`}
                  aria-hidden
                />
              </section>
            );
          })()
        ) : isColorAsset && colorPreview ? (
          // Brand-asset-color preview — solid swatch filling the card
          // with role / name / hex stacked centered. Text color picks
          // black or white based on swatch luminance. The whole tile
          // is clickable: anywhere on the swatch copies the hex to
          // the clipboard, and the copy icon pulses next to the code.
          <button
            type="button"
            className="bk-editor-preview-card bk-editor-preview-card--color bk-editor-color-copy"
            aria-label={`Copy ${colorPreview.hex.toUpperCase()}`}
            onClick={() => copyHexToClipboard(colorPreview.hex, 'preview')}
            style={{
              backgroundColor: colorPreview.hex,
              color: readableOn(colorPreview.hex),
            }}
          >
            <span className="bk-editor-color-meta">
              <span className="bk-editor-color-role">{colorPreview.role}</span>
              <span className="bk-editor-color-name">{colorPreview.name}</span>
              <span className="bk-editor-color-hex">
                {colorPreview.hex.toUpperCase()}
                <span className="bk-editor-color-copy-icon" aria-hidden>
                  <CopyIcon ref={setCopyIconRef('preview')} size={14} />
                </span>
              </span>
            </span>
          </button>
        ) : isFontAsset && fontPreview ? (
          // Type-scale preview — six rows from H1 down to Tiny, all
          // rendered in the brand's family + selected weight. Mirrors
          // a typical brand-guide typography table.
          <section
            className="bk-editor-preview-card bk-editor-preview-card--font"
            aria-label={`${target.label} preview`}
          >
            <table className="bk-editor-font-scale">
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>SIZE</th>
                </tr>
              </thead>
              <tbody>
                {[...fontWeightOptions].reverse().map((w, i) => {
                  // Pair each weight (heaviest first) with the next
                  // size from the scale. Fonts with more weights than
                  // sizes clamp at the smallest slot so the table
                  // always lays out cleanly. The big label is a
                  // fixed string ("Your font") so long family names
                  // don't truncate at the largest sizes; the weight
                  // name sits as a small caption above it.
                  const size =
                    FONT_SCALE_SIZES[i] ??
                    FONT_SCALE_SIZES[FONT_SCALE_SIZES.length - 1];
                  const weightName = FONT_WEIGHT_LABELS[w] ?? `${w}`;
                  const isHighlighted = hoveredFontWeight === w;
                  return (
                    <tr
                      key={w}
                      className={`bk-editor-font-scale-row${isHighlighted ? ' is-highlighted' : ''}`}
                    >
                      <td className="bk-editor-font-scale-cell">
                        <span className="bk-editor-font-scale-weight-tag">
                          {weightName}
                        </span>
                        <span
                          className="bk-editor-font-scale-sample"
                          style={{
                            fontFamily: fontPreviewStack,
                            fontWeight: w,
                            fontSize: size,
                          }}
                        >
                          Your font
                        </span>
                      </td>
                      <td className="bk-editor-font-scale-size">{size}px</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : livePreview ? (
          <section
            className="bk-editor-preview-card bk-editor-preview-card--live"
            aria-label={`${target.label} preview`}
          >
            {/* No BindProvider above this — every <Bind> the renderer
                declares falls back to a plain, non-interactive span. This
                is Brand Kit's PREVIEW of the master template, not an
                editing surface; editing it happens in Design now. */}
            <LivePreviewFrame
              // A content-model family paints from PROPS, so the legacy
              // DOM walker stays off for it — everything else still gets
              // the brand's own name/domain substituted into the design's
              // placeholder literals, which is personalisation, not editing.
              replacements={contentKind || isBusinessCard ? EMPTY_REPLACEMENTS : previewReplacements}
              aspect={previewAspect}
              fontFamily={isBrandAsset ? null : selectedFontFamily}
              showLogo={overrides.showLogo !== false}
              logoSrc={isBrandAsset ? null : previewLogoSrc}
            >
              {livePreview}
            </LivePreviewFrame>
          </section>
        ) : (
          <section
            className="bk-editor-preview-card"
            aria-label={`${target.label} preview`}
            style={{ backgroundImage: `url(${selectedCover ?? target.cover})` }}
          />
        )}

        {!isBrandAsset && variants.length > 1 && (
          <div className="bk-editor-variants" aria-label="Other layouts for this deliverable">
            {variants.map((tpl) => {
              const isSelected = previewTemplate?.id === tpl.id;
              return (
                <figure key={tpl.id} className="bk-variant-card">
                  <button
                    type="button"
                    className={`bk-variant-tile${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setPreviewTemplate(tpl)}
                    aria-pressed={isSelected}
                    aria-label={`Preview ${tpl.name}`}
                  >
                    {sourceBrand ? (
                      <span className="bk-variant-tile-render" aria-hidden>
                        {renderTemplateDesign(tpl, sourceBrand, brand)}
                      </span>
                    ) : (
                      <span
                        className="bk-variant-tile-cover"
                        style={{ backgroundImage: `url(${target.cover})` }}
                        aria-hidden
                      />
                    )}
                  </button>
                  <figcaption className="bk-variant-label">{tpl.name}</figcaption>
                </figure>
              );
            })}
          </div>
        )}
        </div>

        <aside className="bk-editor-rail-card" aria-label="Edit options">
          <header className="bk-editor-rail-head">
            <div className="bk-editor-rail-titles">
              <span className="bk-editor-eyebrow">{sectionLabel(target.sectionKey)}</span>
              <h2 className="bk-editor-title">{target.label}</h2>
            </div>
            <button
              type="button"
              className="bk-editor-close"
              onClick={onClose}
              aria-label="Close editor"
            >
              <CloseIcon />
            </button>
          </header>
          <div className="bk-editor-rail-body">
            {isIconAsset ? (
              <>
                <RailGroup title="Weight" hint="Pick the stroke thickness for this icon.">
                  <div className="bk-editor-icon-weights">
                    {ICON_WEIGHTS.map((w) => {
                      const previewName = iconPreviewClass
                        ? withIconWeight(iconPreviewClass, w.id)
                        : null;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          className={`bk-editor-icon-weight${selectedIconWeight === w.id ? ' is-selected' : ''}`}
                          onClick={() => setSelectedIconWeight(w.id)}
                          aria-pressed={selectedIconWeight === w.id}
                          title={w.label}
                        >
                          {previewName && (
                            <i className={`fi ${previewName}`} aria-hidden />
                          )}
                          <span className="bk-editor-icon-weight-label">{w.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </RailGroup>
                <RailGroup title="Color" hint="Tap a brand color to recolor the icon.">
                  <div className="bk-editor-swatches">
                    {allColors.map((c) => (
                      <button
                        key={`icon-${c.hex}-${c.name}`}
                        type="button"
                        className={`bk-editor-swatch${selectedIconColor === c.hex ? ' is-selected' : ''}`}
                        style={{ background: c.hex }}
                        onClick={() => setSelectedIconColor(c.hex)}
                        title={`${c.name} — ${c.hex.toUpperCase()}`}
                        aria-pressed={selectedIconColor === c.hex}
                        aria-label={`Icon color ${c.name} ${c.hex}`}
                      />
                    ))}
                  </div>
                </RailGroup>
              </>
            ) : isFontAsset && fontPreview ? (
              <RailGroup title="Weight" hint="Hover a weight to highlight it on the preview.">
                <div
                  className="bk-editor-font-weight-list"
                  onMouseLeave={() => setHoveredFontWeight(null)}
                >
                  {/* Render heaviest → lightest so the rail mirrors the
                      type-scale on the left (big → small). Rows are
                      non-interactive — they exist as a quick reference
                      and to drive the hover-highlight on the preview. */}
                  {[...fontWeightOptions].reverse().map((w) => (
                    <div
                      key={w}
                      className="bk-editor-font-weight-row"
                      onMouseEnter={() => setHoveredFontWeight(w)}
                    >
                      <span
                        className="bk-editor-font-weight-sample"
                        style={{ fontFamily: fontPreviewStack, fontWeight: w }}
                      >
                        Aa
                      </span>
                      <span className="bk-editor-font-weight-meta">
                        <span className="bk-editor-font-weight-name">
                          {FONT_WEIGHT_LABELS[w] ?? `Weight ${w}`}
                        </span>
                        <span className="bk-editor-font-weight-num">{w}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </RailGroup>
            ) : isColorAsset && colorPreview ? (
              <RailGroup title="Shades" hint="Tones from light to dark, generated from the base hex.">
                <div className="bk-editor-color-shades">
                  {colorShadesWithNames.map(({ hex, name }) => (
                    <button
                      key={hex}
                      type="button"
                      className="bk-editor-color-shade"
                      style={{ background: hex, color: readableOn(hex) }}
                      onClick={() => copyHexToClipboard(hex, hex)}
                      aria-label={`Copy ${hex.toUpperCase()}`}
                    >
                      <span className="bk-editor-color-shade-name">{name}</span>
                      <span className="bk-editor-color-shade-hex">
                        {hex}
                        <span className="bk-editor-color-shade-copy" aria-hidden>
                          <CopyIcon ref={setCopyIconRef(hex)} size={13} />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="bk-editor-shades-download"
                  onClick={handleDownloadShades}
                  aria-label="Download shades as CSV"
                >
                  <svg
                    width="14"
                    height="14"
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
                  <span>Download shades</span>
                </button>
              </RailGroup>
            ) : null}
          </div>
          <footer className="bk-editor-rail-footer">
            <DsButton tone="secondary" size="sm" onClick={onClose}>
              Cancel
            </DsButton>
            <DsButton
              tone="secondary"
              size="sm"
              onClick={() => {
                // Color assets get a dedicated bundle (base + shades
                // in svg/png/jpg/ai). Font assets emit a real
                // TTF/OTF bundle from the user's uploaded files (or
                // a Google Fonts fallback). Other asset types still
                // toast for now.
                if (isColorAsset && colorPreview) {
                  handleDownloadColorBundle();
                  return;
                }
                if (isFontAsset && fontPreview) {
                  handleDownloadFontBundle();
                  return;
                }
                onDownload(target);
              }}
            >
              Download
            </DsButton>
            {isBrandAsset ? (
              // Brand-asset targets still Save — this is real brand data
              // (the icon's weight write-back through onUpdateIconAt, plus
              // the customization record itself), not a deliverable.
              <DsButton
                tone="primary"
                size="sm"
                onClick={() => {
                  // Persist the chosen weight when an icon was edited
                  // — `iconPreviewClass` already has the new prefix
                  // applied via withIconWeight.
                  if (
                    isIconAsset &&
                    iconIndex !== null &&
                    iconPreviewClass &&
                    onUpdateIconAt
                  ) {
                    onUpdateIconAt(iconIndex, iconPreviewClass);
                  }
                  onSave(target, {
                    overrides,
                    cover: selectedCover,
                    color: selectedColor,
                    secondaryColor: selectedSecondaryColor,
                    logoId: selectedLogoId,
                    logoColor: selectedLogoColor,
                    fontId: selectedFontId,
                    savedAt: new Date().toISOString(),
                  });
                }}
              >
                Save
              </DsButton>
            ) : (
              // A deliverable is a preview now — editing it happens in
              // Design. Both actions reuse Task 9/10's handlers verbatim;
              // a family the page hasn't wired to Design yet (every
              // deliverable except Invoice, for now) just gets a disabled
              // button rather than a call that would only toast.
              <>
                <DsButton
                  tone="secondary"
                  size="sm"
                  disabled={!previewTemplate || !onEditTemplate}
                  onClick={() => previewTemplate && onEditTemplate?.(previewTemplate)}
                >
                  Edit Template
                </DsButton>
                <DsButton
                  tone="primary"
                  size="sm"
                  disabled={!previewTemplate || !onUseTemplate}
                  onClick={() => previewTemplate && onUseTemplate?.(previewTemplate)}
                >
                  Use Template
                </DsButton>
              </>
            )}
          </footer>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Wraps the rendered template preview and stitches brand-derived
 * PERSONALISATION into it at the DOM level — the design's placeholder
 * literals ("jane@company.com") become this brand's own defaults
 * ("jane@raqm.com"). This is not editing: `replacements` is always built
 * from `defaultOverridesForType`, never from anything a user typed, and
 * content-model families skip this walker entirely in favour of props.
 *
 * Mechanics:
 *  • Walks every Element under the preview root.
 *  • For each element, gathers its DIRECT text-node children and
 *    concatenates their values. This handles renderers whose JSX
 *    interpolates a brand value into the middle of a literal — e.g.
 *    `<div>jane@{slug}.com</div>` mounts as three sibling text
 *    nodes (`jane@`, `skam`, `.com`) but should match the marker
 *    `jane@skam.com` as one combined string.
 *  • Substitutes against the combined value, writes the result into
 *    the element's first text child, and clears the rest. React's
 *    next reconciliation will restore the original split before our
 *    layout effect runs again, so substitutions never compound.
 *
 * Limits: a marker split across element boundaries (e.g.
 *   `<div>jane@<span>{slug}</span>.com</div>`) still won't match
 *   — that design keeps the literal output. Acceptable trade-off.
 */
function LivePreviewFrame({
  replacements,
  aspect,
  fontFamily,
  showLogo,
  logoSrc,
  children,
}: {
  /** Literal → brand value pairs, substituted directly into the rendered
   *  DOM's text. This is PERSONALISATION (the design's placeholder
   *  literals become this brand's real name/domain), computed once from
   *  the brand's own defaults — never user input, and never anything a
   *  caret writes. Content-model families skip this entirely (they paint
   *  from props instead) by passing an empty array. */
  replacements: Array<[string, string]>;
  /** Native aspect ratio (w/h) of the design. Drives the host's
   *  shape and the inner stage's height so the renderer's hardcoded
   *  pixel sizes don't get visually starved when the preview is
   *  much larger than the original drilldown card. */
  aspect: number;
  /** Optional CSS font-family stack — when provided, every text
   *  inside the rendered template uses it (overrides Tailwind
   *  font-mono / font-serif / etc baked into individual designs). */
  fontFamily: string | null;
  /** When false, every `<img>` tag inside the preview is hidden via
   *  a CSS rule — the BrandLogo renderer always paints itself as an
   *  `<img>`, so this is a clean way to honor the Show Logo toggle
   *  without modifying every individual renderer. */
  showLogo: boolean;
  /** When provided, every `<img>` inside the preview has its `src`
   *  swapped to this data URI — gives "live logo variant + color"
   *  without touching individual renderers. The BrandLogo's CSS
   *  `filter` (used to recolor PNG logos via brightness/invert) is
   *  also cleared, since the URI is already the right color. */
  logoSrc: string | null;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let element = walker.nextNode() as Element | null;

    while (element) {
      const textChildren: Text[] = [];
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          textChildren.push(child as Text);
        }
      }

      if (textChildren.length > 0) {
        const combined = textChildren.map((t) => t.nodeValue ?? '').join('');

        // Apply substitutions.
        let next = combined;
        for (const [from, to] of replacements) {
          if (!from) continue;
          next = next.split(from).join(to);
        }
        if (next !== combined) {
          textChildren[0].nodeValue = next;
          for (let i = 1; i < textChildren.length; i += 1) {
            textChildren[i].nodeValue = '';
          }
        }
      }

      element = walker.nextNode() as Element | null;
    }

    // Swap every <img>'s src to the picked logo data URI (already
    // recolored to the picked logo color). Clears the BrandLogo's
    // brightness/invert filter so the SVG's authored color shows
    // through. Skipped when no logoSrc is provided.
    if (logoSrc) {
      const imgs = root.querySelectorAll('img');
      for (const img of Array.from(imgs)) {
        if (img.getAttribute('src') !== logoSrc) {
          img.setAttribute('src', logoSrc);
        }
        if (img.style.filter && img.style.filter !== 'none') {
          img.style.filter = 'none';
        }
      }
    }
  });

  return (
    <div ref={ref} className="bk-editor-preview-frame">
      <ScalingStage aspect={aspect} fontFamily={fontFamily} hideLogo={!showLogo}>
        {children}
      </ScalingStage>
    </div>
  );
}

function RailGroup({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  /** Optional slot in the group header (right side). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bk-editor-group">
      <header className="bk-editor-group-head">
        <div className="bk-editor-group-head-row">
          <h3 className="bk-editor-group-title">{title}</h3>
          {action}
        </div>
        {hint && <p className="bk-editor-group-hint">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function sectionLabel(key: KitSectionKey): string {
  const map: Record<KitSectionKey, string> = {
    'brand-assets': 'Brand Assets',
    stationery: 'Stationery',
    social: 'Social Media',
    web: 'Web',
    'brand-guides': 'Brand Guides',
    presentations: 'Presentations',
    animations: 'Animations',
  };
  return map[key];
}
