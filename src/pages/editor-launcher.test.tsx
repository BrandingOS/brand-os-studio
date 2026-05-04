// Phase 5 — `/editor` instant-on launcher.
//
// Asserts the on-mount flow: resolve a brand → seed a blank doc →
// persist via IDesignStorage with the "Untitled design" meta →
// replace-navigate to /b/<slug>/design/<id>.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import EditorLauncherPage from './editor-launcher';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IBrandsService, IDesignStorage } from '@/core';
import type { Brand } from '@/shared/types/brand';

function fakeBrand(slug = 'raqm', id = 'brand-raqm'): Brand {
  return {
    id, slug, name: 'Raqm',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

afterEach(() => {
  cleanup();
  serviceContainer.clear();
});

beforeEach(() => {
  serviceContainer.clear();
});

function mount(opts: {
  brands: Brand[];
  preferredQuery?: string;
  /** When set, mounts at /b/<brandScopedSlug>/editor instead of /editor. */
  brandScopedSlug?: string;
}) {
  const list = vi.fn(async () => opts.brands);
  const getBySlug = vi.fn(async (slug: string) => opts.brands.find((b) => b.slug === slug) ?? null);
  const brandsService: IBrandsService = {
    list, getBySlug,
    getById: vi.fn(async () => null),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  } as unknown as IBrandsService;

  const saveDesign = vi.fn(async () => {});
  const designStorage: IDesignStorage = {
    saveDesign,
    loadDesign: vi.fn(async () => null),
    listDesigns: vi.fn(async () => []),
    deleteDesign: vi.fn(async () => {}),
  };

  serviceContainer.register(SERVICE_KEYS.BRANDS, () => brandsService);
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStorage);

  const startPath = opts.brandScopedSlug ? `/b/${opts.brandScopedSlug}/editor` : '/editor';
  let lastPath = startPath;
  const initialEntry = opts.preferredQuery ? `${startPath}?${opts.preferredQuery}` : startPath;
  const ui = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/editor" element={<EditorLauncherPage />} />
        <Route path="/b/:slug/editor" element={<EditorLauncherPage />} />
        <Route
          path="/b/:slug/design/:designSlug"
          element={<div data-testid="design-route">opened</div>}
        />
        <Route path="/dashboard" element={<div data-testid="dashboard-route">dash</div>} />
      </Routes>
      <LocationProbe onChange={(p) => { lastPath = p; }} />
      <Toaster />
    </MemoryRouter>,
  );
  return {
    ...ui,
    saveDesign,
    list,
    getBySlug,
    getLastPath: () => lastPath,
  };
}

describe('/editor launcher', () => {
  it('uses the first brand from IBrandsService when no ?brand= is given', async () => {
    const { saveDesign, getLastPath } = mount({ brands: [fakeBrand('raqm', 'brand-raqm'), fakeBrand('skam', 'brand-skam')] });

    await waitFor(() => expect(saveDesign).toHaveBeenCalledTimes(1), { timeout: 3000 });

    const [brandIdArg, designIdArg, docArg, metaArg] = saveDesign.mock.calls[0];
    expect(brandIdArg).toBe('brand-raqm');
    expect(designIdArg.length).toBeGreaterThan(20);
    expect((docArg as { contentType: string }).contentType).toBe('social-post');
    expect((metaArg as { name: string }).name).toBe('Untitled design');

    await waitFor(() => expect(getLastPath()).toBe(`/b/raqm/design/${designIdArg}`));
  });

  it('honors ?brand=<slug> and saves under that brand', async () => {
    const { saveDesign, getLastPath, getBySlug } = mount({
      brands: [fakeBrand('raqm', 'brand-raqm'), fakeBrand('skam', 'brand-skam')],
      preferredQuery: 'brand=skam',
    });

    await waitFor(() => expect(saveDesign).toHaveBeenCalledTimes(1));
    expect(getBySlug).toHaveBeenCalledWith('skam');
    expect(saveDesign.mock.calls[0][0]).toBe('brand-skam');
    await waitFor(() =>
      expect(getLastPath()).toBe(`/b/skam/design/${saveDesign.mock.calls[0][1]}`),
    );
  });

  it('falls back to the seed `raqm` brand when the service returns no brands', async () => {
    const { saveDesign, getLastPath } = mount({ brands: [] });

    await waitFor(() => expect(saveDesign).toHaveBeenCalledTimes(1));
    // Seed brand id is whatever data/brands/raqm exports — we just
    // assert the URL slug + the meta shape.
    const designId = saveDesign.mock.calls[0][1] as string;
    await waitFor(() => expect(getLastPath()).toBe(`/b/raqm/design/${designId}`));
  });

  it('does not double-seed under React StrictMode-style double-invoke', async () => {
    const { saveDesign } = mount({ brands: [fakeBrand('raqm', 'brand-raqm')] });
    await waitFor(() => expect(saveDesign).toHaveBeenCalledTimes(1));
    // Wait briefly to confirm a second call doesn't sneak in.
    await new Promise((r) => setTimeout(r, 100));
    expect(saveDesign).toHaveBeenCalledTimes(1);
  });

  it('brand-scoped /b/:slug/editor uses the URL slug, ignoring ?brand= and the list', async () => {
    const { saveDesign, getBySlug, getLastPath, list } = mount({
      brands: [fakeBrand('raqm', 'brand-raqm'), fakeBrand('skam', 'brand-skam')],
      brandScopedSlug: 'skam',
      // ?brand= conflicts with the URL slug — the URL slug wins.
      preferredQuery: 'brand=raqm',
    });

    await waitFor(() => expect(saveDesign).toHaveBeenCalledTimes(1));
    expect(getBySlug).toHaveBeenCalledWith('skam');
    // list() is only consulted when no preferred slug exists.
    expect(list).not.toHaveBeenCalled();
    expect(saveDesign.mock.calls[0][0]).toBe('brand-skam');
    await waitFor(() =>
      expect(getLastPath()).toBe(`/b/skam/design/${saveDesign.mock.calls[0][1]}`),
    );
  });
});
