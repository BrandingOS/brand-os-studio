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
import { defaultContentFor } from '@/features/brandkit/content';

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
      rows.push({
        id: designId,
        isTemplate: meta?.isTemplate,
        contentType: meta?.contentType,
        sourceTemplateId: meta?.sourceTemplateId,
        name: meta?.name,
      });
    }),
    loadDesign: vi.fn(async () => null),
    deleteDesign: vi.fn(async () => {}),
  };
  return { storage, rows, saved };
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
    const master = createTemplateInstanceDocument({
      designId: '22222222-2222-4222-8222-222222222222',
      brandId: 'skam',
      contentType: 'invoice',
      templateId: 'invoices-ext-4',
      content: defaultContentFor('invoice', { name: 'SKAM' }),
      design: {},
    });

    // The user takes a copy and fills in a real client.
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    if (instance.body?.kind !== 'template-instance' || instance.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    instance.body.content.clientName = 'Northwind Ltd';
    instance.body.content.lineItems.push({ id: 'li-5', label: 'Retainer', qty: 3, unitPrice: 500 });

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
    expect(reloaded.body.content.issuerAddress).toBe('1234 Studio · NY');
    expect(reloaded.body.content.lineItems).toHaveLength(5);
    expect(reloaded.body.templateId).toBe('invoices-ext-4');
  });
});
