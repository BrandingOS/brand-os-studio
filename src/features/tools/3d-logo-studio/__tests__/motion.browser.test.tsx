/**
 * Automatic rotation, in the running editor.
 *
 * The evaluator is tested exhaustively next to the engine; these are the
 * questions only a mounted, rendering editor can answer — does it actually move,
 * does stopping put the logo back exactly where it was, and does it get out of
 * the way of the things it would otherwise ruin.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { page } from '@vitest/browser/context';

import { Studio3dEditor } from '../index';
import { createDocument, setAnimation } from '../engine/document';
import type { Component, Ring } from '../engine/types';

const circle = (cx: number, cy: number, r: number, n = 48): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  return Float64Array.from(p);
};
// Deliberately off-centre and asymmetric, so a rotation is visible in the pixels.
const components: Component[] = [
  { id: 'a', rings: [circle(30, 56, 22)], fillRule: 'nonzero' },
  { id: 'b', rings: [circle(86, 56, 10)], fillRule: 'nonzero' },
];
const doc = () => createDocument({ svg: '<svg/>', fileName: 'mark.svg', components });

function mount(ui: React.ReactNode) {
  const host = document.createElement('div');
  host.setAttribute('data-workspace', '');
  host.setAttribute('data-theme', 'light');
  host.style.width = '1400px';
  host.style.height = '900px';
  document.body.appendChild(host);
  return { host, ...render(<MemoryRouter>{ui}</MemoryRouter>, { container: host }) };
}

async function readyCanvas(host: HTMLElement): Promise<HTMLCanvasElement> {
  let canvas: HTMLCanvasElement | null = null;
  await waitFor(() => {
    canvas = host.querySelector('canvas[data-ready="true"]');
    expect(canvas).toBeTruthy();
    expect(canvas!.width).not.toBe(300);
  }, { timeout: 20_000 });
  return canvas!;
}

/**
 * A cheap fingerprint of what is on screen: total brightness, and the
 * horizontal centre of mass. Both move when the object turns and neither moves
 * when it does not.
 */
function frameSignature(canvas: HTMLCanvasElement): [number, number] {
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
  const w = Math.min(canvas.width, 160);
  const h = Math.min(canvas.height, 160);
  const x = Math.max(0, Math.floor((canvas.width - w) / 2));
  const y = Math.max(0, Math.floor((canvas.height - h) / 2));
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let sum = 0;
  let weighted = 0;
  for (let i = 0, p = 0; i < buf.length; i += 4, p++) {
    const v = buf[i] + buf[i + 1] + buf[i + 2];
    sum += v;
    weighted += v * (p % w);
  }
  return [sum / 1000, weighted / Math.max(1, sum)];
}

/** How far two frames are apart, in units where "nothing moved" is ~0. */
function signatureDistance(a: [number, number], b: [number, number]): number {
  return Math.abs(a[0] - b[0]) / 100 + Math.abs(a[1] - b[1]);
}

/**
 * Wait until the picture stops changing, then return it.
 *
 * A canvas exists, and is sized, before the geometry has been built and drawn
 * into it — so capturing a "resting" frame the moment the canvas is ready
 * compares an empty background against a rendered logo, which is a difference of
 * everything.
 */
async function restingFrame(canvas: HTMLCanvasElement): Promise<[number, number]> {
  let previous = frameSignature(canvas);
  for (let i = 0; i < 100; i++) {
    await settle(80);
    const now = frameSignature(canvas);
    if (signatureDistance(previous, now) < 0.01) return now;
    previous = now;
  }
  return previous;
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => { await page.viewport(1440, 900); });
afterEach(() => {
  cleanup();
  document.body.querySelectorAll('[data-workspace]').forEach((n) => n.remove());
});

describe('automatic rotation', () => {
  it('is off until asked for', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    const before = await restingFrame(canvas);
    await settle(500);
    expect(signatureDistance(frameSignature(canvas), before)).toBeLessThan(0.01);
  });

  it('turns the logo once switched on', async () => {
    const spinning = setAnimation(doc(), { preset: 'turntable', speed: 1, durationSeconds: 2 });
    const { host } = mount(<Studio3dEditor initialDocument={spinning} />);
    const canvas = await readyCanvas(host);
    await settle(200);
    const frames: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      frames.push(frameSignature(canvas));
      await settle(120);
    }
    let moved = 0;
    for (let i = 1; i < frames.length; i++) {
      if (signatureDistance(frames[i], frames[i - 1]) > 0.05) moved++;
    }
    expect(moved).toBeGreaterThan(3);
  });

  it('speed changes how far it gets in the same time', async () => {
    const travelled = async (speed: number) => {
      const d = setAnimation(doc(), { preset: 'turntable', speed, durationSeconds: 8 });
      const { host, unmount } = mount(<Studio3dEditor initialDocument={d} />);
      const canvas = await readyCanvas(host);
      await settle(250);
      const start = frameSignature(canvas);
      await settle(700);
      const distance = signatureDistance(frameSignature(canvas), start);
      unmount();
      host.remove();
      return distance;
    };
    // A slow turn covers a few degrees in 700ms and a fast one covers a
    // quarter of a revolution, so the comparison is of *how far*, not of
    // whether it moved at all — at 0.05x it does move, just barely.
    const slow = await travelled(0.05);
    const fast = await travelled(3);
    expect(fast).toBeGreaterThan(slow * 3);
  });

  it('stopping puts the logo back exactly where it was', async () => {
    // The animation is a delta on top of the user's transform and is never
    // written into the project, so switching it off must restore the resting
    // pose to the pixel rather than leaving it wherever the last frame landed.
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    const atRest = await restingFrame(canvas);

    fireEvent.click(screen.getByRole('button', { name: 'Motion' }));
    fireEvent.click(await screen.findByRole('option', { name: /Turntable/ }));
    await waitFor(
      () => expect(signatureDistance(frameSignature(canvas), atRest)).toBeGreaterThan(0.1),
      { timeout: 10_000 },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Motion' }));
    fireEvent.click(await screen.findByRole('option', { name: /None/ }));
    await waitFor(
      () => expect(signatureDistance(frameSignature(canvas), atRest)).toBeLessThan(0.01),
      { timeout: 10_000 },
    );
  });

  it('holds still while a high-quality render is running', async () => {
    // A path trace accumulates samples of one fixed frame; a moving subject
    // averages to a smear, and every frame would restart the render.
    const spinning = setAnimation(doc(), { preset: 'turntable', speed: 2, durationSeconds: 2 });
    const { host } = mount(<Studio3dEditor initialDocument={spinning} />);
    const canvas = await readyCanvas(host);
    await settle(200);

    fireEvent.click(screen.getByRole('radio', { name: 'High quality' }));
    // Whether tracing is supported here or not, the motion stops.
    await settle(500);
    const a = frameSignature(canvas);
    await settle(500);
    expect(signatureDistance(frameSignature(canvas), a)).toBeLessThan(0.05);
  });

  it('offers the controls only once a motion is chosen', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);
    expect(screen.queryByRole('slider', { name: /speed/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Motion' }));
    fireEvent.click(await screen.findByRole('option', { name: /Spin/ }));
    expect(await screen.findByRole('slider', { name: /speed/i })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /seconds per turn/i })).toBeTruthy();
  });

  it('unmounting while spinning leaves no loop behind', async () => {
    const spinning = setAnimation(doc(), { preset: 'spin', speed: 2 });
    const { host, unmount } = mount(<Studio3dEditor initialDocument={spinning} />);
    await readyCanvas(host);
    unmount();
    host.remove();
    expect(document.querySelectorAll('canvas')).toHaveLength(0);
  });
});
