/**
 * Reading a PNG back, without decoding it.
 *
 * An export is only correct if the FILE is correct, and "the browser drew
 * something" is not that. A PNG's IHDR carries its true pixel size in the
 * first 24 bytes, so a test — and the integration wave's no-letterbox
 * check — can assert the exact dimensions of what shipped without a
 * canvas, a bitmap decode, or a browser.
 */
export const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPng(bytes: Uint8Array, offset = 0): boolean {
  if (bytes.length < offset + PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((byte, i) => bytes[offset + i] === byte);
}

/** `{ width, height }` from the IHDR, or null if these are not PNG bytes. */
export function readPngSize(
  bytes: Uint8Array,
  offset = 0,
): { width: number; height: number } | null {
  if (!isPng(bytes, offset) || bytes.length < offset + 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 24);
  // 8 signature + 4 length + 4 type ('IHDR') = 16, then width, then height.
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}
