/**
 * QA Q11 — three animations shipped one still.
 *
 * `deliverables/logo-reveal.png`, `fade.png` and `rotate.png` came out of a
 * kit export BYTE-IDENTICAL (37 125 bytes each). Nothing was broken about
 * the rasterizer: every animation in this family ends on the finished
 * lockup, by design, and the export captured the rest frame — so a reveal,
 * a fade and a spin all exported the same picture of a logo sitting still.
 * The one thing a motion deliverable has to show is the only thing a
 * single frame cannot.
 *
 * The still is a STORYBOARD now (`AnimationStoryboard`): the same design
 * frozen at several points along its own timeline, ending on the frame the
 * export used to ship alone. So the assertion here is the one the QA made
 * by hand — export the four families and compare the bytes — plus the shape
 * that makes it true, because four different pictures that were not strips
 * would pass the first check while losing the motion again.
 *
 * It runs in the browser project because it is html2canvas over real CSS
 * animations: jsdom computes no keyframe and paints no pixel.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// The real stylesheets, because the snapshot host is STYLED — an offscreen
// mount that misses them lays every renderer out at 0×0 and the export
// "succeeds" with a zip of empty pictures.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { getEntryFor } from '../../catalog/catalog';
import { buildKitZipBlob } from '../../data/exportEverything';
import { resetRenderEnvironment } from '../../data/templateSnapshot';
import { aspectForLabel } from '../../data/cardPresentation';
import { STORYBOARD_FRAMES } from '../AnimationsExtended';

const sourceBrand = SEED_BRANDS[0]!;
const LABELS = ['Logo Reveal', 'Slide In', 'Fade', 'Rotate'];
const ENTRIES = LABELS.map((label) => getEntryFor('animations', label)!);
const PATHS: Record<string, string> = {
  'Logo Reveal': 'deliverables/logo-reveal.png',
  'Slide In': 'deliverables/slide-in.png',
  Fade: 'deliverables/fade.png',
  Rotate: 'deliverables/rotate.png',
};

/** The PNG's IHDR — the picture's real size, read from the bytes. */
function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function fingerprint(bytes: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < bytes.length; i += 1) hash = ((hash * 33) ^ bytes[i]) >>> 0;
  return `${bytes.length}:${hash.toString(16)}`;
}

beforeEach(() => resetRenderEnvironment());
afterEach(cleanup);

describe('exporting the animations', () => {
  it('gives every family a still no other family exports', async () => {
    const result = await buildKitZipBlob({ brand: mockBrand, sourceBrand, entries: ENTRIES });
    expect(result.skipped).toEqual([]);
    expect(result.added).toBe(ENTRIES.length);

    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());

    const seen = new Map<string, string>();
    for (const label of LABELS) {
      const file = zip.file(PATHS[label]);
      expect(file, `${PATHS[label]} is not in the zip`).toBeTruthy();
      const bytes = await file!.async('uint8array');
      // A real picture, not a blank canvas the size of one.
      expect(bytes.byteLength, `${label} exported almost nothing`).toBeGreaterThan(2000);

      const key = fingerprint(bytes);
      expect(seen.get(key), `${label} exports the same still as ${seen.get(key)}`).toBeUndefined();
      seen.set(key, label);

      // …and it is a strip, so the difference is the MOTION rather than a
      // coincidence of the rest frame.
      const size = pngSize(bytes)!;
      const cells = STORYBOARD_FRAMES.length;
      const expected = aspectForLabel(label) * cells;
      expect(size.width / size.height, `${label} is not a ${cells}-frame strip`).toBeCloseTo(
        expected,
        1,
      );
    }
    expect(seen.size).toBe(LABELS.length);
  }, 180000);
});
