/**
 * Brand Token Resolver
 * ─────────────────────────────────────────────────────────────────────────
 * Pure, deterministic transform from a `Brand` record into a normalized
 * `BrandTokens` object. Every generation path (templates, prompts, copy
 * binding) consumes BrandTokens — never the raw `Brand` — so that one
 * brand reliably yields one identity across every output type.
 *
 * If a Brand is missing pieces (no secondary color, no guidelines), the
 * resolver fills in safe, consistency-preserving defaults rather than
 * randomizing per-call.
 */
import type { Brand } from '@/shared/types/brand';
import { hasLogo } from '@/shared/brand/logoUrl';
import {
  hexToHsl,
  hslToHex,
  getColorInfo,
  checkContrast,
} from '@/shared/color/colorEngine';

function isLightColor(hex: string): boolean {
  try {
    return getColorInfo(hex).isLight;
  } catch {
    return true;
  }
}

function contrastRatio(fg: string, bg: string): number {
  try {
    return checkContrast(fg, bg).ratio;
  } catch {
    return 1;
  }
}

export interface BrandTokens {
  brandId: string;
  brandName: string;
  slug: string;

  /** Color tokens — every UI surface should pick from here, never invent hex. */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;       // page/card background
    surfaceMuted: string;  // alternating zones
    foreground: string;    // body text on `surface`
    foregroundMuted: string;
    onPrimary: string;     // text on `primary` swatch
    onSecondary: string;
    onAccent: string;
    border: string;
  };

  /** Typography tokens — family + sensible scale derived from Brand.fonts. */
  typography: {
    headingFamily: string;
    bodyFamily: string;
    headingWeight: number;
    bodyWeight: number;
    /** Display scale tokens in `rem` — used by templates for visual rhythm. */
    scale: {
      display: string;
      h1: string;
      h2: string;
      h3: string;
      body: string;
      caption: string;
    };
    letterSpacingHeading: string;
    letterSpacingBody: string;
  };

  /** UI/layout tokens — radius, spacing, density. */
  ui: {
    radius: string;            // "0.75rem"
    radiusLarge: string;       // bigger surfaces
    radiusSmall: string;       // chips, tags
    shadow: string;            // box-shadow
    density: 'cozy' | 'compact' | 'airy';
  };

  /** Logo logic — which logo to use on which background. */
  logo: {
    full?: string;
    icon?: string;
    light?: string;
    dark?: string;
    /** Best logo URL given a background hex. May be undefined if no logo. */
    pickFor(bg: string): string | undefined;
  };

  /** Voice / personality / mood — used by both prompts and template captions. */
  voice: {
    tone: string;
    audience: string;
    personality: string[];
    descriptors: string[];
    /** Compact prompt-safe one-liner: "warm, premium, confident". */
    moodLine: string;
    /** Things to avoid in copy and visuals. */
    avoid: string[];
  };

  /** Strategy excerpts (mission/vision/positioning), if available. */
  strategy: {
    mission?: string;
    vision?: string;
    positioning?: string;
    values: string[];
  };

  /** Completeness signal — used by the UI to surface missing pieces. */
  completeness: {
    score: number;       // 0..1
    missing: string[];   // human-readable list
  };
}

const DEFAULT_HEADING_FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';
const DEFAULT_BODY_FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

/** Pick a readable text color (black or white) given an arbitrary background. */
function readableOn(bg: string): string {
  return isLightColor(bg) ? '#0B0B0F' : '#FFFFFF';
}

/** Shift lightness while preserving hue/saturation. */
function shiftLightness(hex: string, deltaL: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + deltaL)));
}

/** Generate a complementary accent if the brand only has a primary color. */
function deriveAccent(primary: string, secondary?: string): string {
  if (secondary && secondary !== primary) return secondary;
  const { h, s, l } = hexToHsl(primary);
  // 30° hue shift toward orange/teal; bump saturation slightly.
  return hslToHex((h + 30) % 360, Math.min(100, s + 10), Math.min(80, Math.max(40, l)));
}

function deriveSecondary(primary: string, secondary?: string): string {
  if (secondary && secondary !== primary) return secondary;
  // Choose a near-complement with reduced saturation for stable pairing.
  const { h, s, l } = hexToHsl(primary);
  return hslToHex((h + 180) % 360, Math.max(20, s - 30), l);
}

function deriveSurface(primary: string): { surface: string; surfaceMuted: string; foreground: string; foregroundMuted: string; border: string } {
  // Brand surfaces stay neutral so templates feel like a system, not a
  // tinted demo. Tinted variants exist as accents, not as the page bg.
  const surface = '#FFFFFF';
  const surfaceMuted = '#F6F6F8';
  const foreground = '#0B0B0F';
  const foregroundMuted = '#5B5B66';
  // Subtle hint of the brand in the border so cards still feel branded.
  const border = shiftLightness(primary, 35) + '33'; // hex8 alpha
  return { surface, surfaceMuted, foreground, foregroundMuted, border };
}

function pickHeadingFont(brand: Brand): string {
  const f = brand.fonts?.primary?.trim();
  if (!f) return DEFAULT_HEADING_FONT;
  return `${f}, ${DEFAULT_HEADING_FONT}`;
}

function pickBodyFont(brand: Brand): string {
  const f = brand.fonts?.secondary?.trim() || brand.fonts?.primary?.trim();
  if (!f) return DEFAULT_BODY_FONT;
  return `${f}, ${DEFAULT_BODY_FONT}`;
}

function buildVoice(brand: Brand): BrandTokens['voice'] {
  const personality = brand.guidelines?.strategy?.personality?.length
    ? brand.guidelines.strategy.personality
    : deriveDescriptorsFromTone(brand.tone);
  const descriptors = Array.from(new Set([
    ...personality,
    ...descriptorsFromAudience(brand.audience),
  ])).filter(Boolean).slice(0, 6);
  const moodLine = descriptors.slice(0, 4).join(', ');
  const voice = brand.guidelines?.voiceAndTone;
  const avoid = voice?.doAndDonts?.dont?.length
    ? voice.doAndDonts.dont
    : ['cliches', 'generic stock-photo language', 'random emoji', 'vague jargon'];
  return {
    tone: brand.tone || 'professional, modern',
    audience: brand.audience || 'general professionals',
    personality,
    descriptors,
    moodLine,
    avoid,
  };
}

function deriveDescriptorsFromTone(tone?: string): string[] {
  if (!tone) return ['modern', 'confident', 'clear'];
  return tone
    .split(/[,;/&]+|\s+and\s+/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

function descriptorsFromAudience(audience?: string): string[] {
  if (!audience) return [];
  const a = audience.toLowerCase();
  const out: string[] = [];
  if (a.includes('luxury') || a.includes('premium')) out.push('premium');
  if (a.includes('developer') || a.includes('engineer') || a.includes('tech')) out.push('precise');
  if (a.includes('creative') || a.includes('design')) out.push('expressive');
  if (a.includes('startup') || a.includes('founder')) out.push('ambitious');
  if (a.includes('enterprise')) out.push('institutional');
  return out;
}

function computeCompleteness(brand: Brand): { score: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ['logo', hasLogo(brand) || hasLogo(brand, 'iconmark')],
    ['primary color', Boolean(brand.primaryColor)],
    ['secondary color', Boolean(brand.secondaryColor)],
    ['primary font', Boolean(brand.fonts?.primary)],
    ['secondary font', Boolean(brand.fonts?.secondary)],
    ['tone of voice', Boolean(brand.tone)],
    ['target audience', Boolean(brand.audience)],
    ['strategy / mission', Boolean(brand.strategy || brand.guidelines?.strategy?.mission)],
  ];
  const passed = checks.filter(([, v]) => v).length;
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  return { score: passed / checks.length, missing };
}

export function resolveBrandTokens(brand: Brand): BrandTokens {
  const primary = brand.primaryColor || '#111111';
  const secondary = deriveSecondary(primary, brand.secondaryColor);
  const accent = deriveAccent(primary, brand.secondaryColor);
  const { surface, surfaceMuted, foreground, foregroundMuted, border } = deriveSurface(primary);

  const onPrimary = readableOn(primary);
  const onSecondary = readableOn(secondary);
  const onAccent = readableOn(accent);

  const headingFamily = pickHeadingFont(brand);
  const bodyFamily = pickBodyFont(brand);

  // Pick logo by background: if the bg is dark, prefer light/full(white) logo.
  const logoAssets = brand.logoAssets || {};
  const fallbackLogo = brand.logo || logoAssets.full;
  const logo: BrandTokens['logo'] = {
    full: logoAssets.full || brand.logo,
    icon: logoAssets.icon,
    light: logoAssets.light,
    dark: logoAssets.dark,
    pickFor(bg: string) {
      const light = isLightColor(bg);
      if (light) return logoAssets.dark || logoAssets.full || fallbackLogo;
      return logoAssets.light || logoAssets.full || fallbackLogo;
    },
  };

  return {
    brandId: brand.id,
    brandName: brand.name,
    slug: brand.slug,
    colors: {
      primary,
      secondary,
      accent,
      surface,
      surfaceMuted,
      foreground,
      foregroundMuted,
      onPrimary,
      onSecondary,
      onAccent,
      border,
    },
    typography: {
      headingFamily,
      bodyFamily,
      headingWeight: 700,
      bodyWeight: 400,
      scale: {
        display: '4rem',
        h1: '2.75rem',
        h2: '2rem',
        h3: '1.375rem',
        body: '1rem',
        caption: '0.75rem',
      },
      letterSpacingHeading: '-0.02em',
      letterSpacingBody: '0',
    },
    ui: {
      radius: '0.75rem',
      radiusLarge: '1.5rem',
      radiusSmall: '0.375rem',
      shadow: '0 8px 32px -12px rgba(11, 11, 15, 0.18)',
      density: 'cozy',
    },
    logo,
    voice: buildVoice(brand),
    strategy: {
      mission: brand.guidelines?.strategy?.mission || brand.strategy,
      vision: brand.guidelines?.strategy?.vision,
      positioning: brand.guidelines?.strategy?.positioning,
      values: brand.guidelines?.strategy?.values || [],
    },
    completeness: computeCompleteness(brand),
  };
}

/** Quick helpers exported for templates and prompts. */
export function tokenContrast(a: string, b: string): number {
  return contrastRatio(a, b);
}

/** Strip the `pickFor` function so tokens can be JSON-persisted (snapshots). */
export function serializeTokens(tokens: BrandTokens): Omit<BrandTokens, 'logo'> & { logo: Omit<BrandTokens['logo'], 'pickFor'> } {
  const { logo, ...rest } = tokens;
  const { pickFor: _pickFor, ...logoRest } = logo;
  void _pickFor;
  return { ...rest, logo: logoRest };
}
