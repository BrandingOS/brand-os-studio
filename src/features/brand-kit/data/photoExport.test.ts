/**
 * What a photography download has to contain — and what it must refuse.
 *
 * Every case here is one of the audit's photo defects turned into a gate:
 *
 *  • **D1 (blocker).** The card download shipped `photo-1.html`, which was the
 *    app's own `index.html`: the image 404'd, a dev server answered the miss
 *    with the SPA document at status **200**, and `res.ok` was the whole test.
 *    Two tests below reproduce that exact response — `200 text/html` holding a
 *    `<!doctype html>` — and require a SKIP with a reason, never a file.
 *  • **D14 / D46.** An empty slot counted as photography. `realPhotos` /
 *    `hasRealPhotos` are the one answer, and a source measured as broken stops
 *    counting the moment it is measured.
 *  • **D12.** The download produced no file at all. Now the art direction is a
 *    document, so a brand with rules and no pictures still exports something.
 *
 * The zip is read back with JSZip rather than trusted from the builder's return
 * value, because the file the zip actually held is precisely what shipped.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import JSZip from 'jszip';
import {
  EMPTY_DIRECTION,
  applyRamp,
  buildArtDirectionMarkdown,
  buildPhotoFiles,
  buildPhotoZip,
  hasRealPhotos,
  isPhotoSourceBroken,
  lightness,
  markPhotoSourceBroken,
  nameFromSource,
  NO_PHOTOS_REASON,
  orderedPhotos,
  photoSourceVersion,
  photosUnavailableReason,
  probePhotoSources,
  subscribePhotoSources,
  rampFor,
  readPngSize,
  realPhotos,
  resetPhotoSourceCache,
  sniffImageBytes,
  slugifyPhotoName,
  treatmentCss,
  treatmentFor,
  verifyImageBytes,
  type PhotoDirection,
  type PhotoRasterizer,
} from './photoExport';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { mockBrand } from '@/features/setup/data/mockBrand';

/* ─── Bytes that are, and are not, pictures ───────────────────────── */

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A real 2×3 PNG head: signature + an IHDR chunk a reader can measure. */
function pngBytes(width = 2, height = 3): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set(PNG_HEAD, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13); // IHDR length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

const jpegBytes = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

/** The document a single-page app answers a missing file with. */
const SPA_INDEX = '<!doctype html>\n<html><head><title>BrandingOS</title></head><body></body></html>';

function response(body: Uint8Array | string, contentType: string | null, status = 200): Response {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

/** A fetch that answers from a table and 404s (SPA-style) for anything else. */
function fetchFrom(table: Record<string, Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    // The defect exactly: a MISSING file comes back as the app's own page,
    // at status 200, with an HTML content type.
    return table[url] ?? response(SPA_INDEX, 'text/html; charset=utf-8', 200);
  }) as unknown as typeof fetch;
}

/* ─── A brand shaped like a real one ──────────────────────────────── */

const brand = (over: Partial<MockBrand> = {}): MockBrand =>
  ({
    ...mockBrand,
    name: 'Raqm',
    colors: {
      core: [
        { hex: '#7231FF', name: 'Violet' },
        { hex: '#0A0A0F', name: 'Ink' },
      ],
      accent: [{ hex: '#00D4AA', name: 'Turquoise' }],
      grey: [],
    },
    photos: [],
    ...over,
  }) as MockBrand;

const photo = (id: string, src: string, slot = 'A') => ({ id, src, slot }) as MockBrand['photos'][number];

/** A rasterizer with no canvas: it proves the ramp reached it and returns PNG bytes. */
const fakeRasterizer: PhotoRasterizer = async (_blob, ramp) => ({
  blob: new Blob([pngBytes(ramp ? 8 : 4, 6)], { type: 'image/png' }),
  width: ramp ? 8 : 4,
  height: 6,
});

beforeEach(() => {
  resetPhotoSourceCache();
});

/* ─── Is this a picture? ──────────────────────────────────────────── */

describe('verifyImageBytes — the gate D1 walked through', () => {
  it('refuses the app index served at 200 as text/html', () => {
    const verdict = verifyImageBytes('text/html; charset=utf-8', new TextEncoder().encode(SPA_INDEX));
    expect(verdict.ok).toBe(false);
    expect((verdict as { reason: string }).reason).toMatch(/text\/html/);
  });

  it('refuses HTML even when the server claims it is a PNG', () => {
    // The other half of the rule: the content type alone is not evidence.
    const verdict = verifyImageBytes('image/png', new TextEncoder().encode(SPA_INDEX));
    expect(verdict.ok).toBe(false);
    expect((verdict as { reason: string }).reason).toMatch(/not a PNG/);
  });

  it('refuses an empty body', () => {
    expect(verifyImageBytes('image/png', new Uint8Array(0))).toEqual({
      ok: false,
      reason: 'the file came back empty',
    });
  });

  it('accepts a PNG, a JPEG and an SVG on their bytes', () => {
    expect(verifyImageBytes('image/png', pngBytes())).toEqual({ ok: true, ext: 'png' });
    expect(verifyImageBytes('image/jpeg', jpegBytes())).toEqual({ ok: true, ext: 'jpg' });
    expect(
      verifyImageBytes('image/svg+xml', new TextEncoder().encode('<svg viewBox="0 0 1 1"></svg>')),
    ).toEqual({ ok: true, ext: 'svg' });
  });

  it('accepts a picture whose server sent no content type at all', () => {
    expect(verifyImageBytes(null, jpegBytes())).toEqual({ ok: true, ext: 'jpg' });
  });

  it('reads the extension from the bytes, not the label', () => {
    // A JPEG uploaded as "photo.png" is still a JPEG to every decoder.
    expect(verifyImageBytes('image/png', jpegBytes())).toEqual({ ok: true, ext: 'jpg' });
  });

  it('sniffs GIF and WebP too', () => {
    expect(sniffImageBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('gif');
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageBytes(webp)).toBe('webp');
  });
});

/* ─── What counts as photography ──────────────────────────────────── */

describe('realPhotos / hasRealPhotos — D14, D46', () => {
  it('an empty slot is not a photograph', () => {
    const b = brand({ photos: [photo('a', ''), photo('b', '')] });
    expect(realPhotos(b)).toHaveLength(0);
    expect(hasRealPhotos(b)).toBe(false);
  });

  it('a brand with no photos at all is not complete', () => {
    expect(hasRealPhotos(brand())).toBe(false);
    expect(hasRealPhotos(null)).toBe(false);
  });

  it('a photo hidden from the kit is not the kit\'s photography — but stays a file', () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/a.png'), photo('b', 'https://cdn.test/b.png')] });
    const direction: PhotoDirection = { ...EMPTY_DIRECTION, hidden: ['a'] };
    expect(realPhotos(b, direction).map((p) => p.id)).toEqual(['b']);
    // The Library still holds it — hiding is an arrangement, not a delete.
    expect(b.photos.map((p) => p.id)).toEqual(['a', 'b']);
    expect(hasRealPhotos(b, direction)).toBe(true);
    expect(hasRealPhotos(b, { ...EMPTY_DIRECTION, hidden: ['a', 'b'] })).toBe(false);
  });

  it('a hidden photo is not exported, and is not named in the rules', async () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/a.png'), photo('b', 'https://cdn.test/b.png')] });
    const { files, skipped } = await buildPhotoFiles(b, {
      direction: { ...EMPTY_DIRECTION, hidden: ['a'] },
      fetchImpl: fetchFrom({
        'https://cdn.test/a.png': response(pngBytes(), 'image/png'),
        'https://cdn.test/b.png': response(pngBytes(), 'image/png'),
      }),
      rasterize: fakeRasterizer,
    });
    expect(files.map((f) => f.path)).toEqual(['originals/b.png', 'art-direction.md']);
    // Hiding is a decision, not a failure: nothing to report.
    expect(skipped).toEqual([]);
  });

  it('a real file counts, and carries a caption', () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/studio-portrait.jpg')] });
    expect(hasRealPhotos(b)).toBe(true);
    expect(realPhotos(b)[0].name).toBe('Studio portrait');
  });

  it('stops counting a source once it has been measured as broken', async () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/missing.png')] });
    expect(hasRealPhotos(b)).toBe(true);
    await buildPhotoFiles(b, { fetchImpl: fetchFrom({}), rasterize: fakeRasterizer });
    expect(isPhotoSourceBroken('https://cdn.test/missing.png')).toBe(true);
    expect(hasRealPhotos(b)).toBe(false);
  });
});

/* ─── Names and order ─────────────────────────────────────────────── */

/**
 * QA Q15 — the sidebar read 37 / 37 with Photos ticked while the card beside
 * it said "No photography yet".
 *
 * `hasRealPhotos` is optimistic on purpose: an unmeasured source counts as a
 * photograph, because refusing to show a picture nobody has failed to load
 * would be worse. What was missing is that nothing ASKED for the measurement
 * and nothing HEARD the answer, so a count taken on first paint believed a
 * 404 for the rest of the session.
 */
describe('the count is honest, and it says when it changes', () => {
  it('gives a reason a user can act on, and none when there is nothing to say', () => {
    expect(photosUnavailableReason(brand())).toBe(NO_PHOTOS_REASON);
    expect(photosUnavailableReason(null)).toBe(NO_PHOTOS_REASON);
    expect(
      photosUnavailableReason(brand({ photos: [photo('a', 'https://cdn.test/a.png')] })),
    ).toBeUndefined();
  });

  it('a source measured as broken changes the answer, and announces it', () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/gone.png')] });
    expect(photosUnavailableReason(b)).toBeUndefined();

    const seen: number[] = [];
    const stop = subscribePhotoSources(() => seen.push(photoSourceVersion()));
    markPhotoSourceBroken('https://cdn.test/gone.png');
    expect(photosUnavailableReason(b)).toBe(NO_PHOTOS_REASON);
    expect(seen, 'nobody was told the answer had changed').toHaveLength(1);

    // Measuring the same source twice is not news.
    markPhotoSourceBroken('https://cdn.test/gone.png');
    expect(seen).toHaveLength(1);
    stop();
    markPhotoSourceBroken('https://cdn.test/also-gone.png');
    expect(seen).toHaveLength(1);
  });

  it('probes each source once, and records only the failures', () => {
    const loaded: Array<{ src: string; fail: boolean }> = [];
    class FakeImage {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      naturalWidth = 8;
      set src(value: string) {
        const entry = { src: value, fail: value.includes('gone') };
        loaded.push(entry);
        // The load is asynchronous in a browser; fire it the same way.
        queueMicrotask(() => (entry.fail ? this.onerror?.() : this.onload?.()));
      }
    }
    const original = globalThis.Image;
    (globalThis as { Image?: unknown }).Image = FakeImage as unknown as typeof Image;
    try {
      const b = brand({
        photos: [photo('a', 'https://cdn.test/gone.png'), photo('b', 'https://cdn.test/real.png')],
      });
      probePhotoSources(b);
      probePhotoSources(b); // …twice, on purpose.
      expect(loaded.map((l) => l.src)).toEqual([
        'https://cdn.test/gone.png',
        'https://cdn.test/real.png',
      ]);
      return new Promise<void>((resolve) => {
        queueMicrotask(() => {
          expect(isPhotoSourceBroken('https://cdn.test/gone.png')).toBe(true);
          expect(isPhotoSourceBroken('https://cdn.test/real.png')).toBe(false);
          expect(hasRealPhotos(b)).toBe(true);
          resolve();
        });
      });
    } finally {
      (globalThis as { Image?: unknown }).Image = original;
    }
  });
});

describe('captions and order', () => {
  it('reads a name out of a filename and falls back to an index', () => {
    expect(nameFromSource('https://cdn.test/a/team_offsite.JPG', 0)).toBe('Team offsite');
    expect(nameFromSource('data:image/png;base64,AAA', 4)).toBe('Photo 05');
    expect(nameFromSource('', 0)).toBe('Photo 01');
  });

  it('refuses a storage key as a caption', () => {
    // A real CDN path. "Photo 1503023345310 bd7c1de61c7d" across a photograph
    // is worse than no caption at all.
    expect(nameFromSource('https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=600', 0)).toBe(
      'Photo 01',
    );
    expect(nameFromSource('https://cdn.test/9f2c41ab8e7d4410bb02.png', 2)).toBe('Photo 03');
  });

  it('slugs a caption, and never returns an empty stem', () => {
    expect(slugifyPhotoName('Team offsite 01', 0)).toBe('team-offsite-01');
    expect(slugifyPhotoName('•••', 2)).toBe('photo-03');
  });

  it('puts the photos in the order the direction names, unknown ids last', () => {
    const photos = realPhotos(
      brand({
        photos: [photo('a', 'https://cdn.test/a.png'), photo('b', 'https://cdn.test/b.png'), photo('c', 'https://cdn.test/c.png')],
      }),
    );
    const direction: PhotoDirection = { ...EMPTY_DIRECTION, order: ['c', 'a'] };
    expect(orderedPhotos(photos, direction).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('a per-photo treatment beats the default', () => {
    const direction: PhotoDirection = { ...EMPTY_DIRECTION, defaultTreatment: 'mono', treatments: { a: 'duotone' } };
    expect(treatmentFor('a', direction)).toBe('duotone');
    expect(treatmentFor('b', direction)).toBe('mono');
  });
});

/* ─── Treatments ──────────────────────────────────────────────────── */

describe('treatments', () => {
  it('original has no ramp and no filter', () => {
    expect(rampFor('original', brand())).toBeNull();
    expect(treatmentCss('original', brand())).toEqual({ filter: 'none', overlays: [] });
  });

  it('duotone puts the darker brand colour at the shadow end', () => {
    const ramp = rampFor('duotone', brand());
    expect(ramp).not.toBeNull();
    expect(lightness(ramp!.shadow)).toBeLessThan(lightness(ramp!.highlight));
  });

  it('two colours of the same weight are pushed apart rather than flattened', () => {
    const flat = brand({
      colors: { core: [{ hex: '#808080', name: 'A' }, { hex: '#7f7f7f', name: 'B' }], accent: [], grey: [] },
    } as Partial<MockBrand>);
    const ramp = rampFor('duotone', flat)!;
    expect(lightness(ramp.highlight) - lightness(ramp.shadow)).toBeGreaterThan(0.3);
  });

  it('a brand tint still ramps when the brand has one colour', () => {
    const one = brand({ colors: { core: [{ hex: '#7231FF', name: 'Violet' }], accent: [], grey: [] } } as Partial<MockBrand>);
    const ramp = rampFor('tint', one)!;
    expect(lightness(ramp.shadow)).toBeLessThan(lightness(ramp.highlight));
  });

  it('the CSS preview and the raster ramp agree on the same two ends', () => {
    const ramp = rampFor('duotone', brand())!;
    const css = treatmentCss('duotone', brand());
    expect(css.overlays.map((o) => o.background)).toEqual([ramp.shadow, ramp.highlight]);
    expect(css.overlays.map((o) => o.mixBlendMode)).toEqual(['lighten', 'multiply']);
  });

  it('applyRamp maps black to the shadow, white to the highlight, and leaves alpha alone', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 128, 255, 255, 255, 64]);
    applyRamp(pixels, { shadow: '#102030', highlight: '#ffeedd' });
    expect([pixels[0], pixels[1], pixels[2]]).toEqual([0x10, 0x20, 0x30]);
    expect(pixels[3]).toBe(128);
    expect([pixels[4], pixels[5], pixels[6]]).toEqual([0xff, 0xee, 0xdd]);
    expect(pixels[7]).toBe(64);
  });

  it('greyscale is a black-to-white ramp, which is the identity on a grey pixel', () => {
    const pixels = new Uint8ClampedArray([90, 90, 90, 255]);
    applyRamp(pixels, rampFor('mono', brand()));
    expect([pixels[0], pixels[1], pixels[2]]).toEqual([90, 90, 90]);
  });
});

/* ─── The files that leave ────────────────────────────────────────── */

describe('buildPhotoFiles', () => {
  it('a 404 answered by the SPA yields a SKIP, never an html file', async () => {
    const b = brand({ photos: [photo('a', '/images/grain.png')] });
    const { files, skipped } = await buildPhotoFiles(b, {
      fetchImpl: fetchFrom({}),
      rasterize: fakeRasterizer,
    });
    // This is D1, exactly: nothing named like a picture, nothing holding HTML.
    expect(files.filter((f) => f.path !== 'art-direction.md')).toHaveLength(0);
    expect(files.some((f) => /\.html?$/.test(f.path))).toBe(false);
    expect(skipped).toEqual([{ label: 'Grain', reason: 'the server answered with text/html, not an image' }]);
  });

  it('a 404 with an honest status is skipped with its status', async () => {
    const fetchImpl = (async () => response('', 'text/plain', 404)) as unknown as typeof fetch;
    const b = brand({ photos: [photo('a', 'https://cdn.test/gone.png')] });
    const { skipped } = await buildPhotoFiles(b, { fetchImpl, rasterize: fakeRasterizer });
    expect(skipped[0].reason).toMatch(/\(404\)/);
  });

  it('a network failure is skipped, not thrown', async () => {
    const fetchImpl = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const b = brand({ photos: [photo('a', 'https://cdn.test/x.png')] });
    const { files, skipped } = await buildPhotoFiles(b, { fetchImpl, rasterize: fakeRasterizer });
    expect(files.filter((f) => f.path !== 'art-direction.md')).toHaveLength(0);
    expect(skipped[0].reason).toBe('the file could not be reached');
  });

  it('writes the original and the treated copy the direction asks for', async () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/studio.jpg')] });
    const { files, skipped } = await buildPhotoFiles(b, {
      direction: { ...EMPTY_DIRECTION, defaultTreatment: 'duotone' },
      fetchImpl: fetchFrom({ 'https://cdn.test/studio.jpg': response(jpegBytes(), 'image/jpeg') }),
      rasterize: fakeRasterizer,
    });
    expect(skipped).toEqual([]);
    expect(files.map((f) => f.path).sort()).toEqual([
      'art-direction.md',
      'duotone/studio.jpg'.replace('.jpg', '.png'),
      'originals/studio.jpg',
    ].sort());
  });

  it('keeps the good photographs when one of them is broken', async () => {
    const b = brand({
      photos: [photo('a', 'https://cdn.test/good.png'), photo('b', '/images/grain.png')],
    });
    const { files, skipped } = await buildPhotoFiles(b, {
      fetchImpl: fetchFrom({ 'https://cdn.test/good.png': response(pngBytes(), 'image/png') }),
      rasterize: fakeRasterizer,
    });
    expect(files.map((f) => f.path)).toContain('originals/good.png');
    expect(skipped).toHaveLength(1);
  });

  it('exports the art direction even when the brand has no photographs — D12', async () => {
    const { files } = await buildPhotoFiles(brand(), { fetchImpl: fetchFrom({}), rasterize: fakeRasterizer });
    expect(files.map((f) => f.path)).toEqual(['art-direction.md']);
    // jsdom's Blob has no `text()`; the bytes themselves are read back out of
    // the zip in "the zip, read back" below, which is the layer that ships.
    const text = buildArtDirectionMarkdown(brand(), EMPTY_DIRECTION);
    expect(text).toContain('Raqm — photography');
    expect(text).toContain('no photographs in its Library');
  });

  it('a treated copy that cannot be rendered is a skip, not a zero-byte file', async () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/studio.jpg')] });
    const { files, skipped } = await buildPhotoFiles(b, {
      direction: { ...EMPTY_DIRECTION, defaultTreatment: 'mono' },
      fetchImpl: fetchFrom({ 'https://cdn.test/studio.jpg': response(jpegBytes(), 'image/jpeg') }),
      rasterize: async () => null,
    });
    expect(files.map((f) => f.path)).toEqual(['originals/studio.jpg', 'art-direction.md']);
    expect(skipped).toEqual([{ label: 'Studio — mono', reason: 'the treated copy could not be rendered' }]);
  });
});

describe('the zip, read back', () => {
  it('holds the bytes it claims, at a real size, and no html', async () => {
    const b = brand({ photos: [photo('a', 'https://cdn.test/studio.png')] });
    const { blob, added, skipped } = await buildPhotoZip(b, {
      direction: { ...EMPTY_DIRECTION, defaultTreatment: 'tint' },
      fetchImpl: fetchFrom({ 'https://cdn.test/studio.png': response(pngBytes(12, 9), 'image/png') }),
      rasterize: fakeRasterizer,
    });
    expect({ added, skipped }).toEqual({ added: 2, skipped: [] });

    const zip = await JSZip.loadAsync(blob);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    expect(names.sort()).toEqual(['art-direction.md', 'originals/studio.png', 'tint/studio.png']);
    expect(names.some((n) => /\.html?$/.test(n))).toBe(false);

    for (const name of names) {
      const bytes = await zip.file(name)!.async('uint8array');
      expect(bytes.length, `${name} is empty`).toBeGreaterThan(0);
    }
    // Read the PNGs back rather than trusting the encoder: a 0×0 picture is a
    // passing export and a failing deliverable.
    expect(readPngSize(await zip.file('originals/studio.png')!.async('uint8array'))).toEqual({
      width: 12,
      height: 9,
    });
    const treated = readPngSize(await zip.file('tint/studio.png')!.async('uint8array'))!;
    expect(treated.width).toBeGreaterThan(0);
    expect(treated.height).toBeGreaterThan(0);
  });

  it('a brand whose only photo 404s still gets a zip, and it holds the rules — D1 + D12', async () => {
    const b = brand({ photos: [photo('a', '/images/grain.png')] });
    const { blob, added, skipped } = await buildPhotoZip(b, {
      fetchImpl: fetchFrom({}),
      rasterize: fakeRasterizer,
    });
    expect(added).toBe(0);
    expect(skipped).toHaveLength(1);
    const zip = await JSZip.loadAsync(blob);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    expect(names).toEqual(['art-direction.md']);
    const md = await zip.file('art-direction.md')!.async('string');
    expect(md).toContain('Raqm — photography');
    expect(md).toContain('no photographs in its Library');
  });
});

describe('the art direction document', () => {
  it('prints the rules, the treatment and its ramp', () => {
    const b = brand();
    const md = buildArtDirectionMarkdown(
      b,
      { ...EMPTY_DIRECTION, note: 'Daylight only. No stock.', defaultTreatment: 'duotone' },
      realPhotos(brand({ photos: [photo('a', 'https://cdn.test/studio.png')] })),
    );
    expect(md).toContain('Daylight only. No stock.');
    expect(md).toContain('Duotone');
    expect(md).toMatch(/Ramp: `#[0-9a-f]{6}` \(shadows\)/);
    expect(md).toContain('- Studio — Duotone');
  });

  it('names what could not be included, and why — the user-facing half of D1', async () => {
    const b = brand({ photos: [photo('a', '/images/grain.png')] });
    const { blob } = await buildPhotoZip(b, { fetchImpl: fetchFrom({}), rasterize: fakeRasterizer });
    const zip = await JSZip.loadAsync(blob);
    const md = await zip.file('art-direction.md')!.async('string');
    expect(md).toContain('## Not included');
    expect(md).toContain('Grain — the server answered with text/html, not an image');
  });

  it('says plainly when no rules have been written', () => {
    expect(buildArtDirectionMarkdown(brand(), EMPTY_DIRECTION)).toContain('_No art direction written yet._');
  });
});
