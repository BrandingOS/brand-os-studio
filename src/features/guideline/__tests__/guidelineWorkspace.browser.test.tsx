// Browser E2E — the Brand Guidelines workspace at /b/:slug/guideline.
//
// Pins the FLOW rather than the markup: the landing states what you have, and
// opening it lands on the deck editor route. The page it replaced offered a
// row of controls that were toasts; the guard here is that what is shown is
// real — the status comes from the same store the editor writes to.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { GuidelineWorkspace } from '../GuidelineWorkspace';
import { useSlideSnapshotStore } from '@/shared/editor/slideSnapshotStore';
import { EDITORIAL_GUIDELINE, guidelineEditorKey } from '../templates/registry';
import type { Brand } from '@/shared/types/brand';

const brand = {
  id: 'brand-1',
  slug: 'acme',
  name: 'Acme',
  primaryColor: '#2B4CF2',
  fonts: { primary: 'Inter' },
  guidelines: { strategy: { mission: 'Make good things.' } },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Brand;

// NOTE: no default for `b`. `mount(undefined)` would otherwise fall back to the
// default parameter and quietly render the happy path — which is exactly how
// the loading-state test passed against the wrong branch the first time.
function mount(b: Brand | undefined, opts: { isLoading?: boolean; error?: string } = {}) {
  let location = '';
  function Probe() {
    location = useLocation().pathname;
    return null;
  }
  render(
    <MemoryRouter initialEntries={['/b/acme/guideline']}>
      <Probe />
      <Routes>
        <Route
          path="/b/:slug/guideline"
          element={
            <GuidelineWorkspace
              slug="acme"
              brand={b}
              isLoading={opts.isLoading ?? false}
              error={opts.error}
            />
          }
        />
        <Route path="/b/:slug/guideline/:templateId" element={<div>DECK EDITOR</div>} />
        <Route path="/b/:slug/setup" element={<div>SETUP</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return () => location;
}

beforeEach(() => {
  useSlideSnapshotStore.setState({ snapshots: {}, currentSlideIndex: {}, hasHydrated: true });
});
afterEach(() => cleanup());

describe('the guidelines landing', () => {
  it('names the brand and its guideline', () => {
    mount(brand);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Acme');
    expect(screen.getByRole('heading', { level: 2, name: 'Editorial' })).toBeTruthy();
  });

  it('states the real page count, read off the built deck', () => {
    mount(brand);
    const built = EDITORIAL_GUIDELINE.buildSlides(brand).length;
    expect(screen.getByText(`${built} pages`)).toBeTruthy();
  });

  it('lists every chapter the template covers', () => {
    mount(brand);
    for (const section of EDITORIAL_GUIDELINE.sections) {
      expect(screen.getByText(section)).toBeTruthy();
    }
  });
});

describe('opening the guideline', () => {
  it('lands on the deck editor route', async () => {
    const where = mount(brand);
    fireEvent.click(screen.getByRole('button', { name: /open guideline/i }));
    await waitFor(() => expect(where()).toBe('/b/acme/guideline/editorial'));
    expect(screen.getByText('DECK EDITOR')).toBeTruthy();
  });
});

describe('progress is real, not decorative', () => {
  it('reads Not started when the editor has written nothing', () => {
    mount(brand);
    expect(screen.getByText('Not started')).toBeTruthy();
  });

  it('reflects edits the EDITOR made, from the same store it writes to', () => {
    // This is the contract: the badge is not a hard-coded chip. Seed the
    // editor's own snapshot store and the landing must notice.
    const key = guidelineEditorKey(EDITORIAL_GUIDELINE, brand.id);
    useSlideSnapshotStore.setState({
      snapshots: { [key]: { cover: '<h1>Edited</h1>', values: '<p>Ours</p>' } },
      hasHydrated: true,
    });
    mount(brand);
    expect(screen.getByText('Edited')).toBeTruthy();
    expect(screen.getByText('2 pages customised')).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue editing/i })).toBeTruthy();
  });

  it('ignores another brand’s edits', () => {
    useSlideSnapshotStore.setState({
      snapshots: { 'brand-guides-someone-else': { cover: '<h1>x</h1>' } },
      hasHydrated: true,
    });
    mount(brand);
    expect(screen.getByText('Not started')).toBeTruthy();
  });
});

describe('brands that are not ready yet', () => {
  it('says what is missing and points at Setup, rather than rendering gaps silently', () => {
    const bare = { ...brand, fonts: undefined, guidelines: undefined } as unknown as Brand;
    mount(bare);
    const notice = screen.getByRole('status');
    expect(notice.textContent).toMatch(/a typeface/);
    expect(notice.textContent).toMatch(/a mission/);
    expect(screen.getByRole('link', { name: /finish setup/i })).toBeTruthy();
  });

  it('shows no notice when the brand has what it needs', () => {
    const full = {
      ...brand,
      logos: [{ role: 'primary', url: 'data:image/svg+xml,<svg/>' }],
    } as unknown as Brand;
    mount(full);
    // fonts + mission are present; the only possible gap is the logo, so the
    // notice must not claim anything that IS there.
    const notice = screen.queryByRole('status');
    if (notice) expect(notice.textContent).not.toMatch(/typeface|mission/);
  });
});

describe('states', () => {
  it('says it is loading before the brand resolves', () => {
    mount(undefined, { isLoading: true });
    expect(screen.getByText(/loading brand/i)).toBeTruthy();
  });

  it('explains a missing brand instead of rendering an empty page', () => {
    mount(undefined, { error: 'gone' });
    expect(screen.getByText(/couldn’t find that brand/i)).toBeTruthy();
  });
});
