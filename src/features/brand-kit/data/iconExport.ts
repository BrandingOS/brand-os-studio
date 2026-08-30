// opentype.js exposes itself as a CJS module without a default export;
// Vite's pre-bundler can't synthesize one ("does not provide an export
// named 'default'"). Namespace import works against both the named-
// exports surface and the CJS module.exports pattern.
import * as opentype from 'opentype.js';
import { triggerBlobDownload } from './colorPaletteExport';
import type { ZipFolder } from './kitExport';
import { zipAdd } from './zipFile';
import { iconLabel } from './iconPacks';
import { detectIconWeight, ICON_WEIGHTS } from './iconWeights';

/**
 * The Icons download.
 *
 * ### What it used to weigh, and why
 *
 * 13.6–14.2 MB per download (`.audit/OURS.md` D42), of which 8.9 MB was a
 * single PDF — a raster of a contact sheet nobody asked for — beside a JPG of
 * every icon, which is a transparent line drawing flattened onto white, i.e. a
 * worse copy of the PNG sitting next to it. The PNGs themselves were 1024²,
 * four times bigger than the largest place an icon is ever drawn.
 *
 * So the bundle is LEAN by default and `full` is an explicit ask:
 *
 *   {brand}-icons.zip
 *     SVG/<name>.svg      one per icon — REAL `<path>` data pulled out of the
 *                         Flaticon webfont with opentype.js, so it opens fully
 *                         editable in Illustrator, Figma or Inkscape.
 *     PNG/64/<name>.png   the two sizes an icon is actually placed at.
 *     PNG/128/<name>.png
 *     sprite.svg          every icon as a `<symbol>`, ready to
 *                         `<use href="sprite.svg#name">` on a web page.
 *     icons.json          the manifest: what is in here, at what weight, in
 *                         what tint, and which file is which icon.
 *
 * `full` adds what a print workflow occasionally wants and nobody wants by
 * default: `JPG/`, the combined contact-sheet SVG and its PDF.
 *
 * Why opentype.js: UICONS ships as a webfont, so the artwork is locked inside
 * glyph tables. opentype parses the font and `.toPathData()` gives the raw SVG
 * path — no rasterisation, and no font dependency in the exported file. The
 * user's chosen tint is baked into `fill`.
 */

export type IconExportEntry = {
  /** Friendly name (e.g. "Camera"). */
  name: string;
  /** Raw icon source (Flaticon class, bare name, URL, or inline SVG). */
  source: string;
  /** Rendered glyph DOM node — used to read the unicode codepoint
   *  (`::before` content), the resolved font-family, and the chosen
   *  tint color. */
  element: HTMLElement;
};

/* ─── Font loading + glyph path extraction ─────────────────── */

/** Cache of parsed opentype.js fonts, keyed by font-family. Built
 *  lazily on first use, reused across icons in the same export. */
const fontCache = new Map<string, opentype.Font | null>();

/** Cache of resolved font-face URLs so we don't walk the stylesheets
 *  twice for the same family. */
const fontUrlCache = new Map<string, string | null>();

/** Walk the page's stylesheets and locate the woff/woff2 URL for a
 *  given font-family. opentype.js handles WOFF directly, so we
 *  prefer that over WOFF2 (which would need a separate decoder). */
function findFontUrl(family: string): string | null {
  const target = stripQuotes(family).toLowerCase();
  if (fontUrlCache.has(target)) return fontUrlCache.get(target) ?? null;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (rule.constructor.name !== 'CSSFontFaceRule') continue;
      const fontRule = rule as CSSFontFaceRule;
      const ruleFamily = stripQuotes(fontRule.style.getPropertyValue('font-family')).toLowerCase();
      if (ruleFamily !== target) continue;
      const src = fontRule.style.getPropertyValue('src');
      // Prefer WOFF over WOFF2 — opentype.js parses WOFF natively
      // without an extra decoder. Fall through to WOFF2 only if no
      // WOFF source is listed (older browsers' loaders may strip it).
      const woff = matchUrl(src, 'woff');
      const woff2 = matchUrl(src, 'woff2');
      const resolved = woff ?? woff2 ?? null;
      fontUrlCache.set(target, resolved);
      return resolved;
    }
  }
  fontUrlCache.set(target, null);
  return null;
}

function matchUrl(src: string, format: 'woff' | 'woff2'): string | null {
  // opentype only handles woff (not woff2). The regex needs to NOT
  // match woff2 when looking for woff — anchor with a non-digit lookahead.
  const re =
    format === 'woff'
      ? /url\(([^)]+)\)\s*format\(["']?woff["']?\)/i
      : /url\(([^)]+)\)\s*format\(["']?woff2["']?\)/i;
  const m = src.match(re);
  if (!m) return null;
  const raw = m[1].trim().replace(/^["']|["']$/g, '');
  try {
    return new URL(raw, document.baseURI).toString();
  } catch {
    return raw;
  }
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '');
}

/** Fetch and parse the font file for a given family. Returns null
 *  if the family isn't loaded on the page or opentype.js fails to
 *  parse it (woff2-only fonts fall into that bucket). */
async function getFont(family: string): Promise<opentype.Font | null> {
  const key = stripQuotes(family).toLowerCase();
  if (fontCache.has(key)) return fontCache.get(key) ?? null;
  const url = findFontUrl(family);
  if (!url) {
    fontCache.set(key, null);
    return null;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    const font = opentype.parse(buffer);
    fontCache.set(key, font);
    return font;
  } catch {
    fontCache.set(key, null);
    return null;
  }
}

/* ─── Glyph metadata from the rendered DOM ─────────────────── */

type GlyphInfo = {
  /** Single unicode character the icon's `::before` resolves to. */
  char: string;
  codepoint: number;
  family: string;
  color: string;
};

function readGlyphInfo(element: HTMLElement): GlyphInfo | null {
  // Walk down to the `<i>` if the caller passed a wrapper.
  const i =
    element.tagName.toLowerCase() === 'i'
      ? element
      : (element.querySelector('i') as HTMLElement | null);
  if (!i) return null;
  const before = window.getComputedStyle(i, '::before');
  const rawContent = before.getPropertyValue('content');
  // CSS content can come back wrapped in quotes; the unicode is
  // typically resolved to a real character by the browser, but some
  // older browsers leave the literal `\fXXX` escape — handle both.
  const decoded = stripQuotes(rawContent).replace(/\\([0-9a-f]+)\s?/gi, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  if (!decoded || decoded === 'none') return null;
  const codepoint = decoded.codePointAt(0);
  if (codepoint === undefined) return null;
  const family = before.getPropertyValue('font-family') || window.getComputedStyle(i).fontFamily;
  const color =
    before.getPropertyValue('color') ||
    window.getComputedStyle(i).color ||
    '#111113';
  // Normalised HERE, once. `getComputedStyle` answers `rgb(114, 49, 255)`,
  // and an SVG that states the tint that way is a file whose colour a designer
  // cannot match to the brand's own hex by looking at it.
  return { char: decoded, codepoint, family: stripQuotes(family), color: normalizeCssColor(color) };
}

/* ─── SVG builders (real vector paths) ─────────────────────── */

const ICON_SIZE = 512;

/** Build a per-icon SVG containing the actual glyph path. */
function buildIconSvg(font: opentype.Font, glyph: GlyphInfo): string | null {
  const path = glyphPathData(font, glyph.codepoint);
  if (!path) return null;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" width="${ICON_SIZE}" height="${ICON_SIZE}">`,
    `<path d="${path}" fill="${glyph.color}"/>`,
    `</svg>`,
  ].join('');
}

/** Get a glyph's SVG path d-attribute, sized to fit ICON_SIZE and
 *  centered on the canvas. opentype.js returns the path in font
 *  units — we scale + flip Y to land in SVG's top-down coordinate
 *  system. Returns null when the codepoint isn't in the font. */
function glyphPathData(font: opentype.Font, codepoint: number): string | null {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  if (!glyph || (glyph as { unicode?: number }).unicode === undefined) return null;
  // Use the font's own metrics to fit. unitsPerEm gives us the
  // design grid; the cap-height-ish 75% factor centers the glyph
  // within ICON_SIZE while leaving padding similar to other icon
  // packs (Lucide, Phosphor, Flaticon's own preview).
  const targetSize = ICON_SIZE * 0.75;
  const scale = targetSize / font.unitsPerEm;
  // Center horizontally based on the glyph's advance width;
  // vertically based on the font's ascender/descender.
  const advance = (glyph as { advanceWidth?: number }).advanceWidth ?? font.unitsPerEm;
  const dx = (ICON_SIZE - advance * scale) / 2;
  const dy = ICON_SIZE / 2 + ((font.ascender + font.descender) / 2) * scale;
  // opentype.js' getPath supports negative scaleY for the Y flip.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = (glyph as any).getPath(dx, dy, targetSize, undefined, undefined);
  // Simpler / more reliable: reset to font-unit coords then bake
  // the transform into the path string ourselves. opentype's
  // built-in getPath has occasional precision drift around 0.
  if (path && typeof path.toPathData === 'function') {
    return path.toPathData(3);
  }
  return null;
}

/** Combined-grid SVG for the "all icons in one file" deliverable.
 *  Each icon is its own translated `<g>` with a real `<path>`.
 *  Returns the markup plus the box dimensions so the PDF builder
 *  can size its page to match. */
function buildCombinedIconsSvg(
  glyphs: { glyph: GlyphInfo; font: opentype.Font; name: string }[],
): { svg: string; width: number; height: number } {
  const COLS = 5;
  const CELL = 96;
  const PAD = 32;
  const rows = Math.ceil(glyphs.length / COLS);
  const W = PAD * 2 + COLS * CELL;
  const H = PAD * 2 + rows * CELL;
  const cellTargetSize = CELL * 0.75;
  const inset = (CELL - cellTargetSize) / 2;
  const groups = glyphs
    .map(({ glyph, font, name }, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const tx = PAD + col * CELL + inset;
      const ty = PAD + row * CELL + inset;
      const pathData = scaledGlyphPath(font, glyph.codepoint, cellTargetSize);
      if (!pathData) return '';
      return `<g transform="translate(${tx} ${ty})"><title>${escapeXml(name)}</title><path d="${pathData}" fill="${glyph.color}"/></g>`;
    })
    .filter(Boolean)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${groups}</svg>`;
  return { svg, width: W, height: H };
}

/** Glyph path scaled to a target box, anchored at origin. Used by
 *  the combined grid where each `<g>` translates to its cell. */
function scaledGlyphPath(font: opentype.Font, codepoint: number, target: number): string | null {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  if (!glyph || (glyph as { unicode?: number }).unicode === undefined) return null;
  const scale = target / font.unitsPerEm;
  const advance = (glyph as { advanceWidth?: number }).advanceWidth ?? font.unitsPerEm;
  const dx = (target - advance * scale) / 2;
  const dy = target / 2 + ((font.ascender + font.descender) / 2) * scale;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = (glyph as any).getPath(dx, dy, target, undefined, undefined);
  if (path && typeof path.toPathData === 'function') {
    return path.toPathData(3);
  }
  return null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ─── Raster + PDF derivatives ─────────────────────────────── */

const RASTER_DPI = 2;

/** Render an SVG string to a canvas at 2× DPI. The SVG is loaded via
 *  a Blob URL so we sidestep CORS — there's nothing external to
 *  fetch since the path data is inline. */
async function svgToCanvas(
  svg: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement | null> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg load failed'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * RASTER_DPI;
    canvas.height = height * RASTER_DPI;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The same vector, drawn at EXACTLY `px`.
 *
 * `svgToCanvas` multiplies by a fixed 2× DPI, which is right for a preview and
 * wrong for a deliverable: it is how every icon PNG came out 1024² when the
 * largest place one is ever placed is 128. A size the caller names is a size
 * the caller gets.
 */
async function rasterizeIcon(svg: string, px: number): Promise<HTMLCanvasElement | null> {
  const canvas = await svgToCanvas(svg, px / RASTER_DPI, px / RASTER_DPI);
  return canvas;
}

/** `rgb(114, 49, 255)` → `#7231ff`. A manifest states a colour once. */
function normalizeCssColor(value: string): string {
  const raw = (value || '').trim();
  const m = /^rgba?\(([^)]+)\)$/.exec(raw);
  if (m) {
    const [r, g, b] = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    return `#${[r, g, b]
      .map((n) => Math.round(n ?? 0).toString(16).padStart(2, '0'))
      .join('')}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.slice(1).split('').map((c) => c + c).join('')}`.toLowerCase();
  }
  return raw;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  if (!canvas.width || !canvas.height) return Promise.resolve(null);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

/** Composite a transparent canvas onto white for JPG export — JPG
 *  has no alpha channel, so without this the icon would render on
 *  top of black. */
function whiteBackedJpg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  if (!canvas.width || !canvas.height) return Promise.resolve(null);
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return canvasToBlob(out, 'image/jpeg', 0.92);
}

/** Build a single-page PDF of the combined grid. The combined SVG
 *  is rendered to a high-DPI canvas, then embedded as a PNG so the
 *  page is visually identical to the .svg deliverable. */
async function buildCombinedPdfBlob(svg: string, width: number, height: number): Promise<Blob | null> {
  try {
    const canvas = await svgToCanvas(svg, width, height);
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const { default: jsPDF } = await import('jspdf');
    const orientation = width >= height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      unit: 'pt',
      format: [width, height],
      orientation,
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    const buffer = pdf.output('arraybuffer');
    return new Blob([buffer], { type: 'application/pdf' });
  } catch {
    return null;
  }
}

/* ─── The plan: pure, and therefore testable ───────────────── */

/** The raster sizes an icon is actually placed at. 1024² was four times the
 *  largest, and it was most of D42's megabytes. */
export const ICON_PNG_SIZES = [64, 128] as const;

/** One icon, as the manifest and the sprite describe it. */
export type IconManifestEntry = {
  /** The name a person reads — the SAME name as on the tile and in the editor. */
  name: string;
  /** The filename stem, unique within the bundle. */
  slug: string;
  /** What the brand stores: a UICONS class name, a url or inline SVG. */
  source: string;
  svg: string;
  png: Record<string, string>;
  jpg?: string;
};

export type IconsManifest = {
  brand: string;
  generated: string;
  /** One weight for the whole set — it is the prefix on every class name. */
  weight: string;
  weightLabel: string;
  /** The colour the set is drawn in, as it appears in every file here. */
  tint: string;
  variant: 'lean' | 'full';
  count: number;
  icons: IconManifestEntry[];
};

/**
 * A filename stem for one icon, unique within the bundle.
 *
 * `used` is mutated, which is the point: two icons named "Star" must not both
 * claim `star.svg` and silently become one file.
 */
export function iconSlug(name: string, used: Set<string>): string {
  const base = (name || 'icon').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'icon';
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

/** Where each of an icon's files lives. Pure — this is the file PLAN. */
export function planIconFiles(
  name: string,
  source: string,
  used: Set<string>,
  lean: boolean,
): IconManifestEntry {
  const slug = iconSlug(name, used);
  const png: Record<string, string> = {};
  for (const size of ICON_PNG_SIZES) png[String(size)] = `PNG/${size}/${slug}.png`;
  return {
    name,
    slug,
    source,
    svg: `SVG/${slug}.svg`,
    png,
    ...(lean ? {} : { jpg: `JPG/${slug}.jpg` }),
  };
}

/**
 * The manifest.
 *
 * A zip of 30 files called `chart-line-up.svg` does not say what weight the set
 * is, what colour it was drawn in, or which of them is the one on the tile. One
 * small JSON file answers all three, and it is the thing a build step can read.
 */
export function buildIconsManifest(
  icons: IconManifestEntry[],
  meta: { brand: string; weight: string; tint: string; lean: boolean; now?: Date },
): IconsManifest {
  const weightLabel = ICON_WEIGHTS.find((w) => w.id === meta.weight)?.label ?? 'Regular';
  return {
    brand: meta.brand,
    generated: (meta.now ?? new Date()).toISOString(),
    weight: meta.weight,
    weightLabel,
    tint: meta.tint,
    variant: meta.lean ? 'lean' : 'full',
    count: icons.length,
    icons,
  };
}

/**
 * Every icon as a `<symbol>`, so a web page can `<use>` one by name.
 *
 * The symbols carry NO fill: a sprite whose colour is baked in can only ever be
 * one colour, and the whole point of a single file is that the page decides.
 * The tint lives in the per-icon SVGs and in the manifest.
 */
export function buildIconSprite(
  icons: { slug: string; name: string; path: string }[],
): string {
  const symbols = icons
    .map(
      ({ slug, name, path }) =>
        `<symbol id="${escapeXml(slug)}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">` +
        `<title>${escapeXml(name)}</title><path d="${path}" fill="currentColor"/></symbol>`,
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `style="display:none">${symbols}</svg>`
  );
}

/* ─── Public entry point ───────────────────────────────────── */


export type IconBundleOptions = {
  /**
   * `lean` (the default) is SVG + two PNG sizes + a sprite + the manifest.
   * `full` adds the JPG set, the combined contact-sheet SVG and its PDF —
   * 13.6 MB of a 14 MB download, which is why it is not the default (D42).
   */
  variant?: 'lean' | 'full';
  /** The older boolean, kept so existing call sites read unchanged. */
  lean?: boolean;
};

/** `true` unless the caller explicitly asked for the full bundle. */
function isLean(options: IconBundleOptions): boolean {
  if (options.variant) return options.variant === 'lean';
  return options.lean !== false;
}

export async function downloadIconsBundle(
  entries: IconExportEntry[],
  zipName: string,
  options: IconBundleOptions = {},
): Promise<void> {
  if (entries.length === 0) return;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  await addIconsToZip(zip, entries, zipName, options);
  triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${zipName}.zip`);
}

/**
 * Write the icon bundle into a folder of an EXISTING zip.
 *
 * The whole-kit export wants exactly what the Icons card download produces,
 * filed under `icons/` rather than in a zip of its own — so the builder is the
 * shared thing and the download is a wrapper around it. Returns how many icons
 * were written.
 */
export async function addIconsToZip(
  zip: ZipFolder,
  entries: IconExportEntry[],
  zipName: string,
  options: IconBundleOptions = {},
): Promise<number> {
  if (entries.length === 0) return 0;
  const lean = isLean(options);

  // Pre-load every font referenced by the icons. opentype.js parses each font
  // once; results land in `fontCache` for the per-icon loop below.
  const families = new Set<string>();
  for (const entry of entries) {
    const info = readGlyphInfo(entry.element);
    if (info) families.add(info.family);
  }
  await Promise.all(Array.from(families).map((f) => getFont(f)));

  const used = new Set<string>();
  const manifestIcons: IconManifestEntry[] = [];
  const sprite: { slug: string; name: string; path: string }[] = [];
  const grid: { glyph: GlyphInfo; font: opentype.Font; name: string }[] = [];
  let tint = '';

  for (const entry of entries) {
    const glyph = readGlyphInfo(entry.element);
    if (!glyph) continue;
    const font = await getFont(glyph.family);
    if (!font) continue;
    const pathData = glyphPathData(font, glyph.codepoint);
    if (!pathData) continue;
    const svg = buildIconSvg(font, glyph);
    if (!svg) continue;
    if (!tint) tint = glyph.color;

    // ONE name for this icon everywhere — the tile, the editor, the file and
    // the manifest — so a symbol can be found again outside the app.
    const name = entry.name || iconLabel(entry.source);
    const plan = planIconFiles(name, entry.source, used, lean);

    zipAdd(zip, plan.svg, svg);
    for (const size of ICON_PNG_SIZES) {
      const canvas = await rasterizeIcon(svg, size);
      const png = canvas ? await canvasToBlob(canvas, 'image/png') : null;
      if (png) zipAdd(zip, plan.png[String(size)]!, png);
    }
    if (!lean && plan.jpg) {
      // JPG has no alpha, so this is the same drawing flattened onto white —
      // a worse copy of the PNG beside it, and only ever an explicit ask.
      const canvas = await rasterizeIcon(svg, ICON_SIZE);
      const jpg = canvas ? await whiteBackedJpg(canvas) : null;
      if (jpg) zipAdd(zip, plan.jpg, jpg);
    }

    manifestIcons.push(plan);
    sprite.push({ slug: plan.slug, name, path: pathData });
    grid.push({ glyph, font, name });
  }

  if (manifestIcons.length === 0) return 0;

  zipAdd(zip, 'sprite.svg', buildIconSprite(sprite));
  const weight = detectIconWeight(entries.find((e) => e.source)?.source ?? '');
  zipAdd(
    zip,
    'icons.json',
    JSON.stringify(
      buildIconsManifest(manifestIcons, {
        brand: zipName,
        weight,
        tint,
        lean,
      }),
      null,
      2,
    ),
  );

  if (!lean) {
    // The contact sheet: every icon as its own `<path>` in one document, and
    // a PDF of the same page for a print workflow. Both are large and neither
    // is what most people came for.
    const combined = buildCombinedIconsSvg(grid);
    zipAdd(zip, `${zipName}.svg`, combined.svg);
    const pdf = await buildCombinedPdfBlob(combined.svg, combined.width, combined.height);
    if (pdf) zipAdd(zip, `${zipName}.pdf`, pdf);
  }

  return manifestIcons.length;
}
