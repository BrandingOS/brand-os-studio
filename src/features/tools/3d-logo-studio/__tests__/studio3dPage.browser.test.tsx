/**
 * Phase 3 — the tool lives inside BrandingOS.
 *
 * Real Chromium, because the two things being proven are a real layout and a
 * real WebGL context: the app-shell grid only exists once a layout engine has
 * run, and "mounts and unmounts without leaking" is meaningless in jsdom, which
 * has no contexts to leak.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { page } from '@vitest/browser/context';

import { Studio3dEditor } from '../index';
import { createDocument } from '../engine/document';
import type { Component, Ring } from '../engine/types';

const circle = (cx: number, cy: number, r: number, n = 48): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};
const CENTRES: [number, number][] = [
  [78.3, 11.1], [101.9, 34.7], [56.5, 56.5], [34.7, 11.1], [78.3, 101.9],
  [34.7, 101.9], [11.1, 34.7], [101.9, 78.3], [11.1, 78.3],
];
const components: Component[] = CENTRES.map(([x, y], i) => ({
  id: `dot-${i}`, rings: [circle(x, y, 11.1, 48)], fillRule: 'nonzero',
}));

const doc = () =>
  createDocument({ svg: '<svg viewBox="0 0 113 113"/>', fileName: 'logomark-3d.svg', components });

/** The editor has to sit inside a sized, `data-workspace` host — that attribute
 *  is what makes every `--ds-*` token resolve, and the shell owns it in the
 *  real page. */
function mount(ui: React.ReactNode, size: [number, number] = [1400, 900]) {
  const host = document.createElement('div');
  host.setAttribute('data-workspace', '');
  host.setAttribute('data-theme', 'light');
  host.style.width = `${size[0]}px`;
  host.style.height = `${size[1]}px`;
  document.body.appendChild(host);
  const result = render(<MemoryRouter>{ui}</MemoryRouter>, { container: host });
  return { host, ...result };
}

const canvasCount = () => document.querySelectorAll('canvas').length;

/**
 * Wait for a canvas a renderer has actually taken over.
 *
 * The <canvas> element is in the markup from the first render, so waiting on
 * its mere existence proves nothing — an earlier version of this file did
 * exactly that and passed while the canvas sat at the HTML default of 300x150
 * with no WebGL context behind it.
 */
async function readyCanvas(host: HTMLElement): Promise<HTMLCanvasElement> {
  let canvas: HTMLCanvasElement | null = null;
  await waitFor(() => {
    canvas = host.querySelector('canvas[data-ready="true"]');
    expect(canvas).toBeTruthy();
    // 300x150 is the HTML default, i.e. a canvas nothing has claimed.
    expect(canvas!.width).not.toBe(300);
    expect(canvas!.width).toBeGreaterThan(0);
  }, { timeout: 20_000 });
  return canvas!;
}

/**
 * Did anything actually get drawn? Reads the framebuffer, which is the only
 * answer that cannot be faked by a mounted-but-idle renderer.
 *
 * The window is *centred*. Sampling from the origin reads the bottom-left
 * corner, which is background in every correctly framed render — so the first
 * version of this helper reported "nothing drawn" for a perfectly good picture.
 */
function drewSomething(canvas: HTMLCanvasElement): boolean {
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
  if (!gl) return false;
  const w = Math.min(canvas.width, 320);
  const h = Math.min(canvas.height, 320);
  const x = Math.max(0, Math.floor((canvas.width - w) / 2));
  const y = Math.max(0, Math.floor((canvas.height - h) / 2));
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const seen = new Set<number>();
  for (let i = 0; i < buf.length; i += 4) seen.add((buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2]);
  return seen.size > 4;
}

beforeAll(async () => {
  // Vitest's default viewport is 414px wide — below this feature's 1100px
  // app-shell breakpoint, where the layout deliberately collapses to one
  // scrolling column. Testing the shell needs a window that is actually in it.
  await page.viewport(1440, 900);
});

afterEach(() => {
  cleanup();
  document.body.querySelectorAll('[data-workspace]').forEach((n) => n.remove());
});

describe('the editor opens with no Brand', () => {
  it('shows the import surface and asks for nothing else', async () => {
    mount(<Studio3dEditor />);
    expect(await screen.findByText(/drop an svg logo here/i)).toBeTruthy();
    expect(screen.getByText(/never uploaded/i)).toBeTruthy();
    // No brand chooser, no sign-in wall, no empty brand state.
    expect(screen.queryByText(/choose a brand/i)).toBeNull();
    expect(screen.queryByText(/sign in/i)).toBeNull();
  });

  it('renders a document handed to it, without touching the network', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    await waitFor(() => expect(screen.getByText(/9 components/)).toBeTruthy(), { timeout: 15_000 });
    await waitFor(() => expect(drewSomething(canvas)).toBe(true), { timeout: 15_000 });
  });
});

describe('it wears BrandingOS chrome', () => {
  it('lays out as an application shell with three real columns', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);

    const work = host.querySelector('.l3d-work') as HTMLElement;
    const columns = getComputedStyle(work).gridTemplateColumns.split(/\s+/).map(parseFloat);
    expect(getComputedStyle(work).display).toBe('grid');
    expect(columns).toHaveLength(3);
    for (const c of columns) expect(c).toBeGreaterThan(40);
    // The middle column must not have been widened past the shell by its own
    // content — that is the failure minmax(0, 1fr) exists to prevent.
    expect(work.scrollWidth).toBeLessThanOrEqual(work.clientWidth + 1);
  });

  it('the stage actually has room, so the renderer can size itself', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    const stage = host.querySelector('.l3d-stage') as HTMLElement;
    expect(stage.clientWidth).toBeGreaterThan(600);
    expect(stage.clientHeight).toBeGreaterThan(400);
    // The drawing buffer follows the stage, not the HTML default.
    expect(canvas.width).toBeGreaterThanOrEqual(stage.clientWidth);
    expect(canvas.height).toBeGreaterThanOrEqual(stage.clientHeight);
  });

  it('names both panels the way every other workspace panel is named', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);
    expect(host.querySelectorAll('.panel').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Customize')).toBeTruthy();
    expect(screen.getByText('logomark-3d')).toBeTruthy();
  });

  it('resolves DS tokens rather than falling back to a browser default', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);
    const stage = host.querySelector('.l3d-stage') as HTMLElement;
    const bg = getComputedStyle(stage).backgroundColor;
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');
  });
});

describe('the controls reach the geometry', () => {
  it('switching mode rebuilds the mesh', async () => {
    mount(<Studio3dEditor initialDocument={doc()} />);
    await waitFor(() => expect(screen.getByText(/9 components/)).toBeTruthy(), { timeout: 15_000 });
    const before = screen.getByText(/triangles/).textContent;

    fireEvent.click(screen.getByRole('radio', { name: 'Extrude' }));
    await waitFor(
      () => expect(screen.getByText(/triangles/).textContent).not.toBe(before),
      { timeout: 15_000 },
    );
    // The controls for the new mode replace the old ones.
    expect(screen.getByText('Alignment')).toBeTruthy();
    expect(screen.queryByText('Front / back balance')).toBeNull();
  });

  it('a mode keeps its own settings when you leave and come back', async () => {
    mount(<Studio3dEditor initialDocument={doc()} />);
    await waitFor(() => expect(screen.getByText(/9 components/)).toBeTruthy(), { timeout: 15_000 });
    fireEvent.click(screen.getByRole('radio', { name: 'Extrude' }));
    await screen.findByText('Alignment');
    fireEvent.click(screen.getByRole('radio', { name: 'Back' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Inflate' }));
    await screen.findByText('Front / back balance');
    fireEvent.click(screen.getByRole('radio', { name: 'Extrude' }));
    await screen.findByText('Alignment');
    expect((screen.getByRole('radio', { name: 'Back' }) as HTMLElement).getAttribute('aria-checked')).toBe('true');
  });
});

describe('what the user sees first', () => {
  it('opens front-on, so the logo still reads as itself', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);
    expect(screen.getByRole('radio', { name: 'Front' }).getAttribute('aria-checked')).toBe('true');
  });

  it('the nine dots come out round, not stretched into ellipses', async () => {
    // The complaint that started this: an angled default view with a wide lens
    // turned the outer discs into ellipses, which reads as stretching rather
    // than depth.
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    await waitFor(() => expect(drewSomething(canvas)).toBe(true), { timeout: 15_000 });

    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
    const w = canvas.width, h = canvas.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    // The mark is nine identical discs in a ring, so whatever the object
    // occupies must be as wide as it is tall. Perspective on an angled view
    // broke that by more than 10%.
    let minX = w, maxX = -1, minY = h, maxY = -1;
    const bg = [buf[0], buf[1], buf[2]];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (Math.abs(buf[i] - bg[0]) + Math.abs(buf[i + 1] - bg[1]) + Math.abs(buf[i + 2] - bg[2]) > 24) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    expect(width).toBeGreaterThan(50);
    expect(width / height).toBeGreaterThan(0.93);
    expect(width / height).toBeLessThan(1.07);
  });

  it('a nine-part revolve raises one warning, not nine', async () => {
    // The first version pushed the artwork off the screen behind a stack of
    // nine identical banners.
    mount(<Studio3dEditor initialDocument={doc()} />);
    await waitFor(() => expect(screen.getByText(/9 components/)).toBeTruthy(), { timeout: 15_000 });
    fireEvent.click(screen.getByRole('radio', { name: 'Revolve' }));
    await screen.findByText('Sweep');
    // the default axis sits at the logo's edge, so nothing crosses it at all
    await waitFor(() => expect(screen.queryAllByText(/cross the axis/i)).toHaveLength(0), { timeout: 15_000 });

    // drag the pivot into the middle and exactly one banner appears
    const pivot = screen.getByRole('slider', { name: /pivot/i }) as HTMLInputElement;
    fireEvent.change(pivot, { target: { value: '0.5' } });
    await waitFor(() => expect(screen.getAllByText(/cross the axis/i).length).toBe(1), { timeout: 15_000 });
  });

  it('the view control moves the camera', async () => {
    const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvas = await readyCanvas(host);
    await waitFor(() => expect(drewSomething(canvas)).toBe(true), { timeout: 15_000 });
    const frame = () => {
      const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
      const buf = new Uint8Array(200 * 200 * 4);
      gl.readPixels((canvas.width - 200) / 2, (canvas.height - 200) / 2, 200, 200, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 4) sum += buf[i];
      return sum;
    };
    const before = frame();
    fireEvent.click(screen.getByRole('radio', { name: '3/4' }));
    await waitFor(() => expect(frame()).not.toBe(before), { timeout: 15_000 });
  });
});

describe('it leaves nothing behind', () => {
  it('unmounting removes the canvas', async () => {
    const { unmount, host } = mount(<Studio3dEditor initialDocument={doc()} />);
    await readyCanvas(host);
    unmount();
    expect(canvasCount()).toBe(0);
  });

  it(
    'mounting and unmounting many times still renders — the WebGL contexts are released',
    { timeout: 90_000 },
    async () => {
      // A browser caps live contexts at about sixteen. Without an explicit
      // release on unmount, the seventeenth canvas silently draws nothing at
      // all: no exception, no warning, just an empty viewport.
      for (let i = 0; i < 20; i++) {
        const { unmount, host } = mount(<Studio3dEditor initialDocument={doc()} />, [520, 380]);
        await readyCanvas(host);
        unmount();
        host.remove();
      }
      const { host } = mount(<Studio3dEditor initialDocument={doc()} />);
      const canvas = await readyCanvas(host);
      // Not "a context can be obtained" — asking an idle canvas for one just
      // makes a fresh one and passes. This asks whether the twenty-first
      // renderer actually put pixels on the screen.
      await waitFor(() => expect(drewSomething(canvas)).toBe(true), { timeout: 15_000 });
    },
  );

  it('two editors can be open at once without fighting over one context', async () => {
    const a = mount(<Studio3dEditor initialDocument={doc()} />);
    const b = mount(<Studio3dEditor initialDocument={doc()} />);
    const canvasA = await readyCanvas(a.host);
    const canvasB = await readyCanvas(b.host);
    expect(canvasCount()).toBe(2);
    await waitFor(() => {
      expect(drewSomething(canvasA)).toBe(true);
      expect(drewSomething(canvasB)).toBe(true);
    }, { timeout: 20_000 });
    a.unmount();
    b.unmount();
  });
});
