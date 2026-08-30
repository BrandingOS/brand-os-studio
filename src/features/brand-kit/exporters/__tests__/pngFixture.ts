/**
 * A REAL PNG, written by hand, for tests that run without a canvas.
 *
 * The exporters take rasters in and hand rasters back, and every one of
 * them injects its rasteriser precisely so a unit test can drive it in
 * jsdom. But a stub returning `new Blob(['x'])` proves nothing: the
 * assertions that matter here are "this file is a PNG" and "its IHDR says
 * exactly 1080×1920", and a fake cannot answer either.
 *
 * So this builds a genuine, byte-correct, 8-bit greyscale PNG: correct
 * CRC-32 on every chunk, a real zlib stream (stored deflate blocks plus an
 * Adler-32), one filter byte per scanline. `readPngSize` reads it, an ICO
 * container holds it, and any decoder would open it.
 *
 * Greyscale rather than RGBA because a 512×512 fixture is then a quarter
 * of the bytes, and nothing here looks at the pixels.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** A zlib stream carrying `data` in stored (uncompressed) deflate blocks. */
function zlibStored(data: Uint8Array): Uint8Array {
  const MAX = 0xffff;
  const blocks = Math.max(1, Math.ceil(data.length / MAX));
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4);
  let at = 0;
  out[at++] = 0x78; // CM = deflate, CINFO = 32K window
  out[at++] = 0x01; // FCHECK, no dictionary, fastest
  for (let i = 0; i < blocks; i += 1) {
    const start = i * MAX;
    const len = Math.min(MAX, data.length - start);
    out[at++] = i === blocks - 1 ? 1 : 0; // BFINAL, BTYPE = 00 (stored)
    out[at++] = len & 0xff;
    out[at++] = (len >>> 8) & 0xff;
    out[at++] = ~len & 0xff;
    out[at++] = (~len >>> 8) & 0xff;
    out.set(data.subarray(start, start + len), at);
    at += len;
  }
  const sum = adler32(data);
  out[at++] = (sum >>> 24) & 0xff;
  out[at++] = (sum >>> 16) & 0xff;
  out[at++] = (sum >>> 8) & 0xff;
  out[at++] = sum & 0xff;
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)), false);
  return out;
}

/** 8-bit greyscale PNG bytes of exactly `width × height`. */
export function pngBytes(width: number, height: number, value = 0x80): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width, false);
  view.setUint32(4, height, false);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type 0 = greyscale
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // One filter byte (0 = None) then one sample per pixel, per scanline.
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width + 1);
    raw[row] = 0;
    raw.fill(value, row + 1, row + 1 + width);
  }

  const parts = [
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function pngBlob(width: number, height: number, value = 0x80): Blob {
  return new Blob([pngBytes(width, height, value)], { type: 'image/png' });
}
