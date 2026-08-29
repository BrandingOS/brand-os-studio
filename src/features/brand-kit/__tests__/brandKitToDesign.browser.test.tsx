/**
 * The Brand Kit → global Design hand-off, end to end.
 *
 * Two claims, proven against the REAL components with only design
 * storage stubbed (`IDesignStorage` — the seam this whole design routes
 * every write and read through):
 *
 *   1. `Use Template` on a variant hands the Design editor a fresh,
 *      independent copy — never a pointer back at the Brand Kit's own
 *      template state.
 *   2. `Edit Template` always opens the SAME canonical master for a given
 *      (contentType, templateId) — seeded lazily on first use, reused on
 *      every call after.
 *
 * A third claim needs no component at all — it is the spec's §7.2
 * invariant, written directly against `createDocument.ts`: editing a
 * master must never reach a working Design that already copied from it.
 * That is the assertion this whole design exists to guarantee, so it is
 * pinned here rather than left to `createDocument.test.ts` alone.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core/types/services';
import type { IDesignStorage, DesignSummary } from '@/core/types/services';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';
import type { BrandOSDocument } from '@/features/editor/schema';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import {
  createTemplateInstanceDocument,
  instantiateFromMaster,
} from '@/features/editor/renderers/template-instance/createDocument';
import { defaultContentFor, type InvoiceContent , type DeliverableContent } from '@/features/brandkit/content';
import { saveFeaturedVariants } from '../data/cardCustomizations';

/**
 * `useNavigate` is mocked directly rather than proven via a real route
 * swap: the "Edit Template twice" case needs the Brand Kit page to stay
 * mounted across both clicks, and a real destination route for
 * `/b/:slug/design/:id` would unmount it on the first navigate. Every
 * other router primitive (MemoryRouter, etc.) is the real thing.
 */
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

/** A stateful fake — `saveDesign` appends into the SAME array
 *  `listDesigns` reads, so `ensureMasterDesign`'s second call can see
 *  what the first one wrote. Follows `masterTemplates.test.ts`'s fake. */
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

/** Same two-phase-commit wait `kitNavigation.browser.test.tsx` uses —
 *  opening an item populates page 2 in one commit and flips the view on
 *  the next frame. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

function navRow(label: string): HTMLElement {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  return within(nav).getByText(label).closest('.panel-item') as HTMLElement;
}

async function openInvoice() {
  fireEvent.click(within(navRow('Invoice')).getByText('Invoice'));
  await settle();
}

/** Right-click the "Brute Force" tile (`invoices-ext-4`, Invoice's first
 *  featured variant) and pick a context-menu item by label. */
async function pickOnBruteForce(label: 'Use Template' | 'Edit Template') {
  const tile = screen.getByRole('button', { name: 'Open Brute Force' });
  fireEvent.contextMenu(tile);
  const item = await screen.findByRole('menuitem', { name: label });
  fireEvent.click(item);
}

beforeEach(() => {
  navigateMock.mockClear();
  container.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  container.clear();
});

describe('Use Template — an independent copy, handed to Design', () => {
  it('saves a working design and routes to it using the saved id', async () => {
    const { storage, saved } = statefulDesignStorage();
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => storage);

    renderKit();
    await openInvoice();
    await pickOnBruteForce('Use Template');

    await vi.waitFor(() => expect(storage.saveDesign).toHaveBeenCalledTimes(1));

    const [call] = saved;
    expect(call.meta).toMatchObject({
      isTemplate: false,
      contentType: 'invoice',
      sourceTemplateId: 'invoices-ext-4',
    });
    expect(call.doc.body?.kind).toBe('template-instance');

    // Not a hardcoded string — the id `saveDesign` was actually called with.
    await vi.waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(`/b/skam/design/${call.designId}`),
    );
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });
});

describe('the tile menu gates a design Design cannot actually edit', () => {
  it('offers both actions ENABLED on every kept invoice — the unbound ones are archived', async () => {
    // The gate consults `rendererBindsContent`; its refusal of a
    // content-blind legacy id is pinned in `contentBinding.test.tsx`. In the
    // drilldown there is nothing left to refuse: the Invoice conversion
    // archived every design that did not bind, so the positive side of the
    // gate is what a user can actually reach.
    const { storage } = statefulDesignStorage();
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => storage);

    renderKit();
    await openInvoice();

    const tiles = await screen.findAllByRole('button', { name: /^Open / });
    expect(tiles.length).toBeGreaterThan(0);
    let menus = 0;
    for (const tile of tiles) {
      fireEvent.contextMenu(tile);
      // Not every "Open …" button is a variant tile (the card's own Open is
      // one too); only tiles open the template menu.
      const use = screen.queryByRole('menuitem', { name: /Use Template/ });
      if (!use) continue;
      menus += 1;
      expect(use).not.toBeDisabled();
      expect(screen.getByRole('menuitem', { name: /Edit Template/ })).not.toBeDisabled();
      fireEvent.keyDown(document.body, { key: 'Escape' });
    }
    expect(menus).toBeGreaterThan(0);
    expect(storage.saveDesign).not.toHaveBeenCalled();
  });
});

describe('Use Template — from the master, once one exists', () => {
  it("a design started after the master was tuned carries the MASTER's content", async () => {
    const { storage, saved, docs } = statefulDesignStorage();
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => storage);

    renderKit();
    await openInvoice();

    // 1. Edit Template seeds the master.
    await pickOnBruteForce('Edit Template');
    await vi.waitFor(() => expect(storage.saveDesign).toHaveBeenCalledTimes(1));
    const masterId = saved[0].designId;

    // 2. The brand tunes it — what the editor's autosave would write.
    const master = docs.get(masterId);
    if (master?.body?.kind !== 'template-instance' || master.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    master.body.content.issuerAddress = 'Tuned HQ · Cairo';
    master.body.content.notes = 'Net 14.';

    // 3. Use Template on the same variant.
    await pickOnBruteForce('Use Template');
    await vi.waitFor(() => expect(storage.saveDesign).toHaveBeenCalledTimes(2));

    const instance = saved[1];
    if (
      instance.doc.body?.kind !== 'template-instance' ||
      instance.doc.body.content.kind !== 'invoice'
    ) {
      throw new Error('narrowing failed');
    }
    expect(instance.doc.body.content.issuerAddress).toBe('Tuned HQ · Cairo');
    expect(instance.doc.body.content.notes).toBe('Net 14.');
    // A working design, not a second master — and still filed under the
    // catalog variant, which is what master lookup matches on.
    expect(instance.doc.metadata.isTemplate).toBe(false);
    expect(instance.meta).toMatchObject({ isTemplate: false, sourceTemplateId: 'invoices-ext-4' });
    expect(instance.doc.id).toBe(instance.designId);

    // And it is a COPY: editing the master afterwards cannot reach it.
    master.body.content.issuerAddress = 'Moved Again';
    expect(instance.doc.body.content.issuerAddress).toBe('Tuned HQ · Cairo');
  });

  it('does not seed a master — Use Template alone leaves the brand with none', async () => {
    const { storage, saved } = statefulDesignStorage();
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => storage);

    renderKit();
    await openInvoice();
    await pickOnBruteForce('Use Template');
    await vi.waitFor(() => expect(storage.saveDesign).toHaveBeenCalledTimes(1));

    expect(saved.every((s) => s.meta?.isTemplate !== true)).toBe(true);
  });
});

describe('Edit Template — always the same canonical master', () => {
  it('routes to the same master id on the first click and every click after', async () => {
    const { storage, saved } = statefulDesignStorage();
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => storage);

    renderKit();
    await openInvoice();

    await pickOnBruteForce('Edit Template');
    await vi.waitFor(() => expect(storage.saveDesign).toHaveBeenCalledTimes(1));
    const masterId = saved[0].designId;
    await vi.waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(`/b/skam/design/${masterId}`),
    );

    await pickOnBruteForce('Edit Template');
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(2));

    // Exactly one save — the second click reused the master it found via
    // `listDesigns`, it did not seed a second one.
    expect(storage.saveDesign).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenNthCalledWith(1, `/b/skam/design/${masterId}`);
    expect(navigateMock).toHaveBeenNthCalledWith(2, `/b/skam/design/${masterId}`);
  });
});

describe('§7.2 invariant — editing a master leaves an existing instance untouched', () => {
  it('editing a master leaves an existing instance untouched', () => {
    // Asserted through the model, not against a copy of its literals:
    // the defaults are facts about the brand (`brandFacts.ts`) and are
    // meant to move when the brand does. What must not move is that the
    // instance still holds them after the master was edited.
    const seededInvoice = (): Extract<DeliverableContent, { kind: 'invoice' }> => {
      const content = defaultContentFor('invoice', { name: 'SKAM' });
      if (content.kind !== 'invoice') throw new Error('narrowing failed');
      return content;
    };
    // A SECOND, independent call for the document: the body holds its
    // content by reference, so sharing one object would let the master's
    // edits below rewrite the very values this test expects back.
    const seeded = seededInvoice();

    const master = createTemplateInstanceDocument({
      designId: '22222222-2222-4222-8222-222222222222',
      brandId: 'skam',
      contentType: 'invoice',
      templateId: 'invoices-ext-4',
      content: seeded,
      design: {},
    });

    // The user takes a copy and fills in a real client.
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    if (instance.body?.kind !== 'template-instance' || instance.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    instance.body.content.clientName = 'Northwind Ltd';
    const itemsBefore = instance.body.content.lineItems.length;
    instance.body.content.lineItems.push({
      id: `li-${itemsBefore + 1}`,
      label: 'Retainer',
      qty: 3,
      unitPrice: 500,
    });

    // A month later the brand tunes the master.
    if (master.body?.kind !== 'template-instance' || master.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    master.body.content.issuerAddress = 'New HQ · Berlin';
    master.body.content.lineItems.length = 0;
    master.body.templateId = 'invoices-ext-8';

    // Round-trip the instance through storage, as a reload would.
    const reloaded = BrandOSDocumentSchema.parse(JSON.parse(JSON.stringify(instance)));
    if (reloaded.body?.kind !== 'template-instance' || reloaded.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }

    expect(reloaded.body.content.clientName).toBe('Northwind Ltd');
    // The seeded address, not the master's 'New HQ · Berlin'.
    expect(reloaded.body.content.issuerAddress).toBe(seededInvoice().issuerAddress);
    expect(reloaded.body.content.issuerAddress).not.toBe('New HQ · Berlin');
    // The master's list was emptied; the instance kept its own, plus the
    // item the user added.
    expect(reloaded.body.content.lineItems).toHaveLength(itemsBefore + 1);
    expect(reloaded.body.templateId).toBe('invoices-ext-4');
  });
});
