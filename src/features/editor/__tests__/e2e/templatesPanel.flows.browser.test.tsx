// Browser E2E for Phase 4.1 — Templates panel open-template flow.
//
// Mounts the unified Editor with the LocalTemplatesService seeded
// from the bundled SEED_TEMPLATES. Clicks the Templates rail entry,
// clicks the first template card's "Use this template" button,
// asserts navigation lands at /b/:slug/design/:designId AND that
// IDesignStorage received the seeded design with the brand resolved.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { Editor } from '@/features/editor/shell/Editor';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService, IDesignStorage } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import { LocalTemplatesService } from '@/core/adapters/templates/LocalTemplatesService';

const FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => {
  cleanup();
  serviceContainer.clear();
  // Bootstrapped seed flag → reset so each test gets fresh seeds.
  try {
    localStorage.removeItem('brandos:templates:bootstrapped-v1');
    localStorage.removeItem('brandos:templates:templates');
    localStorage.removeItem('brandos:templates:categories');
  } catch {
    /* ignore */
  }
});

function makeBrand(): Brand {
  return {
    id: 'brand-raqm', slug: 'raqm', name: 'Raqm',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function registerServices(brand: Brand) {
  const brands: IBrandsService = {
    list: vi.fn(async () => [brand]),
    getById: vi.fn(async (id: string) => (brand.id === id ? brand : null)),
    getBySlug: vi.fn(async (slug: string) => (brand.slug === slug ? brand : null)),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  } as unknown as IBrandsService;

  const saveDesign = vi.fn(async () => {});
  const designStorage: IDesignStorage = {
    saveDesign,
    loadDesign: vi.fn(async () => null),
    listDesigns: vi.fn(async () => []),
    deleteDesign: vi.fn(async () => {}),
    moveDesignToFolder: vi.fn(async () => {}),
  };

  serviceContainer.register(SERVICE_KEYS.BRANDS, () => brands);
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStorage);
  serviceContainer.register(SERVICE_KEYS.TEMPLATES, () => new LocalTemplatesService());

  return { saveDesign };
}

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

function DesignRouteStub() {
  const params = useParams<{ slug: string; designSlug: string }>();
  return (
    <div data-testid="design-route-landed">
      design route slug={params.slug} designSlug={params.designSlug}
    </div>
  );
}

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
  saveDesign: ReturnType<typeof vi.fn>;
  getLastPath: () => string;
}

async function mountWithTemplates(): Promise<MountResult> {
  const brand = makeBrand();
  const { saveDesign } = registerServices(brand);

  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });

  let lastPath = '/b/raqm';
  const onLocChange = (p: string) => { lastPath = p; };

  const { container } = render(
    <MemoryRouter initialEntries={['/b/raqm']}>
      <Routes>
        <Route
          path="/b/:slug"
          element={
            <Editor
              initialDocument={FIXTURE}
              save={async () => {}}
              brand={brand}
              onAdapterReady={(a) => resolveAdapter(a)}
            />
          }
        />
        <Route path="/b/:slug/design/:designSlug" element={<DesignRouteStub />} />
      </Routes>
      <LocationProbe onChange={onLocChange} />
      <Toaster />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 80));
  return { adapter, container, saveDesign, getLastPath: () => lastPath };
}

describe('Templates panel — open template flow (Phase 4.1)', () => {
  it('clicks Templates rail → renders categories + grid + at least one template card', async () => {
    const { container } = await mountWithTemplates();
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => {
      expect(container.querySelector('[data-templates-panel]')).toBeTruthy();
      const cards = container.querySelectorAll('[data-template-card]');
      expect(cards.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('clicking "Use this template" persists a brand-bound design + navigates to /b/raqm/design/:id', async () => {
    const { container, saveDesign, getLastPath } = await mountWithTemplates();
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    let firstCard: HTMLElement | null = null;
    await waitFor(() => {
      firstCard = container.querySelector<HTMLElement>('[data-template-card]');
      expect(firstCard).toBeTruthy();
    }, { timeout: 3000 });

    // Hover overlay → Use button. Hover styles aren't applied in
    // jsdom but the button is in the DOM regardless; click it.
    const useBtn = firstCard!.querySelector<HTMLButtonElement>('[data-template-use]');
    expect(useBtn, 'Use button missing on first card').toBeTruthy();
    fireEvent.click(useBtn!);

    // saveDesign called with brand id + a fresh design id + the seeded doc.
    await waitFor(() => {
      expect(saveDesign).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
    const [savedBrandId, savedDesignId, savedDoc] = saveDesign.mock.calls[0];
    expect(savedBrandId).toBe('brand-raqm');
    expect(typeof savedDesignId).toBe('string');
    expect(savedDesignId.length).toBeGreaterThan(20);
    // The persisted doc passes BrandOSDocumentSchema.
    expect(BrandOSDocumentSchema.safeParse(savedDoc).success).toBe(true);

    // Navigation landed at the production /b/:slug/design/:designSlug route.
    await waitFor(() => {
      expect(getLastPath()).toBe(`/b/raqm/design/${savedDesignId}`);
      expect(document.querySelector('[data-testid="design-route-landed"]')).toBeTruthy();
    });
  });

  it('graceful when TEMPLATES service is unregistered (defensive lookup)', async () => {
    // Mount without registering the templates service.
    const brand = makeBrand();
    const designStorage: IDesignStorage = {
      saveDesign: vi.fn(async () => {}),
      loadDesign: vi.fn(async () => null),
      listDesigns: vi.fn(async () => []),
      deleteDesign: vi.fn(async () => {}),
      moveDesignToFolder: vi.fn(async () => {}),
    };
    const brands: IBrandsService = {
      list: vi.fn(async () => [brand]),
      getById: vi.fn(async () => brand),
      getBySlug: vi.fn(async () => brand),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    } as unknown as IBrandsService;
    serviceContainer.register(SERVICE_KEYS.BRANDS, () => brands);
    serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStorage);
    // intentionally no TEMPLATES registration

    let resolveAdapter!: (a: EditorAdapter) => void;
    const adapterPromise = new Promise<EditorAdapter>((r) => { resolveAdapter = r; });

    const { container } = render(
      <MemoryRouter>
        <Editor
          initialDocument={FIXTURE}
          save={async () => {}}
          brand={brand}
          onAdapterReady={(a) => resolveAdapter(a)}
        />
        <Toaster />
      </MemoryRouter>,
    );
    await adapterPromise;
    await new Promise((r) => setTimeout(r, 60));

    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => {
      expect(container.querySelector('[data-templates-unavailable]')).toBeTruthy();
    });
    // Did NOT crash.
    expect(container.querySelector('[data-templates-grid]')).toBeNull();
  });
});
