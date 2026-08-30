/**
 * The favicon set — the whole set, not a 32px PNG called "favicon".
 *
 * A favicon is the one brand asset a developer has to WIRE UP, and the
 * reason it is usually done badly is that a kit hands over one image and
 * leaves the six other files, the manifest and the four `<link>` tags to
 * be looked up. This builder ships all of it, so "add our favicon" is
 * unzip, drop in, paste eight lines.
 *
 * ## Why the ICO is written by hand
 *
 * `.ico` is still the file a bare `/favicon.ico` request gets, and no
 * dependency in this repo writes one. It is also a genuinely small
 * format: a 6-byte directory, a 16-byte entry per image, then the images.
 * Since Windows Vista an entry's payload may be a PNG rather than a DIB,
 * which removes the only hard part (bottom-up BGRA rows plus an AND mask),
 * so the container below embeds the same PNGs the set already contains.
 *
 * The two bytes that catch people: width and height are ONE byte each and
 * 256 is written as 0 — which is why nothing here goes above 48, the three
 * sizes Windows and the browsers actually read out of an ICO.
 *
 * ## Why resizing is injected
 *
 * `resizePng` needs `createImageBitmap` and a canvas. A test that stubs it
 * can still read the real ICO container back and assert every offset lands
 * on a PNG signature — which is the part with the bugs in it. Production
 * passes nothing and gets the real rasteriser.
 */
import { resizePng, type CustomSize } from '../data/exportFormats';
import { blobOf, bytesOf, textBlob } from './bytes';
import { isPng } from './png';
import type { ExportFile } from './types';

export type FaviconResizer = (png: Blob, size: CustomSize) => Promise<Blob>;

export type FaviconOptions = {
  /** The brand's colour — the manifest theme, and the ground for iOS. */
  brandColor: string;
  /** Ground for the opaque icons. Defaults to `brandColor`. */
  background?: string;
  /** Manifest `name`. Defaults to the short name. */
  name?: string;
  /** Manifest `short_name`. Defaults to `name`, then to a neutral label. */
  shortName?: string;
  /** Where the files will live when served. Default `/`. */
  basePath?: string;
  /** Test seam — see the note above. */
  resize?: FaviconResizer;
};

/** The three sizes an `.ico` is read at. 256 would need a 0 byte for size. */
export const ICO_SIZES = [16, 32, 48] as const;

/** Every raster the set ships, and what each one is for. */
const RASTERS = [
  { path: 'favicon-16.png', size: 16, opaque: false, pad: 0 },
  { path: 'favicon-32.png', size: 32, opaque: false, pad: 0 },
  // iOS composites the icon onto a WHITE sheet if it has alpha, so an
  // apple-touch icon is opaque by rule, with the brand's own ground.
  { path: 'apple-touch-icon.png', size: 180, opaque: true, pad: 0.12 },
  { path: 'icon-192.png', size: 192, opaque: true, pad: 0.12 },
  { path: 'icon-512.png', size: 512, opaque: true, pad: 0.12 },
] as const;

function normalizeHex(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.toLowerCase().split('').map((c) => c + c).join('')}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return fallback;
}

/** Trailing slash always, leading slash always — a `<link href>` joins here. */
function normalizeBase(basePath: string | undefined): string {
  const raw = (basePath ?? '/').trim() || '/';
  const withLead = raw.startsWith('/') ? raw : `/${raw}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/**
 * Pack PNGs into an ICO container.
 *
 * Exported because it is the piece worth testing on its own, and because a
 * future "icon set" deliverable wants the same container.
 */
export function packIco(images: Array<{ size: number; bytes: Uint8Array }>): Uint8Array {
  const entries = images.filter((img) => img.size > 0 && img.size <= 256);
  const headerSize = 6 + entries.length * 16;
  const total = entries.reduce((sum, img) => sum + img.bytes.length, headerSize);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // 1 = icon (2 would be a cursor)
  view.setUint16(4, entries.length, true);

  let offset = headerSize;
  entries.forEach((img, i) => {
    const at = 6 + i * 16;
    // 256 is written as 0 — a single byte cannot hold it.
    out[at] = img.size >= 256 ? 0 : img.size;
    out[at + 1] = img.size >= 256 ? 0 : img.size;
    out[at + 2] = 0; // palette entries — none, this is true colour
    out[at + 3] = 0; // reserved
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, img.bytes.length, true);
    view.setUint32(at + 12, offset, true);
    out.set(img.bytes, offset);
    offset += img.bytes.length;
  });
  return out;
}

export async function buildFaviconSet(
  logoPng: Blob,
  options: FaviconOptions,
): Promise<ExportFile[]> {
  const resize = options.resize ?? resizePng;
  const brandColor = normalizeHex(options.brandColor, '#111113');
  const background = normalizeHex(options.background, brandColor);
  const shortName = (options.shortName ?? options.name ?? '').trim() || 'App';
  const name = (options.name ?? shortName).trim();
  const base = normalizeBase(options.basePath);

  const files: ExportFile[] = [];

  // The set's own rasters. Small sizes keep their transparency (a 16px
  // icon on a coloured tile is a coloured square in a tab strip); the
  // large opaque ones get the brand ground and breathing room.
  for (const raster of RASTERS) {
    const blob = await resize(logoPng, {
      width: raster.size,
      height: raster.size,
      padding: Math.round(raster.size * raster.pad),
      background: raster.opaque ? background : 'transparent',
    });
    files.push({ path: raster.path, blob });
  }

  // The ICO reuses the 16 and 32 already built, and adds a 48.
  const icoImages: Array<{ size: number; bytes: Uint8Array }> = [];
  for (const size of ICO_SIZES) {
    const existing = files.find((f) => f.path === `favicon-${size}.png`);
    const blob = existing
      ? existing.blob
      : await resize(logoPng, { width: size, height: size, background: 'transparent' });
    icoImages.push({ size, bytes: await bytesOf(blob) });
  }
  files.unshift({
    path: 'favicon.ico',
    blob: blobOf(packIco(icoImages), 'image/x-icon'),
  });

  files.push({
    path: 'site.webmanifest',
    blob: textBlob(
      `${JSON.stringify(
        {
          name,
          short_name: shortName,
          icons: [
            { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
            {
              src: `${base}icon-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          theme_color: brandColor,
          background_color: background,
          display: 'standalone',
          start_url: base,
        },
        null,
        2,
      )}\n`,
      'application/manifest+json',
    ),
  });

  files.push({
    path: 'snippet.html',
    blob: textBlob(snippet(base, brandColor), 'text/html;charset=utf-8'),
  });

  return files;
}

/** The lines to paste into `<head>`, in the order a browser reads them. */
function snippet(base: string, brandColor: string): string {
  return [
    '<!-- Favicon. Drop the files beside your index.html, then paste this into <head>. -->',
    `<link rel="icon" href="${base}favicon.ico" sizes="any">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${base}favicon-32.png">`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${base}favicon-16.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${base}apple-touch-icon.png">`,
    `<link rel="manifest" href="${base}site.webmanifest">`,
    `<meta name="theme-color" content="${brandColor}">`,
    '',
  ].join('\n');
}

/** True when `bytes` is a well-formed ICO whose every entry holds a PNG. */
export function isPngIco(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) return false;
  const count = view.getUint16(4, true);
  if (count === 0 || bytes.length < 6 + count * 16) return false;
  for (let i = 0; i < count; i += 1) {
    const offset = view.getUint32(6 + i * 16 + 12, true);
    if (!isPng(bytes, offset)) return false;
  }
  return true;
}
