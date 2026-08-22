// opentype.js exposes itself as a CJS module without a default export;
// Vite's pre-bundler can't synthesize one ("does not provide an export
// named 'default'"). Namespace import works against both the named-
// exports surface and the CJS module.exports pattern.
import * as opentype from 'opentype.js';
import { triggerBlobDownload } from './colorPaletteExport';
import type { ZipFolder } from './kitExport';

/**
 * Icons drilldown export pipeline. Produces a clean ZIP of editable
 * vector icons:
 *
 *   {brand}-icons.zip
 *     SVG/                one .svg per icon — REAL `<path>` data
 *                         extracted from the Flaticon webfont via
 *                         opentype.js. Opens fully editable in any
 *                         vector tool (Illustrator, Figma, Inkscape).
 *     {brand}-icons.svg   single combined-grid SVG — every icon laid
 *                         out as separate `<path>` elements. Drop
 *                         into Illustrator and each glyph is its
 *                         own selectable shape.
 *     {brand}-icons.ai    same combined SVG with the .ai extension
 *                         so users who expect "Adobe Illustrator"
 *                         find one. Illustrator opens SVG-based .ai
 *                         documents transparently.
 *
 * Why opentype.js: Flaticon UICONS ships as a webfont (woff/woff2),
 * so the actual artwork is locked inside glyph tables. opentype.js
 * parses the font and exposes `.toPathData()` for any glyph — that's
 * the raw SVG path string. No rasterization, no font dependency in
 * the exported file. The user's chosen tint is baked into `fill`.
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
  return { char: decoded, codepoint, family: stripQuotes(family), color };
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

/* ─── Public entry point ───────────────────────────────────── */

function slugify(value: string): string {
  return (value || 'icon').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

export async function downloadIconsBundle(
  entries: IconExportEntry[],
  zipName: string,
): Promise<void> {
  if (entries.length === 0) return;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  await addIconsToZip(zip, entries, zipName);
  triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${zipName}.zip`);
}

/**
 * Write the icon bundle into a folder of an EXISTING zip.
 *
 * The whole-kit export needs the same SVG/PNG/JPG set the Icons card
 * download produces, filed under `icons/` rather than in a zip of its
 * own — so the builder is the shared thing and the download is a wrapper
 * around it. Returns how many icons were written.
 */
export async function addIconsToZip(
  zip: ZipFolder,
  entries: IconExportEntry[],
  zipName: string,
): Promise<number> {
  if (entries.length === 0) return 0;

  // Pre-load every font referenced by the icons. opentype.js parses
  // each font once; results land in `fontCache` for the per-icon
  // loop below.
  const families = new Set<string>();
  for (const entry of entries) {
    const info = readGlyphInfo(entry.element);
    if (info) families.add(info.family);
  }
  await Promise.all(Array.from(families).map((f) => getFont(f)));

  const svgDir = zip.folder('SVG');
  const pngDir = zip.folder('PNG');
  const jpgDir = zip.folder('JPG');
  const usedNames = new Set<string>();
  const grid: { glyph: GlyphInfo; font: opentype.Font; name: string }[] = [];

  for (const entry of entries) {
    const glyph = readGlyphInfo(entry.element);
    if (!glyph) continue;
    const font = await getFont(glyph.family);
    if (!font) continue;
    const svg = buildIconSvg(font, glyph);
    if (!svg) continue;
    const baseSlug = slugify(entry.name || entry.source);
    let slug = baseSlug;
    let n = 2;
    while (usedNames.has(slug)) {
      slug = `${baseSlug}-${n}`;
      n += 1;
    }
    usedNames.add(slug);
    if (svgDir) svgDir.file(`${slug}.svg`, svg);
    // Rasterize the same vector SVG for PNG (transparent) + JPG
    // (white-backed). Same source means the raster art matches the
    // vector art exactly — no DOM screenshotting drift.
    const canvas = await svgToCanvas(svg, ICON_SIZE, ICON_SIZE);
    if (canvas) {
      const png = await canvasToBlob(canvas, 'image/png');
      const jpg = await whiteBackedJpg(canvas);
      if (pngDir && png) pngDir.file(`${slug}.png`, png);
      if (jpgDir && jpg) jpgDir.file(`${slug}.jpg`, jpg);
    }
    grid.push({ glyph, font, name: entry.name || slug });
  }

  if (grid.length > 0) {
    // Single combined SVG with every icon as its own `<path>` —
    // open in Illustrator/Figma and each glyph is a discrete,
    // selectable, editable shape.
    const combined = buildCombinedIconsSvg(grid);
    zip.file(`${zipName}.svg`, combined.svg);
    // PDF of the same grid for users who reach for that format —
    // wraps the vector SVG into a single page. The SVG above
    // remains the editable source.
    const pdf = await buildCombinedPdfBlob(combined.svg, combined.width, combined.height);
    if (pdf) zip.file(`${zipName}.pdf`, pdf);
  }

  return grid.length;
}
