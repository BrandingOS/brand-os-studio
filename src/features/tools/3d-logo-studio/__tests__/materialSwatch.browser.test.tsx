/**
 * The material picker's swatches.
 *
 * The point of rendering them rather than approximating them with a gradient is
 * that the metals differ by how they reflect, not by their colour — so the test
 * that matters is that three light-grey metals produce three *different*
 * pictures.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { page } from '@vitest/browser/context';

import { MaterialSwatch } from '../components/MaterialSwatch';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { createDocument } from '../engine/document';
import { getMaterial, MATERIAL_PRESETS } from '../materials/presets';
import type { Component, Ring } from '../engine/types';

const circle = (cx: number, cy: number, r: number, n = 48): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  return Float64Array.from(p);
};
const components: Component[] = [{ id: 'a', rings: [circle(50, 50, 30)], fillRule: 'nonzero' }];
const doc = () => createDocument({ svg: '<svg/>', fileName: 'mark.svg', components });

function mount(ui: React.ReactNode) {
  const host = document.createElement('div');
  host.setAttribute('data-workspace', '');
  host.setAttribute('data-theme', 'light');
  host.style.width = '340px';
  document.body.appendChild(host);
  return { host, ...render(ui, { container: host }) };
}

beforeAll(async () => { await page.viewport(900, 800); });
afterEach(() => {
  cleanup();
  document.body.querySelectorAll('[data-workspace]').forEach((n) => n.remove());
});

/** Mean RGB of a rendered swatch, read back through a canvas. */
async function swatchPixels(img: HTMLImageElement): Promise<[number, number, number]> {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || 96;
  c.height = img.naturalHeight || 96;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

describe('material swatches', () => {
  it('shows something immediately, before anything has rendered', () => {
    const { host } = mount(<MaterialSwatch preset={getMaterial('gold')!} />);
    const chip = host.querySelector('.l3d-swatch') as HTMLElement;
    expect(chip).toBeTruthy();
    // the stand-in carries the material's own colour rather than being blank
    expect(getComputedStyle(chip).backgroundImage).toContain('gradient');
  });

  it('is a circle, with no help from any other component', () => {
    // The crop lives in the feature stylesheet, and the swatch imports it
    // itself. Leaving that to whichever component happened to be mounted made
    // every filled swatch — the glass ones — render as a square.
    const { host } = mount(<MaterialSwatch preset={getMaterial('clear-glass')!} size={24} />);
    const chip = host.querySelector('.l3d-swatch') as HTMLElement;
    const radius = getComputedStyle(chip).borderRadius;
    expect(radius === '50%' || parseFloat(radius) >= 12).toBe(true);
    expect(getComputedStyle(chip).overflow).toBe('hidden');
  });

  it('replaces the stand-in with a rendered sphere', async () => {
    const { host } = mount(<MaterialSwatch preset={getMaterial('gold')!} />);
    await waitFor(() => {
      expect(host.querySelector('.l3d-swatch img')).toBeTruthy();
    }, { timeout: 30_000 });
    const img = host.querySelector('.l3d-swatch img') as HTMLImageElement;
    expect(img.src.startsWith('data:image/png')).toBe(true);
  });

  it('gold looks like gold and copper looks like copper', async () => {
    const { host } = mount(
      <>
        <MaterialSwatch preset={getMaterial('gold')!} />
        <MaterialSwatch preset={getMaterial('copper')!} />
      </>,
    );
    await waitFor(() => expect(host.querySelectorAll('.l3d-swatch img')).toHaveLength(2), { timeout: 30_000 });
    const imgs = Array.from(host.querySelectorAll('.l3d-swatch img')) as HTMLImageElement[];
    await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = r; })));
    const [gold, copper] = await Promise.all(imgs.map(swatchPixels));
    // both warm, and copper decidedly redder than gold
    expect(gold[0]).toBeGreaterThan(gold[2]);
    expect(copper[0]).toBeGreaterThan(copper[2]);
    expect(copper[0] - copper[1]).toBeGreaterThan(gold[0] - gold[1]);
  });

  it('three grey metals produce three different pictures — the whole reason these are rendered', async () => {
    const ids = ['polished-chrome', 'brushed-aluminium', 'textured-silver'];
    const { host } = mount(
      <>{ids.map((id) => <MaterialSwatch key={id} preset={getMaterial(id)!} />)}</>,
    );
    await waitFor(() => expect(host.querySelectorAll('.l3d-swatch img')).toHaveLength(3), { timeout: 30_000 });
    const srcs = Array.from(host.querySelectorAll('.l3d-swatch img')).map((i) => (i as HTMLImageElement).src);
    // Their base colours are within a few points of each other; a colour chip
    // would have made all three identical.
    expect(new Set(srcs).size).toBe(3);
  });

  it('no swatch is blank — glass included', async () => {
    // Clear and frosted glass rendered as empty circles: transmission refracts
    // what is behind the surface, and behind it was nothing at all.
    const glassy = ['clear-glass', 'frosted-glass', 'smoked-glass', 'tinted-glass'];
    const { host } = mount(<>{glassy.map((id) => <MaterialSwatch key={id} preset={getMaterial(id)!} />)}</>);
    await waitFor(() => expect(host.querySelectorAll('.l3d-swatch img')).toHaveLength(4), { timeout: 30_000 });
    const imgs = Array.from(host.querySelectorAll('.l3d-swatch img')) as HTMLImageElement[];
    await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = r; })));
    for (const img of imgs) {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let opaque = 0;
      const seen = new Set<number>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 200) { opaque++; seen.add((data[i] >> 4 << 8) | (data[i + 1] >> 4 << 4) | (data[i + 2] >> 4)); }
      }
      // most of the circle is drawn, and it is not one flat tone
      expect(opaque / (c.width * c.height), img.src.slice(0, 40)).toBeGreaterThan(0.3);
      expect(seen.size, img.src.slice(0, 40)).toBeGreaterThan(3);
    }
  });

  it('every preset gets a swatch', async () => {
    const { host } = mount(
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 12, width: 760 }}>
        {MATERIAL_PRESETS.map((p) => (
          <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, width: 230, fontSize: 13 }}>
            <MaterialSwatch preset={p} size={30} />
            {p.name}
          </span>
        ))}
      </div>,
    );
    host.style.width = '790px';
    await waitFor(
      () => expect(host.querySelectorAll('.l3d-swatch img').length).toBe(MATERIAL_PRESETS.length),
      { timeout: 45_000 },
    );
    await page.screenshot({ path: 'swatches-all.png' });
  });
});

describe('the picker', () => {
  const noop = () => {};
  const panel = () => (
    <PropertiesPanel
      doc={doc()}
      onModeChange={noop}
      onModePatch={noop}
      onMaterialChange={noop}
      onLightingChange={noop}
      onBackgroundToggle={noop}
      onViewChange={noop}
      onProjectionChange={noop}
      onRenderChange={noop}
      onAnimationChange={noop}
      onLightSourceChange={noop}
      onLightSourceReset={noop}
      onReset={noop}
    />
  );

  it('shows a swatch on the closed control and on every option', async () => {
    const { host } = mount(panel());
    const trigger = screen.getByRole('button', { name: 'Material' });
    // the current material is previewed without opening anything
    expect(trigger.querySelector('.l3d-swatch')).toBeTruthy();

    fireEvent.click(trigger);
    const list = await screen.findByRole('listbox');
    const options = list.querySelectorAll('[role="option"]');
    expect(options.length).toBe(MATERIAL_PRESETS.length);
    for (const option of Array.from(options)) {
      expect(option.querySelector('.l3d-swatch'), option.textContent ?? '').toBeTruthy();
    }
    void host;
  });

  it('the swatch sits beside the name, not over it', async () => {
    mount(panel());
    fireEvent.click(screen.getByRole('button', { name: 'Material' }));
    const list = await screen.findByRole('listbox');
    const option = list.querySelector('[role="option"]') as HTMLElement;
    const chip = option.querySelector('.l3d-swatch') as HTMLElement;
    const label = option.querySelector('.ds-select-label') as HTMLElement;
    const chipBox = chip.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    expect(chipBox.width).toBeGreaterThan(12);
    expect(labelBox.left).toBeGreaterThanOrEqual(chipBox.right - 1);
  });
});
