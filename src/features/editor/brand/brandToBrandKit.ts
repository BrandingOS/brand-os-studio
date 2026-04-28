// brandToBrandKit — the single chokepoint that converts a v3 `Brand`
// into the normalized `BrandKit` the slot resolver consumes.
//
// All priority-chain logic lives here. The chains themselves are
// documented in `slotResolver.spec.md`; this file is the
// implementation. Changing a priority chain in one place must update
// both files.
//
// IMPORTANT: This function MUST be memoized at every call site
// (typically via `useBrandKit` in React). Without memoization, every
// selection change in the editor re-runs the full priority resolution
// — wasted work that compounds in multi-page documents.

import type { Brand } from '@/shared/types/brand';
import type { AssetFormat, BrandAsset } from '@/shared/types/brandAssets';
import { suggestNeutrals } from '@/shared/color/colorEngine';
import { BrandKitSchema, type BrandKit, type LogoAsset } from './BrandKit';
import { normalizeNeutrals } from './neutrals';

const SPACING_UNIT_BY_TIER = { compact: 4, comfortable: 8, spacious: 12 } as const;
const FORMAT_PRIORITY: AssetFormat[] = ['svg', 'png', 'webp', 'jpg', 'pdf'];
const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/**
 * Read NODE_ENV at call time, not at module load. This makes
 * test setup (which may flip NODE_ENV between tests) actually take
 * effect without requiring a module reset.
 */
function isProd(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
}

/**
 * Convert a v3 `Brand` to a normalized `BrandKit`. Pure function —
 * given the same input, returns equal output. Production callers MUST
 * memoize (see `useBrandKit`).
 */
export function brandToBrandKit(brand: Brand): BrandKit {
  const warnings: string[] = [];

  // ─── Colors ────────────────────────────────────────────────────────────

  const primaryHex = pickHex(
    brand.colorSystem?.primary?.hex,
    brand.primaryColor,
  );
  const primary = primaryHex ?? '#888888';
  if (!primaryHex) {
    warnings.push('Brand has no primary color defined; falling back to gray.');
  }

  const secondary = pickHex(
    brand.colorSystem?.secondary?.hex,
    brand.secondaryColor,
  );
  const accent = pickHex(brand.colorSystem?.accent?.hex, brand.accentColor);

  // Neutrals: prefer canonical ColorToken[], fall back to legacy string[],
  // last-resort generate from the primary hue via suggestNeutrals.
  const colorSystemNeutrals = brand.colorSystem?.neutrals
    ?.map((n) => n.hex)
    .filter((h) => HEX_RE.test(h));
  const legacyNeutrals = brand.neutrals?.filter((h) => HEX_RE.test(h));
  let neutrals: string[];
  if (colorSystemNeutrals && colorSystemNeutrals.length > 0) {
    neutrals = normalizeNeutrals(colorSystemNeutrals);
  } else if (legacyNeutrals && legacyNeutrals.length > 0) {
    neutrals = normalizeNeutrals(legacyNeutrals);
  } else {
    warnings.push(
      'Brand has no neutrals defined; generating ramp from primary hue.',
    );
    neutrals = suggestNeutrals(primary);
  }

  // ─── Typography (priority chains per slotResolver.spec.md) ─────────────

  // Optional chaining all the way down — partial Typescale objects do
  // exist in test fixtures, and BrandKit shouldn't crash on a missing
  // `fonts.body` field at the source.
  const headingFamily =
    brand.typescale?.fonts?.heading?.family ??
    brand.typography?.primary?.family ??
    brand.fonts.primary;

  const headingWeights =
    brand.typescale?.fonts?.heading?.weights ??
    brand.typography?.primary?.weights;

  const bodyExplicitFamily =
    brand.typescale?.fonts?.body?.family ??
    brand.typography?.secondary?.family ??
    brand.fonts.secondary;

  const bodyFamily = bodyExplicitFamily ?? headingFamily;

  if (!bodyExplicitFamily) {
    const msg = `Brand has no body font defined; falling back to heading family ('${headingFamily}').`;
    warnings.push(msg);
    if (!isProd() && typeof console !== 'undefined') {
      console.warn(`[brandToBrandKit] ${msg}`);
    }
  }

  const bodyWeights =
    brand.typescale?.fonts?.body?.weights ??
    brand.typography?.secondary?.weights ??
    brand.typography?.primary?.weights ??
    headingWeights;

  // ─── Logos (v3 logoSystem → brandAssets[] → format priority) ───────────

  const logos = {
    primary: resolveLogoSlot(brand, 'primary'),
    secondary: resolveLogoSlot(brand, 'secondary'),
    wordmark: resolveLogoSlot(brand, 'wordmark'),
    iconmark: resolveLogoSlot(brand, 'iconmark'),
    mono: {
      black: resolveLogoSlot(brand, 'mono.black'),
      white: resolveLogoSlot(brand, 'mono.white'),
    },
  };

  // ─── Spacing (uiStyle tier → px) ───────────────────────────────────────

  const spacingTier = brand.uiStyle?.spacing ?? 'comfortable';
  const spacing = {
    unit: SPACING_UNIT_BY_TIER[spacingTier],
    cornerRadius: brand.uiStyle?.borderRadius ?? 4,
  };

  return BrandKitSchema.parse({
    id: brand.id,
    name: brand.name,
    colors: {
      primary: { hex: primary },
      ...(secondary ? { secondary: { hex: secondary } } : {}),
      ...(accent ? { accent: { hex: accent } } : {}),
      neutrals,
    },
    typography: {
      heading: {
        family: headingFamily,
        ...(headingWeights ? { weights: headingWeights } : {}),
      },
      body: {
        family: bodyFamily,
        ...(bodyWeights ? { weights: bodyWeights } : {}),
      },
    },
    logos,
    spacing,
    _diagnostics: { warnings },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function pickHex(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates) {
    if (c && HEX_RE.test(c)) return c;
  }
  return undefined;
}

type LogoSlotName =
  | 'primary'
  | 'secondary'
  | 'wordmark'
  | 'iconmark'
  | 'mono.black'
  | 'mono.white';

/**
 * Resolve a logo slot through v3 `logoSystem` first, falling back to
 * the legacy `logoAssets.*` URL fields per `slotResolver.spec.md`. The
 * legacy fallback is intentional ("reads tolerate both") — refusing
 * would break unmigrated brands.
 */
function resolveLogoSlot(brand: Brand, slot: LogoSlotName): LogoAsset | undefined {
  // v3 path: logoSystem → assetId → brandAssets[id] → format priority.
  const ls = brand.logoSystem;
  let assetId: string | undefined;
  if (ls) {
    if (slot === 'primary') assetId = ls.primary?.assetId;
    else if (slot === 'secondary') assetId = ls.secondary?.assetId;
    else if (slot === 'wordmark') assetId = ls.wordmark?.assetId;
    else if (slot === 'iconmark') assetId = ls.iconmark?.assetId;
    else if (slot === 'mono.black') assetId = ls.mono?.black?.assetId;
    else if (slot === 'mono.white') assetId = ls.mono?.white?.assetId;
  }
  if (assetId && brand.brandAssets) {
    const asset = brand.brandAssets.find((a) => a.id === assetId);
    if (asset) return resolveAssetUrl(asset);
  }
  // Legacy fallback.
  return resolveLegacyLogo(brand, slot);
}

function resolveAssetUrl(asset: BrandAsset): LogoAsset | undefined {
  for (const fmt of FORMAT_PRIORITY) {
    const file = asset.formats[fmt];
    if (file?.url) {
      return {
        url: file.url,
        format: fmt,
        ...(asset.metadata.width && asset.metadata.height
          ? { aspectRatio: asset.metadata.width / asset.metadata.height }
          : {}),
      };
    }
  }
  return undefined;
}

function resolveLegacyLogo(brand: Brand, slot: LogoSlotName): LogoAsset | undefined {
  const la = brand.logoAssets;
  let url: string | undefined;
  if (slot === 'primary') url = la?.full ?? brand.logo;
  else if (slot === 'secondary') url = la?.alternate;
  else if (slot === 'wordmark') url = la?.wordmark;
  else if (slot === 'iconmark') url = la?.icon;
  else if (slot === 'mono.black') url = la?.dark;
  else if (slot === 'mono.white') url = la?.light;
  if (!url) return undefined;
  // BrandKitSchema requires URL form; if a legacy logo came in as a
  // relative path it can't pass validation. Return undefined so the
  // schema accepts the brand kit without that logo, instead of
  // throwing.
  if (!isAcceptableUrl(url)) return undefined;
  return { url, format: detectFormatFromUrl(url) ?? 'png' };
}

/**
 * Accepts the same URL shapes the BrandKitSchema's `RendererUrlSchema`
 * does: absolute URLs, data: / blob: URIs, and root-/relative-paths.
 * Filtering out anything else keeps `resolveLegacyLogo` from emitting
 * a logo whose URL would later trip the schema parse.
 */
function isAcceptableUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  try {
    new URL(url);
    return true;
  } catch {
    /* not an absolute URL — try the renderer-friendly forms */
  }
  return /^data:/i.test(url) || /^blob:/i.test(url) || /^\.{0,2}\//.test(url);
}

function detectFormatFromUrl(url: string): AssetFormat | undefined {
  const m = url.toLowerCase().match(/\.(svg|png|jpg|jpeg|webp|pdf)(?:\?|$|#)/);
  if (!m) return undefined;
  const ext = m[1] === 'jpeg' ? 'jpg' : (m[1] as AssetFormat);
  return ext;
}
