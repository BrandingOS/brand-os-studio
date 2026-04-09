import type { Brand, BrandLogoAssets } from '@/shared/types/brand';

// ─── Color Utilities ───────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.179;
}

export function isDarkColor(hex: string): boolean {
  return !isLightColor(hex);
}

// ─── Logo Variant Rules ────────────────────────────────────────

export type LogoVariantType =
  | 'color-light'     // Color logo on white/light bg
  | 'color-dark'      // Color logo on dark bg (if logo has enough contrast)
  | 'white-on-brand'  // White logo on brand primary bg
  | 'white-on-dark'   // White logo on dark/black bg
  | 'white-on-accent' // White logo on accent color bg
  | 'black-on-light'  // Black logo on white/light bg
  | 'brand-on-light'  // Brand-color logo on white bg
  | 'mono-dark'       // Monochrome dark for print
  | 'mono-light'      // Monochrome light for reverse print
  | 'transparent'     // Transparent background
  | 'icon-only'       // Symbol/monogram only
  | 'wordmark-only'   // Typographic wordmark only
  | 'horizontal'      // Horizontal layout
  | 'stacked'         // Vertical/stacked layout
  | 'profile-circle'  // Circular profile/avatar
  | 'profile-square'  // Square profile/avatar
  | 'favicon'         // Small-size browser icon
  | 'app-icon';       // Rounded-square app icon

/**
 * High-level groups the UI organizes variants into. Each group answers a
 * different design question: "the canonical form" (master), "the safe
 * reductions" (monochrome), "on colored surfaces" (background), "shape for
 * this space" (configuration), and "for this product surface" (application).
 */
export type LogoVariantGroup =
  | 'master'
  | 'monochrome'
  | 'background'
  | 'configuration'
  | 'application';

/**
 * Describes the number of brand colors the variant system was generated
 * against. Drives which variants are produced and how they are labeled.
 */
export type BrandColorStrategy = 'single' | 'dual' | 'palette';

export interface BrandColorAnalysis {
  strategy: BrandColorStrategy;
  colorCount: number;
  colors: Array<{ hex: string; role: 'primary' | 'secondary' | 'accent'; name?: string }>;
  primary: string;
  secondary?: string;
  accent?: string;
}

/**
 * Inspects a Brand's color setup and decides which variant strategy
 * applies. 1 color = mono-heavy, 2 colors = dual system, 3+ = full palette
 * with reduced-palette fallbacks.
 */
export function analyzeBrandColors(brand: Brand): BrandColorAnalysis {
  const primary = brand.primaryColor;
  const secondary = brand.secondaryColor;
  const palette = brand.guidelines?.colorPalette;
  const accent = palette?.accent?.hex;

  const colors: BrandColorAnalysis['colors'] = [
    { hex: primary, role: 'primary', name: palette?.primary?.name },
  ];
  if (secondary && secondary.toLowerCase() !== primary.toLowerCase()) {
    colors.push({ hex: secondary, role: 'secondary', name: palette?.secondary?.name });
  }
  if (accent && accent.toLowerCase() !== primary.toLowerCase() && accent.toLowerCase() !== (secondary ?? '').toLowerCase()) {
    colors.push({ hex: accent, role: 'accent', name: palette?.accent?.name });
  }

  const colorCount = colors.length;
  const strategy: BrandColorStrategy =
    colorCount >= 3 ? 'palette' : colorCount === 2 ? 'dual' : 'single';

  return { strategy, colorCount, colors, primary, secondary, accent };
}

export interface LogoVariant {
  id: string;
  name: string;
  type: LogoVariantType;
  bgColor: string;
  logoSrc: string;
  logoFilter?: string;
  description: string;
  recommendedUse: string;
  isValid: boolean;
  contrastScore: number;
  warnings: string[];
  category: 'primary' | 'inverse' | 'monochrome' | 'accent';
  downloadFormats: string[];

  // ── Brand-aware metadata (optional — additive to keep existing
  // consumers such as brandkit-v2 LogoSection and bulkExport working
  // unchanged). See `generateLogoVariants` for how these are populated. ──

  /** High-level grouping for UI organization. */
  group?: LogoVariantGroup;
  /** Human-readable group label (matches `group` enum). */
  groupLabel?: string;
  /** Context tags: 'web', 'print', 'social', 'app', 'dark', 'light', etc. */
  tags?: string[];
  /** Which surface this variant is designed for. */
  bgCompatibility?: 'light' | 'dark' | 'brand' | 'any' | 'transparent';
  /** Preview aspect hint. */
  aspectHint?: 'horizontal' | 'stacked' | 'square' | 'auto';
  /** Minimum recommended render size in px. */
  minSize?: number;
  /** Suitable for print output (CMYK-safe, vector-first). */
  forPrint?: boolean;
  /** Suitable for digital output (web/app/social). */
  forDigital?: boolean;
  /** If this variant ideally uses a separate source asset, which one. */
  requiresSource?: keyof BrandLogoAssets;
  /** Whether an ideal source asset is present (false = falling back to main logo). */
  hasSourceAsset?: boolean;
  /** Sort priority within group (lower = first). */
  priority?: number;
  /** Which color strategy this variant is optimized for. 'all' = universal. */
  strategy?: BrandColorStrategy | 'all';
}

const WHITE_FILTER = 'brightness(0) invert(1)';
const BLACK_FILTER = 'brightness(0)';

/**
 * Brand-aware logo variant generator.
 *
 * Analyzes the brand's color strategy (1 / 2 / 3+ colors) and produces a
 * structured catalogue of variants grouped by purpose: master, monochrome,
 * background, configuration, and application. Each variant carries
 * background-compatibility metadata, usage tags, and source-asset
 * resolution from `brand.logoAssets`.
 */
export function generateLogoVariants(brand: Brand): LogoVariant[] {
  const logoSrc = brand.logo || '';
  if (!logoSrc) return [];

  const analysis = analyzeBrandColors(brand);
  const p = analysis.primary;
  const s = analysis.secondary;
  const accent = analysis.accent;
  const assets: BrandLogoAssets = brand.logoAssets || {};

  const hasIcon = !!assets.icon;
  const hasWordmark = !!assets.wordmark;
  const hasAlternate = !!assets.alternate;
  const hasLightAsset = !!assets.light;

  const whiteOnPrimary = contrastRatio('#FFFFFF', p);
  const primaryOnWhite = contrastRatio(p, '#FFFFFF');

  const variants: LogoVariant[] = [];

  // ── MASTER GROUP ───────────────────────────────────────────
  variants.push({
    id: 'primary-color',
    name: 'Primary Logo',
    type: 'color-light',
    bgColor: '#FFFFFF',
    logoSrc: assets.full || logoSrc,
    description: 'The canonical brand logo in full color on white.',
    recommendedUse: 'Default usage — web, documents, marketing on light surfaces.',
    isValid: true,
    contrastScore: primaryOnWhite,
    warnings: primaryOnWhite < 2 ? ['Primary color is very close to white — the mark may appear ghosted.'] : [],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG', 'PDF'],
    group: 'master',
    groupLabel: 'Master',
    tags: ['web', 'print', 'light'],
    bgCompatibility: 'light',
    aspectHint: 'auto',
    forPrint: true,
    forDigital: true,
    hasSourceAsset: true,
    priority: 1,
    strategy: 'all',
  });

  variants.push({
    id: 'primary-transparent',
    name: 'Primary Transparent',
    type: 'transparent',
    bgColor: 'transparent',
    logoSrc: assets.full || logoSrc,
    description: 'Full-color master with a transparent background for layered compositions.',
    recommendedUse: 'Overlays, watermarks, photography, slides where background varies.',
    isValid: true,
    contrastScore: 0,
    warnings: ['Contrast depends on placement surface — verify before use.'],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'master',
    groupLabel: 'Master',
    tags: ['web', 'social', 'transparent'],
    bgCompatibility: 'transparent',
    aspectHint: 'auto',
    forDigital: true,
    forPrint: false,
    hasSourceAsset: true,
    priority: 2,
    strategy: 'all',
  });

  variants.push({
    id: 'primary-neutral',
    name: 'On Neutral Surface',
    type: 'color-light',
    bgColor: '#F4F4F5',
    logoSrc: assets.full || logoSrc,
    description: 'Full-color master on a neutral gray surface for soft panels and cards.',
    recommendedUse: 'Cards, neutral sections, subtle secondary placements.',
    isValid: contrastRatio(p, '#F4F4F5') >= 2.5,
    contrastScore: contrastRatio(p, '#F4F4F5'),
    warnings: contrastRatio(p, '#F4F4F5') < 2.5
      ? ['Brand color is close to neutral gray — verify legibility or prefer the Primary on White.']
      : [],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'master',
    groupLabel: 'Master',
    tags: ['web', 'light'],
    bgCompatibility: 'light',
    aspectHint: 'auto',
    forDigital: true,
    forPrint: false,
    hasSourceAsset: true,
    priority: 3,
    strategy: 'all',
  });

  if (analysis.strategy === 'palette') {
    variants.push({
      id: 'reduced-palette',
      name: 'Reduced Palette',
      type: 'color-light',
      bgColor: '#FFFFFF',
      logoSrc: assets.full || logoSrc,
      description: 'Simplified two-color reduction for constrained reproduction.',
      recommendedUse: 'Spot-color print, one-color-plus-accent environments, merchandise.',
      isValid: true,
      contrastScore: primaryOnWhite,
      warnings: ['Best produced from a dedicated two-color master — treat this as a guideline.'],
      category: 'primary',
      downloadFormats: ['SVG', 'PNG', 'PDF'],
      group: 'master',
      groupLabel: 'Master',
      tags: ['print', 'spot-color', 'light'],
      bgCompatibility: 'light',
      aspectHint: 'auto',
      forPrint: true,
      forDigital: false,
      hasSourceAsset: false,
      priority: 4,
      strategy: 'palette',
    });
  }

  // ── MONOCHROME GROUP ───────────────────────────────────────
  variants.push({
    id: 'black-version',
    name: 'Black Version',
    type: 'black-on-light',
    bgColor: '#FFFFFF',
    logoSrc: assets.dark || assets.full || logoSrc,
    logoFilter: assets.dark ? undefined : BLACK_FILTER,
    description: 'Single-color black rendition — the purest monochrome form.',
    recommendedUse: 'Print, newspapers, fax, embossing, stamps, legal documents.',
    isValid: true,
    contrastScore: 21,
    warnings: [],
    category: 'monochrome',
    downloadFormats: ['SVG', 'PNG', 'PDF'],
    group: 'monochrome',
    groupLabel: 'Monochrome',
    tags: ['print', 'light', 'mono'],
    bgCompatibility: 'light',
    aspectHint: 'auto',
    forPrint: true,
    forDigital: true,
    requiresSource: 'dark',
    hasSourceAsset: !!assets.dark,
    priority: 1,
    strategy: 'all',
  });

  variants.push({
    id: 'white-version',
    name: 'White Version',
    type: 'mono-light',
    bgColor: '#0A0A0F',
    logoSrc: assets.light || assets.full || logoSrc,
    logoFilter: hasLightAsset ? undefined : WHITE_FILTER,
    description: 'Single-color white rendition for dark surfaces and reversed print.',
    recommendedUse: 'Dark UI, photo overlays, reversed print, merchandise on dark fabric.',
    isValid: true,
    contrastScore: contrastRatio('#FFFFFF', '#0A0A0F'),
    warnings: [],
    category: 'monochrome',
    downloadFormats: ['SVG', 'PNG', 'PDF'],
    group: 'monochrome',
    groupLabel: 'Monochrome',
    tags: ['print', 'dark', 'mono', 'social'],
    bgCompatibility: 'dark',
    aspectHint: 'auto',
    forPrint: true,
    forDigital: true,
    requiresSource: 'light',
    hasSourceAsset: hasLightAsset,
    priority: 2,
    strategy: 'all',
  });

  variants.push({
    id: 'inverse',
    name: 'Inverse Logo',
    type: 'white-on-dark',
    bgColor: '#111111',
    logoSrc: assets.light || assets.full || logoSrc,
    logoFilter: hasLightAsset ? undefined : WHITE_FILTER,
    description: 'Reversed treatment tuned for dark-mode and low-light contexts.',
    recommendedUse: 'Dark-mode apps, video outros, evening marketing, dark websites.',
    isValid: true,
    contrastScore: contrastRatio('#FFFFFF', '#111111'),
    warnings: [],
    category: 'inverse',
    downloadFormats: ['SVG', 'PNG', 'PDF'],
    group: 'monochrome',
    groupLabel: 'Monochrome',
    tags: ['web', 'dark', 'ui'],
    bgCompatibility: 'dark',
    aspectHint: 'auto',
    forDigital: true,
    forPrint: false,
    hasSourceAsset: hasLightAsset,
    priority: 3,
    strategy: 'all',
  });

  // ── BACKGROUND / INVERSE GROUP ─────────────────────────────
  variants.push({
    id: 'on-brand-primary',
    name: 'On Brand Primary',
    type: 'white-on-brand',
    bgColor: p,
    logoSrc: assets.light || assets.full || logoSrc,
    logoFilter: hasLightAsset ? undefined : WHITE_FILTER,
    description: `White logo on ${brand.name}'s primary brand color.`,
    recommendedUse: 'Hero sections, branded surfaces, social covers, campaign pages.',
    isValid: whiteOnPrimary >= 3,
    contrastScore: whiteOnPrimary,
    warnings: whiteOnPrimary < 3
      ? ['Low contrast — white on this brand color may not read clearly. Prefer the Black Version on a tinted surface instead.']
      : [],
    category: 'inverse',
    downloadFormats: ['SVG', 'PNG', 'PDF'],
    group: 'background',
    groupLabel: 'On Backgrounds',
    tags: ['web', 'social', 'brand'],
    bgCompatibility: 'brand',
    aspectHint: 'auto',
    forDigital: true,
    forPrint: true,
    hasSourceAsset: true,
    priority: 1,
    strategy: 'all',
  });

  if (s) {
    const sIsDark = isDarkColor(s);
    const fgOnS = sIsDark ? '#FFFFFF' : '#000000';
    const cr = contrastRatio(fgOnS, s);
    variants.push({
      id: 'on-brand-secondary',
      name: 'On Secondary',
      type: 'white-on-brand',
      bgColor: s,
      logoSrc: sIsDark ? (assets.light || assets.full || logoSrc) : (assets.dark || assets.full || logoSrc),
      logoFilter: sIsDark
        ? (hasLightAsset ? undefined : WHITE_FILTER)
        : (assets.dark ? undefined : BLACK_FILTER),
      description: `Logo on ${brand.name}'s secondary color — auto-adapted for contrast.`,
      recommendedUse: 'Accent surfaces, seasonal campaigns, dual-tone layouts.',
      isValid: cr >= 3,
      contrastScore: cr,
      warnings: cr < 3 ? ['Low contrast on secondary color — verify legibility before use.'] : [],
      category: 'accent',
      downloadFormats: ['SVG', 'PNG', 'PDF'],
      group: 'background',
      groupLabel: 'On Backgrounds',
      tags: ['web', 'social', 'accent'],
      bgCompatibility: 'brand',
      aspectHint: 'auto',
      forDigital: true,
      forPrint: true,
      hasSourceAsset: true,
      priority: 2,
      strategy: 'dual',
    });
  }

  if (accent) {
    const aIsDark = isDarkColor(accent);
    const fgOnA = aIsDark ? '#FFFFFF' : '#000000';
    const cr = contrastRatio(fgOnA, accent);
    variants.push({
      id: 'on-accent',
      name: 'On Accent',
      type: 'white-on-accent',
      bgColor: accent,
      logoSrc: aIsDark ? (assets.light || assets.full || logoSrc) : (assets.dark || assets.full || logoSrc),
      logoFilter: aIsDark
        ? (hasLightAsset ? undefined : WHITE_FILTER)
        : (assets.dark ? undefined : BLACK_FILTER),
      description: 'Logo on the accent color from the extended palette.',
      recommendedUse: 'Highlight moments, call-outs, promotional surfaces.',
      isValid: cr >= 3,
      contrastScore: cr,
      warnings: cr < 3 ? ['Low contrast on accent — use sparingly.'] : [],
      category: 'accent',
      downloadFormats: ['SVG', 'PNG'],
      group: 'background',
      groupLabel: 'On Backgrounds',
      tags: ['web', 'accent'],
      bgCompatibility: 'brand',
      aspectHint: 'auto',
      forDigital: true,
      forPrint: false,
      hasSourceAsset: true,
      priority: 3,
      strategy: 'palette',
    });
  }

  variants.push({
    id: 'on-dark',
    name: 'On Dark Surface',
    type: 'white-on-dark',
    bgColor: '#0A0A0F',
    logoSrc: assets.light || assets.full || logoSrc,
    logoFilter: hasLightAsset ? undefined : WHITE_FILTER,
    description: 'Logo on a near-black surface for dark UI and keynote contexts.',
    recommendedUse: 'Dark mode, video intros/outros, dark keynote slides.',
    isValid: true,
    contrastScore: contrastRatio('#FFFFFF', '#0A0A0F'),
    warnings: [],
    category: 'inverse',
    downloadFormats: ['SVG', 'PNG'],
    group: 'background',
    groupLabel: 'On Backgrounds',
    tags: ['web', 'dark'],
    bgCompatibility: 'dark',
    aspectHint: 'auto',
    forDigital: true,
    forPrint: false,
    hasSourceAsset: true,
    priority: 4,
    strategy: 'all',
  });

  variants.push({
    id: 'on-light-tint',
    name: 'On Light Tint',
    type: 'color-light',
    bgColor: tintedLight(p),
    logoSrc: assets.full || logoSrc,
    description: 'Full-color master on a whisper of brand-tinted surface.',
    recommendedUse: 'Soft branded sections, empty states, welcoming hero panels.',
    isValid: contrastRatio(p, tintedLight(p)) >= 2.5,
    contrastScore: contrastRatio(p, tintedLight(p)),
    warnings: [],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'background',
    groupLabel: 'On Backgrounds',
    tags: ['web', 'light', 'brand'],
    bgCompatibility: 'light',
    aspectHint: 'auto',
    forDigital: true,
    forPrint: false,
    hasSourceAsset: true,
    priority: 5,
    strategy: 'all',
  });

  // ── CONFIGURATION GROUP ────────────────────────────────────
  variants.push({
    id: 'horizontal',
    name: 'Horizontal Layout',
    type: 'horizontal',
    bgColor: '#FFFFFF',
    logoSrc: assets.alternate || assets.full || logoSrc,
    description: 'Horizontal (side-by-side) layout tuned for wide containers.',
    recommendedUse: 'Website headers, email signatures, banners, horizontal nav bars.',
    isValid: true,
    contrastScore: primaryOnWhite,
    warnings: hasAlternate
      ? []
      : ['Using the master logo as a fallback — upload a dedicated horizontal asset under Brand Settings → Logo Assets for best results.'],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'configuration',
    groupLabel: 'Configurations',
    tags: ['web', 'email', 'horizontal'],
    bgCompatibility: 'light',
    aspectHint: 'horizontal',
    forDigital: true,
    forPrint: true,
    requiresSource: 'alternate',
    hasSourceAsset: hasAlternate,
    priority: 1,
    strategy: 'all',
  });

  variants.push({
    id: 'stacked',
    name: 'Stacked Layout',
    type: 'stacked',
    bgColor: '#FFFFFF',
    logoSrc: assets.alternate || assets.full || logoSrc,
    description: 'Vertical (stacked) layout tuned for narrow or square containers.',
    recommendedUse: 'Social profiles, posters, narrow cards, signage.',
    isValid: true,
    contrastScore: primaryOnWhite,
    warnings: hasAlternate
      ? []
      : ['Using the master logo as a fallback — upload a dedicated stacked asset for best results.'],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'configuration',
    groupLabel: 'Configurations',
    tags: ['social', 'print', 'stacked'],
    bgCompatibility: 'light',
    aspectHint: 'stacked',
    forDigital: true,
    forPrint: true,
    requiresSource: 'alternate',
    hasSourceAsset: hasAlternate,
    priority: 2,
    strategy: 'all',
  });

  variants.push({
    id: 'icon-only',
    name: 'Icon Only',
    type: 'icon-only',
    bgColor: '#FFFFFF',
    logoSrc: assets.icon || logoSrc,
    description: 'Symbol or monogram without the wordmark — for compact spaces.',
    recommendedUse: 'Favicons, app icons, social avatars, compact nav, embroidery.',
    isValid: hasIcon,
    contrastScore: primaryOnWhite,
    warnings: hasIcon
      ? []
      : ['No dedicated icon asset uploaded — upload one under Brand Settings → Logo Assets. Full logos lose clarity at small sizes.'],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'configuration',
    groupLabel: 'Configurations',
    tags: ['app', 'social', 'small'],
    bgCompatibility: 'light',
    aspectHint: 'square',
    minSize: 16,
    forDigital: true,
    forPrint: true,
    requiresSource: 'icon',
    hasSourceAsset: hasIcon,
    priority: 3,
    strategy: 'all',
  });

  variants.push({
    id: 'wordmark-only',
    name: 'Wordmark Only',
    type: 'wordmark-only',
    bgColor: '#FFFFFF',
    logoSrc: assets.wordmark || logoSrc,
    description: 'Typographic wordmark without the icon or symbol.',
    recommendedUse: 'Editorial layouts, signatures, typographic contexts.',
    isValid: hasWordmark,
    contrastScore: primaryOnWhite,
    warnings: hasWordmark
      ? []
      : ['No dedicated wordmark asset uploaded — upload one under Brand Settings → Logo Assets.'],
    category: 'primary',
    downloadFormats: ['SVG', 'PNG'],
    group: 'configuration',
    groupLabel: 'Configurations',
    tags: ['editorial', 'print', 'horizontal'],
    bgCompatibility: 'light',
    aspectHint: 'horizontal',
    forDigital: true,
    forPrint: true,
    requiresSource: 'wordmark',
    hasSourceAsset: hasWordmark,
    priority: 4,
    strategy: 'all',
  });

  // ── APPLICATION GROUP ──────────────────────────────────────
  const profileUsesWhite = whiteOnPrimary >= 3;
  variants.push({
    id: 'profile-picture',
    name: 'Profile Picture',
    type: 'profile-circle',
    bgColor: profileUsesWhite ? p : '#FFFFFF',
    logoSrc: assets.icon || assets.full || logoSrc,
    logoFilter: profileUsesWhite ? (hasLightAsset ? undefined : WHITE_FILTER) : undefined,
    description: 'Square-format profile picture — auto-optimized for contrast.',
    recommendedUse: 'X/Twitter, LinkedIn, Instagram, Facebook, Slack avatars.',
    isValid: true,
    contrastScore: profileUsesWhite ? whiteOnPrimary : primaryOnWhite,
    warnings: !hasIcon
      ? ['Upload a dedicated icon asset for sharper profile pictures.']
      : [],
    category: 'accent',
    downloadFormats: ['PNG'],
    group: 'application',
    groupLabel: 'Applications',
    tags: ['social', 'avatar', 'app'],
    bgCompatibility: profileUsesWhite ? 'brand' : 'light',
    aspectHint: 'square',
    minSize: 400,
    forDigital: true,
    forPrint: false,
    requiresSource: 'icon',
    hasSourceAsset: hasIcon,
    priority: 1,
    strategy: 'all',
  });

  variants.push({
    id: 'favicon',
    name: 'Favicon',
    type: 'favicon',
    bgColor: '#FFFFFF',
    logoSrc: assets.icon || logoSrc,
    description: 'Small-size mark for browser tabs and bookmarks.',
    recommendedUse: 'Browser favicon, PWA icon, bookmark icon — export at 16/32/48px.',
    isValid: true,
    contrastScore: primaryOnWhite,
    warnings: !hasIcon
      ? ['Full logos lose clarity at 16px — upload a dedicated icon asset for sharper favicons.']
      : [],
    category: 'accent',
    downloadFormats: ['PNG', 'SVG'],
    group: 'application',
    groupLabel: 'Applications',
    tags: ['web', 'small', 'app'],
    bgCompatibility: 'light',
    aspectHint: 'square',
    minSize: 16,
    forDigital: true,
    forPrint: false,
    requiresSource: 'icon',
    hasSourceAsset: hasIcon,
    priority: 2,
    strategy: 'all',
  });

  variants.push({
    id: 'app-icon',
    name: 'App Icon',
    type: 'app-icon',
    bgColor: p,
    logoSrc: assets.icon || assets.full || logoSrc,
    logoFilter: profileUsesWhite ? (hasLightAsset ? undefined : WHITE_FILTER) : undefined,
    description: 'Rounded-square format for iOS / Android app icons.',
    recommendedUse: 'iOS app icon, Android launcher, PWA home-screen icon (1024×1024).',
    isValid: true,
    contrastScore: profileUsesWhite ? whiteOnPrimary : primaryOnWhite,
    warnings: profileUsesWhite ? [] : ['Brand color may not carry a white mark — review the Profile Picture variant first.'],
    category: 'accent',
    downloadFormats: ['PNG'],
    group: 'application',
    groupLabel: 'Applications',
    tags: ['app', 'ios', 'android'],
    bgCompatibility: 'brand',
    aspectHint: 'square',
    minSize: 1024,
    forDigital: true,
    forPrint: false,
    requiresSource: 'icon',
    hasSourceAsset: hasIcon,
    priority: 3,
    strategy: 'all',
  });

  variants.push({
    id: 'print-master',
    name: 'Print Master',
    type: 'color-light',
    bgColor: '#FFFFFF',
    logoSrc: assets.full || logoSrc,
    description: 'Print-ready vector export with full color fidelity on white.',
    recommendedUse: 'Offset/digital print, business cards, stationery, brochures.',
    isValid: true,
    contrastScore: primaryOnWhite,
    warnings: [],
    category: 'primary',
    downloadFormats: ['SVG', 'PDF'],
    group: 'application',
    groupLabel: 'Applications',
    tags: ['print', 'cmyk'],
    bgCompatibility: 'light',
    aspectHint: 'auto',
    forPrint: true,
    forDigital: false,
    hasSourceAsset: true,
    priority: 4,
    strategy: 'all',
  });

  return variants;
}

/** Returns a lightly-tinted background color derived from the brand primary. */
function tintedLight(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // Mix with white at 92% white / 8% brand
  const mix = (c: number) => Math.round(c * 0.08 + 255 * 0.92);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// ─── Profile Icon Rules ────────────────────────────────────────

export interface ProfileIconConfig {
  logoSrc: string;
  bgColor: string;
  logoFilter?: string;
  padding: string;
  shape: 'circle' | 'rounded-square';
  isValid: boolean;
  warning?: string;
}

export function getProfileIconConfig(brand: Brand): ProfileIconConfig[] {
  const p = brand.primaryColor;
  const hasLogo = !!brand.logo;

  if (!hasLogo) {
    return [{
      logoSrc: '',
      bgColor: p,
      padding: '25%',
      shape: 'circle',
      isValid: true,
    }];
  }

  const configs: ProfileIconConfig[] = [
    // Brand color bg + white logo
    {
      logoSrc: brand.logo!,
      bgColor: p,
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'circle',
      isValid: contrastRatio('#FFFFFF', p) >= 3,
      warning: contrastRatio('#FFFFFF', p) < 3 ? 'Low contrast' : undefined,
    },
    // White bg + color logo
    {
      logoSrc: brand.logo!,
      bgColor: '#FFFFFF',
      padding: '20%',
      shape: 'circle',
      isValid: true,
    },
    // Dark bg + white logo
    {
      logoSrc: brand.logo!,
      bgColor: '#0A0A0F',
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'circle',
      isValid: true,
    },
    // Brand color bg + white logo (square)
    {
      logoSrc: brand.logo!,
      bgColor: p,
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'rounded-square',
      isValid: contrastRatio('#FFFFFF', p) >= 3,
    },
    // White bg (square)
    {
      logoSrc: brand.logo!,
      bgColor: '#FFFFFF',
      padding: '20%',
      shape: 'rounded-square',
      isValid: true,
    },
    // Dark bg (square)
    {
      logoSrc: brand.logo!,
      bgColor: '#0A0A0F',
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'rounded-square',
      isValid: true,
    },
  ];

  return configs.filter(c => c.isValid);
}

// ─── Brand Validation ──────────────────────────────────────────

export interface BrandValidationResult {
  isValid: boolean;
  issues: BrandIssue[];
  score: number; // 0-100
}

export interface BrandIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

export function validateBrand(brand: Brand): BrandValidationResult {
  const issues: BrandIssue[] = [];

  // Logo checks
  if (!brand.logo) {
    issues.push({ severity: 'warning', field: 'logo', message: 'No logo uploaded — using text fallback' });
  }

  // Color checks
  if (!brand.primaryColor) {
    issues.push({ severity: 'error', field: 'primaryColor', message: 'Primary brand color is missing' });
  }

  if (brand.primaryColor && brand.secondaryColor) {
    const cr = contrastRatio(brand.primaryColor, brand.secondaryColor);
    if (cr < 1.5) {
      issues.push({ severity: 'warning', field: 'colors', message: 'Primary and secondary colors are too similar — may cause confusion' });
    }
  }

  // White text on primary
  if (brand.primaryColor) {
    const whiteOnPrimary = contrastRatio('#FFFFFF', brand.primaryColor);
    if (whiteOnPrimary < 3) {
      issues.push({ severity: 'warning', field: 'primaryColor', message: `White text on primary color has low contrast (${whiteOnPrimary.toFixed(1)}:1) — inverse logos may not be visible` });
    }
  }

  // Typography checks
  if (!brand.fonts?.primary) {
    issues.push({ severity: 'warning', field: 'fonts', message: 'No primary font selected' });
  }

  // Name checks
  if (!brand.name || brand.name.length < 2) {
    issues.push({ severity: 'error', field: 'name', message: 'Brand name is too short or missing' });
  }

  // Score calculation
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 25 - warningCount * 10);

  return {
    isValid: errorCount === 0,
    issues,
    score,
  };
}

// ─── Safe Logo Selection ───────────────────────────────────────

export function getSafeLogoForBackground(brand: Brand, bgColor: string): { filter?: string; warning?: string } {
  if (!brand.logo) return {};

  const bgIsLight = isLightColor(bgColor);
  const brandColorLuminance = relativeLuminance(brand.primaryColor);

  if (bgIsLight) {
    // Light background — use original color logo (should be dark/vivid enough)
    const cr = contrastRatio(brand.primaryColor, bgColor);
    if (cr < 2) {
      return { filter: 'grayscale(1) brightness(0)', warning: 'Logo color too similar to background — using black version' };
    }
    return {};
  } else {
    // Dark background — use white version
    return { filter: 'brightness(0) invert(1)' };
  }
}
