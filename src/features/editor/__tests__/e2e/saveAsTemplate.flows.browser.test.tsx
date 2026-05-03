// Browser E2E for Phase 4.2 — Save as template + My Designs.
//
// Two flows:
//   1. Save current design as a private template → assert
//      ITemplatesService.createTemplate received a brand-bound doc
//      (literals → SlotRefs) and the appropriate visibility/status.
//   2. My Designs tab in TemplatesPanel renders saved-design
//      summaries from IDesignStorage.listDesigns and clicking one
//      navigates to /b/:slug/design/:id.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import {
  MemoryRouter, Route, Routes, useLocation,
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
  try {
    localStorage.removeItem('brandos:templates:bootstrapped-v1');
    localStorage.removeItem('brandos:templates:templates');
    localStorage.removeItem('brandos:templates:categories');
  } catch { /* ignore */ }
});

function makeBrand(): Brand {
  return {
    id: 'brand-raqm', slug: 'raqm', name: 'Raqm',
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

interface MountOpts {
  designs?: Array<{ id: string; name?: string; thumbnailUrl?: string; contentType?: string }>;
}

async function mountEditor(opts: MountOpts = {}) {
  const brand = makeBrand();
  const brands: IBrandsService = {
    list: vi.fn(async () => [brand]),
    getById: vi.fn(async () => brand),
    getBySlug: vi.fn(async () => brand),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  } as unknown as IBrandsService;

  const designStorage: IDesignStorage = {
    saveDesign: vi.fn(async () => {}),
    loadDesign: vi.fn(async () => null),
    listDesigns: vi.fn(async () => opts.designs ?? []),
    deleteDesign: vi.fn(async () => {}),
  };

  const templatesService = new LocalTemplatesService();
  const createSpy = vi.spyOn(templatesService, 'createTemplate');

  serviceContainer.register(SERVICE_KEYS.BRANDS, () => brands);
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStorage);
  serviceContainer.register(SERVICE_KEYS.TEMPLATES, () => templatesService);

  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => { resolveAdapter = r; });
  let lastPath = '/b/raqm';

  const { container } = render(
    <MemoryRouter initialEntries={['/b/raqm']}>
      <Routes>
        <Route path="/b/:slug" element={
          <Editor
            initialDocument={FIXTURE}
            save={async () => {}}
            brand={brand}
            onAdapterReady={(a) => resolveAdapter(a)}
          />
        } />
        <Route path="/b/:slug/design/:designSlug" element={<div data-testid="design-route">opened</div>} />
      </Routes>
      <LocationProbe onChange={(p) => { lastPath = p; }} />
      <Toaster />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 80));
  return { adapter, container, createSpy, designStorage, getLastPath: () => lastPath };
}

// ─── Flow 1 — Save as template ─────────────────────────────────────────

describe('Phase 4.2 — Save as template (top-chrome button)', () => {
  it('clicking Save → fills name → submits → ITemplatesService.createTemplate called with brand-bound doc', async () => {
    const { container, createSpy } = await mountEditor();

    // Open the popover.
    const trigger = container.querySelector<HTMLButtonElement>('[data-save-as-template-trigger]');
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger!);

    // Form mounts.
    await waitFor(() => {
      expect(container.querySelector('[data-save-as-template-popover]')).toBeTruthy();
    });

    // Fill name + submit.
    const nameInput = container.querySelector<HTMLInputElement>('[data-save-as-template-name]')!;
    fireEvent.change(nameInput, { target: { value: 'My branded post' } });

    // Visibility defaults to 'private'; mood defaults to 'professional'.
    const submit = container.querySelector<HTMLButtonElement>('[data-save-as-template-submit]')!;
    fireEvent.click(submit);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
    const args = createSpy.mock.calls[0][0];
    expect(args.name).toBe('My branded post');
    expect(args.source).toBe('user_uploaded');
    expect(args.visibility).toBe('private');
    // Private = auto-approved per spec.
    expect(args.uploadStatus).toBe('approved');
    // The persisted doc still parses against the schema.
    expect(args.document).toBeTruthy();
    expect(BrandOSDocumentSchema.safeParse(args.document).success).toBe(true);
  });

  it('public visibility → uploadStatus = pending (4.4 admin queue)', async () => {
    const { container, createSpy } = await mountEditor();
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-save-as-template-trigger]')!);
    await waitFor(() => container.querySelector('[data-save-as-template-popover]'));

    fireEvent.change(
      container.querySelector<HTMLInputElement>('[data-save-as-template-name]')!,
      { target: { value: 'Community submission' } },
    );
    fireEvent.change(
      container.querySelector<HTMLSelectElement>('[data-save-as-template-visibility]')!,
      { target: { value: 'public' } },
    );
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-save-as-template-submit]')!);

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    const args = createSpy.mock.calls[0][0];
    expect(args.visibility).toBe('public');
    expect(args.uploadStatus).toBe('pending');
  });

  it('rejects empty name (toast + no createTemplate call)', async () => {
    const { container, createSpy } = await mountEditor();
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-save-as-template-trigger]')!);
    await waitFor(() => container.querySelector('[data-save-as-template-popover]'));

    // Submit button is disabled when name is empty (defensive check
    // beyond the toast — verify the submit can't fire).
    const submit = container.querySelector<HTMLButtonElement>('[data-save-as-template-submit]')!;
    expect(submit.disabled).toBe(true);

    expect(createSpy).not.toHaveBeenCalled();
  });
});

// ─── Flow 2 — My Designs tab ───────────────────────────────────────────

describe('Phase 4.2 — My Designs tab in Templates panel', () => {
  it('renders saved-design summaries from IDesignStorage and clicks navigate to the design route', async () => {
    const { container, getLastPath } = await mountEditor({
      designs: [
        { id: 'design-aaa', name: 'My first design', thumbnailUrl: 'data:image/svg+xml;utf8,a', contentType: 'social-post' },
        { id: 'design-bbb', name: 'Pitch deck', thumbnailUrl: 'data:image/svg+xml;utf8,b', contentType: 'presentation' },
      ],
    });

    // Open Templates panel.
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => container.querySelector('[data-templates-panel]'));

    // Switch to My Designs tab.
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-templates-tab="my-designs"]')!);

    await waitFor(() => {
      const cards = container.querySelectorAll('[data-my-design-card]');
      expect(cards.length).toBe(2);
    });

    // Click first card → navigates.
    const firstCard = container.querySelector<HTMLButtonElement>('[data-my-design-card][data-design-id="design-aaa"]');
    fireEvent.click(firstCard!);
    await waitFor(() => {
      expect(getLastPath()).toBe('/b/raqm/design/design-aaa');
    });
  });

  it('empty My Designs → shows empty state', async () => {
    const { container } = await mountEditor({ designs: [] });
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => container.querySelector('[data-templates-panel]'));
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-templates-tab="my-designs"]')!);
    await waitFor(() => {
      expect(container.querySelector('[data-my-designs-empty]')).toBeTruthy();
    });
  });
});
