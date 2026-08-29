import { hexToName } from '@/features/setup/data/colorNames';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';

/**
 * Color-asset export pipeline shared by:
 *   • the card editor's footer Download (single-color bundle)
 *   • the Colors drilldown's header Download (all-colors bundle)
 *
 * Builds an SVG of the centered role/name/hex block AND the shades
 * stack, rasterizes both to PNG / JPG via an off-screen canvas, and
 * produces a PDF-shaped .ai file via jsPDF (Illustrator opens
 * PDF-derived .ai natively since CS2). Lives outside the React tree
 * so the typecheck is simple and the editor module stays smaller.
 */

/**
 * The five roles a brand colour can hold.
 *
 * There is no "Core 4". A role is what the colour DOES — it is never the
 * index it happens to sit at in the Setup projection. Tiles, the editor,
 * `brand.json` and every token export read this one vocabulary, so a
 * colour called Background in the kit is called Background everywhere.
 */
export type PaletteRole = 'Primary' | 'Secondary' | 'Accent' | 'Background' | 'Neutral';

export const PALETTE_ROLES: readonly PaletteRole[] = [
  'Primary',
  'Secondary',
  'Accent',
  'Background',
  'Neutral',
];

export type PaletteColor = {
  hex: string;
  name: string;
  role: string;
};

const BASE_W = 1200;
const BASE_H = 750;
const SHADES_W = 720;
const SHADES_ROW_H = 80;

/** SVG of the centered "role / name / hex" block — same composition
 *  the editor's big preview tile shows. */
export function buildBaseColorSvg(color: PaletteColor): string {
  const fg = readableOn(color.hex);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BASE_W} ${BASE_H}" width="${BASE_W}" height="${BASE_H}">`,
    `<rect width="${BASE_W}" height="${BASE_H}" fill="${color.hex}"/>`,
    `<text x="${BASE_W / 2}" y="${BASE_H / 2 - 80}" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" text-anchor="middle" dominant-baseline="middle">${escapeXml(color.role.toUpperCase())}</text>`,
    `<text x="${BASE_W / 2}" y="${BASE_H / 2 + 10}" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="120" font-weight="600" letter-spacing="-1.2" text-anchor="middle" dominant-baseline="middle">${escapeXml(color.name)}</text>`,
    `<text x="${BASE_W / 2}" y="${BASE_H / 2 + 110}" fill="${fg}" font-family="JetBrains Mono, ui-monospace, SFMono-Regular, monospace" font-size="22" letter-spacing="2" text-anchor="middle" dominant-baseline="middle">${color.hex.toUpperCase()}</text>`,
    `</svg>`,
  ].join('');
}

/** SVG of the shades stack — vertical color bars with name on the
 *  left and hex on the right. */
export function buildShadesSvg(rows: { hex: string; name: string }[]): string {
  const PAD_X = 28;
  const totalH = SHADES_ROW_H * rows.length;
  const svgRows = rows
    .map(({ hex, name }, i) => {
      const fg = readableOn(hex);
      const y = i * SHADES_ROW_H;
      const labelY = y + SHADES_ROW_H / 2;
      return [
        `<rect x="0" y="${y}" width="${SHADES_W}" height="${SHADES_ROW_H}" fill="${hex}"/>`,
        `<text x="${PAD_X}" y="${labelY}" fill="${fg}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="500" dominant-baseline="middle">${escapeXml(name)}</text>`,
        `<text x="${SHADES_W - PAD_X}" y="${labelY}" fill="${fg}" font-family="JetBrains Mono, ui-monospace, SFMono-Regular, monospace" font-size="20" font-weight="500" letter-spacing="1.2" text-anchor="end" dominant-baseline="middle">${hex.toUpperCase()}</text>`,
      ].join('');
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHADES_W} ${totalH}" width="${SHADES_W}" height="${totalH}">${svgRows}</svg>`;
}

/** Rasterize an SVG string into PNG + JPG blobs at 2× DPI. */
export async function rasterizeSvg(
  svg: string,
  width: number,
  height: number,
): Promise<{ png: Blob | null; jpg: Blob | null }> {
  const SCALE = 2;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.src = svgUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg load failed'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { png: null, jpg: null };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), 'image/png'),
    );
    const jpg = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), 'image/jpeg', 0.92),
    );
    return { png, jpg };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Build an .ai blob from an SVG. Real .ai files are PDF-compatible
 *  since Illustrator CS2, so we generate a single-page PDF and
 *  rename the extension.
 *
 *  The export SVGs are pure rect + text compositions, so we draw them
 *  as REAL VECTORS with jsPDF primitives — each .ai lands at a few KB.
 *  The old path embedded a 2× PNG raster (jsPDF stores PNG pixels
 *  near-uncompressed), which made every .ai ~10 MB and pushed the
 *  all-colors bundle to ~607 MB / minutes of canvas work. A compressed
 *  JPEG raster remains only as the fallback for SVGs with shapes this
 *  renderer doesn't know. */
export async function buildAiBlob(
  svg: string,
  width: number,
  height: number,
): Promise<Blob | null> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const orientation = width >= height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'pt',
      format: [width, height],
    });
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;
    if (!drawSvgAsVectors(pdf, svgEl)) {
      // Unknown shapes — fall back to ONE compressed raster (JPEG at
      // 1×, not the old raw-PNG-at-2× that ballooned the files).
      const { jpg } = await rasterizeSvg(svg, width, height);
      if (jpg) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(jpg);
        });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
      }
    }
    const arrayBuffer = pdf.output('arraybuffer');
    return new Blob([arrayBuffer], { type: 'application/postscript' });
  } catch {
    return null;
  }
}

/** Draw our rect/text SVG subset natively into a jsPDF page.
 *  @returns false when the SVG contains anything this renderer can't
 *  draw — the caller then rasterizes instead. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSvgAsVectors(pdf: any, svgEl: Element): boolean {
  const children = Array.from(svgEl.children);
  for (const el of children) {
    if (el.tagName === 'rect') continue;
    if (el.tagName === 'text') continue;
    return false;
  }
  const num = (el: Element, attr: string) => parseFloat(el.getAttribute(attr) ?? '0') || 0;
  for (const el of children) {
    const fill = el.getAttribute('fill') ?? '#000000';
    if (el.tagName === 'rect') {
      pdf.setFillColor(fill);
      pdf.rect(num(el, 'x'), num(el, 'y'), num(el, 'width'), num(el, 'height'), 'F');
    } else {
      const size = num(el, 'font-size') || 16;
      const weight = num(el, 'font-weight') || 400;
      const anchor = el.getAttribute('text-anchor');
      const family = el.getAttribute('font-family') ?? '';
      pdf.setFont(/mono/i.test(family) ? 'courier' : 'helvetica', weight >= 600 ? 'bold' : 'normal');
      pdf.setFontSize(size);
      pdf.setTextColor(fill);
      pdf.setCharSpace(num(el, 'letter-spacing'));
      pdf.text(el.textContent ?? '', num(el, 'x'), num(el, 'y'), {
        align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
        baseline: el.getAttribute('dominant-baseline') === 'middle' ? 'middle' : 'alphabetic',
      });
      pdf.setCharSpace(0);
    }
  }
  return true;
}

/**
 * The step ladder every shade scale is drawn on — the familiar 50…900
 * design-token rungs, with the lightness each rung targets.
 */
export const SHADE_STEPS: readonly { step: number; l: number }[] = [
  { step: 50, l: 95 },
  { step: 100, l: 90 },
  { step: 200, l: 81 },
  { step: 300, l: 71 },
  { step: 400, l: 61 },
  { step: 500, l: 50 },
  { step: 600, l: 42 },
  { step: 700, l: 33 },
  { step: 800, l: 24 },
  { step: 900, l: 14 },
];

export type ShadeRow = { hex: string; name: string; step: number; isBase: boolean };

/**
 * Build the shade ladder for a brand colour.
 *
 * Two rules, and both were defects (D39):
 *
 *  • **The ladder must ROUND-TRIP.** The old sweep ran L from 92 to 12 in
 *    even steps, so the brand's own hex was never on it — Raqm's Iris
 *    `#7231FF` came back as `#7A3DFF`, a colour the brand does not own,
 *    printed under the brand's own name. Here the brand hex CLAIMS the
 *    rung nearest its own lightness, verbatim; the other rungs are drawn
 *    around it.
 *  • **A shade name may never collide with a neutral's name.** The old
 *    path named each rung with `hexToName`, which returns the same
 *    dictionary the Neutral ladder uses — so the darkest step of Iris was
 *    called "Jet", which is also the name of a grey in every brand. Every
 *    rung is now `<Name> <step>`, which carries a digit and therefore
 *    cannot equal any entry in that dictionary.
 */
export function buildShadeRows(baseHex: string, name?: string): ShadeRow[] {
  const norm = normalizeHex(baseHex);
  const [h, s, l] = hexToHsl(norm);
  const label = (name ?? hexToName(norm)).trim() || 'Shade';
  // Whichever rung this colour is closest to becomes the colour itself.
  let baseIdx = 0;
  let bestDelta = Infinity;
  SHADE_STEPS.forEach(({ l: target }, i) => {
    const delta = Math.abs(target - l);
    if (delta < bestDelta) {
      bestDelta = delta;
      baseIdx = i;
    }
  });
  return SHADE_STEPS.map(({ step, l: target }, i) => ({
    hex: i === baseIdx ? norm : hslToHex(h, s, target),
    name: `${label} ${step}`,
    step,
    isBase: i === baseIdx,
  }));
}

/**
 * How much of a colour bundle to write.
 *
 * `lean` (the default) is SVG + PNG: the two formats every tool on earth
 * opens. `full` re-adds the JPG and the PDF-shaped `.ai`, which is the
 * only reason the old Colors download was 12–13 MB across 300+ files
 * (D37/D38) — a flat colour needs neither a lossy raster nor an
 * Illustrator container to be useful.
 */
export type BundleDepth = 'lean' | 'full';

/** Add a single-color bundle to a JSZip folder: svg + png, plus jpg/ai when full. */
export async function addColorBundleToZip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  folder: any,
  baseName: string,
  svg: string,
  width: number,
  height: number,
  depth: BundleDepth = 'lean',
) {
  folder.file(`${baseName}.svg`, svg);
  const { png, jpg } = await rasterizeSvg(svg, width, height);
  if (png) folder.file(`${baseName}.png`, png);
  if (depth === 'full') {
    if (jpg) folder.file(`${baseName}.jpg`, jpg);
    const ai = await buildAiBlob(svg, width, height);
    if (ai) folder.file(`${baseName}.ai`, ai);
  }
}

/** Trigger a browser download for an in-memory blob. */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Build a complete ZIP for one color: a single folder containing the
 *  base block and a Shades subfolder, each with svg/png/jpg/ai. */
export async function buildSingleColorZip(
  color: PaletteColor,
  depth: BundleDepth = 'lean',
): Promise<Blob> {
  const safe = slugify(color.name);
  const baseSvg = buildBaseColorSvg(color);
  const shades = buildShadeRows(color.hex, color.name);
  const shadesSvg = buildShadesSvg(shades);
  const shadesH = SHADES_ROW_H * shades.length;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip.folder(color.name);
  if (root) {
    await addColorBundleToZip(root, safe, baseSvg, BASE_W, BASE_H, depth);
    const shadesDir = root.folder('Shades');
    if (shadesDir) {
      await addColorBundleToZip(shadesDir, `${safe}-shades`, shadesSvg, SHADES_W, shadesH, depth);
    }
    // Dynamic so `tokensExport` can import the colour math from HERE
    // without the two modules forming a cycle.
    const { buildCssVariables, buildDesignTokensJson } = await import('./tokensExport');
    root.file('tokens.css', buildCssVariables([color], color.name));
    root.file('tokens.json', buildDesignTokensJson([color], color.name));
  }
  return zip.generateAsync({ type: 'blob' });
}

/** Build a complete ZIP for every color in the palette. Each color
 *  gets its own top-level folder with the same shape as the
 *  single-color bundle. `onProgress` fires after each color so callers
 *  can drive a visible progress indicator. */
export async function buildAllColorsZip(
  colors: PaletteColor[],
  brandName: string,
  onProgress?: (done: number, total: number, name: string) => void,
  depth: BundleDepth = 'lean',
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  // Track folder names so two colors with the same display name
  // (e.g. duplicates between core + accent) don't collide inside the
  // archive — we suffix with a counter just like setup does.
  const used = new Set<string>();
  for (const color of colors) {
    let folderName = color.name;
    let n = 2;
    while (used.has(folderName)) {
      folderName = `${color.name} ${n}`;
      n += 1;
    }
    used.add(folderName);
    const root = zip.folder(folderName);
    if (!root) continue;
    const safe = slugify(folderName);
    const baseSvg = buildBaseColorSvg(color);
    const shades = buildShadeRows(color.hex, color.name);
    const shadesSvg = buildShadesSvg(shades);
    const shadesH = SHADES_ROW_H * shades.length;
    await addColorBundleToZip(root, safe, baseSvg, BASE_W, BASE_H, depth);
    const shadesDir = root.folder('Shades');
    if (shadesDir) {
      await addColorBundleToZip(shadesDir, `${safe}-shades`, shadesSvg, SHADES_W, shadesH, depth);
    }
    onProgress?.(used.size, colors.length, folderName);
  }
  // Developer handoff travels with the artwork — a palette nobody can
  // paste into a stylesheet is a palette that gets re-typed by hand.
  const tokens = zip.folder('tokens');
  const { buildTokenFiles, buildAseBlob, buildColorsReadme } = await import('./tokensExport');
  if (tokens) {
    for (const { path, text } of buildTokenFiles(colors, brandName)) {
      tokens.file(path, text);
    }
    const ase = buildAseBlob(colors);
    if (ase) tokens.file('palette.ase', ase);
  }
  zip.file('README.md', buildColorsReadme(colors, brandName, depth));
  return zip.generateAsync({ type: 'blob' });
}

/* ─── Roles: what a colour DOES ───────────────────────────── */

/**
 * The Setup projection stores the palette POSITIONALLY —
 * `core = [primary, secondary, background?, …the rest]`, `accent`,
 * `grey` — and the kit used to print that position as the role, so a
 * brand with seven colours advertised "CORE 4", "CORE 5", "CORE 6"
 * (D40). Position answers the first two slots and nothing after them.
 *
 * Past `secondary` the colour itself is the evidence:
 *  • near-white → a **Background**, the ground a page is laid on;
 *  • greyscale  → a **Neutral**, text and rules;
 *  • anything with real chroma → an **Accent**.
 *
 * When the canonical `Brand` is available (the editor has it) the
 * hexes are matched against `colorSystem` first, so a background the
 * user actually assigned is named Background even if it is dark.
 */
export function roleForColor(
  hex: string,
  index: number,
  bucket: 'core' | 'accent' | 'grey',
  source?: Brand | null,
): PaletteRole {
  if (bucket === 'grey') return 'Neutral';
  if (bucket === 'accent') return 'Accent';
  if (index === 0) return 'Primary';
  if (index === 1) return 'Secondary';
  const cs = source?.colorSystem;
  const same = (other?: string) => !!other && normalizeHex(other) === normalizeHex(hex);
  if (same(cs?.primary?.hex ?? source?.primaryColor)) return 'Primary';
  if (same(cs?.secondary?.hex ?? source?.secondaryColor)) return 'Secondary';
  if (same(cs?.accent?.hex ?? source?.accentColor)) return 'Accent';
  if (isNearWhite(hex)) return 'Background';
  if (isGreyscale(hex)) return 'Neutral';
  return 'Accent';
}

/**
 * The brand's palette as roles, names and hexes — the one list the
 * tiles, the editor, the token exports and `brand.json` all read.
 *
 * Neutrals are the generated 32-step grey ladder and are OFF by
 * default: they belong to no brand, they are not what a designer means
 * by "the palette", and shipping them as first-class colours is what
 * made the Colors download 300+ files (D37).
 */
export function paletteFromMockBrand(
  brand: Pick<MockBrand, 'colors'>,
  opts?: { includeNeutrals?: boolean; source?: Brand | null },
): PaletteColor[] {
  const source = opts?.source ?? null;
  const out: PaletteColor[] = [
    ...brand.colors.core.map((c, i) => ({
      hex: c.hex,
      name: c.name,
      role: roleForColor(c.hex, i, 'core', source) as string,
    })),
    ...brand.colors.accent.map((c, i) => ({
      hex: c.hex,
      name: c.name,
      role: roleForColor(c.hex, i, 'accent', source) as string,
    })),
  ];
  if (opts?.includeNeutrals) {
    out.push(
      ...brand.colors.grey.map((c) => ({ hex: c.hex, name: c.name, role: 'Neutral' as string })),
    );
  }
  return out;
}

/* ─── Colour spaces + WCAG ────────────────────────────────── */

export function normalizeHex(hex: string): string {
  const m = (hex ?? '').trim().replace(/^#/, '');
  const expanded = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return '#000000';
  return `#${expanded.toUpperCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const v = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as [number, number, number];
}

/** Naive (device-independent) CMYK — the conversion print shops expect
 *  from an RGB source without an ICC profile in play. */
export function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const k = 1 - Math.max(rf, gf, bf);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - rf - k) / (1 - k);
  const m = (1 - gf - k) / (1 - k);
  const y = (1 - bf - k) / (1 - k);
  return [c, m, y, k].map((n) => Math.round(n * 100)) as [number, number, number, number];
}

export function formatRgb(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

export function formatCmyk(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToCmyk(r, g, b).join(' ');
}

export function formatHsl(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  return `${Math.round(h)}° ${Math.round(s)}% ${Math.round(l)}%`;
}

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hexes (1 … 21). */
export function contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

/** How a colour behaves against the two grounds every deliverable has. */
export function contrastReport(hex: string): {
  onWhite: { ratio: number; level: WcagLevel };
  onBlack: { ratio: number; level: WcagLevel };
} {
  const white = contrast(hex, '#FFFFFF');
  const black = contrast(hex, '#000000');
  return {
    onWhite: { ratio: white, level: wcagLevel(white) },
    onBlack: { ratio: black, level: wcagLevel(black) },
  };
}

/** Highest-contrast text colour for a ground — measured, not guessed. */
export function bestTextOn(hex: string): '#FFFFFF' | '#111113' {
  return contrast(hex, '#FFFFFF') >= contrast(hex, '#111113') ? '#FFFFFF' : '#111113';
}

export function isGreyscale(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 16;
}

export function isNearWhite(hex: string): boolean {
  return relativeLuminance(hex) > 0.7;
}

/**
 * The 60 / 30 / 10 usage split, extended to however many colours the
 * brand actually has. Deterministic, so the bar reads the same on
 * every surface that draws it.
 */
export function usageProportions(colors: PaletteColor[]): { color: PaletteColor; pct: number }[] {
  const WEIGHTS: Record<number, number[]> = {
    1: [100],
    2: [70, 30],
    3: [60, 30, 10],
    4: [55, 25, 12, 8],
    5: [50, 25, 12, 8, 5],
  };
  const shown = colors.slice(0, 5);
  const weights = WEIGHTS[shown.length] ?? [];
  return shown.map((color, i) => ({ color, pct: weights[i] ?? 0 }));
}

/* ─── Helpers ─────────────────────────────────────────────── */

export function slugify(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'color';
}

export function readableOn(hex: string): '#111113' | '#ffffff' {
  const m = hex.replace('#', '');
  const expanded = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#111113' : '#ffffff';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ─── Color math (HSL ↔ HEX) ──────────────────────────────── */

export function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const expanded = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (expanded.length !== 6) return [0, 0, 50];
  const r = parseInt(expanded.slice(0, 2), 16) / 255;
  const g = parseInt(expanded.slice(2, 4), 16) / 255;
  const b = parseInt(expanded.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m2) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
