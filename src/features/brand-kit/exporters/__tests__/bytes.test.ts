/**
 * The plumbing, and the two places it is not boring.
 *
 * `bytesOf` exists because jsdom's Blob has no `arrayBuffer`, so every
 * test that reads an export back would throw — in the runner only, which
 * is the worst place to find out. `base64Of` chunks because spreading a
 * 512×512 PNG across `String.fromCharCode(...)` blows the call stack. Both
 * of those are asserted here rather than believed.
 */
import { describe, it, expect } from 'vitest';
import { bytesOf, blobOf, textBlob, base64Of, bytesOfBase64, dataUrlOf } from '../bytes';
import { isPng, readPngSize, PNG_SIGNATURE } from '../png';
import { pngBytes, pngBlob } from './pngFixture';
import { textOf } from './blobText';

describe('bytes', () => {
  it('reads a Blob back even where Blob.arrayBuffer does not exist', async () => {
    const source = Uint8Array.from([0, 1, 2, 250, 251, 255]);
    const bytes = await bytesOf(new Blob([source]));
    expect([...bytes]).toEqual([...source]);
  });

  it('round-trips a large buffer through base64 without blowing the stack', () => {
    // Bigger than the 0x8000 chunk, and bigger than a comfortable spread.
    const source = new Uint8Array(300_000);
    for (let i = 0; i < source.length; i += 1) source[i] = i % 256;
    const round = bytesOfBase64(base64Of(source));
    expect(round.length).toBe(source.length);
    expect(round[0]).toBe(source[0]);
    expect(round[123_456]).toBe(source[123_456]);
    expect(round[source.length - 1]).toBe(source[source.length - 1]);
  });

  it('blobOf copies the view rather than the whole backing buffer', async () => {
    const backing = new Uint8Array(64).fill(7);
    const view = backing.subarray(8, 12);
    const blob = blobOf(view, 'application/octet-stream');
    expect(blob.size).toBe(4);
    expect(blob.type).toBe('application/octet-stream');
    expect([...(await bytesOf(blob))]).toEqual([7, 7, 7, 7]);
  });

  it('textBlob is utf-8, and keeps what it was given', async () => {
    const blob = textBlob('café — naïve');
    expect(blob.type).toContain('charset=utf-8');
    expect(await textOf(blob)).toBe('café — naïve');
  });

  it('dataUrlOf takes a Blob, a bare base64 string, or a data url', async () => {
    const fromBlob = await dataUrlOf(pngBlob(2, 2));
    expect(fromBlob.startsWith('data:image/png;base64,')).toBe(true);
    expect(isPng(bytesOfBase64(fromBlob.split(',')[1]))).toBe(true);

    expect(await dataUrlOf('AAEC')).toBe('data:image/png;base64,AAEC');
    expect(await dataUrlOf('AAEC', 'image/jpeg')).toBe('data:image/jpeg;base64,AAEC');
    // An existing data url is left exactly as it is.
    expect(await dataUrlOf('data:image/svg+xml;base64,PHN2Zz4=')).toBe(
      'data:image/svg+xml;base64,PHN2Zz4=',
    );
  });
});

describe('png — reading a raster without decoding it', () => {
  it('finds the signature and the true pixel size in the IHDR', () => {
    const bytes = pngBytes(1080, 1920);
    expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(isPng(bytes)).toBe(true);
    expect(readPngSize(bytes)).toEqual({ width: 1080, height: 1920 });
  });

  it('reads at an OFFSET, which is how an ICO entry is checked', () => {
    const inner = pngBytes(48, 48);
    const container = new Uint8Array(22 + inner.length);
    container.set(inner, 22);
    expect(isPng(container)).toBe(false);
    expect(isPng(container, 22)).toBe(true);
    expect(readPngSize(container, 22)).toEqual({ width: 48, height: 48 });
  });

  it('answers null for anything that is not a PNG, and for a truncated one', () => {
    expect(readPngSize(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(readPngSize(pngBytes(4, 4).subarray(0, 20))).toBeNull();
    expect(isPng(new Uint8Array(0))).toBe(false);
  });
});
