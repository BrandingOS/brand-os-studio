/**
 * A visual sweep — every mode, across its settings range, at the product's own
 * defaults for camera and lighting.
 *
 * Not an assertion suite. Its job is to put the actual output in front of a
 * human (or in front of me) at settings a user will really reach, because the
 * last three defects were all things a test passed and an eye caught
 * immediately. Screenshots land next to this file.
 */
import { describe, it, beforeAll, afterEach, expect } from 'vitest';
import { page } from '@vitest/browser/context';

import { importSvg } from '../render/svgImport';
import { inflate, DEFAULT_SPHERE } from '../engine/modes/inflate';
import { extrude, flat } from '../engine/modes/extrude';
import { revolve } from '../engine/modes/revolve';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import { Studio, buildMaterial } from '../render/studio';
import { LIGHTING_PRESETS } from '../materials/lighting';
import { getMaterial } from '../materials/presets';
import { DEFAULT_CAMERA, CAMERA_VIEWS } from '../engine/document';
import type { Component, MeshData } from '../engine/types';

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113 113"><g><g>
<path d="M78.3,0c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1S84.5,0,78.3,0Z"/>
<path d="M101.9,45.8c6.1,0,11.1-5,11.1-11.1s-5-11.1-11.1-11.1-11.1,5-11.1,11.1,5,11.1,11.1,11.1Z"/>
<path d="M56.5,45.4c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
<path d="M34.7,22.3c6.1,0,11.1-5,11.1-11.1S40.8,0,34.7,0s-11.1,5-11.1,11.1,5,11.1,11.1,11.1Z"/>
<path d="M78.3,90.8c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
<path d="M34.7,90.8c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
<path d="M11.1,23.5c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
<path d="M101.9,67.2c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
<path d="M11.1,67.2c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
</g></g></svg>`;

const SIZE = 520;
let components: Component[] = [];
const open: Studio[] = [];

function shot(mesh: MeshData, materialId: string, view: keyof typeof CAMERA_VIEWS = 'front') {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  canvas.style.width = `${SIZE}px`; canvas.style.height = `${SIZE}px`;
  document.body.appendChild(canvas);
  const studio = new Studio({ canvas, width: SIZE, height: SIZE });
  open.push(studio);
  studio.setLighting(LIGHTING_PRESETS[0]);
  const { geometry } = toBufferGeometry(mesh);
  normalizeToUnitSize(geometry, 2);
  studio.setObject(geometry, buildMaterial(getMaterial(materialId)!));
  const d = CAMERA_VIEWS[view];
  const len = 4;
  const n = Math.hypot(d[0], d[1], d[2]);
  studio.setProjection(DEFAULT_CAMERA.projection, DEFAULT_CAMERA.fov);
  studio.camera.position.set((d[0] / n) * len, (d[1] / n) * len, (d[2] / n) * len);
  studio.frame(1.25);
  studio.render();
}

beforeAll(async () => {
  await page.viewport(600, 620);
  components = (await importSvg(FIXTURE)).components;
  expect(components).toHaveLength(9);
});
afterEach(() => {
  while (open.length) open.pop()!.dispose();
  document.body.querySelectorAll('canvas').forEach((c) => c.remove());
});

describe('visual sweep', () => {
  it('inflate at its default settings', async () => {
    shot(inflate(components, {}), 'satin-black');
    await page.screenshot({ path: 'sweep-inflate-default.png' });
  });
  it('inflate, thin and flat', async () => {
    shot(inflate(components, { thickness: 2, fullness: 0.15 }), 'satin-black');
    await page.screenshot({ path: 'sweep-inflate-thin.png' });
  });
  it('inflate, very full', async () => {
    shot(inflate(components, { thickness: 14, fullness: 1, edgeSoftness: 0 }), 'satin-black');
    await page.screenshot({ path: 'sweep-inflate-full.png' });
  });
  it('inflate, three-quarter', async () => {
    shot(inflate(components, {}), 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-inflate-34.png' });
  });
  it('inflate, side on', async () => {
    shot(inflate(components, {}), 'satin-black', 'side');
    await page.screenshot({ path: 'sweep-inflate-side.png' });
  });

  it('sphere — a circle really is a ball', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'satin-black');
    await page.screenshot({ path: 'sweep-sphere-front.png' });
  });
  it('sphere, three-quarter', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-sphere-34.png' });
  });
  it('sphere, side on — the profile should be a circle', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'satin-black', 'side');
    await page.screenshot({ path: 'sweep-sphere-side.png' });
  });
  it('sphere in chrome', async () => {
    shot(inflate(components, DEFAULT_SPHERE), 'polished-chrome', 'three-quarter');
    await page.screenshot({ path: 'sweep-sphere-chrome.png' });
  });

  it('extrude at its default settings', async () => {
    shot(extrude(components, {}), 'satin-black');
    await page.screenshot({ path: 'sweep-extrude-default.png' });
  });
  it('extrude, three-quarter', async () => {
    shot(extrude(components, {}), 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-extrude-34.png' });
  });
  it('extrude, heavily bevelled, three-quarter', async () => {
    shot(extrude(components, { depth: 14, bevelSize: 4, bevelThickness: 3, bevelSegments: 8 }), 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-extrude-bevel-34.png' });
  });
  it('extrude, side on', async () => {
    shot(extrude(components, {}), 'satin-black', 'side');
    await page.screenshot({ path: 'sweep-extrude-side.png' });
  });

  it('flat at its default settings', async () => {
    shot(flat(components, {}), 'satin-black');
    await page.screenshot({ path: 'sweep-flat-default.png' });
  });
  it('flat, three-quarter', async () => {
    shot(flat(components, {}), 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-flat-34.png' });
  });

  it('revolve at its default settings', async () => {
    shot(revolve(components, {}).mesh, 'satin-black');
    await page.screenshot({ path: 'sweep-revolve-default.png' });
  });
  it('revolve, three-quarter', async () => {
    shot(revolve(components, {}).mesh, 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-revolve-34.png' });
  });
  it('revolve, half sweep', async () => {
    shot(revolve(components, { sweep: Math.PI }).mesh, 'satin-black', 'three-quarter');
    await page.screenshot({ path: 'sweep-revolve-half.png' });
  });
});
