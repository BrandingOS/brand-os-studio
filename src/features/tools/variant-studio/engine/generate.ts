/**
 * generate — orchestrator that turns a (source, palette, partial spec)
 * tuple into a fully-resolved `VariantSpec` ready for the renderer.
 *
 * Also includes `seedDefaultVariants` which produces the starter set
 * the user sees when they first land in the studio. The starter set
 * is intentionally opinionated — it's meant to look like a complete
 * "logo system" out of the box, so the empty state is never empty.
 */
import type {
  Background,
  ColorMap,
  ColorMode,
  Composition,
  Layout,
  PaletteContext,
  SourceLogo,
  VariantSpec,
} from './types';
import { deriveColorMap } from './colorMap';
import { contrastRatio } from './palette';

/** Stable, content-addressable id for a spec. */
export function variantId(spec: Omit<VariantSpec, 'id' | 'label'>): string {
  const key = JSON.stringify({
    s: spec.sourceId,
    c: spec.composition,
    l: spec.layout,
    cl: spec.customLayout,
    cm: spec.colorMode,
    map: spec.colorMap.icon.hex + spec.colorMap.wordmark.hex,
    bg: `${spec.background.kind}:${spec.background.value ?? ''}`,
    sa: spec.safeArea,
    sl: spec.includeSlogan ? '1' : '0',
  });
  // Tiny non-cryptographic hash — deterministic and short.
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return `v_${(h >>> 0).toString(36)}`;
}

/**
 * Build a human label for a variant. The label intentionally omits
 * the composition + layout for the simple "lockup horizontal" case
 * because that's the implicit default — surfacing it on every tile
 * (when most variants share it) just creates visual noise. We only
 * call them out when the user has explicitly chosen a non-default.
 */
export function variantLabel(
  spec: Pick<VariantSpec, 'composition' | 'layout' | 'colorMode' | 'background' | 'includeSlogan'>,
): string {
  const parts: string[] = [];
  if (spec.composition !== 'lockup') parts.push(LABEL_COMPOSITION[spec.composition]);
  if (spec.composition === 'lockup' && spec.layout !== 'horizontal') {
    parts.push(LABEL_LAYOUT[spec.layout] ?? spec.layout);
  }
  parts.push(LABEL_COLOR[spec.colorMode]);
  if (spec.background.kind !== 'transparent') parts.push(LABEL_BG[spec.background.kind]);
  if (spec.includeSlogan) parts.push('Slogan');
  return parts.join(' · ');
}

const LABEL_COMPOSITION: Record<Composition, string> = {
  lockup: 'Lockup',
  'icon-only': 'Icon',
  'wordmark-only': 'Wordmark',
};
const LABEL_LAYOUT: Record<Layout, string> = {
  horizontal: 'Horizontal',
  stacked: 'Stacked',
  'icon-left': 'Icon left',
  'icon-top': 'Icon top',
  custom: 'Custom',
};
const LABEL_COLOR: Record<ColorMode, string> = {
  brand: 'Brand',
  'mono-black': 'Black',
  'mono-white': 'White',
  inverse: 'Inverse',
  custom: 'Custom',
};
const LABEL_BG: Record<Background['kind'], string> = {
  transparent: 'Transparent',
  solid: 'Solid',
  brand: 'Brand BG',
  image: 'Image BG',
};

interface ResolveInput {
  source: SourceLogo;
  palette: PaletteContext;
  composition?: Composition;
  layout?: Layout;
  colorMode?: ColorMode;
  background?: Background;
  colorOverride?: Partial<ColorMap>;
  includeSlogan?: boolean;
}

/**
 * Build a fully-resolved VariantSpec from partial input. The single
 * entry point UI handlers should use when adding/editing a variant.
 */
export function resolveVariant(input: ResolveInput): VariantSpec {
  const composition = input.composition ?? 'lockup';
  const layout = input.layout ?? 'horizontal';
  const colorMode = input.colorMode ?? 'brand';
  const background: Background = input.background ?? { kind: 'transparent' };
  const bgHex = backgroundHex(background, input.palette);
  const colorMap = deriveColorMap(colorMode, input.palette, bgHex, input.colorOverride);

  const draft: Omit<VariantSpec, 'id' | 'label'> = {
    sourceId: input.source.id,
    composition,
    layout,
    colorMode,
    colorMap,
    background,
    includeSlogan: input.includeSlogan ?? false,
    safeArea: 'standard',
    format: 'png',
    density: 2,
  };
  const id = variantId(draft);
  const label = variantLabel({
    composition,
    layout,
    colorMode,
    background,
    includeSlogan: input.includeSlogan,
  });
  return { ...draft, id, label };
}

/**
 * Create a fresh "draft" variant for the rail editor. The user
 * iterates on the draft via the EditVariant controls and commits it
 * to the gallery via the Add button. This is the entry point for the
 * rail's draft state — every new draft starts here.
 */
export function createDraft(source: SourceLogo, palette: PaletteContext): VariantSpec {
  return resolveVariant({
    source,
    palette,
    composition: 'lockup',
    layout: 'horizontal',
    colorMode: 'brand',
    background: { kind: 'transparent' },
  });
}

export function backgroundHex(bg: Background, palette: PaletteContext): string {
  if (bg.kind === 'transparent') return '#FFFFFF';
  if (bg.kind === 'solid') return bg.value ?? '#FFFFFF';
  if (bg.kind === 'brand') return palette.brandColors[0]?.hex ?? '#FFFFFF';
  return '#FFFFFF';
}

// ─── Dedupe + validity helpers ──────────────────────────────────
//
// Two specs that produce the *same render output* should not coexist
// as separate variants — they're noise. The content-hashed `id` from
// `variantId` collapses identical specs but doesn't catch the case
// where two different specs render identically (e.g. for a monolithic
// source, `composition: 'lockup'` and `composition: 'icon-only'`
// render the same thing because there's nothing to extract).
//
// `renderKey` is the canonical fingerprint of "what does this look
// like on screen". Variants with the same renderKey are deduped.

/** A canonical key describing the *visible result* of a spec. */
export function renderKey(spec: VariantSpec, source: SourceLogo): string {
  const isMonolithic = !source.icon;
  // For monolithic sources, composition + layout collapse to the
  // identity render — they don't change the output, so we strip them
  // from the key.
  const composition = isMonolithic ? '*' : spec.composition;
  const layout =
    isMonolithic || spec.composition !== 'lockup' ? '*' : spec.layout;
  // Mono modes are color-fixed; for non-mono modes the actual color
  // map matters.
  const colorSig =
    spec.colorMode === 'mono-white'
      ? 'white'
      : spec.colorMode === 'mono-black'
        ? 'black'
        : spec.colorMode === 'inverse'
          ? 'inverse'
          : `${spec.colorMap.icon.hex}|${spec.colorMap.wordmark.hex}`.toLowerCase();
  const bg = `${spec.background.kind}:${(spec.background.value ?? '').toLowerCase()}`;
  const slogan = spec.includeSlogan ? '1' : '0';
  return [spec.sourceId, composition, layout, colorSig, bg, spec.safeArea, slogan].join('::');
}

/**
 * Effective foreground color a variant will paint the icon with,
 * accounting for color mode. Used to detect "logo color === bg color"
 * situations where the variant would be invisible.
 */
function effectiveForegroundHex(spec: VariantSpec): string {
  if (spec.colorMode === 'mono-white') return '#FFFFFF';
  if (spec.colorMode === 'mono-black') return '#000000';
  return spec.colorMap.icon.hex;
}

/**
 * A variant is "invisible" when the foreground and background are
 * effectively the same color. We never want to ship those — they
 * render as a solid square with no logo.
 *
 * Transparent backgrounds are exempt: we don't know what surface
 * they'll land on, so we can't judge.
 */
export function isInvisibleVariant(
  spec: VariantSpec,
  palette: PaletteContext,
): boolean {
  if (spec.background.kind === 'transparent') return false;
  const fg = effectiveForegroundHex(spec);
  const bg = backgroundHex(spec.background, palette);
  // Contrast ratio of 1 = identical luminance. Anything below ~1.3
  // is functionally the same color (or close enough to be illegible).
  return contrastRatio(fg, bg) < 1.3;
}

/**
 * Filter a variant list down to a unique, visible set.
 *
 *  - Drops variants where fg ≈ bg (the logo would be invisible).
 *  - Collapses variants that produce the same render (per renderKey).
 *
 * Keeps the FIRST occurrence of each renderKey so user-curated
 * variants take precedence over later programmatically-added ones.
 */
export function dedupeVariants(
  variants: VariantSpec[],
  source: SourceLogo,
  palette: PaletteContext,
): VariantSpec[] {
  const seen = new Set<string>();
  const out: VariantSpec[] = [];
  for (const v of variants) {
    if (isInvisibleVariant(v, palette)) continue;
    const key = renderKey(v, source);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Try to append a new variant to a list. If the new variant would
 * collide with an existing one (same renderKey) or would be
 * invisible, the original list is returned unchanged and the
 * existing collider is reported back. Used by every "add variant"
 * code path so duplicates can never enter the session.
 */
export function tryAddVariant(
  variants: VariantSpec[],
  next: VariantSpec,
  source: SourceLogo,
  palette: PaletteContext,
): { variants: VariantSpec[]; addedId: string; collidedWith?: string } {
  if (isInvisibleVariant(next, palette)) {
    return { variants, addedId: variants[0]?.id ?? next.id, collidedWith: 'invisible' };
  }
  const nextKey = renderKey(next, source);
  const existing = variants.find((v) => renderKey(v, source) === nextKey);
  if (existing) {
    return { variants, addedId: existing.id, collidedWith: existing.id };
  }
  return { variants: [...variants, next], addedId: next.id };
}

/**
 * The starter set every new session ships with. The goal: a brand-new
 * user opens the studio and immediately sees a credible logo system,
 * not an empty grid.
 *
 * The recipes differ depending on whether the source is monolithic
 * (one image containing icon + wordmark already baked together — the
 * common case) or has been decomposed into a separate icon and
 * wordmark. For monolithic sources, composition and layout collapse
 * to "render the source as-is" — so we only seed color/background
 * variations, never duplicate icon/wordmark/horizontal/stacked
 * tiles. For decomposed sources, the full matrix is meaningful.
 */
export function seedDefaultVariants(
  source: SourceLogo,
  palette: PaletteContext,
): VariantSpec[] {
  const isMonolithic = !source.icon;

  const monolithicRecipes: ResolveInput[] = [
    // Color treatments — every monolithic logo needs these
    { source, palette, composition: 'lockup', colorMode: 'brand' },
    { source, palette, composition: 'lockup', colorMode: 'mono-black' },
    {
      source,
      palette,
      composition: 'lockup',
      colorMode: 'mono-white',
      background: { kind: 'solid', value: '#000000' },
    },
    {
      source,
      palette,
      composition: 'lockup',
      colorMode: 'mono-white',
      background: { kind: 'brand' },
    },
    {
      source,
      palette,
      composition: 'lockup',
      colorMode: 'brand',
      background: { kind: 'solid', value: '#FFFFFF' },
    },
  ];

  const decomposedRecipes: ResolveInput[] = [
    { source, palette, composition: 'lockup', layout: 'horizontal', colorMode: 'brand' },
    { source, palette, composition: 'lockup', layout: 'stacked', colorMode: 'brand' },
    {
      source,
      palette,
      composition: 'lockup',
      layout: 'horizontal',
      colorMode: 'mono-white',
      background: { kind: 'solid', value: '#000000' },
    },
    { source, palette, composition: 'lockup', layout: 'horizontal', colorMode: 'mono-black' },
    { source, palette, composition: 'icon-only', layout: 'horizontal', colorMode: 'brand' },
    { source, palette, composition: 'wordmark-only', layout: 'horizontal', colorMode: 'brand' },
    {
      source,
      palette,
      composition: 'lockup',
      layout: 'horizontal',
      colorMode: 'mono-white',
      background: { kind: 'brand' },
    },
  ];

  const recipes = isMonolithic ? monolithicRecipes : decomposedRecipes;
  // Resolve every recipe and run the full dedupe pipeline:
  // collapses by render-key AND drops invisible (fg=bg) variants in
  // one pass. So even if the recipe set above accidentally listed two
  // recipes that produce the same render, only one survives.
  return dedupeVariants(recipes.map(resolveVariant), source, palette);
}
