/**
 * The rasterisers, in a real browser, measured from the bytes.
 *
 * Every exporter here injects its rasteriser so a unit test can drive it
 * in jsdom — and those tests prove the plumbing: the right frame reaches
 * the renderer, the right name reaches the file. What they cannot prove is
 * the part that actually spends the pixels, because jsdom has no canvas.
 * `createImageBitmap`, `canvas.toBlob` and `drawImage` are where a size is
 * silently lost, and letterboxing — the failure the spec names by name —
 * is invisible to every layer except a real encode.
 *
 * So this file runs the DEFAULT rasterisers, with no seam, and reads the
 * PNG's own IHDR back out of the produced blob. A file whose header says
 * 1584×396 is 1584×396 whatever it looks like; nothing else is trusted.
 */
import { describe, it, expect } from 'vitest';
import {
  SOCIAL_SIZES,
  PROFILE_SLOTS,
  socialSlot,
  coverIntoFrame,
  buildSocialSizePack,
  buildProfilePack,
} from '../socialSizes';
import { buildFaviconSet } from '../faviconSet';
import { bytesOf, dataUrlOf } from '../bytes';
import { isPng, readPngSize } from '../png';
import { isPngIco } from '../faviconSet';

/** A real, drawable PNG at an arbitrary aspect, made by the browser. */
async function sourcePng(width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2550E3';
  ctx.fillRect(0, 0, width, height);
  // An off-centre mark, so a crop that lost the artwork is visible in the
  // pixels as well as in the size.
  ctx.fillStyle = '#F1EEE4';
  ctx.fillRect(Math.round(width * 0.1), Math.round(height * 0.1), Math.round(width * 0.3), Math.round(height * 0.3));
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'),
  );
}

/** A logo-shaped raster: a centred mark on a TRANSPARENT ground. */
async function markPng(edge: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2550E3';
  ctx.beginPath();
  ctx.arc(edge / 2, edge / 2, edge * 0.4, 0, Math.PI * 2);
  ctx.fill();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'),
  );
}

async function sizeOf(blob: Blob) {
  const bytes = await bytesOf(blob);
  expect(isPng(bytes)).toBe(true);
  return readPngSize(bytes)!;
}

/** Is this pixel opaque? A letterboxed frame has transparent bands. */
async function cornerAlpha(blob: Blob): Promise<number> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
  bitmap.close();
  return alpha;
}

describe('coverIntoFrame — the real rasteriser', () => {
  it('produces EXACTLY the frame asked for, from any source aspect', async () => {
    const source = await sourcePng(1080, 1080);
    for (const frame of [
      { width: 1500, height: 500 },
      { width: 400, height: 400 },
      { width: 2560, height: 1440 },
      { width: 191, height: 1128 },
    ]) {
      expect(await sizeOf(await coverIntoFrame(source, frame))).toEqual(frame);
    }
  });

  it('COVERS rather than letterboxes — no empty band at the edge', async () => {
    // A square design in a very wide frame is the case that letterboxes.
    const out = await coverIntoFrame(await sourcePng(1080, 1080), { width: 1584, height: 396 });
    expect(await sizeOf(out)).toEqual({ width: 1584, height: 396 });
    expect(await cornerAlpha(out)).toBe(255);
  });
});

describe('buildSocialSizePack — every declared size, for real', () => {
  it('writes one PNG per slot whose header matches the table exactly', async () => {
    const source = await sourcePng(1080, 1080);
    const files = await buildSocialSizePack(source, SOCIAL_SIZES);
    expect(files).toHaveLength(SOCIAL_SIZES.length);
    for (let i = 0; i < files.length; i += 1) {
      const slot = SOCIAL_SIZES[i];
      expect(await sizeOf(files[i].blob), `${slot.id} came out the wrong size`).toEqual({
        width: slot.width,
        height: slot.height,
      });
      expect(files[i].path).toBe(`${slot.id}-${slot.width}x${slot.height}.png`);
    }
  }, 60_000);

  it('the tall one and the wide one both land on the nose', async () => {
    const source = await sourcePng(1600, 900);
    const [story] = await buildSocialSizePack(source, 'instagram-story');
    expect(await sizeOf(story.blob)).toEqual({ width: 1080, height: 1920 });
    const [company] = await buildSocialSizePack(source, 'linkedin-company');
    expect(await sizeOf(company.blob)).toEqual({ width: 1128, height: 191 });
    expect(socialSlot('linkedin-company')!.height).toBe(191);
  });
});

describe('buildProfilePack — a mark, contained, on a ground', () => {
  it('renders every square slot at its exact size on each ground', async () => {
    const logo = await sourcePng(512, 512);
    const files = await buildProfilePack(logo, ['#2550E3', 'transparent']);
    expect(files).toHaveLength(PROFILE_SLOTS.length * 2);
    for (const file of files) {
      const size = await sizeOf(file.blob);
      expect(size.width).toBe(size.height);
      expect(file.path).toContain(`${size.width}x${size.height}`);
    }
    // The coloured ground is opaque; the transparent one is not. A profile
    // mark is CONTAINED, so its corner is the ground, never the artwork.
    const onBrand = files.find((f) => f.path.startsWith('2550e3/'))!;
    const clear = files.find((f) => f.path.startsWith('transparent/'))!;
    expect(await cornerAlpha(onBrand.blob)).toBe(255);
    expect(await cornerAlpha(clear.blob)).toBe(0);
  }, 60_000);
});

describe('buildFaviconSet — with the real resizer', () => {
  it('every raster is its named size and the ICO holds three real PNGs', async () => {
    // A real logo has a transparent ground; that is what makes the opaque
    // rule for the iOS icon a rule rather than a coincidence.
    const logo = await markPng(512);
    const files = await buildFaviconSet(logo, { brandColor: '#2550E3', name: 'Nuworld' });
    const byPath = new Map(files.map((f) => [f.path, f.blob]));

    for (const [path, size] of [
      ['favicon-16.png', 16],
      ['favicon-32.png', 32],
      ['apple-touch-icon.png', 180],
      ['icon-192.png', 192],
      ['icon-512.png', 512],
    ] as Array<[string, number]>) {
      expect(await sizeOf(byPath.get(path)!), path).toEqual({ width: size, height: size });
    }

    const ico = await bytesOf(byPath.get('favicon.ico')!);
    expect(isPngIco(ico)).toBe(true);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect(view.getUint16(4, true)).toBe(3);
    for (let i = 0; i < 3; i += 1) {
      const at = 6 + i * 16;
      const offset = view.getUint32(at + 12, true);
      expect(readPngSize(ico, offset)).toEqual({ width: ico[at], height: ico[at] });
    }

    // The apple-touch icon must be OPAQUE: iOS composites alpha onto white.
    expect(await cornerAlpha(byPath.get('apple-touch-icon.png')!)).toBe(255);
    expect(await cornerAlpha(byPath.get('favicon-32.png')!)).toBe(0);
  }, 60_000);

  it('a data url round-trips a real raster', async () => {
    const url = await dataUrlOf(await sourcePng(64, 64));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    const back = await fetch(url).then((r) => r.blob());
    expect(await sizeOf(back)).toEqual({ width: 64, height: 64 });
  });
});
