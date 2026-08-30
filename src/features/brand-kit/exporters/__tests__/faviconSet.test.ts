/**
 * The favicon set, read back out of the files it produced.
 *
 * Everything asserted here is a byte in a container, not a call that was
 * made: the ICO directory is parsed the way Windows parses it, every
 * entry's offset is followed to see whether a PNG really begins there, the
 * manifest is `JSON.parse`d, and the snippet is checked to reference only
 * files the set actually shipped. That last one is the failure this test
 * exists for — a `<link>` pointing at a file nobody wrote is a 404 in
 * production and looks perfect in review.
 */
import { describe, it, expect } from 'vitest';
import {
  buildFaviconSet,
  packIco,
  isPngIco,
  ICO_SIZES,
  type FaviconResizer,
} from '../faviconSet';
import { bytesOf } from '../bytes';
import { isPng, readPngSize } from '../png';
import { pngBlob, pngBytes } from './pngFixture';
import { textOf, jsonOf } from './blobText';

/**
 * The injected rasteriser: a real PNG at exactly the size asked for.
 *
 * It also RECORDS the requests, because half of what this exporter decides
 * is which sizes get a transparent ground and which get the brand's.
 */
function stubResizer() {
  const calls: Array<{ width: number; height: number; padding?: number; background?: string }> = [];
  const resize: FaviconResizer = async (_png, size) => {
    calls.push({ ...size, width: size.width, height: size.height ?? size.width });
    return pngBlob(size.width, size.height ?? size.width);
  };
  return { resize, calls };
}

const OPTIONS = { brandColor: '#2550E3', name: 'Nuworld Studio', shortName: 'Nuworld' };

async function build(extra: Record<string, unknown> = {}) {
  const { resize, calls } = stubResizer();
  const files = await buildFaviconSet(pngBlob(512, 512), { ...OPTIONS, resize, ...extra });
  const byPath = new Map(files.map((f) => [f.path, f.blob]));
  return { files, byPath, calls };
}

describe('buildFaviconSet — the files', () => {
  it('ships the ico, five rasters, the manifest and the snippet', async () => {
    const { files } = await build();
    expect(files.map((f) => f.path)).toEqual([
      'favicon.ico',
      'favicon-16.png',
      'favicon-32.png',
      'apple-touch-icon.png',
      'icon-192.png',
      'icon-512.png',
      'site.webmanifest',
      'snippet.html',
    ]);
  });

  it('every raster is a real PNG at exactly its named size', async () => {
    const { byPath } = await build();
    const expected: Array<[string, number]> = [
      ['favicon-16.png', 16],
      ['favicon-32.png', 32],
      ['apple-touch-icon.png', 180],
      ['icon-192.png', 192],
      ['icon-512.png', 512],
    ];
    for (const [path, size] of expected) {
      const bytes = await bytesOf(byPath.get(path)!);
      expect(isPng(bytes)).toBe(true);
      expect(readPngSize(bytes)).toEqual({ width: size, height: size });
    }
  });

  it('keeps the tab icons transparent and gives the app icons the brand ground', async () => {
    const { calls } = await build();
    const at = (size: number) => calls.find((c) => c.width === size)!;
    expect(at(16).background).toBe('transparent');
    expect(at(32).background).toBe('transparent');
    // iOS composites alpha onto white, so these are opaque by rule.
    expect(at(180).background).toBe('#2550e3');
    expect(at(192).background).toBe('#2550e3');
    expect(at(512).background).toBe('#2550e3');
    expect(at(180).padding).toBeGreaterThan(0);
    expect(at(16).padding).toBe(0);
  });
});

describe('buildFaviconSet — the ICO container', () => {
  it('parses back as three PNG entries at 16, 32 and 48', async () => {
    const { byPath } = await build();
    const ico = await bytesOf(byPath.get('favicon.ico')!);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

    expect(view.getUint16(0, true)).toBe(0); // reserved
    expect(view.getUint16(2, true)).toBe(1); // 1 = icon
    const count = view.getUint16(4, true);
    expect(count).toBe(3);

    const widths: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const at = 6 + i * 16;
      widths.push(ico[at]);
      expect(ico[at + 1]).toBe(ico[at]); // square
      const length = view.getUint32(at + 8, true);
      const offset = view.getUint32(at + 12, true);
      // The offset must point at a PNG, and the whole payload must fit.
      expect(isPng(ico, offset)).toBe(true);
      expect(offset + length).toBeLessThanOrEqual(ico.length);
      // And the embedded image must BE the size the directory claims.
      expect(readPngSize(ico, offset)).toEqual({ width: widths[i], height: widths[i] });
    }
    expect(widths).toEqual([...ICO_SIZES]);
    expect(isPngIco(ico)).toBe(true);
  });

  it('packIco writes 256 as a zero byte, and isPngIco refuses junk', () => {
    const ico = packIco([{ size: 256, bytes: pngBytes(8, 8) }]);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
    expect(isPngIco(ico)).toBe(true);
    expect(isPngIco(new Uint8Array([1, 2, 3]))).toBe(false);
    expect(isPngIco(packIco([{ size: 16, bytes: new Uint8Array([1, 2, 3, 4]) }]))).toBe(false);
  });
});

describe('buildFaviconSet — the wiring files', () => {
  it('site.webmanifest is valid JSON naming icons that exist', async () => {
    const { files, byPath } = await build();
    const manifest = await jsonOf<Record<string, any>>(byPath.get('site.webmanifest')!);
    expect(manifest.name).toBe('Nuworld Studio');
    expect(manifest.short_name).toBe('Nuworld');
    expect(manifest.theme_color).toBe('#2550e3');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    const shipped = new Set(files.map((f) => f.path));
    for (const icon of manifest.icons as Array<{ src: string; sizes: string; type: string }>) {
      expect(icon.type).toBe('image/png');
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
      expect(shipped.has(icon.src.replace(/^\//, ''))).toBe(true);
    }
  });

  it('snippet.html references only files the set shipped', async () => {
    const { files, byPath } = await build();
    const html = await textOf(byPath.get('snippet.html')!);
    const shipped = new Set(files.map((f) => f.path));
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBe(5);
    for (const href of hrefs) expect(shipped.has(href.replace(/^\//, ''))).toBe(true);
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('<meta name="theme-color" content="#2550e3">');
  });

  it('a base path is applied to every reference, with both slashes', async () => {
    const { byPath } = await build({ basePath: 'static/icons' });
    const manifest = await jsonOf<Record<string, any>>(byPath.get('site.webmanifest')!);
    expect(manifest.start_url).toBe('/static/icons/');
    expect(manifest.icons[0].src).toBe('/static/icons/icon-192.png');
    const html = await textOf(byPath.get('snippet.html')!);
    expect(html).toContain('href="/static/icons/favicon.ico"');
  });

  it('a malformed brand colour falls back rather than reaching the manifest', async () => {
    const { byPath } = await build({ brandColor: 'rebeccapurple' });
    const manifest = await jsonOf<Record<string, any>>(byPath.get('site.webmanifest')!);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('a three-digit hex is expanded, and short_name falls back to name', async () => {
    const { byPath } = await build({ brandColor: '#0AF', name: 'Solo', shortName: undefined });
    const manifest = await jsonOf<Record<string, any>>(byPath.get('site.webmanifest')!);
    expect(manifest.theme_color).toBe('#00aaff');
    expect(manifest.short_name).toBe('Solo');
    expect(manifest.name).toBe('Solo');
  });
});
