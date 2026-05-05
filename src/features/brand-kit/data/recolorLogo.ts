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

/**
 * Build the (logoIndex, markHex, bgHex) triples for the Brand Assets
 * Logos drilldown.
 *
 * Mark colors are restricted to {Primary, Secondary, White} — the
 * three logo treatments every brand kit needs. Backgrounds span every
 * brand color (core + accent + grey). Pairs where the mark would be
 * invisible against the bg (exact match or low contrast) are skipped.
 *
 * Used both to enumerate synthetic templates and to look up a combo
 * by index from the renderer.
 */
export function logoCombosFor(brand: {
  logos: Array<{ id: string; label: string; svg: string }>;
  colors: { core: { hex: string; name: string }[]; accent: { hex: string; name: string }[]; grey: { hex: string; name: string }[] };
}): Array<{
  logoIndex: number;
  logoLabel: string;
  mark: { hex: string; name: string };
  bg: { hex: string; name: string };
}> {
  const backgrounds = [
    ...brand.colors.core,
    ...brand.colors.accent,
    ...brand.colors.grey,
  ];

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
    seenMarks.add(key);
    marks.push(m);
  };
  pushMark(primary && { hex: primary.hex, name: 'Primary' });
  pushMark(secondary && { hex: secondary.hex, name: 'Secondary' });
  pushMark({ hex: '#FFFFFF', name: 'White' });

  const out: ReturnType<typeof logoCombosFor> = [];
  brand.logos.forEach((logo, logoIndex) => {
    for (const mark of marks) {
      for (const bg of backgrounds) {
        if (colorsTooSimilar(mark.hex, bg.hex)) continue;
        out.push({ logoIndex, logoLabel: logo.label, mark, bg });
      }
    }
  });
  return out;
}
