/**
 * Procedural template asset generator.
 *
 * The production pipeline (spec §8) ships photographs + hand-made
 * Photoshop displacement/lighting/mask layers per template. V1 ships
 * procedural placeholders so the engine + UI can be built, tested, and
 * shown end-to-end without blocking on the asset-production workstream.
 *
 * Each descriptor produces a set of data-URL images the engine treats
 * identically to real ones. When a real template is added later, drop
 * the raw files into the template's folder and swap the `assets` map.
 */

export interface ProceduralTemplateDescriptor {
  id: string;
  /** Overall canvas size (square for simplicity). */
  canvas: number;
  /** Backdrop color behind the product silhouette. */
  backgroundColor: string;
  /** Base color of the product itself. */
  productColor: string;
  /** Silhouette shape — which primitive draws the product outline. */
  shape: 'tshirt' | 'businessCard' | 'mug' | 'phone' | 'poster';
  /** Zone where the design goes (in canvas coords, 0–1 normalized). */
  designZone: { x: number; y: number; width: number; height: number };
}

export interface ProceduralAssets {
  base: string;
  displacement: string;
  lighting: string;
  mask: string;
  tintMask: string;
  thumbnail: string;
}

/** Cached per-descriptor so we don't redraw on every re-render. */
const cache = new Map<string, ProceduralAssets>();

export function generateProceduralAssets(
  desc: ProceduralTemplateDescriptor,
): ProceduralAssets {
  const cached = cache.get(desc.id);
  if (cached) return cached;

  const base = drawBase(desc);
  const displacement = drawDisplacement(desc);
  const lighting = drawLighting(desc);
  const mask = drawProductMask(desc, 'designZone');
  const tintMask = drawProductMask(desc, 'product');
  const thumbnail = drawBase(desc, 512);

  const assets: ProceduralAssets = {
    base,
    displacement,
    lighting,
    mask,
    tintMask,
    thumbnail,
  };
  cache.set(desc.id, assets);
  return assets;
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

function drawBase(desc: ProceduralTemplateDescriptor, overrideSize?: number): string {
  const size = overrideSize ?? desc.canvas;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = desc.backgroundColor;
  ctx.fillRect(0, 0, size, size);
  // Subtle vignette for a photo-like feel.
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.2,
    size / 2,
    size / 2,
    size * 0.72,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  drawProductShape(ctx, desc, size, { fill: desc.productColor, shadow: true });
  return c.toDataURL('image/png');
}

function drawDisplacement(desc: ProceduralTemplateDescriptor): string {
  const size = desc.canvas;
  const [c, ctx] = makeCanvas(size);
  // Mid-gray = no displacement. We add a gentle bump map centered on the
  // design zone so the design catches a faint 3D curl.
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  const zone = desc.designZone;
  const cx = zone.x * size + (zone.width * size) / 2;
  const cy = zone.y * size + (zone.height * size) / 2;
  const r = Math.max(zone.width, zone.height) * size * 0.6;
  const grad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.2, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(192,192,192,1)');
  grad.addColorStop(0.5, 'rgba(140,140,140,1)');
  grad.addColorStop(1, 'rgba(128,128,128,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c.toDataURL('image/png');
}

function drawLighting(desc: ProceduralTemplateDescriptor): string {
  const size = desc.canvas;
  const [c, ctx] = makeCanvas(size);
  // Multiply-blended, so white = no effect, dark = shadow.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const zone = desc.designZone;
  const cx = zone.x * size + (zone.width * size) / 2;
  const cy = zone.y * size + (zone.height * size) / 2;
  const r = Math.max(zone.width, zone.height) * size * 0.55;
  // Soft top-left highlight.
  const grad1 = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.35,
    0,
    cx - r * 0.3,
    cy - r * 0.35,
    r * 0.6,
  );
  grad1.addColorStop(0, 'rgba(255,255,255,1)');
  grad1.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, size, size);
  // Bottom-right shadow.
  const grad2 = ctx.createRadialGradient(
    cx + r * 0.3,
    cy + r * 0.3,
    0,
    cx + r * 0.3,
    cy + r * 0.3,
    r,
  );
  grad2.addColorStop(0, 'rgba(40,40,40,0.35)');
  grad2.addColorStop(1, 'rgba(40,40,40,0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, size, size);
  return c.toDataURL('image/png');
}

function drawProductMask(
  desc: ProceduralTemplateDescriptor,
  mode: 'product' | 'designZone',
): string {
  const size = desc.canvas;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  if (mode === 'product') {
    drawProductShape(ctx, desc, size, { fill: '#ffffff' });
  } else {
    const zone = desc.designZone;
    const x = zone.x * size;
    const y = zone.y * size;
    const w = zone.width * size;
    const h = zone.height * size;
    ctx.fillStyle = '#ffffff';
    ctx.filter = 'blur(2px)';
    ctx.fillRect(x, y, w, h);
    ctx.filter = 'none';
  }
  return c.toDataURL('image/png');
}

function drawProductShape(
  ctx: CanvasRenderingContext2D,
  desc: ProceduralTemplateDescriptor,
  size: number,
  opts: { fill: string; shadow?: boolean },
) {
  ctx.save();
  if (opts.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = size * 0.04;
    ctx.shadowOffsetY = size * 0.015;
  }
  ctx.fillStyle = opts.fill;
  switch (desc.shape) {
    case 'tshirt':
      drawTshirt(ctx, size);
      break;
    case 'businessCard':
      drawBusinessCard(ctx, size);
      break;
    case 'mug':
      drawMug(ctx, size);
      break;
    case 'phone':
      drawPhone(ctx, size);
      break;
    case 'poster':
      drawPoster(ctx, size);
      break;
  }
  ctx.restore();
}

function drawTshirt(ctx: CanvasRenderingContext2D, size: number) {
  // Simple t-shirt silhouette — hand-tuned bezier path.
  const cx = size / 2;
  const w = size * 0.72;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = size * 0.18;
  const neckTop = top + size * 0.02;
  const shoulderY = top + size * 0.05;
  const sleeveOutY = top + size * 0.2;
  const bodyOutY = size * 0.28;
  const hem = size * 0.88;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.08, top);
  // Collar — gentle curve.
  ctx.quadraticCurveTo(cx, neckTop + size * 0.05, cx + size * 0.08, top);
  // Shoulder to sleeve (right).
  ctx.lineTo(right - size * 0.02, shoulderY);
  ctx.quadraticCurveTo(right + size * 0.01, sleeveOutY - size * 0.02, right, sleeveOutY);
  ctx.lineTo(right - size * 0.08, sleeveOutY + size * 0.03);
  // Armpit right.
  ctx.quadraticCurveTo(right - size * 0.14, bodyOutY - size * 0.02, right - size * 0.14, bodyOutY);
  // Body right.
  ctx.lineTo(right - size * 0.16, hem);
  // Hem.
  ctx.lineTo(left + size * 0.16, hem);
  // Body left.
  ctx.lineTo(left + size * 0.14, bodyOutY);
  // Armpit left.
  ctx.quadraticCurveTo(left + size * 0.14, bodyOutY - size * 0.02, left + size * 0.08, sleeveOutY + size * 0.03);
  // Sleeve left.
  ctx.lineTo(left, sleeveOutY);
  ctx.quadraticCurveTo(left - size * 0.01, sleeveOutY - size * 0.02, left + size * 0.02, shoulderY);
  ctx.lineTo(cx - size * 0.08, top);
  ctx.closePath();
  ctx.fill();
}

function drawBusinessCard(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.7;
  const h = size * 0.4;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  const r = size * 0.02;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function drawMug(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const w = size * 0.5;
  const h = size * 0.5;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // Body.
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, size * 0.03);
  ctx.fill();
  // Handle (ring on right).
  ctx.beginPath();
  ctx.arc(x + w + size * 0.04, cy, size * 0.1, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.stroke();
}

function drawPhone(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.36;
  const h = size * 0.72;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  const r = size * 0.04;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function drawPoster(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.5;
  const h = size * 0.72;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  roundRect(ctx, x, y, w, h, size * 0.005);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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
