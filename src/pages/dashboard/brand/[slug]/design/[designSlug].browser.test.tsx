// Production editor route — minimum viable wiring (browser E2E).
//
// Step 9.3 commit 3a. Confirms the new `/b/:slug/design/:designSlug`
// route mounts the unified <Editor> with a real brand context when
// a saved design loads, and falls through to the redirect path when
// the design id is unknown. Real DOM, real Fabric.js — not a unit
// test, because the failure mode here ("Editor never mounts") is
// invisible to schema-only assertions.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import BrandDesignEditorPage from './[designSlug]';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService, IDesignStorage } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';

const FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => {
  cleanup();
  serviceContainer.clear();
});

function makeBrand(slug: string, name: string): Brand {
  return {
    id: `brand-${slug}`,
    slug,
    name,
    primaryColor: '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function registerServices(args: {
  brand?: Brand | null;
  saved?: Record<string, unknown>;
}) {
  const brandsStub: IBrandsService = {
    list: vi.fn(async () => (args.brand ? [args.brand] : [])),
    getById: vi.fn(async (id: string) => (args.brand?.id === id ? args.brand : null)),
    getBySlug: vi.fn(async (slug: string) =>
      args.brand?.slug === slug ? args.brand : null,
    ),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as IBrandsService;

  const designStub: IDesignStorage = {
    saveDesign: vi.fn(async () => {}),
    loadDesign: vi.fn(async (_brandId: string, designId: string) => {
      return args.saved?.[designId] ?? null;
    }),
    listDesigns: vi.fn(async () => Object.keys(args.saved ?? {}).map((id) => ({ id }))),
    deleteDesign: vi.fn(async () => {}),
  };

  serviceContainer.register(SERVICE_KEYS.BRANDS, () => brandsStub);
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStub);
}

function mount(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/b/:slug/design/:designSlug" element={<BrandDesignEditorPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-stub">dashboard</div>} />
        <Route
          path="/b/:slug/design"
          element={<div data-testid="launchpad-stub">launchpad</div>}
        />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  );
}

describe('BrandDesignEditorPage — production editor route', () => {
  it('mounts the unified Editor with brand context when both brand and design load', async () => {
    const brand = makeBrand('raqm', 'Raqm');
    registerServices({
      brand,
      saved: { 'design-abc': FIXTURE },
    });

    const { container } = mount('/b/raqm/design/design-abc');

    // Wait for the dual-load to settle and the Editor to mount. The
    // editor canvas region is the smoke marker (any unified-Editor
    // mount has it).
    await waitFor(
      () => {
        expect(container.querySelector('[data-editor-canvas-region]')).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // Brand context flowed through — the topbar shows the brand name.
    expect(container.textContent ?? '').toContain('Raqm');
  });

  it('renders inline NotFoundPanel when the design id is unknown (no redirect)', async () => {
    const brand = makeBrand('raqm', 'Raqm');
    registerServices({ brand, saved: {} });

    const { container } = mount('/b/raqm/design/missing-id');

    // Inline 404 — no redirect, URL stays at /b/raqm/design/missing-id.
    await waitFor(
      () => {
        expect(container.querySelector('[data-design-route-not-found]')).toBeTruthy();
      },
      { timeout: 5000 },
    );
    expect(container.textContent).toMatch(/Design not found in Raqm/);
    // Recovery action points back to brand launchpad.
    const back = container.querySelector<HTMLAnchorElement>('[data-not-found-primary]');
    expect(back?.getAttribute('href')).toBe('/b/raqm/design');
  });

  it('renders inline NotFoundPanel when the brand slug is unknown (no redirect)', async () => {
    registerServices({ brand: null });

    const { container } = mount('/b/no-such-brand/design/anything');

    await waitFor(
      () => {
        expect(container.querySelector('[data-design-route-not-found]')).toBeTruthy();
      },
      { timeout: 5000 },
    );
    expect(container.textContent).toMatch(/couldn't find brand "no-such-brand"/);
    const back = container.querySelector<HTMLAnchorElement>('[data-not-found-primary]');
    expect(back?.getAttribute('href')).toBe('/dashboard');
  });

  it('Share button on the editor topbar copies the canonical URL to clipboard', async () => {
    const brand = makeBrand('raqm', 'Raqm');
    registerServices({
      brand,
      saved: { 'design-abc': FIXTURE },
    });

    // Spy on clipboard.writeText.
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { container } = mount('/b/raqm/design/design-abc');

    // Wait for editor to mount.
    await waitFor(() => {
      expect(container.querySelector('[data-editor-canvas-region]')).toBeTruthy();
    }, { timeout: 5000 });

    // Click Share.
    const shareBtn = container.querySelector<HTMLButtonElement>('[data-share-button]');
    expect(shareBtn, 'Share button not in topbar').toBeTruthy();
    fireEvent.click(shareBtn!);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const [copied] = writeText.mock.calls[0] as [string];
    // Canonical /b/:slug/design/:designId URL — host-prefixed by
    // window.location.origin.
    expect(copied).toMatch(/\/b\/raqm\/design\/design-abc$/);
  });
});
