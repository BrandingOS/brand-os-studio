import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Type,
  AtSign,
  Mail,
  Phone,
  Globe,
  Megaphone,
  MessageSquare,
  Hash,
  FileText,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { renderCosmosTemplate as renderTemplateDesign } from '../renderers';
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
import type { BusinessCardContent, TemplateOverrides } from '../types';

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

type EditorField = {
  key: keyof TemplateOverrides;
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder?: string;
};

/** Stable empty array — passed to LivePreviewFrame when the renderer
 *  is prop-driven (business-cards) and the DOM-walker text substitution
 *  path needs to stay dormant. Defined at module scope so its identity
 *  doesn't change between renders, which keeps the layout effect's
 *  observed deps stable. */
const EMPTY_REPLACEMENTS: Array<[string, string]> = [];

/** Fields shown in the rail's Content group, by template type.
 *  Same set as the legacy modal's getEditorFields. brand-asset-*
 *  types have no content fields — they're previews of real assets. */
function getEditorFields(templateType: string): EditorField[] {
  switch (templateType) {
    case 'business-cards':
      return [
        { key: 'title', label: 'Full Name', icon: Type, placeholder: 'Jane Smith' },
        { key: 'subtitle', label: 'Job Title', icon: AtSign, placeholder: 'Brand Manager' },
        { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'jane@company.com' },
        { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '+1 234 56789' },
        { key: 'website', label: 'Website', icon: Globe, placeholder: 'company.com' },
      ];
    case 'facebook-covers':
      return [
        { key: 'headline', label: 'Headline', icon: Megaphone, placeholder: 'Your tagline here' },
        { key: 'body', label: 'Description', icon: MessageSquare, placeholder: 'Supporting text...' },
      ];
    case 'instagram-posts':
      return [
        { key: 'headline', label: 'Post Headline', icon: Megaphone, placeholder: 'Bold statement' },
        { key: 'body', label: 'Post Body', icon: MessageSquare, placeholder: 'Supporting copy...' },
        { key: 'cta', label: 'CTA Text', icon: Hash, placeholder: 'Learn More' },
      ];
    case 'instagram-stories':
      return [
        { key: 'headline', label: 'Story Headline', icon: Megaphone, placeholder: 'Your headline' },
        { key: 'cta', label: 'CTA Text', icon: Hash, placeholder: 'Swipe Up' },
      ];
    case 'presentations':
    case 'pres-pitch':
    case 'pres-plan':
    case 'pres-portfolio':
    case 'pres-proposal':
    case 'pres-case':
      return [
        { key: 'slideTitle', label: 'Slide Title', icon: FileText, placeholder: 'Presentation Title' },
        { key: 'slideSubtitle', label: 'Subtitle', icon: MessageSquare, placeholder: 'Subtitle or date' },
      ];
    case 'invoices':
      return [
        { key: 'title', label: 'Company Name', icon: Type, placeholder: 'Client Corp' },
        { key: 'subtitle', label: 'Invoice #', icon: Hash, placeholder: 'INV-0042' },
      ];
    case 'brand-guides':
    case 'guide-logo':
    case 'guide-color':
    case 'guide-typography':
    case 'guide-voice':
    case 'guide-imagery':
      return [
        { key: 'slideTitle', label: 'Guide Title', icon: FileText, placeholder: 'Brand Guidelines' },
        { key: 'slideSubtitle', label: 'Version', icon: Hash, placeholder: 'v2.0 — 2025' },
      ];
    case 'profile-icons':
      return [];
    case 'mockups':
    case 'mockup-mug':
    case 'mockup-tshirt':
    case 'mockup-billboard':
    case 'mockup-tote':
    case 'mockup-sticker':
      return [
        { key: 'headline', label: 'Product Label', icon: Type, placeholder: 'Your product' },
      ];
    case 'letterhead':
    case 'envelope':
    case 'notecard':
      return [
        { key: 'title', label: 'Recipient', icon: Type, placeholder: 'Dear ...' },
        { key: 'body', label: 'Body', icon: MessageSquare, placeholder: 'Letter body…' },
      ];
    // brand-asset-* and unknown types — no content fields.
    default:
      if (templateType.startsWith('brand-asset-')) return [];
      return [
        { key: 'headline', label: 'Headline', icon: Type, placeholder: 'Your text here' },
      ];
  }
}

function getDefaultOverrides(templateType: string, brand: MockBrand): TemplateOverrides {
  const slug = brand.name.toLowerCase().replace(/\s+/g, '-');
  const base: TemplateOverrides = {
    name: brand.name,
    primaryColor: brand.colors.core[0]?.hex,
    secondaryColor: brand.colors.core[1]?.hex ?? brand.colors.accent[0]?.hex,
    showLogo: true,
  };
  switch (templateType) {
    case 'business-cards':
      return {
        ...base,
        title: 'Jane Smith',
        subtitle: 'Brand Manager',
        email: `jane@${slug}.com`,
        phone: '+1 234 56789',
        website: `${slug}.com`,
      };
    case 'invoices':
      return { ...base, title: 'Acme Corp', subtitle: 'INV-0042' };
    case 'instagram-posts':
      return { ...base, headline: 'Bold statement here', body: 'Supporting copy', cta: 'Learn More' };
    case 'instagram-stories':
      return { ...base, headline: 'Your story headline', cta: 'Swipe Up' };
    case 'facebook-covers':
      return { ...base, headline: `${brand.name}`, body: brand.voice?.essay ?? '' };
    default:
      return { ...base, headline: brand.name };
  }
}

/** Resolve the template type for a target. Prefers `target.template.type`
 *  (set when the editor opens from a drilldown variant) and falls back
 *  to a label-based map for direct-card edits. */
function templateTypeFor(target: EditorTarget): string {
  if (target.template?.type) return target.template.type;
  const labelToType: Record<string, string> = {
    'Business Card': 'business-cards',
    Letterhead: 'letterhead',
    Envelope: 'envelope',
    Invoice: 'invoices',
    Profile: 'profile-icons',
    Cover: 'facebook-covers',
    Post: 'instagram-posts',
    Story: 'instagram-stories',
    'Pitch Deck': 'pres-pitch',
    'Business Plan': 'pres-plan',
    Proposal: 'pres-proposal',
    'Case Studies': 'pres-case',
  };
  return labelToType[target.label] ?? target.sectionKey;
}

/** Native aspect ratio (width / height) the renderer was designed
 *  for. Used by the ScalingStage to size the canonical 360px-wide
 *  inner stage and pick the correct preview-host shape. */
function aspectFor(templateType: string): number {
  switch (templateType) {
    // Square — single-asset previews + IG post + favicon + profile.
    case 'instagram-posts':
    case 'profile-icons':
    case 'favicon':
    case 'web-favicon':
    case 'mockup-mug':
    case 'mockup-tote':
    case 'mockup-sticker':
    case 'qr-branded':
    case 'qr-minimal':
    case 'qr-rounded':
    case 'qr-square':
    case 'anim-reveal':
    case 'anim-rotate':
      return 1;
    // Brand-asset cards render a single asset on a colored panel —
    // 4/3 reads better than 1/1 when there's a meta line under the
    // sample (color name, font role, etc).
    case 'brand-asset-logo':
    case 'brand-asset-color':
    case 'brand-asset-font':
    case 'brand-asset-icon':
    case 'brand-asset-photo':
    case 'brand-asset-about':
      return 4 / 3;
    case 'instagram-stories':
      return 9 / 16;
    case 'mockup-tshirt':
      return 4 / 5;
    case 'facebook-covers':
      return 820 / 312;
    case 'mockup-billboard':
    case 'website':
    case 'web-website':
    case 'pres-pitch':
    case 'pres-plan':
    case 'pres-portfolio':
    case 'pres-proposal':
    case 'pres-case':
    case 'guide-logo':
    case 'guide-color':
    case 'guide-typography':
    case 'guide-voice':
    case 'guide-imagery':
    case 'landing':
    case 'web-landing-page':
    case 'anim-slide':
    case 'anim-fade':
      return 16 / 9;
    case 'email-sig':
    case 'web-email-signature':
      return 3 / 1;
    case 'letterhead':
    case 'notecard':
      return 1 / 1.414;
    case 'envelope':
      return 2.3;
    default:
      return 1.6;
  }
}

export type EditorTarget = {
  sectionKey: KitSectionKey;
  label: string;
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
  onClose: () => void;
  onSave: (target: EditorTarget) => void;
  onDownload: (target: EditorTarget) => void;
  /** Persistence hook for the brand-asset-icon editor — when the
   *  user picks a different weight, the page rewrites brand.icons
   *  at this index so the drilldown tile matches on close. */
  onUpdateIconAt?: (index: number, newClassName: string) => void;
};

/**
 * Full-screen-ish (90vw × 90vh) card editor. Left half shows the card
 * cover at large size; right half is a scrollable edit rail with the
 * brand's colors, logos, and fonts. Selection state is local — the
 * intent is to wire each control to a real renderer later, when the
 * card covers are generated per-brand instead of being stock photos.
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
  onClose,
  onSave,
  onDownload,
  onUpdateIconAt,
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
  // Markers detected in the rendered preview by LivePreviewFrame.
  // The Customize panel only shows fields whose marker actually
  // appears in this design, so the right-side controls match what's
  // visible on the card.
  const [presentMarkers, setPresentMarkers] = useState<Set<keyof TemplateOverrides>>(
    new Set(),
  );
  // Map of CopyIcon handles, keyed by hex (or 'preview' for the big
  // tile). Lives at the top of the component so the hook count stays
  // stable across renders — the `if (!target) return null` guard
  // below would otherwise turn this useRef into a conditional hook.
  const copyIconRefs = useRef<Map<string, OrganicIconHandle | null>>(new Map());

  const templateType = useMemo(
    () => (target ? templateTypeFor(target) : ''),
    [target],
  );
  const editorFields = useMemo(() => getEditorFields(templateType), [templateType]);

  // Reset selection + content overrides whenever a new card opens so
  // state from the previous card doesn't bleed into this one.
  useEffect(() => {
    if (!target) return;
    setSelectedCover(target.cover);
    setSelectedColor(brand.colors.core[0]?.hex ?? null);
    setSelectedSecondaryColor(
      brand.colors.core[1]?.hex ?? brand.colors.accent[0]?.hex ?? null,
    );
    setSelectedLogoId(brand.logos[0]?.id ?? null);
    setSelectedLogoColor(brand.colors.core[0]?.hex ?? '#0F1216');
    setSelectedFontId(brand.fonts[0]?.id ?? null);
    setSelectedIconColor(brand.colors.core[0]?.hex ?? '#0F1216');
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
    setOverrides(getDefaultOverrides(templateType, brand));
  }, [target, brand, templateType]);

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
  // For business-cards we pass content as a prop straight to the
  // renderer — the DOM-walker text substitution path is disabled
  // for this type, so typing is reliable (no compounding, no
  // accidental whole-string deletion).
  const isBusinessCard = templateType === 'business-cards';
  const businessCardContent: Partial<BusinessCardContent> | undefined = isBusinessCard
    ? {
        fullName: overrides.title,
        jobTitle: overrides.subtitle,
        email: overrides.email,
        phone: overrides.phone,
        website: overrides.website,
      }
    : undefined;
  const renderContent = businessCardContent
    ? { businessCard: businessCardContent }
    : undefined;
  const livePreview = previewBrand && target.template
    ? renderTemplateDesign(target.template, previewBrand, brand, renderContent)
    : null;
  const previewAspect = aspectFor(templateType);

  // Only show Content fields whose marker text actually appears in
  // the rendered design. When the preview hasn't been scanned yet
  // (initial render) `presentMarkers` is empty — fall back to the
  // full list so the panel isn't blank for a frame.
  // Business-cards are prop-driven — the DOM no longer contains the
  // marker literals after the user types, so marker-based hiding
  // doesn't apply. Show all 5 fields unconditionally for that type.
  const visibleFields =
    isBusinessCard
      ? editorFields
      : livePreview && presentMarkers.size > 0
        ? editorFields.filter((f) => presentMarkers.has(f.key))
        : editorFields;

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
            <LivePreviewFrame
              // Business-card designs are prop-driven now — pass an
              // empty replacements list so the legacy DOM walker
              // doesn't fight the renderer for ownership of the text.
              replacements={isBusinessCard ? EMPTY_REPLACEMENTS : previewReplacements}
              markerTable={markerTable}
              onMarkers={setPresentMarkers}
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
            {visibleFields.length > 0 && (
              <RailGroup
                title="Content"
                hint="Type-specific text shown on this artifact."
                action={
                  <button
                    type="button"
                    className="bk-editor-group-reset"
                    onClick={() => setOverrides(getDefaultOverrides(templateType, brand))}
                    aria-label="Reset content"
                    title="Reset"
                  >
                    <RotateCcw size={12} aria-hidden />
                    <span>Reset</span>
                  </button>
                }
              >
                <div className="bk-editor-fields">
                  {visibleFields.map((field) => {
                    const Icon = field.icon;
                    const value = (overrides[field.key] as string | undefined) ?? '';
                    return (
                      <label key={field.key} className="bk-editor-field">
                        <span className="bk-editor-field-label">
                          <Icon size={12} aria-hidden />
                          {field.label}
                        </span>
                        <input
                          type={field.type ?? 'text'}
                          value={value}
                          onChange={(e) =>
                            setOverrides((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className="bk-editor-field-input"
                        />
                      </label>
                    );
                  })}
                </div>
              </RailGroup>
            )}

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
            ) : (
              <RailGroup title="Image" hint="Pick the cover for this card.">
                <div className="bk-editor-covers">
                  {target.covers.map((src) => {
                    const isSelected = selectedCover === src;
                    return (
                      <button
                        key={src}
                        type="button"
                        className={`bk-editor-cover${isSelected ? ' is-selected' : ''}`}
                        onClick={() => setSelectedCover(src)}
                        aria-pressed={isSelected}
                        aria-label="Select image"
                      >
                        <span
                          className="bk-editor-cover-thumb"
                          style={{ backgroundImage: `url(${src})` }}
                        />
                      </button>
                    );
                  })}
                </div>
              </RailGroup>
            )}

            {!isBrandAsset && (
            <RailGroup title="Colors" hint="Tap a swatch to recolor primary or secondary.">
              <div className="bk-editor-color-row">
                <span className="bk-editor-color-row-label">Primary</span>
                <div className="bk-editor-swatches">
                  {allColors.map((c) => (
                    <button
                      key={`p-${c.hex}-${c.name}`}
                      type="button"
                      className={`bk-editor-swatch${selectedColor === c.hex ? ' is-selected' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setSelectedColor(c.hex)}
                      title={`${c.name} — ${c.hex.toUpperCase()}`}
                      aria-pressed={selectedColor === c.hex}
                      aria-label={`Primary ${c.name} ${c.hex}`}
                    />
                  ))}
                </div>
              </div>
              <div className="bk-editor-color-row">
                <span className="bk-editor-color-row-label">Secondary</span>
                <div className="bk-editor-swatches">
                  {allColors.map((c) => (
                    <button
                      key={`s-${c.hex}-${c.name}`}
                      type="button"
                      className={`bk-editor-swatch${selectedSecondaryColor === c.hex ? ' is-selected' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setSelectedSecondaryColor(c.hex)}
                      title={`${c.name} — ${c.hex.toUpperCase()}`}
                      aria-pressed={selectedSecondaryColor === c.hex}
                      aria-label={`Secondary ${c.name} ${c.hex}`}
                    />
                  ))}
                </div>
              </div>
            </RailGroup>
            )}

            {!isBrandAsset && (
            <RailGroup
              title="Logos"
              hint="Choose a mark to drop on the artwork."
              action={
                <label className="bk-editor-toggle">
                  <ImageIcon size={12} aria-hidden />
                  <span className="bk-editor-toggle-label">Show Logo</span>
                  <button
                    type="button"
                    className={`bk-editor-toggle-switch${overrides.showLogo ? ' is-on' : ''}`}
                    role="switch"
                    aria-checked={!!overrides.showLogo}
                    onClick={() =>
                      setOverrides((prev) => ({ ...prev, showLogo: !prev.showLogo }))
                    }
                  >
                    <span className="bk-editor-toggle-knob" aria-hidden />
                  </button>
                </label>
              }
            >
              <div className="bk-editor-logos">
                {brand.logos.map((logo) => (
                  <button
                    key={logo.id}
                    type="button"
                    className={`bk-editor-logo${selectedLogoId === logo.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedLogoId(logo.id)}
                    aria-pressed={selectedLogoId === logo.id}
                    aria-label={`${logo.label} logo`}
                  >
                    <span
                      className="bk-editor-logo-thumb"
                      dangerouslySetInnerHTML={{ __html: logo.svg }}
                      aria-hidden
                    />
                    <span className="bk-editor-logo-label">{logo.label}</span>
                  </button>
                ))}
              </div>
              <div className="bk-editor-color-row" style={{ marginTop: 12 }}>
                <span className="bk-editor-color-row-label">Mark</span>
                <div className="bk-editor-swatches">
                  {allColors.map((c) => (
                    <button
                      key={`logo-${c.hex}-${c.name}`}
                      type="button"
                      className={`bk-editor-swatch${selectedLogoColor === c.hex ? ' is-selected' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setSelectedLogoColor(c.hex)}
                      title={`${c.name} — ${c.hex.toUpperCase()}`}
                      aria-pressed={selectedLogoColor === c.hex}
                      aria-label={`Logo color ${c.name} ${c.hex}`}
                    />
                  ))}
                </div>
              </div>
            </RailGroup>
            )}

            {!isBrandAsset && (
            <RailGroup title="Typography" hint="Pick a face for the body copy.">
              <div className="bk-editor-fonts">
                {brand.fonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`bk-editor-font${selectedFontId === font.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedFontId(font.id)}
                    aria-pressed={selectedFontId === font.id}
                  >
                    <span className="bk-editor-font-role">{font.role}</span>
                    <span
                      className="bk-editor-font-family"
                      style={{ fontFamily: `${font.family}, ${font.fallback ?? 'sans-serif'}` }}
                    >
                      {font.family}
                    </span>
                    <span className="bk-editor-font-weights">{font.weights}</span>
                  </button>
                ))}
              </div>
            </RailGroup>
            )}
          </div>
          <footer className="bk-editor-rail-footer">
            <button
              type="button"
              className="bk-editor-btn bk-editor-btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bk-editor-btn bk-editor-btn--secondary"
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
            </button>
            <button
              type="button"
              className="bk-editor-btn bk-editor-btn--primary"
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
                onSave(target);
              }}
            >
              Save
            </button>
          </footer>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Wraps the rendered template preview and stitches user content
 * overrides into it at the DOM level, so any renderer gets live
 * edits without modifying its hardcoded JSX.
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
 *  • While computing combined values, also detects which marker
 *    keys appear in the design — `onMarkers` reports the set up so
 *    the editor can hide fields the design doesn't actually show.
 *
 * Limits: a marker split across element boundaries (e.g.
 *   `<div>jane@<span>{slug}</span>.com</div>`) still won't match
 *   — that design keeps the literal output. Acceptable trade-off.
 */
function LivePreviewFrame({
  replacements,
  markerTable,
  onMarkers,
  aspect,
  fontFamily,
  showLogo,
  logoSrc,
  children,
}: {
  replacements: Array<[string, string]>;
  markerTable: Array<[keyof TemplateOverrides, string]>;
  onMarkers: (next: Set<keyof TemplateOverrides>) => void;
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
  // Track the last reported marker set so we don't trigger the
  // editor's setState when nothing changed (avoids an
  // effect-render-effect loop).
  const lastMarkersKey = useRef<string>('');

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let element = walker.nextNode() as Element | null;
    const present = new Set<keyof TemplateOverrides>();

    while (element) {
      const textChildren: Text[] = [];
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          textChildren.push(child as Text);
        }
      }

      if (textChildren.length > 0) {
        const combined = textChildren.map((t) => t.nodeValue ?? '').join('');

        // Detect markers from the combined original (before
        // substitution) so the editor can hide fields whose marker
        // doesn't appear in this design.
        for (const [key, marker] of markerTable) {
          if (marker && combined.includes(marker)) present.add(key);
        }

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

    const key = Array.from(present).sort().join(',');
    if (key !== lastMarkersKey.current) {
      lastMarkersKey.current = key;
      onMarkers(present);
    }
  });

  return (
    <div ref={ref} className="bk-editor-preview-frame">
      <ScalingStage aspect={aspect} fontFamily={fontFamily} showLogo={showLogo}>
        {children}
      </ScalingStage>
    </div>
  );
}

/**
 * Renders children at a fixed canonical width (360px) and scales
 * the whole subtree to fill the host. Renderers in this codebase
 * use absolute pixel sizes (`text-[4.5px]`, `text-[18px]`) sized for
 * a small drilldown card — without this stage the editor's much
 * larger preview makes every glyph look starved. Scaling preserves
 * the designer's pixel ratios at any preview size.
 */
function ScalingStage({
  aspect,
  fontFamily,
  showLogo,
  children,
}: {
  aspect: number;
  fontFamily: string | null;
  showLogo: boolean;
  children: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // 260 ≈ the drilldown card width the renderers were designed for.
  // At a 720px-wide editor preview the scale becomes ≈2.77×, so a
  // hardcoded text-[4.5px] glyph reads at ≈12.5px — comfortably
  // legible without losing the designer's intended pixel ratios.
  const BASE_WIDTH = 260;
  const baseHeight = BASE_WIDTH / aspect;

  useLayoutEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) return;
    const update = () => {
      const w = host.clientWidth;
      stage.style.transform = `scale(${w / BASE_WIDTH})`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const hostStyle: React.CSSProperties = { aspectRatio: `${aspect} / 1` };
  if (fontFamily) {
    (hostStyle as Record<string, string>)['--bk-preview-font'] = fontFamily;
  }

  return (
    <div
      ref={hostRef}
      className="bk-preview-host"
      data-font-override={fontFamily ? '' : undefined}
      data-hide-logo={!showLogo ? '' : undefined}
      style={hostStyle}
    >
      <div
        ref={stageRef}
        className="bk-preview-stage"
        style={{ width: BASE_WIDTH, height: baseHeight }}
      >
        {children}
      </div>
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
  /** Optional slot in the group header (right side) — used for
   *  Reset buttons on Content and toggles on Logos. */
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
