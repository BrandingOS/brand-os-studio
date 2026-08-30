/**
 * THE EXPORT MUST LOOK LIKE THE SCREEN.
 *
 * Every PNG the Brand Kit hands over is drawn by `snapshotElementPng`, and for
 * a long time the only definition of success was "a blob came back". A blob
 * always came back. What was in it (QA Q2/Q3) was text sheared through the
 * middle, a wordmark redrawn as a slab and a triangle, a round mark squashed to
 * an ellipse, and a mug with no handle — none of which any test could see,
 * because a test that opens the file is the only kind that can.
 *
 * So this suite rasterizes and then READS THE PIXELS. Three mechanisms, three
 * measurements, each one the shape of the bug it exists to catch:
 *
 *  1. **The baseline.** html2canvas measures where a font sits with a 1×1 probe
 *     image; Tailwind preflight's `img { display: block }` made that
 *     measurement "how tall is a line" instead, so every glyph was painted a
 *     line too low and clipped by whatever contained it.
 *  2. **`object-fit`.** html2canvas has none — it stretches a picture to its
 *     box — so a logo's proportions survived only by luck.
 *  3. **Inline `<svg>`.** It is serialized WITH the style that positioned it in
 *     the scene, which inside its own one-part document displaces the drawing
 *     off its own canvas.
 *
 * The fixture is deliberately not a product renderer: it is the smallest
 * arrangement that reproduces all three, so a failure names the mechanism
 * rather than a design. The real renderers are exercised at the end, once.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
// The real stylesheets — `.bk-snapshot-host` is what gives the offscreen mount
// its size, and `index.css` is where the preflight rule that broke the baseline
// lives. Without them this suite measures a different browser than the product.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { variantsForCard } from '../legacy-mapping';
import { aspectForLabel, featuredTemplates } from '../cardPresentation';
import { renderCosmosTemplate } from '../../renderers';
import {
  keepFontMetricsHonest,
  snapshotElementPng,
  snapshotTemplatePng,
} from '../templateSnapshot';

const LOGO = '/brands/raqm/logo-white.svg';
const GROUND = '#7231FF';

/** The 1×1 GIF html2canvas measures every baseline against. */
const PROBE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

afterEach(cleanup);

/* ───────────────────────────  reading the picture  ─────────────────────────── */

async function pixelsOf(blob: Blob | null): Promise<ImageData> {
  expect(blob).toBeTruthy();
  const bitmap = await createImageBitmap(blob!);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

type Box = { x: number; y: number; w: number; h: number };

/** Rows inside `box` that carry any ink, as booleans top to bottom. */
function inkRows(px: ImageData, box: Box, isInk: (r: number, g: number, b: number, a: number) => boolean): boolean[] {
  const rows: boolean[] = [];
  for (let y = box.y; y < box.y + box.h; y += 1) {
    let hit = false;
    for (let x = box.x; x < box.x + box.w && !hit; x += 1) {
      const i = (y * px.width + x) * 4;
      if (isInk(px.data[i]!, px.data[i + 1]!, px.data[i + 2]!, px.data[i + 3]!)) hit = true;
    }
    rows.push(hit);
  }
  return rows;
}

/** Contiguous runs of inked rows — one per line of type. */
function bands(rows: boolean[]): Array<{ from: number; to: number }> {
  const out: Array<{ from: number; to: number }> = [];
  let start = -1;
  rows.forEach((on, i) => {
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      out.push({ from: start, to: i - 1 });
      start = -1;
    }
  });
  if (start >= 0) out.push({ from: start, to: rows.length - 1 });
  return out;
}

/** The tightest rectangle around the ink in `box`. */
function inkBounds(px: ImageData, box: Box, isInk: (r: number, g: number, b: number, a: number) => boolean): Box | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      const i = (y * px.width + x) * 4;
      if (!isInk(px.data[i]!, px.data[i + 1]!, px.data[i + 2]!, px.data[i + 3]!)) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const dark = (r: number, g: number, b: number, a: number) => a > 40 && r < 120 && g < 120 && b < 120;
const notGround = (r: number, g: number, b: number, a: number) =>
  a > 40 && (Math.abs(r - 0x72) > 40 || Math.abs(g - 0x31) > 40 || Math.abs(b - 0xff) > 40);

/* ───────────────────────────  the fixture  ─────────────────────────── */

const SCALE = 4;
const W = 260;
const H = 160;

/** Copy box: exactly two lines tall, and it clips. */
const COPY = { left: 8, top: 8, width: 150, height: 15 };
/** A square well for a 4.2∶1 wordmark — `contain` is the whole point. */
const LOGO_BOX = { left: 180, top: 8, width: 64, height: 64 };
/** The mug handle's own numbers: a part positioned in the scene. */
const PART = { left: 62, top: 45, width: 16.8, height: 25 };

function fixture(): HTMLElement {
  const host = document.createElement('div');
  host.className = 'bk-snapshot-host';
  host.setAttribute('data-workspace', '');
  host.setAttribute('data-theme', 'light');
  host.style.minHeight = '0';
  host.style.width = `${W}px`;
  host.style.height = `${H}px`;
  host.innerHTML = `
    <div style="position:absolute;inset:0;background:#ffffff">
      <div data-part="copy" style="position:absolute;left:${COPY.left}px;top:${COPY.top}px;width:${COPY.width}px;height:${COPY.height}px;overflow:hidden;color:#111111;font-size:6px;line-height:1.2;font-family:Inter,system-ui,sans-serif">
        Raqm is a brand with a clear point of view and a system that matches it.
      </div>
      <div data-part="logo" style="position:absolute;left:${LOGO_BOX.left}px;top:${LOGO_BOX.top}px;width:${LOGO_BOX.width}px;height:${LOGO_BOX.height}px;background:${GROUND}">
        <img src="${LOGO}" alt="" style="width:100%;height:100%;object-fit:contain" />
      </div>
      <svg viewBox="0 0 40 60" preserveAspectRatio="xMidYMid meet"
           style="position:absolute;left:${PART.left}%;top:${PART.top}%;width:${PART.width}%;height:${PART.height}%">
        <path d="M4 8 C30 2 38 16 38 30 C38 44 30 58 4 52" fill="none" stroke="#111111" stroke-width="9" stroke-linecap="round" />
      </svg>
    </div>`;
  document.body.appendChild(host);
  return host;
}

const scaled = (px: { left: number; top: number; width: number; height: number }): Box => ({
  x: Math.round(px.left * SCALE),
  y: Math.round(px.top * SCALE),
  w: Math.round(px.width * SCALE),
  h: Math.round(px.height * SCALE),
});

let shot: ImageData;
let logoAspect: number;

beforeAll(async () => {
  const source = new Image();
  source.src = LOGO;
  await source.decode();
  logoAspect = source.naturalWidth / source.naturalHeight;

  const host = fixture();
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  shot = await pixelsOf(await snapshotElementPng(host, SCALE));
  host.remove();
}, 60000);

/* ───────────────────────────  the measurements  ─────────────────────────── */

describe('the offscreen rasterizer', () => {
  it('measures a font baseline, not a line height', () => {
    // The cause, pinned where it happened. `parseMetrics` verbatim: html2canvas
    // stands a 1×1 image on the baseline of a sample of text and reads the
    // offset. `display: block` puts the image on the NEXT line instead, and the
    // answer roughly doubles — which is exactly one line of overshoot per glyph.
    keepFontMetricsHonest();
    const container = document.createElement('div');
    const img = document.createElement('img');
    const span = document.createElement('span');
    Object.assign(container.style, {
      visibility: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      margin: '0',
      padding: '0',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(container);
    img.src = PROBE;
    img.width = 1;
    img.height = 1;
    img.style.margin = '0';
    img.style.padding = '0';
    img.style.verticalAlign = 'baseline';
    span.style.font = 'inherit';
    span.appendChild(document.createTextNode('Hidden Text'));
    container.appendChild(span);
    container.appendChild(img);
    const baseline = img.offsetTop - span.offsetTop + 2;
    container.remove();

    // A 16px face sits ~16px below the top of its line box, never ~24.
    expect(baseline).toBeGreaterThan(10);
    expect(baseline).toBeLessThan(20);
  });

  it('draws every line of a text block, whole', () => {
    const box = scaled(COPY);
    const rows = inkRows(shot, box, dark);
    const lines = bands(rows);

    // Two lines fit; two lines are drawn. Text pushed a line low left ONE band
    // and clipped the rest — that was the whole of Q2.
    expect(lines.length).toBe(2);
    // The first line starts near the top of its box. A sheared block begins low.
    expect(lines[0]!.from).toBeLessThan(box.h * 0.25);
    // And the ink reaches the bottom of the second line rather than stopping at
    // its middle.
    expect(lines[1]!.to).toBeGreaterThan(box.h * 0.6);
  });

  it('keeps a logo at its own proportions inside a square well', () => {
    const box = scaled(LOGO_BOX);
    const mark = inkBounds(shot, box, notGround);
    expect(mark).toBeTruthy();
    const drawn = mark!.w / mark!.h;
    // `object-fit: contain` — html2canvas ignores it and stretches to the box,
    // which in a square well means aspect 1. Within 12% of the artwork's own.
    expect(Math.abs(drawn - logoAspect) / logoAspect).toBeLessThan(0.12);
    // It really is contained: full width, well short of full height.
    expect(mark!.w).toBeGreaterThan(box.w * 0.8);
    expect(mark!.h).toBeLessThan(box.h * 0.6);
  });

  it('draws an inline SVG part inside its own box', () => {
    const box = scaled({
      left: (PART.left / 100) * W,
      top: (PART.top / 100) * H,
      width: (PART.width / 100) * W,
      height: (PART.height / 100) * H,
    });
    const part = inkBounds(shot, box, dark);
    expect(part).toBeTruthy();
    // Serialized with its placement style, the drawing lands outside its own
    // image and leaves a nub or nothing. `xMidYMid meet` in a taller box means
    // full height and most of the width.
    expect(part!.h).toBeGreaterThan(box.h * 0.7);
    expect(part!.w).toBeGreaterThan(box.w * 0.5);
  });

  it('exports a real deliverable with its type intact and its logo unsquashed', async () => {
    // One pass over the product's own renderer, because a fixture can drift
    // away from what the kit actually ships.
    const brand = SEED_BRANDS[0]!;
    const mock = brandToMockBrand(brand);
    const label = 'Business Card';
    const all = variantsForCard('stationery', label, mock);
    const tpl = featuredTemplates(label, all)[0]!;
    const aspect = aspectForLabel(label);
    const px = await pixelsOf(
      await snapshotTemplatePng(renderCosmosTemplate(tpl, brand, mock), W, aspect, SCALE),
    );

    const full: Box = { x: 0, y: 0, w: px.width, h: px.height };
    const lines = bands(inkRows(px, full, dark));
    // A business card is a stack of rows: the eyebrow, the name, the role, and
    // a contact block. A rasterizer that shears type collapses that.
    expect(lines.length).toBeGreaterThan(4);

    // The contact block is the measurement that matters, because it is the LAST
    // thing on the card and a one-line overshoot pushes it off the bottom
    // entirely. Sheared, it exported as a few grey specks: 89 inked pixels in
    // this window against 2418 once the baseline was right. Ink DENSITY says
    // that plainly where a band count does not — half a line is still a band.
    const contact: Box = {
      x: Math.round(px.width * 0.29),
      y: Math.round(px.height * 0.6),
      w: Math.round(px.width * 0.42),
      h: Math.round(px.height * 0.32),
    };
    let ink = 0;
    for (let y = contact.y; y < contact.y + contact.h; y += 1) {
      for (let x = contact.x; x < contact.x + contact.w; x += 1) {
        const i = (y * px.width + x) * 4;
        if (dark(px.data[i]!, px.data[i + 1]!, px.data[i + 2]!, px.data[i + 3]!)) ink += 1;
      }
    }
    expect(ink / (contact.w * contact.h)).toBeGreaterThan(0.01);
    expect(bands(inkRows(px, contact, dark)).length).toBeGreaterThanOrEqual(5);
  }, 60000);
});
