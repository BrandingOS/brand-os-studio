/**
 * Tiny CSS value parsers used by the DOM walker and the emitters.
 *
 * Kept as simple, dependency-free pure functions so they can be unit-tested
 * trivially and shared between SVG and PDF code paths.
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parse any browser-computed color string (hex / rgb / rgba) → RGBA. */
export function parseColor(value: string | undefined | null): RGBA | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'transparent' || v === 'none') return { r: 0, g: 0, b: 0, a: 0 };

  // Hex: #rgb / #rrggbb / #rrggbbaa
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: parseInt(hex.substring(6, 8), 16) / 255,
      };
    }
    return null;
  }

  // rgb() / rgba() — modern browsers always normalize computed colors to one of these
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map((p) => p.trim());
    if (parts.length >= 3) {
      return {
        r: clamp(parseFloat(parts[0]), 0, 255),
        g: clamp(parseFloat(parts[1]), 0, 255),
        b: clamp(parseFloat(parts[2]), 0, 255),
        a: parts[3] !== undefined ? clamp(parseFloat(parts[3]), 0, 1) : 1,
      };
    }
  }

  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** True if the parsed color is fully transparent (or unparseable). */
export function isTransparent(value: string | undefined | null): boolean {
  const c = parseColor(value);
  return !c || c.a === 0;
}

/** Convert an RGBA to a 6-char hex string ignoring alpha. */
export function rgbaToHex(c: RGBA): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

/** Convert a CSS font-weight value (number, 'normal', 'bold', '700', etc.) → numeric weight. */
export function parseFontWeight(value: string | undefined | null): number {
  if (!value) return 400;
  const v = value.trim().toLowerCase();
  if (v === 'normal') return 400;
  if (v === 'bold') return 700;
  if (v === 'lighter') return 300;
  if (v === 'bolder') return 700;
  const n = parseInt(v, 10);
  return isFinite(n) ? n : 400;
}

/** Pick the first family from a CSS font-family stack (stripping quotes). */
export function firstFontFamily(stack: string | undefined | null): string {
  if (!stack) return 'sans-serif';
  const first = stack.split(',')[0].trim();
  return first.replace(/^["']|["']$/g, '');
}

/** Parse a CSS pixel length (e.g. "16px", "0.5px") → number. Returns 0 for invalid. */
export function parsePx(value: string | undefined | null): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return isFinite(n) ? n : 0;
}

/** Average the four corner radii (top-left, top-right, bottom-right, bottom-left). */
export function averageBorderRadius(style: CSSStyleDeclaration): number {
  const tl = parsePx(style.borderTopLeftRadius);
  const tr = parsePx(style.borderTopRightRadius);
  const br = parsePx(style.borderBottomRightRadius);
  const bl = parsePx(style.borderBottomLeftRadius);
  return (tl + tr + br + bl) / 4;
}
