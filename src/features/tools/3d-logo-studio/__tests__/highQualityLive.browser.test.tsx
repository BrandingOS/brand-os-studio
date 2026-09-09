/**
 * Does "High quality" actually change what is on screen, in the real editor?
 *
 * Headed only — headless falls back to SwiftShader, where a traced sample takes
 * seconds. See pathTraced.browser.test.tsx.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { page } from '@vitest/browser/context';

import { Studio3dEditor } from '../index';
import { createDocument, setRender } from '../engine/document';
import type { Component, Ring } from '../engine/types';

const circle = (cx: number, cy: number, r: number, n = 64): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  return Float64Array.from(p);
};
const components: Component[] = [
  { id: 'a', rings: [circle(40, 40, 26)], fillRule: 'nonzero' },
  { id: 'b', rings: [circle(86, 62, 20)], fillRule: 'nonzero' },
];
const doc = () => {
  const d = createDocument({ svg: '<svg/>', fileName: 'mark.svg', components });
  return { ...d, materials: { ...d.materials, defaultId: 'polished-chrome' } };
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

/** Mean brightness and its variance — a traced frame differs from a rasterized
 *  one in both, because it carries occlusion and inter-reflection. */
function stats(canvas: HTMLCanvasElement) {
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
  const w = Math.min(canvas.width, 300);
  const h = Math.min(canvas.height, 300);
  const x = Math.floor((canvas.width - w) / 2);
  const y = Math.floor((canvas.height - h) / 2);
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let sum = 0;
  const n = w * h;
  for (let i = 0; i < buf.length; i += 4) sum += (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
  const mean = sum / n;
  let variance = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const v = (buf[i] + buf[i + 1] + buf[i + 2]) / 3 - mean;
    variance += v * v;
  }
  return { mean, sd: Math.sqrt(variance / n) };
}
const differs = (a: { mean: number; sd: number }, b: { mean: number; sd: number }) =>
  Math.abs(a.mean - b.mean) + Math.abs(a.sd - b.sd);

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

describe('high quality, in the editor', () => {
  it.runIf(onRealGpu())('visibly changes the picture', { timeout: 180_000 }, async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    await settle(1200);
    const preview = stats(canvas);
    await page.screenshot({ path: 'live-preview.png' });

    fireEvent.click(screen.getByRole('radio', { name: 'High quality' }));
    // Give it real time to accumulate.
    await settle(12_000);
    const traced = stats(canvas);
    await page.screenshot({ path: 'live-high.png' });

    // eslint-disable-next-line no-console
    console.log('LIVE preview', JSON.stringify(preview), 'traced', JSON.stringify(traced));
    expect(differs(preview, traced)).toBeGreaterThan(2);
  });

  it.runIf(onRealGpu())('shows progress while it works', { timeout: 180_000 }, async () => {
    const { host } = mount(<Studio3dEditor initialDocument={setRender(doc(), { mode: 'high' })} />);
    await readyCanvas(host);
    expect(await screen.findByText(/Rendering ·/, {}, { timeout: 30_000 })).toBeTruthy();
  });

  it.runIf(onRealGpu())('re-traces after the camera moves', { timeout: 240_000 }, async () => {
    const { host } = mount(<Studio3dEditor initialDocument={setRender(doc(), { mode: 'high', targetSamples: 64 })} />);
    const canvas = await readyCanvas(host);
    await settle(10_000);
    const before = stats(canvas);

    // Zoom, the way a wheel does.
    fireEvent.wheel(canvas, { deltaY: -400 });
    await settle(300);
    fireEvent.wheel(canvas, { deltaY: -400 });
    await settle(12_000);
    const after = stats(canvas);
    await page.screenshot({ path: 'live-high-zoomed.png' });

    // eslint-disable-next-line no-console
    console.log('LIVE before', JSON.stringify(before), 'after zoom', JSON.stringify(after));
    // The view changed, so the picture must have.
    expect(differs(before, after)).toBeGreaterThan(2);
    // And it must be a *traced* picture again, not a rasterized one left behind.
    expect(screen.queryByText(/Rendering ·/)).toBeNull();
  });
});
