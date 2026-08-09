/**
 * Legacy Brand → CanonicalBrand mapper (Stage 2A adapter boundary).
 *
 * This is the ONLY place canonical code reads the legacy `Brand` shape (its v3
 * fields, legacy scalars, and the `guidelines` JSONB mirror). It resolves the
 * competing representations into one canonical identity with a deterministic,
 * documented precedence — and in doing so structurally removes the stale-mirror
 * revert class from any path that reads through it:
 *
 *   COLOR precedence: v3 `colorSystem` (written together with scalars by the
 *   Setup path) → then the fresh scalar `primaryColor` ENRICHED with mirror
 *   metadata only when the hexes agree → the `guidelines.colorPalette` mirror is
 *   NEVER allowed to override a fresh scalar (that inversion is exactly the
 *   05/11 bug where a Setup edit reverted on reload).
 *
 * The mapper is pure and deterministic: same input → deep-equal output.
 */
import type {
  Brand,
  ColorDefinition,
  ExtendedColorPalette,
  ExtendedTypography,
  FontDefinition,
  LogoSystem as LegacyLogoSystem,
  VoiceAndTone,
} from '@/shared/types/brand';
import type {
  ColorSystem,
  ColorToken,
  FontToken,
  LogoRef,
  LogoSystemRefs,
  TypographySystem,
} from '@/shared/types/brandAssets';
import {
  CANONICAL_BRAND_SCHEMA_VERSION,
  type BrandIdentity,
  type CanonicalBrand,
  type Strategy,
  type Voice,
} from './identity';

/**
 * Deep-clone JSON-safe value objects (colors/logos/typography are plain data —
 * no Dates/functions). Used so the canonical aggregate never aliases the mutable
 * legacy input object (there must be exactly one authoritative copy).
 */
function cloneJson<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** Coerce possibly-stringified weights to numbers (fixes the legacy drift). */
function toNumericWeights(w: unknown): number[] | undefined {
  if (!Array.isArray(w)) return undefined;
  const nums = w
    .map((x) => (typeof x === 'number' ? x : Number(String(x).trim())))
    .filter((n) => Number.isFinite(n));
  return nums.length ? nums : undefined;
}

function colorDefToToken(c: ColorDefinition): ColorToken {
  return {
    hex: c.hex,
    name: c.name,
    rgb: c.rgb,
    cmyk: c.cmyk,
    pantone: c.pantone,
    usage: c.usage,
  };
}

function resolveColors(b: Brand): ColorSystem {
  // 1. v3 field is authoritative when present (Setup writes it alongside scalars).
  //    Clone so the canonical aggregate never aliases the legacy input object.
  if (b.colorSystem?.primary?.hex) return cloneJson(b.colorSystem);

  // 2. Build from the fresh scalar; enrich metadata from the mirror ONLY if the
  //    hexes agree (a differing mirror hex is stale — ignore its metadata).
  const mirror: ExtendedColorPalette | undefined = b.guidelines?.colorPalette;
  const sameHex = (a?: string, c?: string) =>
    !!a && !!c && a.replace('#', '').toLowerCase() === c.replace('#', '').toLowerCase();

  const primary: ColorToken = {
    hex: b.primaryColor,
    ...(sameHex(mirror?.primary?.hex, b.primaryColor)
      ? {
          name: mirror!.primary.name,
          rgb: mirror!.primary.rgb,
          cmyk: mirror!.primary.cmyk,
          pantone: mirror!.primary.pantone,
          usage: mirror!.primary.usage,
        }
      : {}),
  };

  const secondary: ColorToken | undefined = b.secondaryColor
    ? { hex: b.secondaryColor }
    : undefined;
  const accent: ColorToken | undefined = b.accentColor ? { hex: b.accentColor } : undefined;
  const neutrals: ColorToken[] | undefined = b.neutrals?.length
    ? b.neutrals.map((hex) => ({ hex }))
    : undefined;

  return { primary, secondary, accent, neutrals };
}

function legacyLogoRef(url: string): LogoRef {
  // Transitional ref: the real Asset (with id/hash/formats) is created in Stage 2C.
  // The slot→ref RELATIONSHIP is preserved now; `legacy-url:` marks refs to resolve.
  return { assetId: `legacy-url:${url}` };
}

function resolveLogos(b: Brand): LogoSystemRefs {
  // 1. v3 asset-ref logo system when present (cloned — no aliasing of legacy input).
  if (b.logoSystem) return cloneJson(b.logoSystem);

  // 2. Map the legacy url-based guidelines logo system, preserving slots.
  const gl: LegacyLogoSystem | undefined = b.guidelines?.logoSystem;
  if (gl?.primary?.url) {
    const refs: LogoSystemRefs = { primary: legacyLogoRef(gl.primary.url) };
    if (gl.wordmark?.url) refs.wordmark = legacyLogoRef(gl.wordmark.url);
    if (gl.iconmark?.url) refs.iconmark = legacyLogoRef(gl.iconmark.url);
    if (gl.secondary?.url) refs.secondary = legacyLogoRef(gl.secondary.url);
    if (gl.blackVersion?.url || gl.whiteVersion?.url) {
      refs.mono = {
        ...(gl.blackVersion?.url ? { black: legacyLogoRef(gl.blackVersion.url) } : {}),
        ...(gl.whiteVersion?.url ? { white: legacyLogoRef(gl.whiteVersion.url) } : {}),
      };
    }
    return refs;
  }

  // 3. Map the flat legacy logoAssets urls.
  const la = b.logoAssets;
  if (la) {
    const refs: LogoSystemRefs = {};
    if (la.full) refs.primary = legacyLogoRef(la.full);
    if (la.icon) refs.iconmark = legacyLogoRef(la.icon);
    if (la.wordmark) refs.wordmark = legacyLogoRef(la.wordmark);
    if (la.alternate) refs.secondary = legacyLogoRef(la.alternate);
    if (la.dark || la.light) {
      refs.mono = {
        ...(la.dark ? { black: legacyLogoRef(la.dark) } : {}),
        ...(la.light ? { white: legacyLogoRef(la.light) } : {}),
      };
    }
    return refs;
  }

  // 4. Single legacy logo url.
  if (b.logo) return { primary: legacyLogoRef(b.logo) };
  return {};
}

function fontDefToToken(f: FontDefinition): FontToken {
  return {
    family: f.family,
    weights: toNumericWeights(f.weights),
    fallbacks: f.fallbacks,
    url: f.url,
    usage: f.usage,
  };
}

function resolveTypography(b: Brand): TypographySystem {
  // 1. v3 field — clone (no aliasing) then coerce weights to numeric.
  if (b.typography?.primary?.family) {
    const t = cloneJson(b.typography);
    return {
      ...t,
      primary: { ...t.primary, weights: toNumericWeights(t.primary.weights) },
      secondary: t.secondary
        ? { ...t.secondary, weights: toNumericWeights(t.secondary.weights) }
        : undefined,
    };
  }
  // 2. Legacy scalar fonts, enriched from the guidelines mirror.
  const mirror: ExtendedTypography | undefined = b.guidelines?.typography;
  const primary: FontToken = mirror?.primary
    ? fontDefToToken(mirror.primary)
    : { family: b.fonts?.primary ?? 'Inter' };
  const secondary: FontToken | undefined = mirror?.secondary
    ? fontDefToToken(mirror.secondary)
    : b.fonts?.secondary
      ? { family: b.fonts.secondary }
      : undefined;
  return { primary, secondary };
}

function resolveStrategy(b: Brand): Strategy {
  const gs = b.guidelines?.strategy;
  return {
    mission: gs?.mission ?? (b.strategy || undefined),
    vision: gs?.vision,
    values: gs?.values ?? [],
    positioning: gs?.positioning,
    personality: gs?.personality ?? [],
    targetAudience: gs?.targetAudience ?? (b.audience || undefined),
    aboutSections: b.guidelines?.aboutSections ?? [],
  };
}

function resolveVoice(b: Brand): Voice {
  const v: VoiceAndTone | undefined = b.guidelines?.voiceAndTone;
  return {
    tone: v?.brandVoice ?? (b.tone || undefined),
    personality: v?.toneAttributes ?? [],
    doList: v?.doAndDonts?.do ?? [],
    dontList: v?.doAndDonts?.dont ?? [],
    examples: (v?.examples ?? []).map((e) => ({ context: e.context, text: e.good })),
  };
}

function resolveIdentity(b: Brand): BrandIdentity {
  return {
    colors: resolveColors(b),
    logos: resolveLogos(b),
    typography: resolveTypography(b),
    strategy: resolveStrategy(b),
    voice: resolveVoice(b),
  };
}

/** Legacy Brand → CanonicalBrand. Pure, deterministic, lossless for identity. */
export function fromLegacyBrand(b: Brand): CanonicalBrand {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    identity: resolveIdentity(b),
    isPublic: b.isPublic ?? false,
    publicUrl: b.publicUrl,
    identitySchemaVersion: CANONICAL_BRAND_SCHEMA_VERSION,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
