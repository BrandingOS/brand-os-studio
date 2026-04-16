// Quality checks for a logo. Phase 5 adds uniqueness (Google Custom Search) and
// AI-heuristic memorability. Phase 4 ships the checks that can run locally:
//
//   - scalability:   can we still read the logo at 16px?
//   - contrast:      WCAG AA contrast against white and black backgrounds
//
// Both are heuristic. Perfection is not the goal — meaningful feedback is.

export type CheckScore = 'excellent' | 'good' | 'poor';

export interface QualityReport {
  scalability: { score: CheckScore; note: string };
  contrast: { score: CheckScore; note: string };
}

// ── Contrast ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, '');
  if (m.length === 3) {
    const r = parseInt(m[0] + m[0], 16);
    const g = parseInt(m[1] + m[1], 16);
    const b = parseInt(m[2] + m[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  return null;
}

function relLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 1;
  const la = relLuminance(ra);
  const lb = relLuminance(rb);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function scoreContrast(primaryHex: string): QualityReport['contrast'] {
  const vsWhite = contrastRatio(primaryHex, '#ffffff');
  const vsBlack = contrastRatio(primaryHex, '#000000');
  const best = Math.max(vsWhite, vsBlack);
  // WCAG AA large: 3:1. AA normal: 4.5:1. AAA: 7:1.
  if (best >= 7) return { score: 'excellent', note: `WCAG AAA vs ${vsWhite >= vsBlack ? 'white' : 'black'}` };
  if (best >= 4.5) return { score: 'good', note: `WCAG AA vs ${vsWhite >= vsBlack ? 'white' : 'black'}` };
  return { score: 'poor', note: 'Low contrast against both backgrounds' };
}

// ── Scalability ─────────────────────────────────────────────────────

export interface ScalabilityInput {
  objectCount: number;
  smallestObjectArea: number; // sq px at 1x
  canvasArea: number;
}

export function scoreScalability(input: ScalabilityInput): QualityReport['scalability'] {
  const { objectCount, smallestObjectArea, canvasArea } = input;
  // Tiny details shrink to sub-pixel at 16px. A 16x16 icon is 256 px² target.
  // If the smallest element occupies less than 0.5% of the canvas, it likely
  // disappears at favicon size.
  const ratio = smallestObjectArea / canvasArea;
  if (ratio < 0.005 && objectCount > 4) {
    return { score: 'poor', note: 'Small details may vanish at favicon size' };
  }
  if (objectCount > 10) {
    return { score: 'good', note: 'Many elements — simplify for better recall' };
  }
  return { score: 'excellent', note: 'Reads cleanly at 16px and 512px' };
}

// ── Canvas-aware wrapper ────────────────────────────────────────────

// Pulls scalability inputs off a Fabric canvas without importing fabric here,
// so this module stays pure and testable.
export interface CanvasLike {
  getWidth: () => number;
  getHeight: () => number;
  getObjects: () => Array<{ width?: number; height?: number; scaleX?: number; scaleY?: number }>;
}

export function fromCanvas(canvas: CanvasLike, primaryHex: string): QualityReport {
  const objects = canvas.getObjects();
  const areas = objects
    .map((o) => (o.width ?? 0) * (o.scaleX ?? 1) * ((o.height ?? 0) * (o.scaleY ?? 1)))
    .filter((a) => a > 0);
  const smallest = areas.length ? Math.min(...areas) : 0;
  const canvasArea = canvas.getWidth() * canvas.getHeight();
  return {
    scalability: scoreScalability({
      objectCount: objects.length,
      smallestObjectArea: smallest,
      canvasArea: canvasArea || 1,
    }),
    contrast: scoreContrast(primaryHex),
  };
}
