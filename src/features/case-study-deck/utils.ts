/** Pure utilities for the case-study-deck feature. */

/** Parse `#RRGGBB` / `#RGB` / `rgb()` into [r,g,b] 0-255. Returns null on failure. */
export function parseHex(input: string | undefined): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    if (parts.length < 3) return null;
    return [clamp255(parts[0]), clamp255(parts[1]), clamp255(parts[2])];
  }

  const hex = s.startsWith('#') ? s.slice(1) : s;
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

function clamp255(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function toHex([r, g, b]: [number, number, number]): string {
  const p = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

/** Relative luminance 0..1 per WCAG. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns '#FFFFFF' or '#111111' — the best ink on top of `bg`. */
export function inkOn(bg: string): string {
  return luminance(bg) > 0.55 ? '#111111' : '#FFFFFF';
}

/** hex → rgb string "R, G, B". */
export function rgbString(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '0, 0, 0';
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

/** hex → hsl string "H°, S%, L%". */
export function hslString(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '0°, 0%, 0%';
  const [h, s, l] = rgbToHsl(rgb);
  return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`;
}

/** hex → hsv string. */
export function hsvString(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '0°, 0%, 0%';
  const [h, s, v] = rgbToHsv(rgb);
  return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(v)}%`;
}

/** Approximate cmyk from rgb. */
export function cmykString(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '0%, 0%, 0%, 0%';
  const [r, g, b] = rgb.map((c) => c / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return '0%, 0%, 0%, 100%';
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return `${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%`;
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)); break;
      case ng: h = (nb - nr) / d + 2; break;
      default: h = (nr - ng) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function rgbToHsv([r, g, b]: [number, number, number]): [number, number, number] {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)); break;
      case ng: h = (nb - nr) / d + 2; break;
      default: h = (nr - ng) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}

/** Lighten or darken `hex` by `amount` (0..1). Positive = lighter. */
export function shiftLightness(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(rgb);
  const nl = Math.max(0, Math.min(100, l + amount * 100));
  return hslToHex(h, s, nl);
}

function hslToHex(h: number, s: number, l: number): string {
  const nh = h / 360, ns = s / 100, nl = l / 100;
  let r: number, g: number, b: number;
  if (ns === 0) { r = g = b = nl; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
    const p = 2 * nl - q;
    r = hue2rgb(p, q, nh + 1 / 3);
    g = hue2rgb(p, q, nh);
    b = hue2rgb(p, q, nh - 1 / 3);
  }
  return toHex([r * 255, g * 255, b * 255]);
}

/** Small stable hash for signature/cache-busting. */
export function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/**
 * Deterministic pseudo-random. Given the same seed, same sequence of numbers.
 * Used by the signature slide so the same brand always gets the same artwork.
 */
export function seedRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) | 0;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return ((state >>> 0) % 100000) / 100000;
  };
}

/** Build a Google Fonts stylesheet URL for one or more font families. */
export function buildGoogleFontsUrl(families: { family: string; weights?: number[] }[]): string | null {
  const parts = families
    .filter((f) => f.family)
    .map((f) => {
      const name = f.family.replace(/\s+/g, '+');
      const weights = (f.weights && f.weights.length ? f.weights : [400, 700]).join(';');
      return `family=${name}:wght@${weights}`;
    });
  if (!parts.length) return null;
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}
