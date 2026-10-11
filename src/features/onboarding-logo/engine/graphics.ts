/**
 * The brand's graphic language — as SVG strings.
 *
 * Strings rather than React so ONE builder serves the on-screen preview (as a
 * CSS background), the downloadable `.svg`, and the rasterised `.png`. The
 * preview and the file cannot disagree because they are the same bytes.
 *
 * The logo itself is the exception: a pattern or lockup made OF the logo is
 * drawn by `logoArt`, because Chromium will not paint an `<image>` inside an
 * SVG that is loaded through `<img>` or `url()`.
 */
import type { CornerStyle, Palette, PatternKind, ShapeMotif } from '../model/types';

export const PATTERN_LABEL: Record<PatternKind, string> = {
  grid: 'Measured grid',
  dots: 'Dot field',
  diagonal: 'Diagonal rhythm',
  waves: 'Soft waves',
  rings: 'Rings',
  confetti: 'Confetti',
  mark: 'Logo repeat',
};

export const MOTIF_LABEL: Record<ShapeMotif, string> = {
  block: 'Blocks',
  arc: 'Arcs',
  circle: 'Circles',
  diagonal: 'Diagonals',
  blob: 'Organic forms',
  line: 'Fine rules',
};

export const CORNER_LABEL: Record<CornerStyle, string> = {
  sharp: 'Sharp',
  soft: 'Soft',
  rounded: 'Rounded',
  pill: 'Pill',
};

/** Corner radius as a share of the element's shorter side. */
export const CORNER_RATIO: Record<CornerStyle, number> = {
  sharp: 0,
  soft: 0.05,
  rounded: 0.14,
  pill: 0.5,
};

export interface PatternColors {
  fg: string;
  bg: string;
  accent: string;
}

const f = (n: number) => Math.round(n * 100) / 100;

/** One tile's markup (no wrapper). The tile is `size` square and repeats seamlessly. */
export function patternContent(kind: Exclude<PatternKind, 'mark'>, c: PatternColors, size: number): string {
  const s = size;
  switch (kind) {
    case 'grid':
      return `<path d="M0 ${f(s / 2)}H${s}M${f(s / 2)} 0V${s}" stroke="${c.fg}" stroke-opacity="0.32" stroke-width="${f(s * 0.02)}" fill="none"/>`;
    case 'dots':
      return `<circle cx="${f(s / 2)}" cy="${f(s / 2)}" r="${f(s * 0.08)}" fill="${c.fg}" fill-opacity="0.55"/>`;
    case 'diagonal': {
      const w = f(s * 0.1);
      return `<path d="M${-s * 0.25} ${s * 0.25}L${s * 0.25} ${-s * 0.25}M0 ${s}L${s} 0M${s * 0.75} ${s * 1.25}L${s * 1.25} ${s * 0.75}" stroke="${c.fg}" stroke-opacity="0.45" stroke-width="${w}"/>`;
    }
    case 'waves': {
      const y = s / 2;
      const a = s * 0.16;
      return `<path d="M0 ${f(y)}C${f(s * 0.25)} ${f(y - a)} ${f(s * 0.25)} ${f(y - a)} ${f(s * 0.5)} ${f(y)}S${f(s * 0.75)} ${f(y + a)} ${s} ${f(y)}" stroke="${c.fg}" stroke-opacity="0.45" stroke-width="${f(s * 0.045)}" fill="none" stroke-linecap="round"/>`;
    }
    case 'rings':
      return `<circle cx="${f(s / 2)}" cy="${f(s / 2)}" r="${f(s * 0.34)}" stroke="${c.fg}" stroke-opacity="0.4" stroke-width="${f(s * 0.03)}" fill="none"/><circle cx="${f(s / 2)}" cy="${f(s / 2)}" r="${f(s * 0.16)}" stroke="${c.fg}" stroke-opacity="0.4" stroke-width="${f(s * 0.03)}" fill="none"/>`;
    case 'confetti':
      return [
        `<circle cx="${f(s * 0.22)}" cy="${f(s * 0.24)}" r="${f(s * 0.07)}" fill="${c.fg}" fill-opacity="0.7"/>`,
        `<rect x="${f(s * 0.6)}" y="${f(s * 0.16)}" width="${f(s * 0.16)}" height="${f(s * 0.06)}" rx="${f(s * 0.03)}" fill="${c.accent}" transform="rotate(32 ${f(s * 0.68)} ${f(s * 0.19)})"/>`,
        `<path d="M${f(s * 0.3)} ${f(s * 0.82)}l${f(s * 0.08)} -${f(s * 0.14)}l${f(s * 0.08)} ${f(s * 0.14)}z" fill="${c.accent}" fill-opacity="0.85"/>`,
        `<circle cx="${f(s * 0.78)}" cy="${f(s * 0.7)}" r="${f(s * 0.045)}" fill="${c.fg}" fill-opacity="0.5"/>`,
      ].join('');
  }
}

/** A repeating tile as a standalone SVG — for CSS backgrounds. */
export function patternTileSvg(kind: Exclude<PatternKind, 'mark'>, c: PatternColors, size = 48): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${c.bg}"/>${patternContent(kind, c, size)}</svg>`;
}

/** A filled swatch of the pattern — the downloadable file. */
export function patternSwatchSvg(kind: Exclude<PatternKind, 'mark'>, c: PatternColors, width = 1600, height = 1600, tile = 96): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="p" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">${patternContent(kind, c, tile)}</pattern></defs><rect width="${width}" height="${height}" fill="${c.bg}"/><rect width="${width}" height="${height}" fill="url(#p)"/></svg>`;
}

/** A quoted CSS url — Vite-inlined data URIs keep their quotes (see `landingpage/src/lib/cssUrl.ts`). */
export function cssUrl(svg: string): string {
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

/* ── Graphic elements ──────────────────────────────────────────────── */

export interface GraphicElement {
  id: string;
  name: string;
  svg: string;
}

function wrap(body: string, size = 400): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
}

/**
 * Four elements in the motif, coloured by the palette and cornered by the
 * system. The set is what a designer reaches for when a layout needs
 * something that is not a photo and not the logo.
 */
export function graphicElements(motif: ShapeMotif, p: Palette, corner: CornerStyle): GraphicElement[] {
  const S = 400;
  const r = (side: number) => f(side * CORNER_RATIO[corner]);
  const cols = [p.primary, p.secondary, p.accent, p.dark];
  const el = (id: string, name: string, body: string): GraphicElement => ({ id, name, svg: wrap(body, S) });
  switch (motif) {
    case 'block':
      return [
        el('block-a', 'Panel', `<rect x="40" y="40" width="320" height="320" rx="${r(320)}" fill="${cols[0]}"/>`),
        el('block-b', 'Split panel', `<rect x="40" y="40" width="320" height="150" rx="${r(150)}" fill="${cols[1]}"/><rect x="40" y="210" width="320" height="150" rx="${r(150)}" fill="${cols[0]}"/>`),
        el('block-c', 'Stack', `<rect x="40" y="200" width="150" height="160" rx="${r(150)}" fill="${cols[2]}"/><rect x="210" y="40" width="150" height="320" rx="${r(150)}" fill="${cols[0]}"/>`),
        el('block-d', 'Tag', `<rect x="40" y="150" width="320" height="100" rx="${r(100)}" fill="${cols[3]}"/>`),
      ];
    case 'arc':
      return [
        el('arc-a', 'Quarter arc', `<path d="M40 360V200A160 160 0 0 1 200 40H360V360Z" fill="${cols[0]}"/>`),
        el('arc-b', 'Half circle', `<path d="M40 300A160 160 0 0 1 360 300Z" fill="${cols[1]}"/>`),
        el('arc-c', 'Arch', `<path d="M90 360V200A110 110 0 0 1 310 200V360Z" fill="${cols[0]}"/><path d="M150 360V230A50 50 0 0 1 250 230V360Z" fill="${cols[2]}"/>`),
        el('arc-d', 'Ribbon', `<path d="M40 280C120 120 280 120 360 280" stroke="${cols[3]}" stroke-width="44" fill="none" stroke-linecap="round"/>`),
      ];
    case 'circle':
      return [
        el('circle-a', 'Disc', `<circle cx="200" cy="200" r="160" fill="${cols[0]}"/>`),
        el('circle-b', 'Pair', `<circle cx="150" cy="200" r="110" fill="${cols[1]}"/><circle cx="260" cy="200" r="110" fill="${cols[0]}" fill-opacity="0.9"/>`),
        el('circle-c', 'Pill', `<rect x="40" y="140" width="320" height="120" rx="60" fill="${cols[2]}"/>`),
        el('circle-d', 'Dot trio', `<circle cx="100" cy="200" r="50" fill="${cols[0]}"/><circle cx="200" cy="200" r="50" fill="${cols[1]}"/><circle cx="300" cy="200" r="50" fill="${cols[2]}"/>`),
      ];
    case 'diagonal':
      return [
        el('diag-a', 'Slash', `<path d="M120 40H360L280 360H40Z" fill="${cols[0]}"/>`),
        el('diag-b', 'Double slash', `<path d="M80 40H190L130 360H20Z" fill="${cols[1]}"/><path d="M250 40H380L320 360H190Z" fill="${cols[0]}"/>`),
        el('diag-c', 'Chevron', `<path d="M60 80L200 200L60 320H160L300 200L160 80Z" fill="${cols[2]}"/>`),
        el('diag-d', 'Cut corner', `<path d="M40 40H360V260L260 360H40Z" fill="${cols[3]}"/>`),
      ];
    case 'blob':
      return [
        el('blob-a', 'Pebble', `<path d="M200 46C292 40 362 110 352 204C344 296 276 360 190 354C104 348 44 286 48 196C52 110 112 52 200 46Z" fill="${cols[0]}"/>`),
        el('blob-b', 'Leaf', `<path d="M60 340C60 160 180 60 340 60C340 240 220 340 60 340Z" fill="${cols[1]}"/>`),
        el('blob-c', 'Drop', `<path d="M200 40C260 130 320 190 320 250A120 120 0 0 1 80 250C80 190 140 130 200 40Z" fill="${cols[2]}"/>`),
        el('blob-d', 'Squiggle', `<path d="M50 220C90 140 140 140 170 210S250 280 290 200S350 150 360 180" stroke="${cols[0]}" stroke-width="30" fill="none" stroke-linecap="round"/>`),
      ];
    case 'line':
      return [
        el('line-a', 'Rule', `<rect x="40" y="196" width="320" height="8" fill="${cols[3]}"/>`),
        el('line-b', 'Frame', `<rect x="60" y="60" width="280" height="280" rx="${r(280)}" stroke="${cols[0]}" stroke-width="6" fill="none"/>`),
        el('line-c', 'Columns', `<rect x="70" y="60" width="6" height="280" fill="${cols[0]}"/><rect x="197" y="60" width="6" height="280" fill="${cols[0]}"/><rect x="324" y="60" width="6" height="280" fill="${cols[0]}"/>`),
        el('line-d', 'Underline', `<rect x="40" y="170" width="200" height="60" rx="${r(60)}" fill="${cols[1]}"/><rect x="40" y="250" width="320" height="6" fill="${cols[2]}"/>`),
      ];
  }
}
