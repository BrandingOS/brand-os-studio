/**
 * Bento as a page of BrandingOS.
 *
 * The unit suite reads the source and asserts the shell is reached. This one
 * mounts the route and asserts what a person actually sees: the product's own
 * top bar with the five sections in it, one shell and not two, three columns
 * that each have real width, and a canvas that scaled to fit between them.
 *
 * The last of those is why this is a browser test. `BentoCanvas` measures its
 * container to choose a scale, so a column with no resolved width scales the
 * artboard to nothing — a blank workspace that passes every assertion made
 * against markup.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The page reaches the DI container for the assets service (saving an uploaded
// image into the brand library). None of that is under test here, and booting
// the real container would drag Supabase in.
const assets = vi.hoisted(() => ({ create: vi.fn(async () => ({ id: 'a1' })) }));
vi.mock('@/core', () => ({ SERVICE_KEYS: { ASSETS: 'ASSETS' }, useService: () => assets }));

import { useBentoStore } from '../store';
import { BentoEditor } from '../BentoEditor';
import '../bento.css';
import '@/shared/styles/workspace.css';

const brand = {
  id: 'b1',
  name: 'Raqm',
  slug: 'raqm',
  primaryColor: '#C8102E',
  assets: [],
} as never;

beforeEach(() => {
  useBentoStore.getState().init(brand);
});
afterEach(cleanup);

function mount() {
  return render(
    <MemoryRouter initialEntries={['/b/raqm/bento']}>
      <BentoEditor brand={brand} />
    </MemoryRouter>,
  );
}

describe('the page wears the product’s chrome', () => {
  it('renders the real workspace shell, exactly once', () => {
    const { container } = mount();
    expect(container.querySelectorAll('[data-workspace]')).toHaveLength(1);
  });

  it('carries the five-section nav, so there is a way to everything else', () => {
    mount();
    for (const label of ['Setup', 'Brand Kit', 'Guideline', 'Design', 'Tools']) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy();
    }
  });

  it('points the section nav at this brand', () => {
    mount();
    expect(screen.getByRole('link', { name: 'Brand Kit' }).getAttribute('href')).toBe(
      '/b/raqm/brand-kit',
    );
  });

  it('puts its actions in the shell’s bar, not in a bar of its own', () => {
    const { container } = mount();
    const bar = container.querySelector('header, .top-nav, [class*="top-nav"]');
    expect(bar).not.toBeNull();
    expect(bar!.textContent).toContain('Export');
    // One header. A second one is the legacy editor chrome growing back.
    expect(container.querySelectorAll('.bento-toolbar')).toHaveLength(0);
  });

  it('names the page', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Bento' })).toBeTruthy();
  });
});

describe('the workspace has real geometry', () => {
  it('gives all three columns width', () => {
    const { container } = mount();
    const rail = container.querySelector<HTMLElement>('.bento-rail');
    const stage = container.querySelector<HTMLElement>('.bento-stage');
    const props = container.querySelector<HTMLElement>('.bento-inspector');
    expect(rail!.getBoundingClientRect().width).toBeGreaterThan(100);
    expect(stage!.getBoundingClientRect().width).toBeGreaterThan(100);
    expect(props!.getBoundingClientRect().width).toBeGreaterThan(100);
  });

  it('scales the artboard to fit its column', () => {
    const { container } = mount();
    const artboard = container.querySelector<HTMLElement>('[data-bento-artboard]');
    const stage = container.querySelector<HTMLElement>('.bento-stage')!;
    const box = artboard!.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(50);
    // Fitted, not overflowing — the whole point of the measurement.
    expect(box.width).toBeLessThanOrEqual(stage.getBoundingClientRect().width + 1);
  });

  it('keeps the panels as cards, like every other Studio sidebar', () => {
    const { container } = mount();
    const rail = container.querySelector<HTMLElement>('.bento-rail')!;
    const cs = getComputedStyle(rail);
    expect(parseFloat(cs.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(cs.borderTopWidth).not.toBe('0px');
  });
});

describe('the properties panel', () => {
  it('offers the document and the tile in one place', () => {
    mount();
    expect(screen.getByRole('radio', { name: 'Tile' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Document' })).toBeTruthy();
  });

  it('opens on the document, which is what exists before anything is selected', () => {
    mount();
    expect(screen.getByRole('radio', { name: 'Document' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByLabelText('Gap')).toBeTruthy();
  });
});
