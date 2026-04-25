/**
 * Deck Director — turns a Brand into a DeckPlan.
 *
 * The director's job: read the brand's personality, palette, typography,
 * and asset inventory, then pick which slide archetypes to include and
 * which variant of each to render. Two brands with different character
 * should get decks that feel distinct even though they share the same
 * archetype vocabulary.
 *
 * Pure function. No React, no DOM, no storage. Feed it a brand, get a plan.
 */

import type { Brand } from '@/shared/types/brand';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import {
  luminance,
  cmykString,
  rgbString,
  hslString,
  hsvString,
  djb2,
  buildGoogleFontsUrl,
} from './utils';
import type {
  AssetInventory,
  BrandProfile,
  DeckMode,
  DeckPlan,
  PaletteAnalysis,
  SlidePick,
  Swatch,
} from './types';

/* ─────────────────────────  mode inference  ───────────────────────── */

export function inferMode(brand: Brand): DeckMode {
  const personality = (brand.guidelines?.strategy?.personality ?? [])
    .map((p) => p.toLowerCase())
    .join(' ');
  const tone = (brand.tone ?? '').toLowerCase();
  const blob = `${personality} ${tone}`;

  const scoreOf = (keywords: string[]) =>
    keywords.reduce((s, kw) => (blob.includes(kw) ? s + 1 : s), 0);

  const scores: Record<DeckMode, number> = {
    bold: scoreOf(['bold', 'loud', 'strong', 'confident', 'rebellious', 'energetic', 'disruptive']),
    editorial: scoreOf(['editorial', 'elegant', 'premium', 'sophisticated', 'refined', 'luxury', 'timeless']),
    technical: scoreOf(['technical', 'precise', 'data', 'analytical', 'technical', 'scientific', 'engineered', 'professional']),
    elegant: scoreOf(['elegant', 'minimal', 'clean', 'calm', 'serene', 'subtle', 'sophisticated']),
    playful: scoreOf(['playful', 'friendly', 'fun', 'vibrant', 'warm', 'quirky', 'approachable']),
  };

  // Fall back to palette-driven guess if no signals.
  let mode: DeckMode = 'editorial';
  let best = 0;
  (Object.keys(scores) as DeckMode[]).forEach((m) => {
    if (scores[m] > best) {
      best = scores[m];
      mode = m;
    }
  });

  if (best === 0) {
    // No personality signals — guess from palette.
    const primary = brand.colorSystem?.primary?.hex ?? brand.primaryColor ?? '#111111';
    const l = luminance(primary);
    if (l < 0.25) mode = 'editorial';
    else if (l > 0.7) mode = 'elegant';
    else mode = 'bold';
  }

  return mode;
}

/* ─────────────────────────  palette analysis  ───────────────────────── */

export function analyzePalette(brand: Brand): PaletteAnalysis {
  const primary =
    brand.colorSystem?.primary?.hex ??
    brand.primaryColor ??
    '#FA4F26';
  const secondary = brand.colorSystem?.secondary?.hex ?? brand.secondaryColor;
  const accent = brand.colorSystem?.accent?.hex ?? brand.accentColor;

  const primaryIsDark = luminance(primary) < 0.4;
  // Vibrancy heuristic: chroma proxy via rgb deltas.
  const pHex = primary.replace('#', '');
  const pr = parseInt(pHex.slice(0, 2) || '0', 16);
  const pg = parseInt(pHex.slice(2, 4) || '0', 16);
  const pb = parseInt(pHex.slice(4, 6) || '0', 16);
  const chroma = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);
  const isVibrant = chroma > 100;

  const swatches: Swatch[] = [];
  const pushSwatch = (hex: string | undefined, name: string, role: string) => {
    if (!hex) return;
    swatches.push({
      hex: hex.toUpperCase(),
      name,
      rgb: rgbString(hex),
      cmyk: cmykString(hex),
      hsv: hsvString(hex),
      hsl: hslString(hex),
      role,
    });
  };

  pushSwatch(primary, brand.colorSystem?.primary?.name ?? 'Primary', 'primary');
  pushSwatch(secondary, brand.colorSystem?.secondary?.name ?? 'Secondary', 'secondary');
  pushSwatch(accent, brand.colorSystem?.accent?.name ?? 'Accent', 'accent');

  const neutrals = brand.colorSystem?.neutrals ?? [];
  neutrals.slice(0, 3).forEach((n, i) => pushSwatch(n.hex, n.name ?? `Neutral ${i + 1}`, 'neutral'));

  // Always surface pure black + white so the palette slide has its foundations.
  if (!swatches.some((s) => s.hex === '#000000')) {
    pushSwatch('#000000', 'Obsidian', 'ink');
  }
  if (!swatches.some((s) => s.hex === '#FFFFFF')) {
    pushSwatch('#FFFFFF', 'Full White', 'paper');
  }

  return {
    primary: primary.toUpperCase(),
    secondary: secondary?.toUpperCase(),
    accent: accent?.toUpperCase(),
    swatches,
    primaryIsDark,
    isVibrant,
    paper: '#F6F3EE',
    ink: '#111111',
  };
}

/* ─────────────────────────  asset inventory  ───────────────────────── */

// Tags that mark an asset as a surface treatment (overlay/texture/etc.) rather
// than a hero photo. We never want these promoted into the hero pool — a 1px
// grain doesn't read as a product shot. Caught us when SKAM's grain.png ended
// up as the typography-slide hero.
const NON_HERO_TAGS = new Set([
  'texture',
  'grain',
  'overlay',
  'background',
  'pattern',
  'noise',
  'mask',
]);

function isHeroCandidate(name: string | undefined, tags: string[]): boolean {
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => NON_HERO_TAGS.has(t))) return false;
  const n = (name ?? '').toLowerCase();
  if (/\b(grain|texture|overlay|pattern|noise|mask)\b/.test(n)) return false;
  return true;
}

export function inventoryAssets(brand: Brand): AssetInventory {
  const logoPrimary = resolveBrandLogo(brand, 'primary')?.url;
  const logoWordmark = resolveBrandLogo(brand, 'wordmark')?.url ?? logoPrimary;
  const logoIconmark = resolveBrandLogo(brand, 'iconmark')?.url ?? logoPrimary;
  const logoWhite = resolveBrandLogo(brand, 'mono.white')?.url;
  const logoBlack = resolveBrandLogo(brand, 'mono.black')?.url;

  const images = (brand.brandAssets ?? []).filter(
    (a) => a.kind === 'image' && isHeroCandidate(a.name, a.tags ?? []),
  );
  const imageUrls = images
    .map((a) => {
      const fmt = a.formats;
      return fmt.jpg?.url ?? fmt.png?.url ?? fmt.webp?.url ?? undefined;
    })
    .filter((u): u is string => !!u);

  const portraits: string[] = [];
  const scenes: string[] = [];
  images.forEach((a) => {
    const tags = (a.tags ?? []).map((t) => t.toLowerCase());
    const name = (a.name ?? '').toLowerCase();
    const url =
      a.formats.jpg?.url ?? a.formats.png?.url ?? a.formats.webp?.url;
    if (!url) return;
    if (tags.includes('portrait') || tags.includes('person') || name.includes('portrait') || name.includes('person')) {
      portraits.push(url);
    } else if (tags.includes('scene') || tags.includes('lifestyle') || tags.includes('hero')) {
      scenes.push(url);
    }
  });

  // Legacy assets[] fallback
  if (imageUrls.length === 0 && brand.assets?.length) {
    brand.assets.forEach((a) => {
      if (a.type !== 'image' && a.type !== 'reference' && a.type !== 'video') return;
      if (!isHeroCandidate(a.name, a.tags ?? [])) return;
      if (a.url) imageUrls.push(a.url);
    });
  }

  return {
    logoPrimary,
    logoWordmark,
    logoIconmark,
    logoWhite,
    logoBlack,
    portraits,
    scenes,
    allImages: imageUrls,
  };
}

/* ─────────────────────────  brand profile  ───────────────────────── */

export function buildProfile(brand: Brand): BrandProfile {
  const mode = inferMode(brand);
  const palette = analyzePalette(brand);
  const assets = inventoryAssets(brand);

  const primaryFont =
    brand.typography?.primary?.family ??
    brand.fonts?.primary ??
    'Inter';
  const secondaryFont =
    brand.typography?.secondary?.family ??
    brand.fonts?.secondary ??
    primaryFont;
  const primaryWeights = brand.typography?.primary?.weights ?? [400, 700, 800, 900];
  const secondaryWeights = brand.typography?.secondary?.weights ?? [400, 500, 700];

  const fontUrl = buildGoogleFontsUrl([
    { family: primaryFont, weights: primaryWeights },
    ...(secondaryFont && secondaryFont !== primaryFont
      ? [{ family: secondaryFont, weights: secondaryWeights }]
      : []),
  ]);

  const strategy = brand.guidelines?.strategy;

  return {
    id: brand.id,
    name: brand.name || 'Brand',
    tagline:
      (strategy?.positioning as string | undefined) ??
      (brand.tone as string | undefined) ??
      'A brand with a point of view.',
    mission:
      strategy?.mission ??
      brand.strategy ??
      'Build something people will remember. Make the work that only you can make.',
    personality: strategy?.personality ?? [],
    typography: {
      headingFamily: primaryFont,
      bodyFamily: secondaryFont,
      headingWeight: 800,
      bodyWeight: 400,
      fontUrls: fontUrl ? [fontUrl] : [],
    },
    palette,
    assets,
    mode,
  };
}

/* ─────────────────────────  direction  ───────────────────────── */

const ARCHETYPE_ORDER = [
  'cover',
  'manifesto',
  'moodboard',
  'palette',
  'typography',
  'signature',
  'environmental',
  'digital',
  'stationery',
  'outdoor',
] as const;

/**
 * Pick variants for each archetype based on brand character. This is where
 * the deck stops being a stamp and starts being bespoke.
 */
export function directDeck(brand: Brand): DeckPlan {
  const profile = buildProfile(brand);
  const { mode, palette, assets } = profile;
  const hasPortrait = assets.portraits.length > 0;
  const hasAnyImage = assets.allImages.length > 0;

  const picks: SlidePick[] = ARCHETYPE_ORDER.map((archetype) => {
    const variant = pickVariant(archetype, mode, palette, hasPortrait, hasAnyImage);
    return { archetype, variant };
  });

  const signature = djb2(
    [
      brand.id,
      brand.updatedAt instanceof Date ? brand.updatedAt.toISOString() : String(brand.updatedAt ?? ''),
      palette.primary,
      mode,
      assets.logoPrimary ?? '',
    ].join('|'),
  );

  return {
    brandId: brand.id,
    mode,
    slides: picks,
    signature,
    generatedAt: new Date().toISOString(),
  };
}

function pickVariant(
  archetype: typeof ARCHETYPE_ORDER[number],
  mode: DeckMode,
  palette: PaletteAnalysis,
  hasPortrait: boolean,
  hasImage: boolean,
) {
  switch (archetype) {
    case 'cover':
      if (hasPortrait) return 'A';
      if (mode === 'bold') return 'C';
      if (mode === 'editorial' || mode === 'elegant') return 'D';
      return hasImage ? 'B' : 'C';
    case 'manifesto':
      if (mode === 'editorial' || mode === 'elegant') return 'C';
      if (mode === 'bold') return 'B';
      return 'A';
    case 'moodboard':
      if (palette.primaryIsDark || mode === 'bold') return 'A';
      if (mode === 'elegant' || mode === 'editorial') return 'B';
      return 'C';
    case 'palette':
      if (mode === 'technical' || mode === 'editorial') return 'A';
      if (mode === 'elegant') return 'B';
      return 'C';
    case 'typography':
      if (mode === 'editorial') return 'A';
      if (mode === 'bold' || mode === 'playful') return 'C';
      return 'B';
    case 'signature':
      if (mode === 'editorial' || mode === 'elegant') return 'D';
      if (mode === 'technical') return 'B';
      if (mode === 'playful') return 'C';
      return 'A';
    case 'environmental':
      if (mode === 'technical') return 'B';
      if (mode === 'playful') return 'C';
      return 'A';
    case 'digital':
      if (mode === 'playful') return 'B';
      if (mode === 'technical') return 'C';
      return 'A';
    case 'stationery':
      if (mode === 'elegant' || mode === 'editorial') return 'A';
      if (mode === 'technical') return 'B';
      return 'C';
    case 'outdoor':
      if (mode === 'bold') return 'A';
      if (mode === 'elegant') return 'C';
      return 'B';
  }
}
