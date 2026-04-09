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

/** Stable, content-addressable id for a spec. */
export function variantId(spec: Omit<VariantSpec, 'id' | 'label'>): string {
  const key = JSON.stringify({
    c: spec.composition,
    l: spec.layout,
    cl: spec.customLayout,
    cm: spec.colorMode,
    map: spec.colorMap.icon.hex + spec.colorMap.wordmark.hex,
    bg: `${spec.background.kind}:${spec.background.value ?? ''}`,
    sa: spec.safeArea,
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
export function variantLabel(spec: Pick<VariantSpec, 'composition' | 'layout' | 'colorMode' | 'background'>): string {
  const parts: string[] = [];
  if (spec.composition !== 'lockup') parts.push(LABEL_COMPOSITION[spec.composition]);
  if (spec.composition === 'lockup' && spec.layout !== 'horizontal') {
    parts.push(LABEL_LAYOUT[spec.layout] ?? spec.layout);
  }
  parts.push(LABEL_COLOR[spec.colorMode]);
  if (spec.background.kind !== 'transparent') parts.push(LABEL_BG[spec.background.kind]);
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
    composition,
    layout,
    colorMode,
    colorMap,
    background,
    safeArea: 'standard',
    format: 'png',
    density: 2,
  };
  const id = variantId(draft);
  const label = variantLabel({ composition, layout, colorMode, background });
  return { ...draft, id, label };
}

export function backgroundHex(bg: Background, palette: PaletteContext): string {
  if (bg.kind === 'transparent') return '#FFFFFF';
  if (bg.kind === 'solid') return bg.value ?? '#FFFFFF';
  if (bg.kind === 'brand') return palette.brandColors[0]?.hex ?? '#FFFFFF';
  return '#FFFFFF';
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

  // De-duplicate by id (resolve gives us content-hashed ids).
  const seen = new Set<string>();
  const out: VariantSpec[] = [];
  for (const r of recipes) {
    const v = resolveVariant(r);
    if (!seen.has(v.id)) {
      seen.add(v.id);
      out.push(v);
    }
  }
  return out;
}
