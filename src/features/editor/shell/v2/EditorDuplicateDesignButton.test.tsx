// Phase 7.5 — EditorDuplicateDesignButton tests.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { EditorDuplicateDesignButton } from './EditorDuplicateDesignButton';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';

const fixtureDoc = (): BrandOSDocument => ({
  schemaVersion: 1,
  id: '11111111-1111-1111-1111-111111111111',
  contentType: 'social-post',
  brandId: 'b',
  masterPages: [],
  metadata: { name: 'My Cool Design' },
  pages: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'P',
      width: 1080,
      height: 1080,
      background: '#fff',
      masterPageId: null,
      layers: [],
    },
  ],
} as BrandOSDocument);

const saveDesignMock = vi.fn(
  async (
    _brandId: string,
    _designId: string,
    _data: unknown,
    _meta?: Partial<{ isTemplate: boolean; sourceTemplateId: string }>,
  ) => undefined,
);
const designStorage: IDesignStorage = {
  saveDesign: saveDesignMock,
  loadDesign: vi.fn(async () => null),
  listDesigns: vi.fn(async () => []),
  deleteDesign: vi.fn(async () => undefined),
  moveDesignToFolder: vi.fn(async () => {}),
};

beforeEach(() => {
  saveDesignMock.mockClear();
  serviceContainer.reset();
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStorage);
});

afterEach(() => {
  cleanup();
});

const wrap = (children: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/b/raqm/design/d-1']}>
      <Routes>
        <Route path="/b/:slug/design/:designSlug" element={<>{children}</>} />
        <Route path="/b/:slug/design/:designSlug/*" element={<>{children}</>} />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  );

describe('EditorDuplicateDesignButton', () => {
  it('renders the trigger', () => {
    const { container } = wrap(
      <EditorDuplicateDesignButton
        getDoc={fixtureDoc}
        brandId="b"
        brandSlug="raqm"
        sourceName="My Cool Design"
      />,
    );
    expect(
      container.querySelector('[data-duplicate-design-button]'),
    ).not.toBeNull();
  });

  it('saves a copy with "Copy of …" name and a fresh UUID', async () => {
    const { container } = wrap(
      <EditorDuplicateDesignButton
        getDoc={fixtureDoc}
        brandId="b"
        brandSlug="raqm"
        sourceName="My Cool Design"
      />,
    );
    fireEvent.click(
      container.querySelector('[data-duplicate-design-button]')!,
    );
    await waitFor(() => expect(saveDesignMock).toHaveBeenCalledTimes(1));
    const args = saveDesignMock.mock.calls[0];
    expect(args[0]).toBe('b'); // brandId
    expect(typeof args[1]).toBe('string'); // newId
    const savedDoc = args[2] as BrandOSDocument;
    expect(savedDoc.metadata?.name).toBe('Copy of My Cool Design');
    // Fresh inner UUID, not the source's id
    expect(savedDoc.id).not.toBe('11111111-1111-1111-1111-111111111111');
    expect(savedDoc.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    // The document's id IS the storage key. The editor page autosaves to
    // `doc.id` and loads by the key; when they differed, every edit made
    // to a design created here was written where nothing would read it,
    // and a reload restored the pre-edit body.
    expect(args[1]).toBe(savedDoc.id);
  });

  it('deep-copies the source — the copy shares no nested object with it', async () => {
    const source = fixtureDoc();
    const { container } = wrap(
      <EditorDuplicateDesignButton getDoc={() => source} brandId="b" brandSlug="raqm" />,
    );
    fireEvent.click(container.querySelector('[data-duplicate-design-button]')!);
    await waitFor(() => expect(saveDesignMock).toHaveBeenCalledTimes(1));
    const savedDoc = saveDesignMock.mock.calls[0][2] as BrandOSDocument;
    expect(savedDoc.pages[0]).not.toBe(source.pages[0]);
    source.pages[0].name = 'Renamed on the source';
    expect(savedDoc.pages[0].name).toBe('P');
  });

  it('strips familyId + sourceDesignId so duplicates are independent', async () => {
    const variant: BrandOSDocument = {
      ...fixtureDoc(),
      familyId: 'family-xyz',
      sourceDesignId: 'source-1',
    } as BrandOSDocument;
    const { container } = wrap(
      <EditorDuplicateDesignButton
        getDoc={() => variant}
        brandId="b"
        brandSlug="raqm"
        sourceName="My Variant"
      />,
    );
    fireEvent.click(
      container.querySelector('[data-duplicate-design-button]')!,
    );
    await waitFor(() => expect(saveDesignMock).toHaveBeenCalledTimes(1));
    const savedDoc = saveDesignMock.mock.calls[0][2] as BrandOSDocument & {
      familyId?: string;
      sourceDesignId?: string;
    };
    expect(savedDoc.familyId).toBeUndefined();
    expect(savedDoc.sourceDesignId).toBeUndefined();
  });

  it('duplicating a MASTER produces a working design: isTemplate false, sourceTemplateId set, label reads "Use template"', async () => {
    const master: BrandOSDocument = {
      ...fixtureDoc(),
      id: 'master-1',
      metadata: { name: 'Invoice — Editorial Header', isTemplate: true },
    } as BrandOSDocument;
    const { container } = wrap(
      <EditorDuplicateDesignButton
        getDoc={() => master}
        brandId="b"
        brandSlug="raqm"
        sourceName="Invoice — Editorial Header"
        isTemplate
      />,
    );
    const button = container.querySelector('[data-duplicate-design-button]')!;
    expect(button.getAttribute('aria-label')).toBe('Use template');
    fireEvent.click(button);
    await waitFor(() => expect(saveDesignMock).toHaveBeenCalledTimes(1));
    const args = saveDesignMock.mock.calls[0];
    const savedDoc = args[2] as BrandOSDocument;
    const meta = args[3] as { isTemplate?: boolean; sourceTemplateId?: string };
    // The copy is a working design, never a second master.
    expect(savedDoc.metadata?.isTemplate).toBe(false);
    expect(savedDoc.metadata?.sourceTemplateId).toBe('master-1');
    expect(meta?.isTemplate).toBe(false);
    expect(meta?.sourceTemplateId).toBe('master-1');
    // Fresh id — the copy is its own design, not the master itself.
    expect(savedDoc.id).not.toBe('master-1');
    expect(args[1]).toBe(savedDoc.id);
  });

  it('using a template-instance master carries its content and its catalog id', async () => {
    const master = {
      ...fixtureDoc(),
      id: '33333333-3333-4333-8333-333333333333',
      contentType: 'invoice',
      metadata: {
        name: 'Invoice — Brute Force',
        isTemplate: true,
        sourceTemplateId: 'invoices-ext-4',
      },
      body: {
        kind: 'template-instance',
        templateId: 'invoices-ext-4',
        design: {},
        content: {
          kind: 'invoice',
          issuerName: 'SKAM',
          issuerAddress: 'Tuned HQ · Cairo',
          clientName: 'Acme Co.',
          clientAddress: '',
          number: '0014',
          issueDate: '',
          dueDate: '',
          currency: 'USD',
          lineItems: [{ id: 'li-1', label: 'Retainer', qty: 1, unitPrice: 100 }],
          discountRate: 0,
          taxRate: 5,
          notes: '',
        },
      },
    } as unknown as BrandOSDocument;
    const { container } = wrap(
      <EditorDuplicateDesignButton
        getDoc={() => master}
        brandId="b"
        brandSlug="raqm"
        isTemplate
      />,
    );
    fireEvent.click(container.querySelector('[data-duplicate-design-button]')!);
    await waitFor(() => expect(saveDesignMock).toHaveBeenCalledTimes(1));
    const args = saveDesignMock.mock.calls[0];
    const savedDoc = args[2] as BrandOSDocument;
    const meta = args[3] as { isTemplate?: boolean; sourceTemplateId?: string };
    if (savedDoc.body?.kind !== 'template-instance' || savedDoc.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(savedDoc.body.content.issuerAddress).toBe('Tuned HQ · Cairo');
    expect(savedDoc.metadata?.isTemplate).toBe(false);
    // The catalog variant, not the master's design id — the one meaning
    // `sourceTemplateId` carries everywhere else.
    expect(savedDoc.metadata?.sourceTemplateId).toBe('invoices-ext-4');
    expect(meta?.sourceTemplateId).toBe('invoices-ext-4');
    // A deep copy: tuning the master afterwards cannot reach it.
    const masterBody = master.body as { content: { issuerAddress: string } };
    masterBody.content.issuerAddress = 'Moved Again';
    expect(savedDoc.body.content.issuerAddress).toBe('Tuned HQ · Cairo');
  });

  it('falls back to "Untitled design" when no source name', async () => {
    const noName: BrandOSDocument = {
      ...fixtureDoc(),
      metadata: {},
    } as BrandOSDocument;
    const { container } = wrap(
      <EditorDuplicateDesignButton
        getDoc={() => noName}
        brandId="b"
        brandSlug="raqm"
      />,
    );
    fireEvent.click(
      container.querySelector('[data-duplicate-design-button]')!,
    );
    await waitFor(() => expect(saveDesignMock).toHaveBeenCalledTimes(1));
    const savedDoc = saveDesignMock.mock.calls[0][2] as BrandOSDocument;
    expect(savedDoc.metadata?.name).toBe('Copy of Untitled design');
  });
});
