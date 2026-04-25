/**
 * Procedural mask + lighting generator for photo templates.
 *
 * Each template ships with a real photograph as its base layer. We
 * still need a mask (where the user's design lands) and an optional
 * lighting layer (subtle highlight + shadow to integrate the design
 * with the photo). Both are generated at runtime from a small set of
 * coordinates so we don't have to hand-author Photoshop layers.
 *
 * For real, hand-authored mockup templates with surface-accurate
 * displacement and lighting, drop the raw .webp files into the
 * template's data folder and skip the procedural helpers entirely
 * — the engine treats both paths identically.
 */

export interface MaskDescriptor {
  /** Output canvas size in pixels. Should match the base photo's size. */
  canvas: number;
  /** Where the design appears, in fractional coords of the canvas. */
  zone: { x: number; y: number; width: number; height: number; rotation?: number };
  /** Edge feather in pixels — softens the mask edge so designs blend in. */
  feather?: number;
  /** Mask shape — `rect` for a clean rectangle, `oval` for a soft ellipse. */
  shape?: 'rect' | 'oval';
}

export interface LightingDescriptor {
  canvas: number;
  zone: { x: number; y: number; width: number; height: number };
  /** Direction of the dominant light source. Default: top-left. */
  highlight?: 'top-left' | 'top' | 'top-right' | 'left' | 'right';
  /** How dark the shadow falloff should be. 0 = no shadow, 1 = strong. */
  shadowStrength?: number;
}

/** Cache by JSON key — descriptors are small, hashing is cheap. */
const maskCache = new Map<string, string>();
const lightCache = new Map<string, string>();

export function generateZoneMask(desc: MaskDescriptor): string {
  const key = JSON.stringify(desc);
  const cached = maskCache.get(key);
  if (cached) return cached;
  const out = drawZoneMask(desc);
  maskCache.set(key, out);
  return out;
}

export function generateLightingOverlay(desc: LightingDescriptor): string {
  const key = JSON.stringify(desc);
  const cached = lightCache.get(key);
  if (cached) return cached;
  const out = drawLightingOverlay(desc);
  lightCache.set(key, out);
  return out;
}

// ─── drawing primitives ──────────────────────────────────────────

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  return [c, ctx];
}

function drawZoneMask(desc: MaskDescriptor): string {
  const size = desc.canvas;
  const [c, ctx] = makeCanvas(size);
  // Black background — Pixi luminance masks treat black as fully clipped.
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const x = desc.zone.x * size;
  const y = desc.zone.y * size;
  const w = desc.zone.width * size;
  const h = desc.zone.height * size;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Apply rotation around the zone center for tilted-product mockups.
  if (desc.zone.rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((desc.zone.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = '#ffffff';
  ctx.filter = `blur(${desc.feather ?? 4}px)`;

  if (desc.shape === 'oval') {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rounded-rect with a generous corner radius for soft edges.
    const r = Math.min(w, h) * 0.06;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  ctx.filter = 'none';
  if (desc.zone.rotation) ctx.restore();

  return c.toDataURL('image/png');
}

function drawLightingOverlay(desc: LightingDescriptor): string {
  const size = desc.canvas;
  const [c, ctx] = makeCanvas(size);
  // Lighting layer is multiply-blended; white = no effect, dark = shadow.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const x = desc.zone.x * size;
  const y = desc.zone.y * size;
  const w = desc.zone.width * size;
  const h = desc.zone.height * size;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(w, h) * 0.6;

  const dir = desc.highlight ?? 'top-left';
  const offset = highlightOffset(dir, r);

  // Soft highlight from the chosen direction.
  const hi = ctx.createRadialGradient(
    cx + offset.hiX,
    cy + offset.hiY,
    0,
    cx + offset.hiX,
    cy + offset.hiY,
    r * 0.6,
  );
  hi.addColorStop(0, 'rgba(255,255,255,1)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(0, 0, size, size);

  // Falloff shadow on the opposite side.
  const strength = desc.shadowStrength ?? 0.25;
  const lo = ctx.createRadialGradient(
    cx + offset.loX,
    cy + offset.loY,
    0,
    cx + offset.loX,
    cy + offset.loY,
    r,
  );
  lo.addColorStop(0, `rgba(0,0,0,${strength})`);
  lo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lo;
  ctx.fillRect(0, 0, size, size);

  return c.toDataURL('image/png');
}

function highlightOffset(
  dir: NonNullable<LightingDescriptor['highlight']>,
  r: number,
): { hiX: number; hiY: number; loX: number; loY: number } {
  switch (dir) {
    case 'top':
      return { hiX: 0, hiY: -r * 0.4, loX: 0, loY: r * 0.4 };
    case 'top-right':
      return { hiX: r * 0.3, hiY: -r * 0.35, loX: -r * 0.3, loY: r * 0.3 };
    case 'left':
      return { hiX: -r * 0.4, hiY: 0, loX: r * 0.4, loY: 0 };
    case 'right':
      return { hiX: r * 0.4, hiY: 0, loX: -r * 0.4, loY: 0 };
    case 'top-left':
    default:
      return { hiX: -r * 0.3, hiY: -r * 0.35, loX: r * 0.3, loY: r * 0.3 };
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
