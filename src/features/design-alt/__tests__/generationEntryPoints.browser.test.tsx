// Browser E2E — every generation entry point lands in the SAME editor.
//
// This is the contract the two-surface split broke: the hub's "Image" mode used
// to create a row of a different kind and render a different page, so the
// controls a user learned in one place did not exist in the other. The test
// pins the rule rather than the implementation — whatever the hero creates, the
// destination must be the design editor route with the prompt staged.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DesignHero } from '@/features/design-alt/DesignHero';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import { readAiMetadata } from '@/features/editor/shell/v2/panels/generate/aiMetadata';
import type { IDesignStorage } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';

afterEach(() => cleanup());

const brand: Brand = {
  id: '11111111-2222-3333-4444-555555555555', slug: 'acme', name: 'Acme',
  primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
};

function mountHero(useBrand: Brand = brand) {
  const saved: Array<{ brandId: string; docId: string; doc: BrandOSDocument }> = [];
  const storage = {
    saveDesign: vi.fn(async (brandId: string, docId: string, doc: BrandOSDocument) => {
      saved.push({ brandId, docId, doc });
    }),
  } as unknown as IDesignStorage;

  let location = '';
  function Probe() {
    const l = useLocation();
    location = `${l.pathname}${l.search}`;
    return null;
  }

  render(
    <MemoryRouter initialEntries={['/b/acme/design']}>
      <Probe />
      <Routes>
        <Route path="/b/acme/design" element={<DesignHero brand={useBrand} designStorage={storage} />} />
        <Route path="/b/:slug/design/:designSlug" element={<div data-testid="editor-route" />} />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  );

  return { saved, storage, getLocation: () => location };
}

function submitPrompt(text: string) {
  const input = screen.getByLabelText('Describe what you want to make');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('Design hub → generation entry points', () => {
  it('Image mode saves a DESIGN and opens the editor route with the prompt', async () => {
    const { saved, getLocation } = mountHero();

    submitPrompt('a matte black coffee cup');

    await waitFor(() => expect(saved).toHaveLength(1));
    const { brandId, docId, doc } = saved[0];
    expect(brandId).toBe(brand.id);
    // A real design document, not a project record of some other shape.
    expect(() => BrandOSDocumentSchema.parse(doc)).not.toThrow();
    expect(doc.id).toBe(docId);

    await waitFor(() => expect(screen.getByTestId('editor-route')).toBeTruthy());
    expect(getLocation()).toBe(
      `/b/acme/design/${docId}?prompt=a%20matte%20black%20coffee%20cup&mode=image`,
    );
  });

  it('the Image-mode document is an empty AI canvas with the prompt staged', async () => {
    const { saved } = mountHero();
    submitPrompt('a red bicycle');
    await waitFor(() => expect(saved).toHaveLength(1));

    const doc = saved[0].doc;
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].layers).toEqual([]);
    const ai = readAiMetadata(doc);
    expect(ai.origin).toBe('ai-image');
    expect(ai.pendingPrompt).toBe('a red bicycle');
  });

  it('Editable mode goes to the same route, differing only in the seeded document', async () => {
    const { saved, getLocation } = mountHero();

    fireEvent.click(screen.getByRole('radio', { name: /editable/i }));
    submitPrompt('a launch announcement');

    await waitFor(() => expect(saved).toHaveLength(1));
    const doc = saved[0].doc;
    expect(getLocation()).toBe(
      `/b/acme/design/${doc.id}?prompt=a%20launch%20announcement&mode=editable`,
    );
    // The layered path seeds real content; the AI path does not.
    expect(doc.pages[0].layers.length).toBeGreaterThan(0);
    expect(readAiMetadata(doc).origin).toBeUndefined();
  });

  it('a local demo brand is no longer turned away — every brand can generate', async () => {
    // The project table needed a uuid, so seed brands were refused at the hub.
    // A design has no such requirement, and the refusal went with the split.
    const { storage } = mountHero({ ...brand, id: 'brand_1786308941230' });
    submitPrompt('anything at all');
    await waitFor(() => expect(storage.saveDesign).toHaveBeenCalled());
  });
});
