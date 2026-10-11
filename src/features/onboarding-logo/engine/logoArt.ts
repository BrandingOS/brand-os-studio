/**
 * The logo, made into a system.
 *
 * One black mark becomes: the mark in each sanctioned colour, reversed on the
 * brand's ground, set beside the name as a lockup, and repeated as a pattern.
 *
 * Two pipelines, and the difference is honest rather than hidden:
 *   VECTOR — the owner uploaded an SVG. We recolour its own paths and nest it,
 *            so every `.svg` we hand back is still a real vector.
 *   RASTER — a PNG/JPG. We tint the isolated ink on a canvas. The files are
 *            high-resolution PNGs, and the package says an SVG upload would
 *            give vectors instead of pretending a wrapped bitmap is one.
 */
import type { LogoSource, Palette, BrandSystem } from '../model/types';

/* ── Vector ────────────────────────────────────────────────────────── */

const PAINT_ATTRS = ['fill', 'stroke'] as const;

function paintable(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v !== 'none' && v !== 'transparent' && !v.startsWith('url(');
}

/**
 * Every painted thing in the SVG becomes `color`.
 *
 * A solid logo is one ink, so this is a faithful recolour. Gradients and
 * `none` are left alone — they were a decision, not an ink.
 */
export function recolorSvg(svgText: string, color: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return svgText;
  for (const el of Array.from(root.querySelectorAll('*'))) {
    for (const attr of PAINT_ATTRS) {
      if (paintable(el.getAttribute(attr))) el.setAttribute(attr, color);
    }
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute(
        'style',
        style.replace(/(fill|stroke)\s*:\s*([^;]+)/gi, (m, prop: string, val: string) => (paintable(val) ? `${prop}:${color}` : m)),
      );
    }
    if (el.nodeName.toLowerCase() === 'style' && el.textContent) {
      el.textContent = el.textContent.replace(/(fill|stroke)\s*:\s*([^;}]+)/gi, (m, prop: string, val: string) =>
        paintable(val) ? `${prop}:${color}` : m,
      );
    }
  }
  // Unpainted shapes default to black; the root's fill is what they inherit.
  root.setAttribute('fill', color);
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(root);
}

/** The recoloured SVG, positioned inside a larger SVG. */
export function nestedSvg(svgText: string, color: string, x: number, y: number, w: number, h: number): string {
  const doc = new DOMParser().parseFromString(recolorSvg(svgText, color), 'image/svg+xml');
  const root = doc.documentElement;
  if (!root.getAttribute('viewBox')) {
    const ow = parseFloat(root.getAttribute('width') ?? '');
    const oh = parseFloat(root.getAttribute('height') ?? '');
    if (ow > 0 && oh > 0) root.setAttribute('viewBox', `0 0 ${ow} ${oh}`);
  }
  root.setAttribute('x', String(x));
  root.setAttribute('y', String(y));
  root.setAttribute('width', String(w));
  root.setAttribute('height', String(h));
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return new XMLSerializer().serializeToString(root);
}

/** The mark on a ground, with clear space, as a standalone vector file. */
export function logoOnGroundSvg(svgText: string, ink: string, ground: string | null, ratio: number, clearSpace: number): string {
  const h = 400;
  const w = Math.round(h * ratio);
  const pad = Math.round(h * clearSpace);
  const W = w + pad * 2;
  const H = h + pad * 2;
  const bg = ground ? `<rect width="${W}" height="${H}" fill="${ground}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${nestedSvg(svgText, ink, pad, pad, w, h)}</svg>`;
}

/* ── Raster ────────────────────────────────────────────────────────── */

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image failed to load'));
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return [c, c.getContext('2d')!];
}

/** The ink in one colour, at `height` px tall. */
async function tintedInk(source: LogoSource, color: string, height: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(source.inkUrl);
  const ratio = source.width / source.height;
  const [c, ctx] = canvas(height * ratio, height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

const tintCache = new Map<string, Promise<string>>();

/**
 * The mark in one colour, as a PNG data URL, cached per colour.
 *
 * The UI draws the logo as an `<img>` of this rather than a CSS mask: a mask
 * is invisible to html2canvas, so a board snapshotted for export would arrive
 * without its logo.
 */
export function tintedDataUrl(source: LogoSource, color: string, height = 400): Promise<string> {
  const key = `${source.inkUrl.length}|${source.inkUrl.slice(-48)}|${color}|${height}`;
  let p = tintCache.get(key);
  if (!p) {
    p = tintedInk(source, color, height).then((c) => c.toDataURL('image/png'));
    p.catch(() => tintCache.delete(key));
    tintCache.set(key, p);
  }
  return p;
}

/** One tile of the logo-repeat pattern, as a PNG data URL — for CSS backgrounds. */
export function markTileDataUrl(source: LogoSource, fg: string, tile: number): Promise<string> {
  const key = `tile|${source.inkUrl.length}|${source.inkUrl.slice(-48)}|${fg}|${tile}`;
  let p = tintCache.get(key);
  if (!p) {
    p = (async () => {
      const scale = 2;
      const markH = tile * 0.32 * scale;
      const mark = await tintedInk(source, fg, markH);
      const [c, ctx] = canvas(tile * scale, tile * scale);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(mark, (c.width - mark.width) / 2, (c.height - mark.height) / 2);
      return c.toDataURL('image/png');
    })();
    tintCache.set(key, p);
  }
  return p;
}

export interface LogoPngOptions {
  color: string;
  /** Height of the mark itself, px. */
  height: number;
  ground?: string | null;
  /** Clear space as a share of the mark's height. */
  pad?: number;
}

export async function logoPng(source: LogoSource, o: LogoPngOptions): Promise<Blob> {
  const mark = await tintedInk(source, o.color, o.height);
  const pad = Math.round(o.height * (o.pad ?? 0));
  const [c, ctx] = canvas(mark.width + pad * 2, mark.height + pad * 2);
  if (o.ground) {
    ctx.fillStyle = o.ground;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(mark, pad, pad);
  return toBlob(c);
}

export function toBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas export failed'))), type, quality),
  );
}

/** Waits for a web font so a canvas does not silently draw the fallback. */
export async function ensureFont(family: string, weight: number): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      document.fonts.load(`${weight} 64px "${family}"`),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back silently — the file still names the family */
  }
}

export interface LockupOptions {
  name: string;
  layout: 'horizontal' | 'stacked';
  ink: string;
  ground?: string | null;
  font: string;
  weight: number;
  /** Mark height, px. */
  height: number;
  pad?: number;
}

/** Symbol + name, set in the heading face. Proportions follow the mark's height. */
export async function lockupPng(source: LogoSource, o: LockupOptions): Promise<Blob> {
  await ensureFont(o.font, o.weight);
  const mark = await tintedInk(source, o.ink, o.height);
  const size = o.layout === 'horizontal' ? o.height * 0.52 : o.height * 0.36;
  const [, probe] = canvas(10, 10);
  probe.font = `${o.weight} ${size}px "${o.font}", sans-serif`;
  const textW = probe.measureText(o.name).width;
  const gap = o.height * (o.layout === 'horizontal' ? 0.32 : 0.22);
  const pad = Math.round(o.height * (o.pad ?? 0.35));
  const w = o.layout === 'horizontal' ? mark.width + gap + textW : Math.max(mark.width, textW);
  const h = o.layout === 'horizontal' ? mark.height : mark.height + gap + size * 1.1;
  const [c, ctx] = canvas(w + pad * 2, h + pad * 2);
  if (o.ground) {
    ctx.fillStyle = o.ground;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.font = `${o.weight} ${size}px "${o.font}", sans-serif`;
  ctx.fillStyle = o.ink;
  ctx.textBaseline = 'middle';
  if (o.layout === 'horizontal') {
    ctx.drawImage(mark, pad, pad);
    ctx.fillText(o.name, pad + mark.width + gap, pad + mark.height / 2);
  } else {
    ctx.drawImage(mark, pad + (w - mark.width) / 2, pad);
    ctx.textAlign = 'center';
    ctx.fillText(o.name, pad + w / 2, pad + mark.height + gap + size * 0.55);
  }
  return toBlob(c);
}

/** The vector lockup — only when the mark is vector. The type is live text naming the family. */
export function lockupSvg(svgText: string, ratio: number, o: Omit<LockupOptions, 'height' | 'pad'>): string {
  const H = 200;
  const markW = Math.round(H * ratio);
  const size = o.layout === 'horizontal' ? H * 0.52 : H * 0.36;
  const gap = H * (o.layout === 'horizontal' ? 0.32 : 0.22);
  const textW = o.name.length * size * 0.6;
  const pad = 70;
  const w = o.layout === 'horizontal' ? markW + gap + textW : Math.max(markW, textW);
  const h = o.layout === 'horizontal' ? H : H + gap + size * 1.1;
  const W = Math.round(w + pad * 2);
  const Ht = Math.round(h + pad * 2);
  const bg = o.ground ? `<rect width="${W}" height="${Ht}" fill="${o.ground}"/>` : '';
  const esc = o.name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const text =
    o.layout === 'horizontal'
      ? `<text x="${pad + markW + gap}" y="${pad + H / 2}" dominant-baseline="middle" font-family="${o.font}" font-weight="${o.weight}" font-size="${size}" fill="${o.ink}">${esc}</text>`
      : `<text x="${W / 2}" y="${pad + H + gap + size * 0.8}" text-anchor="middle" font-family="${o.font}" font-weight="${o.weight}" font-size="${size}" fill="${o.ink}">${esc}</text>`;
  const markX = o.layout === 'horizontal' ? pad : (W - markW) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}" viewBox="0 0 ${W} ${Ht}">${bg}${nestedSvg(svgText, o.ink, markX, pad, markW, H)}${text}</svg>`;
}

/** The logo repeated as a pattern, for download. */
export async function markPatternPng(source: LogoSource, fg: string, bg: string, size = 1600): Promise<Blob> {
  const tile = size / 8;
  const markH = tile * 0.32;
  const mark = await tintedInk(source, fg, markH);
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.35;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const x = col * tile + (row % 2 ? tile / 2 : 0) - mark.width / 2;
      const y = row * tile - mark.height / 2;
      ctx.drawImage(mark, x, y);
    }
  }
  return toBlob(c);
}

/* ── The sanctioned variations ─────────────────────────────────────── */

export interface LogoVariation {
  id: string;
  name: string;
  /** Where it is meant to be used. */
  usage: string;
  ink: string;
  ground: string | null;
}

/** The ink the system chose for the default logo. */
export function primaryInk(system: Pick<BrandSystem, 'logo' | 'palette'>): string {
  return system.logo.ink === 'primary' ? system.palette.primary : system.palette.dark;
}

export function logoVariations(system: Pick<BrandSystem, 'logo' | 'palette'>): LogoVariation[] {
  const p: Palette = system.palette;
  const ink = primaryInk(system);
  const out: LogoVariation[] = [
    { id: 'primary', name: 'Primary', usage: 'The default. Light grounds, most of the time.', ink, ground: null },
    { id: 'reversed', name: 'Reversed', usage: 'On the primary colour — covers, hero bands, avatars.', ink: '#ffffff', ground: p.primary },
    { id: 'on-dark', name: 'On dark', usage: 'On the ink colour and on photography.', ink: '#ffffff', ground: p.dark },
    { id: 'black', name: 'One-colour black', usage: 'Single-colour print, stamps, engraving, fax.', ink: '#000000', ground: null },
    { id: 'white', name: 'One-colour white', usage: 'Knock-out on any dark or busy ground.', ink: '#ffffff', ground: null },
  ];
  if (system.logo.ink === 'dark') {
    out.splice(1, 0, { id: 'brand', name: 'Brand colour', usage: 'When the mark should carry the colour itself.', ink: p.primary, ground: null });
  }
  return out;
}
