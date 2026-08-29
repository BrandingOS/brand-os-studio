/**
 * Strip a logo's baked-in background and recolor every fill / stroke
 * to a single mark color. Used by the Brand Assets logos drilldown
 * to render the same logo against every brand color (mark × bg),
 * skipping pairs where they match.
 */
export function recolorLogoSvg(svg: string, markColor: string): string {
  let out = svg;

  // Remove the first full-cover <rect> (the original background).
  out = out.replace(/<rect\b[^>]*\bwidth="[^"]+"[^>]*\bheight="[^"]+"[^>]*\/>/, '');

  // Recolor remaining fills (skip "none" and "transparent").
  out = out.replace(
    /\bfill="((?!none|transparent)[^"]+)"/gi,
    `fill="${markColor}"`,
  );

  // Recolor strokes.
  out = out.replace(
    /\bstroke="((?!none|transparent)[^"]+)"/gi,
    `stroke="${markColor}"`,
  );

  // Inline style="fill: …" / "stroke: …".
  out = out.replace(
    /(fill\s*:\s*)([^;"\s)]+)/gi,
    (_m, p1, color) =>
      color === 'none' || color === 'transparent' ? `${p1}${color}` : `${p1}${markColor}`,
  );
  out = out.replace(
    /(stroke\s*:\s*)([^;"\s)]+)/gi,
    (_m, p1, color) =>
      color === 'none' || color === 'transparent' ? `${p1}${color}` : `${p1}${markColor}`,
  );

  return out;
}

/** Build a silhouette SVG suitable for use as a CSS `mask-image` —
 *  strip the baked-in bg rect and force every fill/stroke to white so
 *  the entire logo shape renders as opaque alpha in the mask. The
 *  caller paints the mark color onto the masked surface, so this works
 *  even when the source SVG embeds the asset as `<image href="...">`
 *  (where the regex-based fill recolor is a no-op). */
export function logoToMaskSvg(svg: string): string {
  let out = svg;

  out = out.replace(/<rect\b[^>]*\bwidth="[^"]+"[^>]*\bheight="[^"]+"[^>]*\/>/, '');
  out = out.replace(/\bfill="((?!none|transparent)[^"]+)"/gi, 'fill="#fff"');
  out = out.replace(/\bstroke="((?!none|transparent)[^"]+)"/gi, 'stroke="#fff"');
  out = out.replace(/(fill\s*:\s*)([^;"\s)]+)/gi, (_m, p1, color) =>
    color === 'none' || color === 'transparent' ? `${p1}${color}` : `${p1}#fff`,
  );
  out = out.replace(/(stroke\s*:\s*)([^;"\s)]+)/gi, (_m, p1, color) =>
    color === 'none' || color === 'transparent' ? `${p1}${color}` : `${p1}#fff`,
  );

  return out;
}

/** Encode an SVG string into a `url("data:image/svg+xml,...")` value
 *  suitable for `mask-image` / `background-image`. */
export function svgToCssUrl(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** Extract the `<image href="...">` URL from a wrapped logo SVG, if
 *  any. Returns null for pure inline-vector logos.
 *
 *  Why we need this: brandToMockBrand wraps the user's asset URL in
 *  `<svg><image href="URL"/></svg>`. Using that wrapper as the source
 *  of a CSS `mask-image` renders blank, because browsers refuse to
 *  load external resources from inside an SVG that's loaded as an
 *  image — the nested `<image>` never fetches. The renderer instead
 *  uses the underlying URL directly as the mask, which the browser
 *  loads as a normal image and uses for its alpha channel. */
export function extractWrappedImageUrl(svg: string): string | null {
  const match = svg.match(/<image\b[^>]*\bhref="([^"]+)"/i);
  return match ? match[1] : null;
}

/** Build a CSS `url(...)` value for any string URL (data URL, http,
 *  relative). Escapes embedded double quotes. */
export function cssUrl(value: string): string {
  return `url("${value.replace(/"/g, '\\"')}")`;
}

/** First explicit fill / stroke color painted by an inline-vector
 *  logo, after stripping the baked-in background rect. Used to pick
 *  which neutral surface the ORIGINAL (unrecolored) artwork reads
 *  best on. Returns null for wrapped `<image href>` logos — their
 *  pixels aren't inspectable from the SVG string. */
export function firstLogoColor(svg: string): string | null {
  const body = svg.replace(/<rect\b[^>]*\bwidth="[^"]+"[^>]*\bheight="[^"]+"[^>]*\/>/, '');
  const match = body.match(/\b(?:fill|stroke)="((?!none|transparent)[^"]+)"/i);
  return match ? match[1] : null;
}

/** Whether two color strings are visually identical. */
export function colorsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return [0, 0, 0];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const norm = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

/** WCAG contrast ratio between two hex colors, in [1, 21]. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(hexToRgb(a));
  const lb = relativeLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Below this contrast ratio the logo silhouette would visually blend
// into the bg — skip the combo so we never ship an "invisible logo"
// tile. 1.5 is permissive enough to keep legitimately mid-contrast
// pairs (e.g. brand color on a slightly lighter neutral) while
// catching same-family near-matches.
const MIN_LOGO_CONTRAST = 1.5;

/** Whether two colors are too close to render a readable logo on
 *  bg pair. Wraps exact match and a luminance-based fallback. */
export function colorsTooSimilar(a: string, b: string): boolean {
  if (colorsMatch(a, b)) return true;
  return contrastRatio(a, b) < MIN_LOGO_CONTRAST;
}

/** Squared Euclidean distance in RGB space — fast, no sqrt. */
function rgbDistanceSquared(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const dr = ar - br;
  const dg = ag - bg;
  const db = ab - bb;
  return dr * dr + dg * dg + db * db;
}

/**
 * Whether two colors are visually close enough that pairing the same
 * mark with each would produce indistinguishable tiles. Used to dedupe
 * the gallery's BACKGROUND list — `colorsTooSimilar` is a contrast
 * gate (will the mark disappear?), this is a perceptual gate (do the
 * two backgrounds look the same?).
 *
 * Threshold is squared Euclidean RGB distance ≤ 60² (3600). 60 RGB
 * units is roughly the gap between adjacent slots on a 6-step ramp
 * spanning black to white — anything closer collapses to one
 * representative tile. Tuned against the 32-step brandToMockBrand
 * grayscale ramp: at threshold 60 the ramp collapses to ~5–6 visually
 * distinct neutrals, which is what a designer actually needs.
 */
export function visuallyClose(a: string, b: string): boolean {
  return rgbDistanceSquared(a, b) <= 60 * 60;
}

/**
 * Build the (logoIndex, markHex, bgHex) triples for the Brand Assets
 * Logos drilldown.
 *
 * Mark colors are restricted to {Primary, Secondary, White} — the
 * three logo treatments every brand kit needs. Backgrounds span the
 * brand's core + accent colors only — neutrals are intentionally
 * excluded so the kit shows on-brand pairings, not grey-on-grey
 * variations. Pairs where the mark would be invisible against the
 * bg (exact match or low contrast) are skipped.
 *
 * Used both to enumerate synthetic templates and to look up a combo
 * by index from the renderer.
 */
/**
 * Roles that are the SAME DRAWING as another logo, in one flat colour.
 *
 * A mono cut is not a second logo — it is the logo, redrawn in black or
 * in white so it can sit on a ground that the coloured original cannot.
 */
const MONO_ROLES: ReadonlySet<string> = new Set(['mono.white', 'mono.black']);

/**
 * Which logos may act as a RECOLOURING SOURCE, by index into `logos`.
 *
 * The gallery paints every combo tile as a CSS mask filled with the mark
 * colour, which discards the source artwork's own colour completely. So
 * two logos that share a SILHOUETTE produce pixel-identical tiles, and a
 * brand's mono cuts share the silhouette of the logo they were cut from
 * by definition.
 *
 * Measured on Raqm, whose three logos are Primary, On dark (mono.white)
 * and On light (mono.black) — one drawing in three colours: the drilldown
 * generated 51 recoloured tiles of which only 17 were distinct. **34 of
 * 54 tiles were exact duplicates**, and because the tile name carried no
 * logo, they were duplicates under duplicate names too.
 *
 * A brand that has ONLY mono cuts still gets tiles — the first one is
 * kept as the source rather than leaving the gallery empty.
 *
 * This does not claim to catch every shape collision: two genuinely
 * different roles could still hold the same artwork (the same file
 * uploaded as both Primary and Wordmark). Proving that needs the pixel
 * comparison in `onboarding/understanding/artwork.ts`, which is async and
 * cannot run inside this synchronous list. Role covers the case every
 * brand actually has.
 */
export function recolorSourceIndexes(
  logos: ReadonlyArray<{ role?: string }>,
): number[] {
  const distinct = logos
    .map((logo, index) => ({ logo, index }))
    .filter(({ logo }) => !MONO_ROLES.has(logo.role ?? ''));
  if (distinct.length > 0) return distinct.map(({ index }) => index);
  return logos.length > 0 ? [0] : [];
}

export function logoCombosFor(brand: {
  logos: Array<{ id: string; label: string; svg: string; role?: string }>;
  colors: { core: { hex: string; name: string }[]; accent: { hex: string; name: string }[]; grey: { hex: string; name: string }[] };
}): Array<{
  logoIndex: number;
  logoLabel: string;
  mark: { hex: string; name: string };
  bg: { hex: string; name: string };
}> {
  // Dedupe backgrounds by perceptual proximity. `brandToMockBrand`
  // generates a 32-step grayscale ramp for every brand, which —
  // multiplied by 3 mark colors — used to produce ~93 logo tiles, most
  // of them visually identical near-black variants. Iterate in
  // priority order (core → accent → grey) so brand-specific colors
  // win over generic neutrals when two backgrounds are close.
  const allBackgrounds = [
    ...brand.colors.core,
    ...brand.colors.accent,
  ];
  const backgrounds: typeof allBackgrounds = [];
  for (const bg of allBackgrounds) {
    if (backgrounds.some((kept) => visuallyClose(kept.hex, bg.hex))) continue;
    backgrounds.push(bg);
  }

  // Marks: Primary (core[0]), Secondary (core[1]), White. Dedupe by
  // hex so a brand whose secondary IS white doesn't yield a duplicate
  // mark entry.
  const primary = brand.colors.core[0];
  const secondary = brand.colors.core[1];
  const marks: Array<{ hex: string; name: string }> = [];
  const seenMarks = new Set<string>();
  const pushMark = (m: { hex: string; name: string } | undefined) => {
    if (!m) return;
    const key = m.hex.trim().toLowerCase();
    if (seenMarks.has(key)) return;
    // Backgrounds are deduped perceptually; marks were deduped only by
    // exact hex, so a brand whose secondary is #FEFEFE drew a tile
    // indistinguishable from its White one.
    if (marks.some((kept) => visuallyClose(kept.hex, m.hex))) return;
    seenMarks.add(key);
    marks.push(m);
  };
  pushMark(primary && { hex: primary.hex, name: 'Primary' });
  pushMark(secondary && { hex: secondary.hex, name: 'Secondary' });
  pushMark({ hex: '#FFFFFF', name: 'White' });

  const out: ReturnType<typeof logoCombosFor> = [];
  // One source per silhouette. `logoIndex` stays an index into
  // `brand.logos` — the renderer looks the artwork up by it.
  for (const logoIndex of recolorSourceIndexes(brand.logos)) {
    const logo = brand.logos[logoIndex];
    if (!logo) continue;
    for (const mark of marks) {
      for (const bg of backgrounds) {
        if (colorsTooSimilar(mark.hex, bg.hex)) continue;
        out.push({ logoIndex, logoLabel: logo.label, mark, bg });
      }
    }
  }
  return out;
}
