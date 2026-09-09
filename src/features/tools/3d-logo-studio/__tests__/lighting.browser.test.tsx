/**
 * Moving the light.
 *
 * The rule this suite exists to enforce: **the control must move the light in
 * both renderers.** A traced render is lit only by the environment — the
 * rasterizer's directional lights do not exist to it — so a control wired to
 * the light alone would appear to do nothing the moment the user switched to
 * high quality, which is precisely the bug that made "High quality" look dead.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { page } from '@vitest/browser/context';

import { Studio3dEditor } from '../index';
import { createDocument, setLightSource, resetLightSource, setRender } from '../engine/document';
import { lightDirection, DEFAULT_LIGHT_SOURCE } from '../materials/lighting';
import type { Component, Ring } from '../engine/types';

const circle = (cx: number, cy: number, r: number, n = 64): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  return Float64Array.from(p);
};
const components: Component[] = [{ id: 'a', rings: [circle(56, 56, 40)], fillRule: 'nonzero' }];
const doc = () => {
  const d = createDocument({ svg: '<svg/>', fileName: 'mark.svg', components });
  // Glossy black, deliberately. Two things are needed at once: a dark object
  // so the "differs from the background" mask actually finds it — chrome on a
  // white studio reflects mostly white and is nearly invisible to that mask —
  // and a sharp specular so the light's position shows as a highlight that
  // moves rather than as a few percent of shading.
  return { ...d, materials: { ...d.materials, defaultId: 'glossy-black' } };
};

function mount(ui: React.ReactNode) {
  const host = document.createElement('div');
  host.setAttribute('data-workspace', '');
  host.setAttribute('data-theme', 'light');
  host.style.width = '1400px';
  host.style.height = '900px';
  document.body.appendChild(host);
  return { host, ...render(<MemoryRouter>{ui}</MemoryRouter>, { container: host }) };
}
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readyCanvas(host: HTMLElement) {
  let canvas: HTMLCanvasElement | null = null;
  await waitFor(() => {
    canvas = host.querySelector('canvas[data-ready="true"]');
    expect(canvas).toBeTruthy();
    expect(canvas!.width).not.toBe(300);
  }, { timeout: 20_000 });
  return canvas!;
}

/**
 * Which side of the object the light is falling on.
 *
 * Masked to the object first. The studio background is near-white, so a plain
 * brightness centroid over the whole frame is dominated by the backdrop and sits
 * at 0.5 whatever the light is doing — which is what the first version of this
 * helper reported, and it looked exactly like a control that was not wired up.
 */
function highlightCentroid(canvas: HTMLCanvasElement): number {
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
  const w = canvas.width;
  const h = canvas.height;
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

  // The corner is background by construction — the object is framed centrally.
  const bg = [buf[0], buf[1], buf[2]];
  let weight = 0;
  let weighted = 0;
  let minX = w;
  let maxX = 0;
  for (let i = 0, p = 0; i < buf.length; i += 4, p++) {
    const differs = Math.abs(buf[i] - bg[0]) + Math.abs(buf[i + 1] - bg[1]) + Math.abs(buf[i + 2] - bg[2]);
    if (differs < 18) continue;
    const x = p % w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    // Fourth power, so the reading follows the specular highlight rather than
    // the object's average shading.
    const luma = (buf[i] + buf[i + 1] + buf[i + 2]) / 765;
    const v = luma ** 4;
    weight += v;
    weighted += v * x;
  }
  if (weight <= 0 || maxX <= minX) return 0.5;
  // Normalised across the object's own extent, so the answer is "which side of
  // the logo" rather than "where in the viewport".
  return (weighted / weight - minX) / (maxX - minX);
}

const onRealGpu = () => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') as WebGL2RenderingContext | null;
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  const name = dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  return !/swiftshader|llvmpipe|software/i.test(name);
};

beforeAll(async () => { await page.viewport(1440, 900); });
afterEach(() => {
  cleanup();
  document.body.querySelectorAll('[data-workspace]').forEach((n) => n.remove());
});

describe('lightDirection', () => {
  it('points at the camera at the default azimuth', () => {
    const [x, , z] = lightDirection({ ...DEFAULT_LIGHT_SOURCE, elevation: 0.5 });
    expect(z).toBeGreaterThan(0.9);
    expect(Math.abs(x)).toBeLessThan(0.1);
  });
  it('swings a quarter turn to the side', () => {
    const [x] = lightDirection({ ...DEFAULT_LIGHT_SOURCE, azimuth: 0.75, elevation: 0.5 });
    expect(x).toBeGreaterThan(0.9);
  });
  it('points straight down from overhead, and up from below', () => {
    expect(lightDirection({ ...DEFAULT_LIGHT_SOURCE, elevation: 0 })[1]).toBeGreaterThan(0.99);
    expect(lightDirection({ ...DEFAULT_LIGHT_SOURCE, elevation: 1 })[1]).toBeLessThan(-0.99);
  });
  it('is always a unit vector, so brightness does not change with direction', () => {
    for (const azimuth of [0, 0.25, 0.5, 0.75, 1]) {
      for (const elevation of [0, 0.3, 0.5, 0.8, 1]) {
        const d = lightDirection({ ...DEFAULT_LIGHT_SOURCE, azimuth, elevation });
        expect(Math.hypot(...d)).toBeCloseTo(1, 6);
      }
    }
  });
});

describe('moving the light', () => {
  it('moves the highlight in the rasterized preview', async () => {
    const left = setLightSource(doc(), { azimuth: 0.25, elevation: 0.4 });
    const { host, unmount } = mount(<Studio3dEditor initialDocument={left} />);
    const canvas = await readyCanvas(host);
    await settle(900);
    const fromLeft = highlightCentroid(canvas);
    unmount(); host.remove();

    const right = setLightSource(doc(), { azimuth: 0.75, elevation: 0.4 });
    const b = mount(<Studio3dEditor initialDocument={right} />);
    const canvas2 = await readyCanvas(b.host);
    await settle(900);
    const fromRight = highlightCentroid(canvas2);

    // eslint-disable-next-line no-console
    console.log('LIGHT raster left', fromLeft.toFixed(3), 'right', fromRight.toFixed(3));
    expect(Math.abs(fromRight - fromLeft)).toBeGreaterThan(0.06);
  });

  it('the controls appear, and reset only once the light has been touched', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);
    expect(screen.getByRole('slider', { name: /direction/i })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /brightness/i })).toBeTruthy();
    // Untouched, there is nothing to reset back to.
    expect(screen.queryByRole('button', { name: /^Reset$/ })).toBeNull();
  });

  it('reset hands the light back to the preset', () => {
    const touched = setLightSource(doc(), { azimuth: 0.9 });
    expect(touched.lighting.source).not.toBeNull();
    expect(resetLightSource(touched).lighting.source).toBeNull();
  });

  it.runIf(onRealGpu())('moves it in a traced render too', { timeout: 240_000 }, async () => {
    // The point of the whole design: a traced render is lit only by the
    // environment, so the control has to move the softbox and not merely the
    // directional light.
    const trace = async (azimuth: number) => {
      const d = setRender(setLightSource(doc(), { azimuth, elevation: 0.35 }), {
        mode: 'high', targetSamples: 48,
      });
      const { host, unmount } = mount(<Studio3dEditor initialDocument={d} />);
      const canvas = await readyCanvas(host);
      await settle(14_000);
      const centroid = highlightCentroid(canvas);
      unmount(); host.remove();
      return centroid;
    };
    const fromLeft = await trace(0.25);
    const fromRight = await trace(0.75);
    // eslint-disable-next-line no-console
    console.log('LIGHT traced left', fromLeft.toFixed(3), 'right', fromRight.toFixed(3));
    expect(Math.abs(fromRight - fromLeft)).toBeGreaterThan(0.05);
  });
});
