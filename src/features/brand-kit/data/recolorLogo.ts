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


/* ─── The logo SYSTEM ─────────────────────────────────────────────── */

/**
 * A logo is not a picture; it is a set of rules about a picture. This
 * section builds the ordered list of tiles the Logos drilldown shows and
 * `logoExport` writes — one list, so a tile and its file cannot disagree.
 *
 * The list is, in order:
 *
 *   1. **Pairings** — the variants the brand actually owns, each on the
 *      brand grounds it can be READ on. The ground is not decorative: a
 *      pairing that fails `MIN_PAIRING_CONTRAST` is not offered at all.
 *      (`.audit/OURS.md` D27: Iris-on-Orange at ~1.5:1 and Turquoise-on-Grey
 *      at ~2.6:1 were shipped as valid pairings.)
 *   2. **Treatments** — the mono cut (black or white) for every ground the
 *      owned variants cannot cover. Same drawing, one flat colour.
 *   3. **Rules** — clear space, minimum size, and three misuses. These are
 *      the half of a logo system that a wall of colour swatches has never
 *      been able to express, and the audit's flat "no clear-space, min-size
 *      or misuse guidance".
 *
 * ### Why `logoIndex` is always 0
 *
 * `legacy-mapping.ts` (which this agent does not own) names a tile
 * `${mark.name} on ${bg.name}`, and prefixes it with the logo's label only
 * when the combos span more than one `logoIndex`. Every tile here already
 * names its own subject in `mark.name` — "Primary on Sand", "Black on
 * Ink", "Clear space on every side" — so a prefix would read "Primary ·
 * Primary on Sand". Sharing one `logoIndex` keeps the caption the tile
 * wrote. The artwork the tile actually draws is `sourceIndex`.
 */

/**
 * The floor a pairing has to clear to be OFFERED.
 *
 * WCAG's 3:1 for non-text content. `pickLogoOnBackground`'s own default is
 * 1.8 — deliberately permissive, because that picker's job is "show the
 * brand SOMEWHERE" on a card that already exists. A brand kit is the
 * opposite job: it publishes the pairings a designer is allowed to use, so
 * the marginal ones must be absent rather than dim.
 */
export const MIN_PAIRING_CONTRAST = 3;

export type LogoTileKind =
  | 'pairing'
  | 'treatment'
  | 'clear-space'
  | 'min-size'
  | 'misuse';

/** Which rule a misuse tile is showing broken. */
export type LogoMisuse = 'stretch' | 'contrast' | 'recolor';

export type LogoTile = {
  /** Always 0 — see the section note above. */
  logoIndex: number;
  /** The label of the artwork this tile draws. */
  logoLabel: string;
  /** Reads as the SUBJECT of the tile's caption. */
  mark: { hex: string; name: string };
  /** Reads as the OBJECT of the tile's caption. */
  bg: { hex: string; name: string };
  kind: LogoTileKind;
  /** Index into `brand.logos` of the artwork drawn. */
  sourceIndex: number;
  /**
   * A flat colour to redraw the silhouette in, or null to draw the
   * artwork exactly as uploaded. Only treatments and the recolour misuse
   * set this — a pairing that had to be recoloured would not be a pairing.
   */
  recolor: string | null;
  /** Measured ink-vs-ground ratio. 0 where the tile is not a pairing. */
  contrast: number;
  misuse?: LogoMisuse;
  /** The rule, in the tile's own words. */
  note?: string;
};

/**
 * Roles that are the SAME DRAWING as another logo, in one flat colour.
 *
 * A mono cut is not a second logo — it is the logo, redrawn in black or in
 * white so it can sit on a ground the coloured original cannot.
 */
const MONO_ROLES: ReadonlySet<string> = new Set(['mono.white', 'mono.black']);

/**
 * Which logos may act as a RECOLOURING SOURCE, by index into `logos`.
 *
 * Two logos that share a SILHOUETTE produce identical treatment tiles, and
 * a brand's mono cuts share the silhouette of the logo they were cut from
 * by definition. Measured on Raqm — Primary, On dark, On light: one drawing
 * in three colours — the old gallery generated 51 recoloured tiles of which
 * 34 were exact duplicates under duplicate names.
 *
 * A brand that has ONLY mono cuts still gets tiles: the first is kept as
 * the source rather than leaving the gallery empty.
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

/** The shape this module needs from a MockBrand logo tile. */
export type LogoLike = {
  label: string;
  svg: string;
  role?: string;
  variant?: 'light' | 'dark';
};

/**
 * The colour a variant is DRAWN IN, as well as it can be known without
 * looking at pixels.
 *
 * Certain for the mono roles (that is what the role means) and for an
 * inline-vector logo (its own first fill). Everything else is a brand's
 * uploaded raster wrapped in `<svg><image href="…"/></svg>` — the wrapper's
 * only colours are the preview ground and a hidden fallback label, neither
 * of which is the artwork. For those, `variant` is the one honest signal
 * the record carries: a tile drawn for a DARK ground holds LIGHT artwork.
 * Failing all that, the brand's primary — the colour a coloured logo is
 * most often inked in.
 *
 * This is a floor for OFFERING a pairing, never a claim about the file.
 * `shared/brand/logoInk.ts` measures the real thing, asynchronously, and
 * cannot run inside this synchronous list.
 */
export function logoInkOf(logo: LogoLike, fallback: string): string {
  if (logo.role === 'mono.black') return '#000000';
  if (logo.role === 'mono.white') return '#ffffff';
  if (!extractWrappedImageUrl(logo.svg)) {
    const painted = firstLogoColor(logo.svg);
    if (painted && /^#[0-9a-f]{3,8}$/i.test(painted.trim())) return painted.trim();
  }
  if (logo.variant === 'dark') return '#ffffff';
  return fallback;
}

/**
 * The name a PAIRING's caption should read for its artwork.
 *
 * `legacy-mapping.ts` composes a tile's name as "`mark.name` on `bg.name`",
 * and the variant vocabulary names a mono cut by its USE — "On dark", "On
 * light" (`shared/brand/logoRoles.ts`, and the naming trap is documented
 * there). Composed, that produced "On dark on Iris" and "On light on White":
 * two prepositions, one of them describing a ground that is not the ground in
 * the tile. A guideline names the INK on that line — "White on Iris" — which
 * is also exactly how the treatment tiles beside it already read, so the two
 * halves of the wall stop speaking different languages.
 *
 * Only the mono roles are renamed. Every other variant is a lockup with a
 * name of its own, and "Wordmark on Sand" was never ambiguous.
 */
export function logoInkName(logo: LogoLike, index: number): string {
  if (logo.role === 'mono.white') return 'White';
  if (logo.role === 'mono.black') return 'Black';
  return logo.label || `Logo ${index + 1}`;
}

/** Strip the preview ground a Setup logo tile bakes in behind its artwork. */
export function stripLogoBackground(svg: string): string {
  return svg.replace(/<rect\b[^>]*\bwidth="[^"]+"[^>]*\bheight="[^"]+"[^>]*\/>/, '');
}

export type BrandGround = { hex: string; name: string };

type GroundBrand = {
  colors: {
    core: ReadonlyArray<{ hex: string; name: string }>;
    /** Neutrals are accepted and ignored — a ground is a brand colour. */
    grey?: ReadonlyArray<{ hex: string; name: string }>;
    accent: ReadonlyArray<{ hex: string; name: string }>;
  };
};

/** Neutral extremes every logo system needs a lockup for. */
const UNIVERSAL_GROUNDS: BrandGround[] = [
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#111113', name: 'Ink' },
];

/**
 * The grounds a logo may be published on: the brand's own colours, plus
 * white and near-black.
 *
 * Perceptually deduped — `brandToMockBrand` generates a 32-step grey ramp
 * for every brand, and even inside core+accent two colours can sit a few
 * RGB units apart and produce two tiles nobody can tell apart. Brand
 * colours are walked FIRST so a brand's own near-white wins the slot over
 * the generic one.
 */
export function brandGrounds(brand: GroundBrand): BrandGround[] {
  const out: BrandGround[] = [];
  for (const g of [...brand.colors.core, ...brand.colors.accent, ...UNIVERSAL_GROUNDS]) {
    if (!g?.hex) continue;
    if (out.some((kept) => visuallyClose(kept.hex, g.hex))) continue;
    out.push({ hex: g.hex, name: g.name });
  }
  return out;
}

type ComboBrand = GroundBrand & { logos: ReadonlyArray<LogoLike & { id?: string }> };

/**
 * The ordered tile list for the Logos drilldown — and, through
 * `logoExport`, for every logo file the kit writes.
 */
export function logoCombosFor(brand: ComboBrand): LogoTile[] {
  const logos = brand.logos ?? [];
  if (logos.length === 0) return [];

  const fallbackInk = brand.colors.core[0]?.hex ?? '#111113';
  const inks = logos.map((logo) => logoInkOf(logo, fallbackInk));
  const grounds = brandGrounds(brand);
  const silhouette = recolorSourceIndexes(logos)[0] ?? 0;
  const primary = logos[silhouette];
  const tiles: LogoTile[] = [];

  const push = (t: Omit<LogoTile, 'logoIndex'>) => tiles.push({ ...t, logoIndex: 0 });

  /* 1 — Pairings. One tile per ground: the owned variant that reads
     best on it. Anything below the floor is simply not offered. */
  const pairedInk = new Map<string, string>();
  for (const ground of grounds) {
    let best: { index: number; ratio: number } | undefined;
    logos.forEach((_, index) => {
      const ratio = contrastRatio(inks[index], ground.hex);
      if (!best || ratio > best.ratio) best = { index, ratio };
    });
    if (!best || best.ratio < MIN_PAIRING_CONTRAST) continue;
    const logo = logos[best.index];
    pairedInk.set(ground.hex, inks[best.index]);
    push({
      logoLabel: logo.label,
      mark: { hex: inks[best.index], name: logoInkName(logo, best.index) },
      bg: ground,
      kind: 'pairing',
      sourceIndex: best.index,
      recolor: null,
      contrast: best.ratio,
    });
  }

  /* 2 — Treatments. The mono cut for each ground, skipped where the
     pairing already put that exact ink there. */
  for (const ground of grounds) {
    const candidates = [
      { hex: '#000000', name: 'Black' },
      { hex: '#FFFFFF', name: 'White' },
    ]
      .map((c) => ({ ...c, ratio: contrastRatio(c.hex, ground.hex) }))
      .filter((c) => c.ratio >= MIN_PAIRING_CONTRAST)
      .sort((a, b) => b.ratio - a.ratio);
    const cut = candidates[0];
    if (!cut) continue;
    if (colorsMatch(pairedInk.get(ground.hex) ?? '', cut.hex)) continue;
    push({
      logoLabel: primary.label,
      mark: { hex: cut.hex, name: cut.name },
      bg: ground,
      kind: 'treatment',
      sourceIndex: silhouette,
      recolor: cut.hex,
      contrast: cut.ratio,
    });
  }

  /* 3 — The rules. Drawn on the ground the primary silhouette reads on,
     so the diagram itself is never the thing that fails. */
  const ink = inks[silhouette];
  const stage =
    grounds.find((g) => contrastRatio(ink, g.hex) >= 4.5) ??
    (contrastRatio(ink, '#FFFFFF') >= contrastRatio(ink, '#111113')
      ? UNIVERSAL_GROUNDS[0]
      : UNIVERSAL_GROUNDS[1]);

  push({
    logoLabel: primary.label,
    mark: { hex: ink, name: 'Clear space' },
    bg: { hex: stage.hex, name: 'every side' },
    kind: 'clear-space',
    sourceIndex: silhouette,
    recolor: null,
    contrast: contrastRatio(ink, stage.hex),
    note: 'R = ⅓ of the smaller dimension',
  });
  push({
    logoLabel: primary.label,
    mark: { hex: ink, name: 'Minimum size' },
    bg: { hex: stage.hex, name: 'screen and print' },
    kind: 'min-size',
    sourceIndex: silhouette,
    recolor: null,
    contrast: contrastRatio(ink, stage.hex),
    note: '24 px · 48 px · 96 px — never smaller than 24 px',
  });
  push({
    logoLabel: primary.label,
    mark: { hex: ink, name: 'Never stretch' },
    bg: { hex: stage.hex, name: 'any layout' },
    kind: 'misuse',
    misuse: 'stretch',
    sourceIndex: silhouette,
    recolor: null,
    contrast: contrastRatio(ink, stage.hex),
    note: 'Scale both axes together',
  });
  push({
    logoLabel: primary.label,
    mark: { hex: ink, name: 'Never place' },
    bg: { hex: tooCloseTo(ink, stage.hex), name: 'a low-contrast ground' },
    kind: 'misuse',
    misuse: 'contrast',
    sourceIndex: silhouette,
    recolor: null,
    contrast: contrastRatio(ink, tooCloseTo(ink, stage.hex)),
    note: `Keep at least ${MIN_PAIRING_CONTRAST}:1`,
  });
  /* The recolour misuse has to be SEEN to say anything. Taking
     `accent[0]` blindly drew SKAM's near-black accent on SKAM's black stage:
     a tile that says "never recolour" and shows nothing at all, which is the
     one thing worse than not shipping the rule. So the wrong colour is chosen
     to be wrong AND visible — a brand colour that is not the ink and reads on
     the stage; failing that, the ink itself pulled toward the stage's
     foreground, which is unmistakably not an approved variant. */
  const approved = [...inks, '#000000', '#FFFFFF'];
  const wrongCandidates = [...brand.colors.accent, ...brand.colors.core]
    // Not the ink of ANY variant, and neither mono cut. Filtering on the
    // primary's ink alone let SKAM illustrate "never recolour" with a white
    // mark on black — which is the mono treatment two tiles up, i.e. the tile
    // told the reader that an approved variant was a mistake.
    .filter((c) => c?.hex && !approved.some((a) => visuallyClose(a, c.hex)))
    .map((c) => ({
      hex: c.hex,
      ratio: contrastRatio(c.hex, stage.hex),
      chroma: chromaOf(c.hex),
    }))
    // 1.8:1 is a VISIBILITY floor, not a legibility one — a misuse tile is
    // deliberately not a pairing, so it is not held to MIN_PAIRING_CONTRAST.
    .filter((c) => c.ratio >= 1.8)
    // Ranking by contrast alone reaches for the darkest or lightest colour
    // the brand owns, which is exactly what a mono cut looks like: Raqm's
    // "never recolour" tile drew a charcoal wordmark on white and read as an
    // approved variant. A wrong colour has to look wrong, so the most
    // CHROMATIC candidate wins and contrast is only the tie-break.
    .sort((a, b) => b.chroma - a.chroma || b.ratio - a.ratio);
  const wrong =
    wrongCandidates[0]
      ? wrongCandidates[0].hex
      : nudgeToward(
          ink,
          contrastRatio('#FFFFFF', stage.hex) >= contrastRatio('#111113', stage.hex)
            ? '#FFFFFF'
            : '#111113',
          0.45,
        );
  push({
    logoLabel: primary.label,
    mark: { hex: wrong, name: 'Never recolour' },
    bg: { hex: stage.hex, name: 'any surface' },
    kind: 'misuse',
    misuse: 'recolor',
    sourceIndex: silhouette,
    recolor: wrong,
    contrast: contrastRatio(wrong, stage.hex),
    note: 'Use the approved variants only',
  });

  return tiles;
}

/** How far a colour is from grey, in [0, 255]. A hue the brand chose scores
 *  high; a neutral, a near-black and a near-white all score near zero. */
export function chromaOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
}


/**
 * A ground the ink genuinely FAILS on.
 *
 * The misuse tile blended 72% toward the stage and called it low
 * contrast — on Raqm's violet over cream that lands at 3.7:1, above the
 * floor, so the tile illustrating "never place the logo on a
 * low-contrast ground" was itself a legal pairing. It walks toward the
 * ink until the ratio is really below the floor.
 */
export function tooCloseTo(ink: string, ground: string): string {
  for (let t = 0.72; t <= 0.96; t += 0.04) {
    const candidate = nudgeToward(ground, ink, t);
    if (contrastRatio(ink, candidate) < MIN_PAIRING_CONTRAST) return candidate;
  }
  return nudgeToward(ground, ink, 0.96);
}

/** Blend `a` toward `b` by `t` (0 = a, 1 = b). Used to build the ground a
 *  deliberately-illegible misuse tile needs. */
export function nudgeToward(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * Math.max(0, Math.min(1, t)));
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(mix(ar, br))}${hex(mix(ag, bg))}${hex(mix(ab, bb))}`;
}

/* ─── Recolouring a raster silhouette ─────────────────────────────── */

/**
 * A treatment tile has to paint the SILHOUETTE in one flat colour, and
 * most brands' artwork is a raster the regex recolour above cannot touch.
 * A CSS `mask-image` looks right on screen and exports BLANK — html2canvas
 * has no mask support, which is `.audit/OURS.md` D4: every colour-combo PNG
 * in the Logos zip was a coloured rectangle with no logo in it.
 *
 * So the silhouette is recoloured on a canvas instead — `source-in` floods
 * the fill wherever the artwork has alpha — and the result is an ordinary
 * `<img src="data:image/png">`, which html2canvas draws like any other
 * image. The cache is what makes it usable from a synchronous render: the
 * drilldown grid warms it, and the offscreen snapshot of the same tile
 * reads it back with no await.
 */
const recoloredCache = new Map<string, string>();

function recolorKey(url: string, hex: string): string {
  return `${hex.toLowerCase()}|${url}`;
}

/** The recoloured PNG for this pair if it has already been built. */
export function cachedRecoloredLogo(url: string, hex: string): string | undefined {
  return recoloredCache.get(recolorKey(url, hex));
}

/** Test seam. */
export function clearRecoloredLogoCache(): void {
  recoloredCache.clear();
}

export type RecolorDeps = {
  loadImage?: (url: string) => Promise<HTMLImageElement>;
  createCanvas?: () => HTMLCanvasElement;
};

function defaultLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('logo failed to load'));
    img.src = url;
  });
}

/**
 * Flat-fill the artwork's silhouette. Resolves to null — never throws — on
 * a load failure or a tainted canvas; the caller falls back to a CSS mask,
 * which is right on screen and merely degraded in an export.
 */
export async function recolorLogoPng(
  url: string,
  hex: string,
  deps: RecolorDeps = {},
): Promise<string | null> {
  const key = recolorKey(url, hex);
  const hit = recoloredCache.get(key);
  if (hit) return hit;
  try {
    const img = await (deps.loadImage ?? defaultLoadImage)(url);
    const w = img.naturalWidth || img.width || 512;
    const h = img.naturalHeight || img.height || 512;
    const canvas = (deps.createCanvas ?? (() => document.createElement('canvas')))();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
    const data = canvas.toDataURL('image/png');
    if (!data.startsWith('data:image/png')) return null;
    recoloredCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}
