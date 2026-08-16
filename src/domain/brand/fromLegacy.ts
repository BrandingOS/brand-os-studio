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
  type BusinessInfo,
  type CanonicalBrand,
  type Positioning,
  type Strategy,
  type VisualStyle,
  type Voice,
} from './identity';
import { sanitizeIdentityMeta, type IdentityMeta } from './coreMeta';

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
    // Fresh scalar `tone` wins over a stale `guidelines.voiceAndTone.brandVoice`
    // mirror (matches resolveColors); falls back to the mirror only when tone is
    // empty (never-edited onboarding brands). Prevents the voice edit reverting.
    tone: (b.tone || undefined) ?? v?.brandVoice,
    personality: v?.toneAttributes ?? [],
    doList: v?.doAndDonts?.do ?? [],
    dontList: v?.doAndDonts?.dont ?? [],
    examples: (v?.examples ?? []).map((e) => ({ context: e.context, text: e.good })),
  };
}

/**
 * BACKFILL (never override) the legacy-derived base from the stored canonical
 * `identity` blob (migration 013). The blob only FILLS a field the legacy shape
 * genuinely lost — the authed accent/neutrals case, where those have no scalar
 * column and get dropped on save, so on reload the legacy base is empty and the
 * blob restores them. It is strictly legacy-FIRST: whenever the legacy shape
 * still carries a value (guest localStorage, or ANY live legacy writer — Brand
 * Board's accent/neutrals scalars, Classic's guidelines voice, onboarding's
 * guidelines typography), that value wins and the blob is ignored. This makes a
 * lagging blob incapable of reverting any writer; it can only recover data the
 * transport dropped. Primary/secondary color, logos, font families and tone are
 * never touched here — they keep their own legacy precedence.
 *
 * STRATEGY IS BACKFILLED, and it has to be. `resolveStrategy` reads only
 * `guidelines.strategy` plus two legacy scalars, while `toLegacyBrandPatch`
 * deliberately does not write the `guidelines.*` mirror — so every canonical
 * strategy write was durable in the blob and invisible on the very next read.
 * Summary, values, positioning, personality, target audience and the free-form
 * About sections all vanished between a save and the reload after it; only
 * `mission` survived, on the `brand.strategy` scalar. The same legacy-first rule
 * applies: anything `guidelines.strategy` still carries wins, so Setup and
 * Classic keep their precedence and this can only recover what was dropped.
 */
function overlayStoredIdentity(base: BrandIdentity, stored: BrandIdentity): BrandIdentity {
  const st = stored ?? ({} as BrandIdentity);
  const sc = st.colors ?? ({} as BrandIdentity['colors']);
  const stypo = st.typography ?? ({} as BrandIdentity['typography']);
  const sv = st.voice ?? ({} as BrandIdentity['voice']);
  const ss = st.strategy ?? ({} as BrandIdentity['strategy']);

  const backfillFont = (baseFont: FontToken | undefined, storedFont: FontToken | undefined) => {
    if (!baseFont || !storedFont) return baseFont;
    return {
      ...baseFont,
      weights: baseFont.weights ?? storedFont.weights,
      fallbacks: baseFont.fallbacks ?? storedFont.fallbacks,
      url: baseFont.url ?? storedFont.url,
    };
  };

  return {
    ...base,
    colors: {
      ...base.colors,
      // Legacy-first: the blob only fills accent/neutrals the transport dropped.
      accent: base.colors.accent ?? sc.accent,
      neutrals: base.colors.neutrals ?? sc.neutrals,
    },
    typography: {
      primary: backfillFont(base.typography.primary, stypo.primary) ?? base.typography.primary,
      secondary: backfillFont(base.typography.secondary, stypo.secondary) ?? base.typography.secondary,
    },
    strategy: {
      ...base.strategy,
      // `summary` has no legacy home at all — the blob is the only place it
      // has ever lived, so it is a pure recovery.
      summary: base.strategy.summary ?? ss.summary,
      mission: base.strategy.mission ?? ss.mission,
      vision: base.strategy.vision ?? ss.vision,
      positioning: base.strategy.positioning ?? ss.positioning,
      targetAudience: base.strategy.targetAudience ?? ss.targetAudience,
      // Empty is what "the transport dropped it" looks like for a list: the
      // legacy resolver defaults each of these to `[]`, never to undefined.
      values: base.strategy.values?.length ? base.strategy.values : ss.values ?? [],
      personality: base.strategy.personality?.length
        ? base.strategy.personality
        : ss.personality ?? [],
      aboutSections: base.strategy.aboutSections?.length
        ? base.strategy.aboutSections
        : ss.aboutSections ?? [],
    },
    voice: {
      ...base.voice,
      personality: base.voice.personality?.length ? base.voice.personality : sv.personality ?? [],
      doList: base.voice.doList?.length ? base.voice.doList : sv.doList ?? [],
      dontList: base.voice.dontList?.length ? base.voice.dontList : sv.dontList ?? [],
      examples: base.voice.examples?.length ? base.voice.examples : sv.examples ?? [],
    },
  };
}

/**
 * `brand.uiStyle` (written by Brand Board) → canonical `visualStyle`.
 *
 * Read-through only: the legacy field keeps working and is retired once no
 * reader remains. A stored `identity.visualStyle` always wins — it is the
 * canonical value, uiStyle is the migration source.
 */
function resolveVisualStyle(b: Brand): VisualStyle | undefined {
  const stored = b.identity?.visualStyle;
  if (stored) return cloneJson(stored);

  const ui = b.uiStyle;
  if (!ui) return undefined;

  const cornerStyle: VisualStyle['cornerStyle'] =
    ui.borderRadius <= 2 ? 'sharp' : ui.borderRadius <= 8 ? 'soft' : ui.borderRadius <= 20 ? 'rounded' : 'pill';
  const density: VisualStyle['density'] =
    ui.spacing === 'compact' ? 'tight' : ui.spacing === 'spacious' ? 'airy' : 'balanced';
  const contrast: VisualStyle['contrast'] =
    ui.shadowIntensity === 'none' || ui.shadowIntensity === 'subtle'
      ? 'low'
      : ui.shadowIntensity === 'bold'
        ? 'high'
        : 'medium';

  return { cornerStyle, density, contrast };
}

/**
 * Structured positioning. `strategy.positioning` / `strategy.targetAudience`
 * are sentences; they stay where they are and act as the migration source, so
 * a brand that has only ever had the sentences still gets a usable structured
 * value. A stored canonical `positioning` always wins.
 */
function resolvePositioning(b: Brand): Positioning | undefined {
  const stored = b.identity?.positioning;
  if (stored) return cloneJson(stored);

  const strategy = resolveStrategy(b);
  const audience = strategy.targetAudience?.trim();
  const differentiator = strategy.positioning?.trim();
  if (!audience && !differentiator) return undefined;

  return {
    ...(differentiator ? { differentiator } : {}),
    ...(audience
      ? { audiences: [{ label: audience, priority: 'primary' as const }] }
      : {}),
  };
}

function resolveIdentity(b: Brand): BrandIdentity {
  const base: BrandIdentity = {
    colors: resolveColors(b),
    logos: resolveLogos(b),
    typography: resolveTypography(b),
    strategy: resolveStrategy(b),
    voice: resolveVoice(b),
  };
  // Recover blob-only fields (accent/neutrals, weights, rich voice) from the
  // stored canonical identity when present. Cloned so the canonical aggregate
  // never aliases the mutable legacy input.
  const resolved = b.identity ? overlayStoredIdentity(base, cloneJson(b.identity)) : base;

  // Additive subsystems — omitted entirely when the brand has nothing to say,
  // so an untouched brand serializes exactly as it did before.
  const visualStyle = resolveVisualStyle(b);
  const positioning = resolvePositioning(b);
  const rules = b.identity?.rules ? cloneJson(b.identity.rules) : undefined;

  return {
    ...resolved,
    ...(visualStyle ? { visualStyle } : {}),
    ...(rules ? { rules } : {}),
    ...(positioning ? { positioning } : {}),
  };
}

/**
 * Timestamps on brands hydrated from JSON (localStorage, Supabase rows) arrive
 * as ISO strings even though the legacy Brand type declares Date. Coerce at
 * this boundary so `assertCanonicalBrand` (z.date()) never rejects a brand
 * that merely round-tripped through storage. Invalid/absent values fall back
 * to "now" rather than producing an Invalid Date that zod also rejects.
 */
function toDate(v: Date | string | undefined): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Legacy Brand → CanonicalBrand. Pure, deterministic, lossless for identity. */
export function fromLegacyBrand(b: Brand): CanonicalBrand {
  // Sidecar metadata is sanitized on every read (INV-1): entries for paths
  // outside the CoreFieldPath registry, or malformed entries, are dropped
  // rather than rejected. Absent metadata is NOT materialized here — readers
  // resolve it through `coreValueMeta`, which returns the documented default.
  const identityMeta: IdentityMeta = sanitizeIdentityMeta(
    (b as { identityMeta?: unknown }).identityMeta,
  );
  const businessInfo = (b as { businessInfo?: BusinessInfo }).businessInfo;

  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    identity: resolveIdentity(b),
    ...(Object.keys(identityMeta).length ? { identityMeta } : {}),
    ...(businessInfo ? { businessInfo: cloneJson(businessInfo) } : {}),
    isPublic: b.isPublic ?? false,
    publicUrl: b.publicUrl,
    identitySchemaVersion: CANONICAL_BRAND_SCHEMA_VERSION,
    createdAt: toDate(b.createdAt),
    updatedAt: toDate(b.updatedAt),
  };
}
