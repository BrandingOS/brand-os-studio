/**
 * renderSvg — turn a (source, spec) tuple into a self-contained SVG
 * string.
 *
 * The SVG produced here is the source of truth for vector exports
 * (SVG, PDF). The canvas renderer rasterizes the same SVG, so previews
 * and exports stay pixel-identical.
 *
 * Strategy:
 *   1. Compute placement via `engine/layout`.
 *   2. Embed the source icon as either inline SVG (preferred) or as
 *      a base64 raster `<image>` (fallback).
 *   3. Apply the variant's color via SVG filters: `mono-white` →
 *      brightness(0) invert(1), `mono-black` → brightness(0), etc.
 *      For brand mode the source is left untouched.
 *   4. Render the wordmark as a `<text>` element using the source's
 *      `wordmark.fontFamily`.
 *   5. Wrap the whole composition in a viewBox sized to the placement
 *      bounds plus safeArea padding.
 *
 * This module is pure — string in, string out, no DOM.
 */
import type { BrandSlogan, VariantSpec, SourceLogo } from '../engine/types';
import { computePlacement } from '../engine/layout';
import { backgroundHex } from '../engine/generate';
import type { PaletteContext } from '../engine/types';

interface RenderOptions {
  source: SourceLogo;
  spec: VariantSpec;
  palette: PaletteContext;
  /** Brand-level slogan. Rendered only when `spec.includeSlogan` is
   *  true AND the slogan text is non-empty. */
  slogan?: BrandSlogan;
  /**
   * Hint for the SVG's intrinsic dimensions. The renderer uses these
   * to compute proportions, but the output `<svg>` is sized as
   * `width="100%" height="100%"` so it fills its container — the
   * caller controls actual pixel size via CSS on the wrapper.
   */
  width: number;
  height: number;
}

const SAFE_AREA_FACTOR: Record<VariantSpec['safeArea'], number> = {
  tight: 0.06,
  standard: 0.12,
  generous: 0.2,
};

export function renderSvg({ source, spec, palette, slogan, width: _w, height: _h }: RenderOptions): string {
  // Is the source a monolithic logo (one image containing both icon
  // AND wordmark already baked together)? That's the common case for
  // uploaded brand logos. If so, we render the source as the entire
  // composition and never add a separate wordmark text element on top
  // — adding text would double the wordmark, since the source SVG
  // already includes it. The user only gets a separately-rendered
  // wordmark when they've supplied a SEPARATE icon asset, which is
  // the explicit "I have decomposed assets" case.
  const isMonolithic = !source.icon;

  // For monolithic sources every composition collapses to "render the
  // source as-is" — we have no way to extract just the icon or just
  // the wordmark without true decomposition. Composition / layout
  // become cosmetic and the renderer ignores them.
  const hasIcon = isMonolithic ? true : spec.composition !== 'wordmark-only';
  const hasWordmark = isMonolithic ? false : spec.composition !== 'icon-only';
  const iconAspect =
    source.original.width && source.original.height
      ? source.original.width / source.original.height
      : 1;
  const wordmarkText = source.wordmark?.text ?? '';
  const wordmarkFont = source.wordmark?.fontFamily ?? 'Inter, sans-serif';
  const wordmarkAspect = Math.max(2, wordmarkText.length * 0.55);

  const placement = computePlacement(spec.layout, {
    hasIcon,
    hasWordmark: hasWordmark && wordmarkText.length > 0,
    iconAspect,
    wordmarkAspect,
  }, spec.customLayout);

  const pad = Math.max(placement.bounds.width, placement.bounds.height) * SAFE_AREA_FACTOR[spec.safeArea];

  // Slogan: brand-level text + alignment, per-variant include flag.
  // Always rendered BELOW the logo (no side-of-logo placement); the
  // user picks horizontal alignment (left/center/right). The viewBox
  // grows vertically to fit the slogan slot.
  const sloganActive = !!(spec.includeSlogan && slogan && slogan.text.trim());
  const sloganHeight = sloganActive ? Math.max(placement.bounds.height * 0.18, 14) : 0;
  const sloganGap = sloganActive ? sloganHeight * 0.6 : 0;
  const sloganAlignment: 'left' | 'center' | 'right' = slogan?.alignment ?? 'center';

  const extraH = sloganActive ? sloganGap + sloganHeight : 0;
  const vbW = placement.bounds.width + pad * 2;
  const vbH = placement.bounds.height + pad * 2 + extraH;

  const bgHex = backgroundHex(spec.background, palette);
  const bgRect =
    spec.background.kind === 'transparent'
      ? ''
      : `<rect width="${vbW}" height="${vbH}" fill="${escapeAttr(bgHex)}"/>`;

  // Color filter for the icon based on color mode
  const filter = colorFilterForMode(spec);

  // Icon embed
  let iconSvg = '';
  if (hasIcon && placement.icon) {
    const ix = placement.icon.x + pad;
    const iy = placement.icon.y + pad;
    const iw = placement.icon.width;
    const ih = placement.icon.height;
    if (source.original.svg) {
      // Inline SVG embed via <g> with viewBox transform.
      iconSvg = `<g transform="translate(${ix} ${iy})" ${filter ? `filter="${filter}"` : ''}>${inlineSvgForEmbed(source.original.svg, iw, ih)}</g>`;
    } else if (source.original.raster) {
      iconSvg = `<image x="${ix}" y="${iy}" width="${iw}" height="${ih}" href="${escapeAttr(source.original.raster)}" preserveAspectRatio="xMidYMid meet" ${filter ? `filter="${filter}"` : ''}/>`;
    }
  }

  // Wordmark text. We force-fit the text into the wordmark bbox using
  // `textLength` + `lengthAdjust="spacingAndGlyphs"`. Without this the
  // text overflows the layout's reserved width because we estimate
  // wordmark width from string length × a fudge factor — fonts vary
  // wildly and "Vector" at weight 700 is much wider than the estimate.
  let wordmarkSvg = '';
  if (hasWordmark && placement.wordmark && wordmarkText) {
    const wx = placement.wordmark.x + pad;
    const wy = placement.wordmark.y + pad;
    const ww = placement.wordmark.width;
    const wh = placement.wordmark.height;
    const fill = wordmarkFillForMode(spec);
    wordmarkSvg = `<text x="${wx}" y="${wy + wh * 0.78}" font-family="${escapeAttr(wordmarkFont)}" font-size="${wh}" font-weight="700" textLength="${ww}" lengthAdjust="spacingAndGlyphs" fill="${escapeAttr(fill)}">${escapeText(wordmarkText)}</text>`;
  }

  // Slogan text — rendered below the logo, horizontally aligned per
  // the brand-level alignment setting. Color tracks the wordmark
  // fill so it stays consistent with the active color mode.
  let sloganSvg = '';
  if (sloganActive && slogan) {
    const sloganFill = wordmarkFillForMode(spec);
    const sloganFont = source.wordmark?.fontFamily ?? 'Inter, sans-serif';
    const sy = pad + placement.bounds.height + sloganGap + sloganHeight * 0.78;
    let sx: number;
    let anchor: 'start' | 'middle' | 'end';
    if (sloganAlignment === 'left') {
      sx = pad;
      anchor = 'start';
    } else if (sloganAlignment === 'right') {
      sx = pad + placement.bounds.width;
      anchor = 'end';
    } else {
      sx = pad + placement.bounds.width / 2;
      anchor = 'middle';
    }
    sloganSvg = `<text x="${sx}" y="${sy}" font-family="${escapeAttr(sloganFont)}" font-size="${sloganHeight}" font-weight="500" text-anchor="${anchor}" fill="${escapeAttr(sloganFill)}">${escapeText(slogan.text)}</text>`;
  }

  // Output is sized as 100% so the SVG fills its container — the
  // caller's wrapper element decides the pixel size via CSS. The
  // viewBox preserves the composition's aspect ratio.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${defs(spec)}${bgRect}${iconSvg}${wordmarkSvg}${sloganSvg}</svg>`;
}

function defs(spec: VariantSpec): string {
  // Static filters: mono-white, mono-black, inverse.
  // Dynamic filter: when colorMode is 'custom' we generate a
  // feColorMatrix on the fly that flattens every pixel to the chosen
  // color (preserving alpha). This is what makes "Logo color" picks
  // actually recolor the SVG instead of just being stored on the
  // spec — same matrix shape as mono-white but with the chosen RGB
  // instead of (1,1,1).
  let customFilter = '';
  if (spec.colorMode === 'custom') {
    const { r, g, b } = hexToRgb01(spec.colorMap.icon.hex);
    customFilter = `<filter id="vsCustomFill"><feColorMatrix type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0"/></filter>`;
  }
  return (
    '<defs>' +
    '<filter id="vsMonoWhite"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>' +
    '<filter id="vsMonoBlack"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>' +
    '<filter id="vsInverse"><feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter>' +
    customFilter +
    '</defs>'
  );
}

/** Hex string → RGB components in 0..1 range, for SVG color matrices. */
function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(v.substring(0, 2), 16) / 255,
    g: parseInt(v.substring(2, 4), 16) / 255,
    b: parseInt(v.substring(4, 6), 16) / 255,
  };
}

function colorFilterForMode(spec: VariantSpec): string {
  if (spec.colorMode === 'mono-white') return 'url(#vsMonoWhite)';
  if (spec.colorMode === 'mono-black') return 'url(#vsMonoBlack)';
  if (spec.colorMode === 'custom') return 'url(#vsCustomFill)';
  if (spec.colorMode === 'inverse') return 'url(#vsInverse)';
  return '';
}

function wordmarkFillForMode(spec: VariantSpec): string {
  if (spec.colorMode === 'mono-white') return '#FFFFFF';
  if (spec.colorMode === 'mono-black') return '#000000';
  return spec.colorMap.wordmark.hex;
}

/**
 * Inline an SVG string as an embedded fragment, sized to (w, h).
 * The simplest reliable approach: wrap the inner XML in a nested
 * <svg> with explicit width/height. This sidesteps viewBox parsing.
 */
function inlineSvgForEmbed(raw: string, w: number, h: number): string {
  // Strip XML decl + outer <svg> opening attrs we don't want, keep inner.
  const inner = raw
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<!DOCTYPE[^>]*>/, '');
  const viewBoxMatch = inner.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${w} ${h}`;
  // Pull out the children of the outer <svg>.
  const childrenMatch = inner.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const children = childrenMatch ? childrenMatch[1] : inner;
  return `<svg width="${w}" height="${h}" viewBox="${escapeAttr(viewBox)}" preserveAspectRatio="xMidYMid meet">${children}</svg>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
