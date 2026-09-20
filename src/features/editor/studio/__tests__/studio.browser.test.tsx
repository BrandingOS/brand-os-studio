// The Design Studio — browser E2E.
//
// Real DOM, real canvas, real Fabric. This layer exists because the
// things that make an editor feel like one are data-flow facts a unit
// test cannot see: whether a selection on the canvas reaches the
// contextual toolbar, whether a keypress reaches the document, whether
// the workspace actually has room to draw in.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page as browserPage } from '@vitest/browser/context';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { StudioEditor } from '../StudioEditor';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
  type Page,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Brand } from '@/shared/types/brand';

const SOCIAL: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => cleanup());

function brand(): Brand {
  return {
    id: 'brand-skam',
    slug: 'skam',
    name: 'SKAM',
    primaryColor: '#EF4444',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Brand;
}

function blankPage(name: string, w = 1080, h = 1080): Page {
  return {
    id: crypto.randomUUID(),
    name,
    width: w,
    height: h,
    background: '#ffffff',
    masterPageId: null,
    layers: [],
  };
}

function emptyDoc(contentType = 'social-post', pages = 1): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    contentType,
    brandId: 'brand-skam',
    masterPages: [],
    pages: Array.from({ length: pages }, (_, i) => blankPage(`Page ${i + 1}`)),
    metadata: { name: 'My design' },
  } as BrandOSDocument;
}

interface MountOptions {
  doc?: BrandOSDocument;
  readOnly?: boolean;
  save?: (d: BrandOSDocument) => Promise<void>;
}

async function mount({ doc = SOCIAL, readOnly, save }: MountOptions = {}) {
  let adapter: EditorAdapter | null = null;
  const utils = render(
    <MemoryRouter>
      <Toaster />
      <StudioEditor
        initialDocument={doc}
        brand={brand()}
        backTo="/b/skam/design"
        readOnly={readOnly}
        save={save ?? (async () => undefined)}
        onAdapterReady={(a) => {
          adapter = a;
        }}
      />
    </MemoryRouter>,
  );
  // The canvas mounts and loads asynchronously.
  await waitFor(() => expect(document.querySelector('canvas')).toBeTruthy());
  await new Promise((r) => setTimeout(r, 120));
  return { ...utils, getAdapter: () => adapter! };
}

const workspace = () =>
  document.querySelector('[data-studio-workspace]') as HTMLElement | null;
const contextBar = () =>
  document.querySelector('[data-studio-contextbar]') as HTMLElement | null;

describe('Studio — the shell', () => {
  it('is a full-screen application: one top bar, a rail, a workspace and a bottom bar', async () => {
    await mount();
    expect(document.querySelector('[data-studio-topbar]')).toBeTruthy();
    expect(document.querySelector('[data-studio-rail]')).toBeTruthy();
    expect(workspace()).toBeTruthy();
    expect(document.querySelector('[data-studio-bottombar]')).toBeTruthy();
    // Exactly ONE shell — the editor is not nested inside a page shell.
    expect(document.querySelectorAll('.st-shell')).toHaveLength(1);
  });

  it('does NOT carry the brand’s section nav', async () => {
    await mount();
    const bar = document.querySelector('[data-studio-topbar]')!.textContent ?? '';
    // "You are on a page of the product" is the impression the top bar
    // must not give; these are the brand workspace's sections.
    expect(bar).not.toMatch(/Brand Kit/);
    expect(bar).not.toMatch(/Guideline/);
    expect(bar).not.toMatch(/Setup/);
    // It carries the DOCUMENT instead.
    expect(
      (document.querySelector('.st-docname') as HTMLInputElement).value,
    ).toBeTruthy();
  });

  it('gives the canvas the room — the workspace is the largest region', async () => {
    await mount();
    const ws = workspace()!.getBoundingClientRect();
    const panel = document
      .querySelector('[data-studio-panel]')
      ?.getBoundingClientRect();
    expect(ws.width).toBeGreaterThan(300);
    expect(ws.height).toBeGreaterThan(200);
    if (panel) expect(ws.width).toBeGreaterThan(panel.width);
  });

  it('offers the rail in brand-first order', async () => {
    await mount();
    const ids = [...document.querySelectorAll('[data-rail-item]')].map((el) =>
      el.getAttribute('data-rail-item'),
    );
    expect(ids[0]).toBe('brand');
    expect(ids).toContain('layers');
    expect(ids).toContain('text');
    expect(ids).toContain('uploads');
  });

  it('closing the panel gives the canvas that width instead of collapsing it', async () => {
    // Below 900px the panel floats OVER the workspace rather than
    // taking a column from it, so this only means anything on a wide
    // screen — and Vitest's browser default is 414px.
    await browserPage.viewport(1440, 900);
    await mount();
    const before = workspace()!.getBoundingClientRect().width;
    fireEvent.click(document.querySelector('[data-rail-item="brand"]')!);
    await waitFor(() =>
      expect(document.querySelector('[data-studio-panel]')).toBeNull(),
    );
    const after = workspace()!.getBoundingClientRect().width;
    expect(after).toBeGreaterThan(before);
    await browserPage.viewport(414, 896);
  });
});

describe('Studio — selection reaches the toolbar', () => {
  it('shows a hint with nothing selected, and the layer’s controls with one', async () => {
    const { getAdapter } = await mount();
    expect(contextBar()!.textContent).toMatch(/Select something/i);

    const adapter = getAdapter();
    const textLayer = adapter
      .getDocument()
      .pages[0].layers.find((l) => l.kind === 'text')!;
    adapter.setSelection([textLayer.id]);

    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('1'),
    );
    // Text-specific controls, and NOT a control for a property text
    // does not have.
    expect(contextBar()!.querySelector('[aria-label="Bold"]')).toBeTruthy();
    expect(contextBar()!.querySelector('[aria-label="Italic"]')).toBeTruthy();
    expect(contextBar()!.querySelector('[aria-label="Border"]')).toBeNull();
  });

  it('a MULTI-selection gets align, distribute and group — the reason it exists', async () => {
    const { getAdapter } = await mount();
    const adapter = getAdapter();
    const ids = adapter.getDocument().pages[0].layers.slice(0, 3).map((l) => l.id);
    expect(ids.length).toBe(3);
    adapter.setSelection(ids);

    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('3'),
    );
    const bar = contextBar()!;
    expect(bar.textContent).toMatch(/3 selected/);
    expect(bar.querySelector('[aria-label="Group"]')).toBeTruthy();
    expect(bar.querySelector('[aria-label="Align left"]')).toBeTruthy();
    // Distribute needs three; with three it is offered.
    expect(bar.querySelector('[aria-label="Space evenly across"]')).toBeTruthy();
  });

  it('aligning a multi-selection is ONE undo step', async () => {
    const { getAdapter } = await mount();
    const adapter = getAdapter();
    const page = adapter.getDocument().pages[0];
    const ids = page.layers.slice(0, 3).map((l) => l.id);
    adapter.setSelection(ids);
    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('3'),
    );

    const before = page.layers.slice(0, 3).map((l) => l.transform.x);
    fireEvent.click(contextBar()!.querySelector('[aria-label="Align left"]')!);
    await waitFor(() => {
      const xs = adapter.getDocument().pages[0].layers.slice(0, 3).map((l) => l.transform.x);
      expect(new Set(xs).size).toBe(1);
    });

    adapter.undo();
    await waitFor(() => {
      const xs = adapter.getDocument().pages[0].layers.slice(0, 3).map((l) => l.transform.x);
      // One press of ⌘Z puts all three back, not one of them.
      expect(xs).toEqual(before);
    });
  });
});

describe('Studio — inserting', () => {
  it('a shape inserted into a brand is FILLED from that brand', async () => {
    const { getAdapter } = await mount({ doc: emptyDoc() });
    fireEvent.click(document.querySelector('[data-rail-item="elements"]')!);
    await waitFor(() =>
      expect(document.querySelector('[data-studio-panel="elements"]')).toBeTruthy(),
    );
    fireEvent.click(document.querySelector('.st-tile')!);

    await waitFor(() => {
      const layers = getAdapter().getDocument().pages[0].layers;
      expect(layers).toHaveLength(1);
      // SKAM's primary, not a hardcoded indigo.
      expect((layers[0] as { fill?: string }).fill?.toLowerCase()).toBe('#ef4444');
    });
  });

  it('selects what it just inserted, so the toolbar is already showing it', async () => {
    await mount({ doc: emptyDoc() });
    fireEvent.click(document.querySelector('[data-rail-item="elements"]')!);
    await waitFor(() =>
      expect(document.querySelector('[data-studio-panel="elements"]')).toBeTruthy(),
    );
    fireEvent.click(document.querySelector('.st-tile')!);
    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('1'),
    );
  });
});

describe('Studio — the empty state', () => {
  it('offers a way forward on a blank page, and clears once there is a layer', async () => {
    await mount({ doc: emptyDoc() });
    expect(document.querySelector('[data-studio-empty]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-rail-item="text"]')!);
    await waitFor(() =>
      expect(document.querySelector('[data-studio-panel="text"]')).toBeTruthy(),
    );
    fireEvent.click(document.querySelector('.st-tile')!);
    await waitFor(() =>
      expect(document.querySelector('[data-studio-empty]')).toBeNull(),
    );
  });

  it('is not offered on a document that already has layers', async () => {
    await mount();
    expect(document.querySelector('[data-studio-empty]')).toBeNull();
  });
});

describe('Studio — pages', () => {
  it('a single-page design states its size instead of drawing page management', async () => {
    await mount({ doc: emptyDoc('social-post', 1) });
    expect(document.querySelectorAll('[data-studio-page]')).toHaveLength(0);
    expect(document.querySelector('[data-studio-pages]')!.textContent).toMatch(
      /1080 × 1080/,
    );
  });

  it('a multi-page design gets a chip per page and switches on click', async () => {
    const { getAdapter } = await mount({ doc: emptyDoc('presentation', 3) });
    const chips = document.querySelectorAll('[data-studio-page]');
    expect(chips).toHaveLength(3);
    expect(document.querySelector('[data-studio-add-page]')).toBeTruthy();

    fireEvent.click(chips[2]);
    await waitFor(() =>
      expect(getAdapter().getActivePageId()).toBe(
        getAdapter().getDocument().pages[2].id,
      ),
    );
  });
});

describe('Studio — keyboard', () => {
  async function withOneSelected() {
    const mounted = await mount();
    const adapter = mounted.getAdapter();
    const id = adapter.getDocument().pages[0].layers[0].id;
    adapter.setSelection([id]);
    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('1'),
    );
    return { ...mounted, adapter, id };
  }

  it('Delete removes the selection — it could not be done at all before', async () => {
    const { adapter, id } = await withOneSelected();
    const before = adapter.getDocument().pages[0].layers.length;
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() =>
      expect(adapter.getDocument().pages[0].layers).toHaveLength(before - 1),
    );
    expect(
      adapter.getDocument().pages[0].layers.find((l) => l.id === id),
    ).toBeUndefined();
  });

  it('an arrow key nudges by one, with Shift by ten', async () => {
    const { adapter, id } = await withOneSelected();
    const x0 = adapter.getDocument().pages[0].layers.find((l) => l.id === id)!.transform.x;

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(
        adapter.getDocument().pages[0].layers.find((l) => l.id === id)!.transform.x,
      ).toBe(x0 + 1),
    );

    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });
    await waitFor(() =>
      expect(
        adapter.getDocument().pages[0].layers.find((l) => l.id === id)!.transform.x,
      ).toBe(x0 + 11),
    );
  });

  it('⌘D duplicates and ⌘Z puts it back', async () => {
    const { adapter } = await withOneSelected();
    const before = adapter.getDocument().pages[0].layers.length;
    fireEvent.keyDown(window, { key: 'd', metaKey: true });
    await waitFor(() =>
      expect(adapter.getDocument().pages[0].layers).toHaveLength(before + 1),
    );
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    await waitFor(() =>
      expect(adapter.getDocument().pages[0].layers).toHaveLength(before),
    );
  });

  it('⌘A selects every unlocked layer', async () => {
    const adapter = (await mount()).getAdapter();
    fireEvent.keyDown(window, { key: 'a', metaKey: true });
    await waitFor(() =>
      expect(Number(contextBar()!.getAttribute('data-selection'))).toBe(
        adapter.getDocument().pages[0].layers.filter((l) => !l.locked && l.visible)
          .length,
      ),
    );
  });

  it('Escape deselects', async () => {
    await withOneSelected();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('0'),
    );
  });

  it('NEVER steals a key from someone typing', async () => {
    const { adapter, id } = await withOneSelected();
    const before = adapter.getDocument().pages[0].layers.length;
    const nameField = document.querySelector('.st-docname') as HTMLInputElement;
    nameField.focus();

    // Renaming a design to "Bold" must not delete or duplicate anything.
    fireEvent.keyDown(nameField, { key: 'Delete', bubbles: true });
    fireEvent.keyDown(nameField, { key: 'd', metaKey: true, bubbles: true });
    await new Promise((r) => setTimeout(r, 60));

    expect(adapter.getDocument().pages[0].layers).toHaveLength(before);
    expect(
      adapter.getDocument().pages[0].layers.find((l) => l.id === id),
    ).toBeTruthy();
  });

  it('? opens the shortcut sheet, and it documents what the handler does', async () => {
    await mount();
    fireEvent.keyDown(window, { key: '?' });
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/Keyboard shortcuts/),
    );
    // A help sheet that lies is worse than none — these come from the
    // same module as the handler.
    expect(document.body.textContent).toMatch(/Fit to screen/);
    expect(document.body.textContent).toMatch(/Nudge 1px/);
  });
});

describe('Studio — read-only', () => {
  it('says so, and refuses the mutating keys', async () => {
    const save = vi.fn(async () => undefined);
    const { getAdapter } = await mount({ readOnly: true, save });
    expect(document.querySelector('[data-studio-readonly]')).toBeTruthy();

    const adapter = getAdapter();
    const before = adapter.getDocument().pages[0].layers.length;
    adapter.setSelection([adapter.getDocument().pages[0].layers[0].id]);
    await waitFor(() =>
      expect(contextBar()!.getAttribute('data-selection')).toBe('1'),
    );

    fireEvent.keyDown(window, { key: 'Delete' });
    fireEvent.keyDown(window, { key: 'd', metaKey: true });
    await new Promise((r) => setTimeout(r, 80));
    expect(adapter.getDocument().pages[0].layers).toHaveLength(before);
  });

  it('still allows looking: zoom and selection work', async () => {
    const { getAdapter } = await mount({ readOnly: true });
    const zoomBefore = document.querySelector('[data-studio-zoom-value]')!.textContent;
    fireEvent.click(document.querySelector('[aria-label="Zoom in"]')!);
    await waitFor(() =>
      expect(document.querySelector('[data-studio-zoom-value]')!.textContent).not.toBe(
        zoomBefore,
      ),
    );
    expect(getAdapter()).toBeTruthy();
  });
});

describe('Studio — the viewport', () => {
  it('fits the page into the workspace on open, and zoom changes the canvas transform', async () => {
    const { getAdapter } = await mount();
    const zoomText = () =>
      document.querySelector('[data-studio-zoom-value]')!.textContent!;
    // Fit, not 100%: a 1080px page in a test-sized window is smaller.
    expect(parseInt(zoomText(), 10)).toBeGreaterThan(0);

    const before = parseInt(zoomText(), 10);
    fireEvent.click(document.querySelector('[aria-label="Zoom in"]')!);
    await waitFor(() => expect(parseInt(zoomText(), 10)).toBeGreaterThan(before));

    // The zoom lives in the CANVAS, not in a CSS scale on a wrapper —
    // which is what keeps selection handles the same size at any zoom.
    const adapter = getAdapter() as unknown as {
      getViewportTransform: () => { zoom: number };
    };
    expect(adapter.getViewportTransform().zoom).toBeCloseTo(
      parseInt(zoomText(), 10) / 100,
      1,
    );
    const wrapper = document.querySelector('[data-editor-canvas-zoom-wrap]');
    expect(wrapper).toBeNull();
  });
});
