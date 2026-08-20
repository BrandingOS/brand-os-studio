// Browser E2E for the brandkit → unified-editor migration.
//
// Step 9.3 commit 4 of 5. Mounts TemplateGallery for three
// representative families (business-cards = fixed-print,
// presentations = multi-page, invoices = new ContentTypeConfig)
// and asserts the migrated flow:
//   click → seed → IDesignStorage.saveDesign → navigate to
//   /b/:slug/design/:designSlug
//
// Plus the mockups placeholder branch — the only family we
// intentionally don't render a card for.
//
// Test shape note: we mount TemplateGallery directly rather than
// the wrapping BrandKitModulePage to keep the test focused on the
// migration's actual contract (gallery → seed → persist →
// navigate). The route wrapper is unchanged by Step 9.3.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TemplateGallery } from './TemplateGallery';
import { getModuleConfig } from '../data/modules';
import type { Brand } from '@/shared/types/brand';
import type { IDesignStorage } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';

afterEach(() => {
  cleanup();
  serviceContainer.clear();
});

function brand(): Brand {
  return {
    id: 'brand-raqm',
    slug: 'raqm',
    name: 'Raqm',
    primaryColor: '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

interface MountResult {
  container: HTMLElement;
  saveDesign: ReturnType<typeof vi.fn>;
  getLastNavigatedPath: () => string;
}

/**
 * LocationProbe captures the current pathname so the test can assert
 * what the gallery navigated to. Mounted as a sibling so it doesn't
 * interfere with the gallery's own DOM.
 */
function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

function mountGallery(moduleId: string): MountResult {
  const cfg = getModuleConfig(moduleId);
  if (!cfg) throw new Error(`No moduleConfig for ${moduleId}`);

  const saveDesign = vi.fn(async () => {});
  const designStub: IDesignStorage = {
    saveDesign,
    loadDesign: vi.fn(async () => null),
    listDesigns: vi.fn(async () => []),
    deleteDesign: vi.fn(async () => {}),
    moveDesignToFolder: vi.fn(async () => {}),
  };
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStub);

  let lastPath = `/b/raqm/brandkit/${moduleId}`;
  const onLocChange = (p: string) => {
    lastPath = p;
  };

  const { container } = render(
    <MemoryRouter initialEntries={[`/b/raqm/brandkit/${moduleId}`]}>
      <Routes>
        <Route
          path="/b/:slug/brandkit/:moduleId"
          element={<TemplateGallery moduleConfig={cfg} brand={brand()} />}
        />
        {/* Stub for the post-migration target route — captures the
            navigated path so we can assert on it. */}
        <Route
          path="/b/:slug/design/:designSlug"
          element={<div data-testid="design-route-landed">design route</div>}
        />
      </Routes>
      <LocationProbe onChange={onLocChange} />
      <Toaster />
    </MemoryRouter>,
  );

  return { container, saveDesign, getLastNavigatedPath: () => lastPath };
}

async function clickEditOnFirstCard(container: HTMLElement): Promise<void> {
  // The trimmed card exposes two hover-revealed buttons: Download
  // (onUse) and Edit (onEdit). Edit fires handleOpenEditor, which
  // post-Step-9.3-commit-3b directly seeds + persists + navigates —
  // no preview-modal hop. Find and click the Edit button by its
  // visible label.
  const cards = container.querySelectorAll<HTMLElement>('[data-template-id]');
  expect(cards.length, 'expected exactly one trimmed card').toBe(1);
  const buttons = Array.from(cards[0].querySelectorAll('button'));
  const editBtn = buttons.find((b) => (b.textContent ?? '').trim() === 'Edit');
  expect(editBtn, 'no Edit button on the trimmed card').toBeTruthy();
  fireEvent.click(editBtn!);
}

describe('TemplateGallery — Step 9.3 brandkit → unified-editor migration', () => {
  it.each([
    ['business-cards', 'fixed-print'],
    ['presentations', 'multi-page'],
    ['invoices', 'new ContentTypeConfig'],
  ] as const)(
    'family "%s" (%s): clicking Edit seeds + persists + navigates to /b/raqm/design/<id>',
    async (familyId) => {
      const { container, saveDesign, getLastNavigatedPath } = mountGallery(familyId);

      // Sanity: the trim landed at exactly one card.
      expect(container.querySelectorAll('[data-template-id]').length).toBe(1);

      await clickEditOnFirstCard(container);

      // saveDesign was called with (brandId, designId, document).
      await waitFor(() => {
        expect(saveDesign).toHaveBeenCalledTimes(1);
      });
      const [savedBrandId, savedDesignId, savedDoc] = saveDesign.mock.calls[0];
      expect(savedBrandId).toBe('brand-raqm');
      expect(typeof savedDesignId).toBe('string');
      expect(savedDesignId.length).toBeGreaterThan(0);
      // The persisted blob is a full BrandOSDocument with the family's
      // contentType (the seed's responsibility — verified more deeply
      // in templateSeeds.test.ts).
      expect((savedDoc as { contentType: string }).contentType).toBeTruthy();

      // Navigation landed on the unified-editor route AND the design id
      // in the URL matches the persisted id.
      await waitFor(() => {
        expect(getLastNavigatedPath()).toBe(`/b/raqm/design/${savedDesignId}`);
      });
      expect(
        document.querySelector('[data-testid="design-route-landed"]'),
      ).toBeTruthy();
    },
  );

  it('mockups module renders the "coming soon" placeholder, not a card', () => {
    const { container } = mountGallery('mockups');
    expect(container.querySelector('[data-mockup-placeholder]')).toBeTruthy();
    expect(container.querySelectorAll('[data-template-id]').length).toBe(0);
  });
});
