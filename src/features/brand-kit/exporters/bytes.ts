/**
 * Byte plumbing shared by the exporters.
 *
 * Two things here are not incidental:
 *
 *   • `bytesOf` does NOT assume `Blob.prototype.arrayBuffer`. jsdom's Blob
 *     has no such method, so every unit test of an exporter that read its
 *     own output back would throw — in the test runner only, which is the
 *     worst place to discover it. `FileReader` works in both environments.
 *   • `base64Of` chunks. `String.fromCharCode(...bytes)` on a 512×512 PNG
 *     spreads a quarter of a million arguments across a call and blows the
 *     stack; the chunked loop is the boring version that survives a real
 *     apple-touch-icon.
 */

/** A Blob's bytes, in browsers and in jsdom alike. */
export async function bytesOf(blob: Blob): Promise<Uint8Array> {
  const anyBlob = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof anyBlob.arrayBuffer === 'function') {
    return new Uint8Array(await anyBlob.arrayBuffer());
  }
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsArrayBuffer(blob);
  });
  return new Uint8Array(buffer);
}

export function blobOf(bytes: Uint8Array, type: string): Blob {
  // Copied through a fresh ArrayBuffer: a Uint8Array view over a larger
  // buffer would otherwise contribute the whole buffer to the Blob.
  return new Blob([bytes.slice()], { type });
}

/** A UTF-8 text file. */
export function textBlob(text: string, type = 'text/plain;charset=utf-8'): Blob {
  return new Blob([text], { type });
}

const CHUNK = 0x8000;

export function base64Of(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function bytesOfBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * A `data:` URL for a raster, whichever form the caller had.
 *
 * `rasterizeLogo` already returns one; a snapshot returns a Blob. Both are
 * legitimate inputs and neither caller should have to convert first.
 */
export async function dataUrlOf(input: Blob | string, mime = 'image/png'): Promise<string> {
  if (typeof input === 'string') {
    return input.startsWith('data:') ? input : `data:${mime};base64,${input}`;
  }
  return `data:${input.type || mime};base64,${base64Of(await bytesOf(input))}`;
}
