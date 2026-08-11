import { hexToName } from '@/features/setup/data/colorNames';

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

/** Build the 9-shade list for a base color. Lightest → darkest by
 *  sweeping the L channel of HSL. Pairs each shade with a hex-derived
 *  display name so the artwork matches what the editor renders. */
export function buildShadeRows(baseHex: string, count = 9): { hex: string; name: string }[] {
  const [h, s] = hexToHsl(baseHex);
  const top = 92;
  const bottom = 12;
  const shades: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    shades.push(hslToHex(h, s, top - t * (top - bottom)));
  }
  const used = new Set<string>();
  return shades.map((hex) => {
    const base = hexToName(hex);
    let name = base;
    let n = 2;
    while (used.has(name)) {
      name = `${base} ${n}`;
      n += 1;
    }
    used.add(name);
    return { hex, name };
  });
}

/** Add a single-color bundle to a JSZip folder: svg, png, jpg, ai. */
export async function addColorBundleToZip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  folder: any,
  baseName: string,
  svg: string,
  width: number,
  height: number,
) {
  folder.file(`${baseName}.svg`, svg);
  const { png, jpg } = await rasterizeSvg(svg, width, height);
  if (png) folder.file(`${baseName}.png`, png);
  if (jpg) folder.file(`${baseName}.jpg`, jpg);
  const ai = await buildAiBlob(svg, width, height);
  if (ai) folder.file(`${baseName}.ai`, ai);
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
export async function buildSingleColorZip(color: PaletteColor): Promise<Blob> {
  const safe = slugify(color.name);
  const baseSvg = buildBaseColorSvg(color);
  const shades = buildShadeRows(color.hex);
  const shadesSvg = buildShadesSvg(shades);
  const shadesH = SHADES_ROW_H * shades.length;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip.folder(color.name);
  if (root) {
    await addColorBundleToZip(root, safe, baseSvg, BASE_W, BASE_H);
    const shadesDir = root.folder('Shades');
    if (shadesDir) {
      await addColorBundleToZip(shadesDir, `${safe}-shades`, shadesSvg, SHADES_W, shadesH);
    }
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
    const shades = buildShadeRows(color.hex);
    const shadesSvg = buildShadesSvg(shades);
    const shadesH = SHADES_ROW_H * shades.length;
    await addColorBundleToZip(root, safe, baseSvg, BASE_W, BASE_H);
    const shadesDir = root.folder('Shades');
    if (shadesDir) {
      await addColorBundleToZip(shadesDir, `${safe}-shades`, shadesSvg, SHADES_W, shadesH);
    }
    onProgress?.(used.size, colors.length, folderName);
  }
  // Touch brandName so future iterations can use it for a top-level
  // README — kept in the API now so callers don't have to update.
  void brandName;
  return zip.generateAsync({ type: 'blob' });
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

function hexToHsl(hex: string): [number, number, number] {
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

function hslToHex(h: number, s: number, l: number): string {
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
