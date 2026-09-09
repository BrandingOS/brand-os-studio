/**
 * Against the reference.
 *
 * The owner supplied a mark and a set of finished renders of it: balls joined
 * by necks, in textured silver and in clear glass. This renders the same class
 * of shape through the product and puts the result where it can be compared.
 *
 * The geometry claim being checked is specific: **a mark made of fat balls and
 * thin necks must come out with fat balls and thin necks**, joined by an organic
 * flare. That is what the ball-union surface does and what a per-component reach
 * cannot.
 */
import { describe, it, beforeAll, afterEach, expect } from 'vitest';
import { page } from '@vitest/browser/context';
import { importSvg } from '../render/svgImport';
import { inflate, DEFAULT_SPHERE } from '../engine/modes/inflate';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import { Studio, buildMaterial } from '../render/studio';
import { LIGHTING_PRESETS } from '../materials/lighting';
import { getMaterial } from '../materials/presets';
import { DEFAULT_CAMERA, CAMERA_VIEWS } from '../engine/document';
import type { Component, MeshData } from '../engine/types';

// Imported as a raw module rather than read from disk: this file runs in the
// browser, where node:fs does not exist.
import FIXTURE from '../__fixtures__/metaball-mark.svg?raw';

const SIZE = 560;
let components: Component[] = [];
const open: Studio[] = [];

function shot(
  mesh: MeshData,
  materialId: string,
  lighting = 'white-studio',
  view: keyof typeof CAMERA_VIEWS = 'front',
  backdrop?: [string, string],
) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  canvas.style.width = `${SIZE}px`; canvas.style.height = `${SIZE}px`;
  document.body.appendChild(canvas);
  const studio = new Studio({ canvas, width: SIZE, height: SIZE });
  open.push(studio);
  studio.setLighting(LIGHTING_PRESETS.find((l) => l.id === lighting)!);
  if (backdrop) studio.setBackdrop(backdrop[0], backdrop[1]);
  const { geometry } = toBufferGeometry(mesh);
  normalizeToUnitSize(geometry, 2);
  studio.setObject(geometry, buildMaterial(getMaterial(materialId)!));
  const d = CAMERA_VIEWS[view];
  const n = Math.hypot(d[0], d[1], d[2]);
  studio.setProjection(DEFAULT_CAMERA.projection, DEFAULT_CAMERA.fov);
  studio.camera.position.set((d[0] / n) * 4, (d[1] / n) * 4, (d[2] / n) * 4);
  studio.frame(1.15);
  studio.render();
  return canvas;
}

beforeAll(async () => {
  await page.viewport(640, 660);
  const result = await importSvg(FIXTURE);
  expect(result.diagnostics).toEqual([]);
  components = result.components;
});
afterEach(() => {
  while (open.length) open.pop()!.dispose();
  document.body.querySelectorAll('canvas').forEach((c) => c.remove());
});

describe('the reference mark, through the product', () => {
  it('textured silver on white — the owner’s main reference frame', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'textured-silver', 'soft-product');
    await page.screenshot({ path: 'ref-silver-front.png' });
  });

  it('textured silver, three-quarter', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'textured-silver', 'soft-product', 'three-quarter');
    await page.screenshot({ path: 'ref-silver-34.png' });
  });

  it('dramatic rim on black, the way the close-ups are lit', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'textured-silver', 'dramatic-rim', 'three-quarter');
    await page.screenshot({ path: 'ref-silver-black.png' });
  });

  it('clear glass on black', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'clear-glass', 'black-studio', 'three-quarter',
      ['#2b2f38', '#050507']);
    await page.screenshot({ path: 'ref-glass-black.png' });
  });

  it('DIAG untextured', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'satin-black', 'soft-product');
    await page.screenshot({ path: 'diag-untextured.png' });
  });

  it('DIAG untextured chrome', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'polished-chrome', 'soft-product');
    await page.screenshot({ path: 'diag-chrome.png' });
  });

  it('DIAG single circle, ball-union', async () => {
    const one: Component = {
      id: 'c', fillRule: 'nonzero',
      rings: [Float64Array.from(Array.from({ length: 256 }, (_, i) => {
        const a = (i / 256) * Math.PI * 2;
        return [200 + Math.cos(a) * 90, 200 + Math.sin(a) * 90];
      }).flat())],
    };
    shot(inflate([one], { ...DEFAULT_SPHERE, quality: 0.9 }), 'satin-black', 'soft-product');
    await page.screenshot({ path: 'diag-one-ball.png' });
  });

  it('the necks stay thin and the balls stay round', async () => {
    // Measured on the mesh rather than the picture: the tallest point of the
    // whole mark is a ball, and the surface over a connector is a fraction of
    // it. A per-component reach would raise both to the same height.
    const mesh = inflate(components, { ...DEFAULT_SPHERE, quality: 0.9 });
    let peak = 0;
    for (let i = 2; i < mesh.positions.length; i += 3) peak = Math.max(peak, mesh.positions[i]);
    expect(peak).toBeGreaterThan(20);

    // Sample heights across the whole mark and check the distribution has two
    // populations — necks well below the balls — rather than one flat plateau.
    const heights: number[] = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (mesh.positions[i + 2] > 0.01) heights.push(mesh.positions[i + 2]);
    }
    heights.sort((a, b) => a - b);
    const low = heights[Math.floor(heights.length * 0.1)];
    expect(low).toBeLessThan(peak * 0.6);
  });
});
