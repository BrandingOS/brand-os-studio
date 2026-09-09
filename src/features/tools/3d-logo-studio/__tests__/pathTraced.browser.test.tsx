/**
 * The high-quality render, against the owner's reference frames.
 *
 * **Run this headed.** Playwright's headless Chromium falls back to SwiftShader,
 * a software rasterizer, where a sample takes 4.5 seconds instead of 18
 * milliseconds — the same render is two hundred times slower and the suite would
 * never finish. Verified by asking the context: headless reports
 * "SwiftShader driver", headed reports "ANGLE Metal Renderer: Apple M1 Pro".
 *
 *     npx vitest run --project browser --browser.headless=false \
 *       src/features/tools/3d-logo-studio/__tests__/pathTraced.browser.test.tsx
 *
 * `pathTracingSupport` refuses on a software rasterizer for the same reason, so
 * in CI these cases assert the *refusal* rather than the render, which is the
 * honest thing to check there.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { page } from '@vitest/browser/context';
import * as THREE from 'three';

import { importSvg } from '../render/svgImport';
import { inflate, DEFAULT_SPHERE } from '../engine/modes/inflate';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import { Studio, buildMaterial } from '../render/studio';
import { LIGHTING_PRESETS } from '../materials/lighting';
import { getMaterial } from '../materials/presets';
import { startPathTrace, pathTracingSupport } from '../render/pathTracer';
import { DEFAULT_CAMERA, CAMERA_VIEWS } from '../engine/document';
import FIXTURE from '../__fixtures__/metaball-mark.svg?raw';
import type { Component } from '../engine/types';

const SIZE = 560;
let components: Component[] = [];
const open: Studio[] = [];

function stage(materialId: string, lighting: string, view: keyof typeof CAMERA_VIEWS = 'three-quarter') {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  canvas.style.width = `${SIZE}px`; canvas.style.height = `${SIZE}px`;
  document.body.appendChild(canvas);
  const studio = new Studio({ canvas, width: SIZE, height: SIZE });
  open.push(studio);
  studio.setLighting(LIGHTING_PRESETS.find((l) => l.id === lighting)!);
  const { geometry } = toBufferGeometry(inflate(components, { ...DEFAULT_SPHERE, quality: 0.85 }));
  normalizeToUnitSize(geometry, 2);
  studio.setObject(geometry, buildMaterial(getMaterial(materialId)!));
  const d = CAMERA_VIEWS[view];
  const n = Math.hypot(d[0], d[1], d[2]);
  studio.setProjection('perspective', 20);
  studio.camera.position.set((d[0] / n) * 4, (d[1] / n) * 4, (d[2] / n) * 4);
  studio.frame(1.2);
  studio.render();
  return studio;
}

async function trace(studio: Studio, samples: number) {
  const handle = await startPathTrace(studio.renderer, studio.scene, studio.camera, {
    targetSamples: samples,
    environment: studio.rawEnvironment,
  });
  await handle.done;
  handle.dispose();
}

beforeAll(async () => {
  await page.viewport(640, 660);
  components = (await importSvg(FIXTURE)).components;
  expect(components.length).toBeGreaterThan(0);
});
afterEach(() => {
  while (open.length) open.pop()!.dispose();
  document.body.querySelectorAll('canvas').forEach((c) => c.remove());
});

const gpuName = () => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') as WebGL2RenderingContext | null;
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  return dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
};
const onRealGpu = () => !/swiftshader|llvmpipe|software/i.test(gpuName());

describe('high-quality render', () => {
  it('refuses on a software rasterizer, and says why', () => {
    const canvas = document.createElement('canvas');
    const studio = new Studio({ canvas, width: 64, height: 64 });
    open.push(studio);
    const support = pathTracingSupport(studio.renderer);
    if (onRealGpu()) {
      expect(support.supported).toBe(true);
    } else {
      // A traced render here would take hours; offering it would be worse than
      // not having it.
      expect(support.supported).toBe(false);
      expect(support.reason).toMatch(/graphics card|WebGL 2|floating-point/);
    }
  });

  it.runIf(onRealGpu())('textured silver, traced', { timeout: 300_000 }, async () => {
    const studio = stage('textured-silver', 'soft-product');
    await trace(studio, 220);
    await page.screenshot({ path: 'traced-silver.png' });
  });

  it.runIf(onRealGpu())('clear glass on black, traced — caustics and dispersion',
    { timeout: 300_000 }, async () => {
      const studio = stage('clear-glass', 'black-studio');
      await trace(studio, 320);
      await page.screenshot({ path: 'traced-glass-black.png' });
    });

  it.runIf(onRealGpu())('polished chrome, traced — the parts reflect each other',
    { timeout: 300_000 }, async () => {
      const studio = stage('polished-chrome', 'soft-product');
      await trace(studio, 220);
      await page.screenshot({ path: 'traced-chrome.png' });
    });

  it.runIf(onRealGpu())('reports progress and stops where it was told',
    { timeout: 300_000 }, async () => {
      const studio = stage('satin-black', 'white-studio');
      const seen: number[] = [];
      const handle = await startPathTrace(studio.renderer, studio.scene, studio.camera, {
        targetSamples: 24,
        environment: studio.rawEnvironment,
        onProgress: (p) => seen.push(p.fraction),
      });
      expect(await handle.done).toBe('complete');
      handle.dispose();
      expect(seen.length).toBeGreaterThan(3);
      // monotone, and it finishes at the top
      for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
      expect(seen[seen.length - 1]).toBe(1);
    });

  it.runIf(onRealGpu())('cancels promptly', { timeout: 300_000 }, async () => {
    const studio = stage('satin-black', 'white-studio');
    const handle = await startPathTrace(studio.renderer, studio.scene, studio.camera, {
      targetSamples: 100_000,
      environment: studio.rawEnvironment,
    });
    setTimeout(() => handle.cancel(), 300);
    const started = performance.now();
    expect(await handle.done).toBe('cancelled');
    expect(performance.now() - started).toBeLessThan(5000);
    handle.dispose();
  });

  it('a traced scene is lit by its environment, not by the studio lights', () => {
    // The lights the rasterized preview uses do not exist to a path tracer. If
    // the environment ever stopped being built, a high render would come out
    // black — correctly, and confusingly.
    const studio = stage('satin-black', 'white-studio');
    expect(studio.scene.environment).toBeTruthy();
    expect((studio.scene.environment as THREE.Texture).isTexture).toBe(true);
  });
});
