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
