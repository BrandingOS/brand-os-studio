/**
 * The Brand Kit → Design hand-off, across the whole kit.
 *
 * `brandKitToDesign.browser.test.tsx` proves the MECHANICS on one family:
 * a copy is independent, a master is canonical, editing a master cannot
 * reach a design already taken from it. This file proves the mechanics
 * reach every family — which is the thing that was actually broken.
 *
 * Ten families were converted onto the content model and every one of them
 * stayed unreachable, because two records had to agree and only one of
 * them had been updated: `renderers/contentBinding.ts` (may this design be
 * handed over?) and `kit/registry.ts`'s `contentTypeId` (what does Design
 * open it as?). Both were written when only invoices bound, and nothing
 * failed when the other ten arrived. So the sweep below walks a real
 * variant of each family through the real page:
 *
 *   right-click a tile → `Use Template` is ENABLED → click it → a design
 *   is saved whose body is a `template-instance` naming that variant, with
 *   the family's hydrated defaults as its content → then `Edit Template`
 *   creates the canonical master, and clicking it again reuses it.
 *
 * Only `IDesignStorage` is stubbed. Everything else — the page, the
 * drilldown, the tile menu, the gate, the registry, the content model — is
 * the real thing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core/types/services';
import type { IDesignStorage, DesignSummary } from '@/core/types/services';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';
import { DELIVERABLES } from '../kit/registry';
import { variantsForCard } from '../data/legacy-mapping';
import { saveFeaturedVariants } from '../data/cardCustomizations';
import { contentKindForTemplateType, defaultContentFor } from '@/features/brandkit/content/kinds';
import type { KitSectionKey } from '../components/BrandKitSidebar';

/** Same reason as `brandKitToDesign`: a real route swap would unmount the
 *  page on the first navigate, and the master case needs a second click. */
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const sourceBrand: Brand = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'skam',
  name: 'SKAM',
  primaryColor: '#1A1A2E',
  fonts: { primary: 'Inter' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
} as Brand;

const brand: MockBrand = mockBrand;

function statefulDesignStorage() {
  const rows: DesignSummary[] = [];
  const docs = new Map<string, BrandOSDocument>();
  const saved: Array<{
    brandId: string;
    designId: string;
    doc: BrandOSDocument;
    meta?: Partial<DesignSummary>;
  }> = [];
  const storage: IDesignStorage = {
    listDesigns: vi.fn(async () => rows),
    saveDesign: vi.fn(async (brandId, designId, doc, meta) => {
      saved.push({ brandId, designId, doc: doc as BrandOSDocument, meta });
      docs.set(designId, doc as BrandOSDocument);
      rows.push({
        id: designId,
        isTemplate: meta?.isTemplate,
        contentType: meta?.contentType,
        sourceTemplateId: meta?.sourceTemplateId,
        name: meta?.name,
      });
    }),
    loadDesign: vi.fn(async (_brandId, designId) => docs.get(designId) ?? null),
    deleteDesign: vi.fn(async () => {}),
    moveDesignToFolder: vi.fn(async () => {}),
  };
  return { storage, rows, saved, docs };
}

function renderKit() {
  return render(
    <MemoryRouter initialEntries={['/b/skam/brand-kit']}>
      <BrandKitCosmosPage brand={brand} sourceBrand={sourceBrand} />
    </MemoryRouter>,
  );
}

/** Opening a card populates page 2 in one commit and flips the view on
 *  the next frame — the same two-phase wait the other kit suites use. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

async function openCard(label: string) {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  const row = within(nav).getByText(label).closest('.panel-item') as HTMLElement;
  fireEvent.click(within(row).getByText(label));
  await settle();
}

/** The drilldown's variant tiles, in order. Scoped to the tiles because
 *  the overview layer stays mounted behind the drilldown and its CARDS
 *  are "Open …" buttons too. */
async function variantTiles(): Promise<HTMLElement[]> {
  return waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('.bk-variant-tile'));
    if (found.length === 0) throw new Error('no variant tiles');
    return found;
  });
}

async function menuOn(tile: HTMLElement, label: 'Use Template' | 'Edit Template') {
  fireEvent.contextMenu(tile);
  return screen.findByRole('menuitem', { name: label });
}

/**
 * One representative family per content KIND that the kit can hand over,
 * plus the shapes that differ inside a kind (a square post and a wide
 * signature are the same `person`/`socialPost` code paths in the panel but
 * different renderers and different content types).
 *
 * The variants are not hardcoded: each family's first two KEPT variants
 * are read from the catalog, so a curation pass that archives a design
 * cannot leave this test pointing at an id nothing renders.
 */
const FAMILIES: Array<{ sectionKey: KitSectionKey; label: string }> = [
  { sectionKey: 'stationery', label: 'Business Card' },
  { sectionKey: 'stationery', label: 'Letterhead' },
  { sectionKey: 'stationery', label: 'Envelope' },
  { sectionKey: 'social', label: 'Post' },
  { sectionKey: 'web', label: 'Email Signature' },
  { sectionKey: 'presentations', label: 'Pitch Deck' },
  { sectionKey: 'animations', label: 'Logo Reveal' },
];

beforeEach(() => {
  navigateMock.mockClear();
  container.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  container.clear();
});

describe('every wired family reaches Design', () => {
  it('covers at least six distinct families, each with its own content type', () => {
    expect(FAMILIES.length).toBeGreaterThanOrEqual(6);
    const types = new Set(
      FAMILIES.map((f) => {
        const def = DELIVERABLES.find(
          (d) => d.sectionKey === f.sectionKey && d.label === f.label,
        );
        expect(def, f.label).toBeDefined();
        expect(def?.contentTypeId, f.label).toBeTruthy();
        return def?.contentTypeId;
      }),
    );
    // Profile/Favicon and the four decks deliberately share an id; these
    // seven still span six distinct ones.
    expect(types.size).toBeGreaterThanOrEqual(6);
  });

  /**
   * ONE mounted page for all seven families, and the reason is not
   * tidiness. `BrandKitCosmosPage` mounts every section of the kit and the
   * drilldown layer stays in the DOM once opened; mounting it seven times
   * in one file took the browser process down mid-run. The page is built
   * to swap the drilldown's target in place — that is exactly what the nav
   * rail does — so walking seven cards in sequence is both lighter and
   * closer to what a user does than seven cold mounts.
   *
   * Every assertion names its family, so a failure still says which one.
   */
  it('hands a real variant of each family to Design, and opens its master', async () => {
    // Two featured tiles per card, set before the first render. A
    // drilldown shows a card's featured set, and a whole family at once
    // (twenty invoices, ten deck slides) is heavy enough to take the page
    // down. Read from the catalog rather than hardcoded, so a curation
    // pass cannot leave this test pointing at an id nothing renders.
    const plan = FAMILIES.map((family) => {
      const def = DELIVERABLES.find(
        (d) => d.sectionKey === family.sectionKey && d.label === family.label,
      );
      if (!def?.contentTypeId) throw new Error(`${family.label} is not wired`);
      const kind = contentKindForTemplateType(def.templateType);
      if (!kind) throw new Error(`${family.label} has no content kind`);
      const catalog = variantsForCard(family.sectionKey, family.label);
      expect(catalog.length, family.label).toBeGreaterThanOrEqual(2);
      const featured = catalog.slice(0, 2);
      saveFeaturedVariants(
        sourceBrand.id,
        family.label,
        featured.map((t) => t.id),
      );
      return { ...family, def, kind, featured };
    });

    const { storage, saved } = statefulDesignStorage();
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => storage);
    renderKit();

    for (const family of plan) {
      const { label, def, kind, featured } = family;
      const base = saved.length;
      navigateMock.mockClear();

      await openCard(label);
      const tiles = await variantTiles();
      expect(tiles, label).toHaveLength(featured.length);

      // ── Use Template ─────────────────────────────────────────────
      const use = await menuOn(tiles[0], 'Use Template');
      expect(use, `${label} Use Template`).not.toBeDisabled();
      fireEvent.click(use);
      await vi.waitFor(() => expect(saved.length, label).toBe(base + 1));

      const instance = saved[base];
      expect(instance.meta, label).toMatchObject({
        isTemplate: false,
        contentType: def.contentTypeId,
        sourceTemplateId: featured[0].id,
      });
      if (instance.doc.body?.kind !== 'template-instance') {
        throw new Error(`${label}: not a template-instance body`);
      }
      expect(instance.doc.contentType, label).toBe(def.contentTypeId);
      expect(instance.doc.body.templateId, label).toBe(featured[0].id);
      // The family's hydrated defaults — facts about the brand, produced
      // by the same function the renderer and the panel read.
      expect(instance.doc.body.content, label).toEqual(defaultContentFor(kind, brand));
      await vi.waitFor(() =>
        expect(navigateMock).toHaveBeenCalledWith(`/b/skam/design/${instance.designId}`),
      );

      // ── Edit Template ────────────────────────────────────────────
      // Use Template saved a working design, not a master, so the master
      // does not exist yet and this call has to mint it.
      const edit = await menuOn(tiles[0], 'Edit Template');
      expect(edit, `${label} Edit Template`).not.toBeDisabled();
      fireEvent.click(edit);
      await vi.waitFor(() => expect(saved.length, label).toBe(base + 2));

      const master = saved[base + 1];
      expect(master.meta, label).toMatchObject({
        isTemplate: true,
        contentType: def.contentTypeId,
        sourceTemplateId: featured[0].id,
      });
      expect(master.doc.metadata?.isTemplate, label).toBe(true);
      if (master.doc.body?.kind !== 'template-instance') {
        throw new Error(`${label}: master is not a template-instance`);
      }
      expect(master.doc.body.templateId, label).toBe(featured[0].id);
      await vi.waitFor(() =>
        expect(navigateMock).toHaveBeenCalledWith(`/b/skam/design/${master.designId}`),
      );

      // Clicking it again REUSES the master rather than minting a second.
      fireEvent.click(await menuOn(tiles[0], 'Edit Template'));
      await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(3));
      expect(saved.length, label).toBe(base + 2);
      expect(navigateMock).toHaveBeenLastCalledWith(`/b/skam/design/${master.designId}`);

      // The second tile is offered too — the gate is about the family's
      // designs, not about whichever one happens to be featured first.
      const second = await menuOn(tiles[1], 'Use Template');
      expect(second, `${label} tile 2`).not.toBeDisabled();
      fireEvent.keyDown(document.body, { key: 'Escape' });
    }

    // Seven families, two saves each — nothing was skipped by a silently
    // absent menu item.
    expect(saved.length).toBe(plan.length * 2);
  });
});
