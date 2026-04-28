// Step 6 — unit tests for `triggerCrossPagePromptIfApplicable`.
//
// These tests verify the gating logic (when does the toast fire?)
// and the predicates the toast's actions wire up (when "All N pages"
// is clicked, which layers actually mutate?). The Sonner toast
// itself is rendered against a real Toaster mounted in the test DOM
// so we can assert on the action buttons.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Toaster, toast } from 'sonner';
import { triggerCrossPagePromptIfApplicable } from '../crossPagePropagation';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type {
  BrandOSDocument,
  Layer,
  Page,
  TextLayer,
} from '@/features/editor/schema';

afterEach(() => {
  cleanup();
  toast.dismiss();
});

// ─── Doc fixtures ──────────────────────────────────────────────────────

function textLayer(
  id: string,
  overrides: Partial<TextLayer> = {},
): TextLayer {
  return {
    id,
    kind: 'text',
    name: 'headline',
    text: 'Hi',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color: '#111111',
    transform: {
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    ...overrides,
  } as TextLayer;
}

function page(id: string, layers: Layer[] = []): Page {
  return {
    id,
    name: id,
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers,
  };
}

function doc(pages: Page[]): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'doc-1',
    contentType: 'social-post',
    brandId: null,
    masterPages: [],
    pages,
    metadata: {},
  };
}

interface StubResult {
  applyCalls: Array<{
    matchedLayerIds: string[];
    matchedPageIds: string[];
    patch: Partial<Layer>;
    label: string;
  }>;
}

/**
 * Stub adapter that captures applyLayerPatchAcrossPages calls. The
 * predicate is invoked against the doc to determine which layers
 * would actually mutate, so the test can assert on those ids without
 * a real Fabric runtime.
 */
function stubAdapter(d: BrandOSDocument): EditorAdapter & StubResult {
  const applyCalls: StubResult['applyCalls'] = [];
  const a = {
    applyCalls,
    getDocument: () => d,
    applyLayerPatchAcrossPages: (
      predicate: (layer: Layer, pageId: string) => boolean,
      patch: Partial<Layer>,
      label: string,
    ) => {
      const matchedLayerIds: string[] = [];
      const matchedPages = new Set<string>();
      for (const p of d.pages) {
        for (const l of p.layers) {
          if (predicate(l, p.id)) {
            matchedLayerIds.push(l.id);
            matchedPages.add(p.id);
          }
        }
      }
      applyCalls.push({
        matchedLayerIds,
        matchedPageIds: [...matchedPages],
        patch,
        label,
      });
      return { mutatedLayerIds: matchedLayerIds, affectedPageIds: [...matchedPages] };
    },
    // No-ops to keep the typed interface happy.
    mount: vi.fn(),
    unmount: vi.fn(),
    loadDocument: vi.fn(),
    replaceDocument: vi.fn(),
    setActivePage: vi.fn(),
    getActivePageId: vi.fn(() => ''),
    addPage: vi.fn(),
    removePage: vi.fn(),
    duplicatePage: vi.fn(() => ''),
    reorderPage: vi.fn(),
    updatePageDimensions: vi.fn(),
    addMasterPage: vi.fn(),
    removeMasterPage: vi.fn(),
    applyMasterToPage: vi.fn(),
    enterMasterMode: vi.fn(),
    exitMasterMode: vi.fn(),
    getEditingMasterId: vi.fn(() => null),
    addLayer: vi.fn(),
    updateLayer: vi.fn(),
    removeLayer: vi.fn(),
    reorderLayer: vi.fn(),
    getSelection: vi.fn(),
    setSelection: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    batch: vi.fn((_label: string, fn: () => void) => fn()),
    exportAs: vi.fn(),
    on: vi.fn(() => () => undefined),
  } as unknown as EditorAdapter & StubResult;
  return a;
}

const SLOT_PRIMARY = { type: 'brand.color.primary' } as const;

// ─── Gating ────────────────────────────────────────────────────────────

describe('triggerCrossPagePromptIfApplicable — gating', () => {
  it('skips when the document has only ONE page', () => {
    const refLayer = textLayer('a', { color: SLOT_PRIMARY as unknown as TextLayer['color'] });
    const d = doc([page('p1', [refLayer])]);
    const adapter = stubAdapter(d);

    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ff0000',
    });

    expect(adapter.applyCalls).toHaveLength(0);
    // No toast in DOM either.
    expect(document.body.querySelector('[data-cross-page-toast]')).toBeNull();
  });

  it('skips when the changed property is NOT brand-bound (e.g. opacity)', () => {
    const refLayer = textLayer('a', { color: SLOT_PRIMARY as unknown as TextLayer['color'] });
    const peer = textLayer('b', { color: SLOT_PRIMARY as unknown as TextLayer['color'] });
    const d = doc([page('p1', [refLayer]), page('p2', [peer])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      opacity: 0.5,
    });
    expect(document.body.querySelector('[data-cross-page-toast]')).toBeNull();
  });

  it('skips when the prev value was a literal (no SlotRef to match)', () => {
    const refLayer = textLayer('a', { color: '#000000' });
    const peer = textLayer('b', { color: SLOT_PRIMARY as unknown as TextLayer['color'] });
    const d = doc([page('p1', [refLayer]), page('p2', [peer])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ff0000',
    });
    expect(document.body.querySelector('[data-cross-page-toast]')).toBeNull();
  });

  it('skips when no other layer in the doc shares the SlotRef', () => {
    const refLayer = textLayer('a', { color: SLOT_PRIMARY as unknown as TextLayer['color'] });
    const otherSlot = textLayer('b', {
      color: { type: 'brand.color.accent' } as unknown as TextLayer['color'],
    });
    const d = doc([page('p1', [refLayer]), page('p2', [otherSlot])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ff0000',
    });
    expect(document.body.querySelector('[data-cross-page-toast]')).toBeNull();
  });
});

// ─── Toast rendering + predicate construction ──────────────────────────

async function waitForToast(): Promise<HTMLElement> {
  for (let i = 0; i < 80; i++) {
    const node = document.body.querySelector<HTMLElement>(
      '[data-cross-page-toast]',
    );
    if (node) return node;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('cross-page toast never rendered');
}

describe('triggerCrossPagePromptIfApplicable — fires when conditions hold', () => {
  it('renders a toast with three actions when 1+ similar layer exists', async () => {
    const refLayer = textLayer('a', {
      name: 'Headline',
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer1 = textLayer('b', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer2 = textLayer('c', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const d = doc([page('p1', [refLayer]), page('p2', [peer1]), page('p3', [peer2])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ff0000',
    });

    const toastNode = await waitForToast();
    expect(toastNode.textContent).toContain('color');
    expect(toastNode.textContent).toContain('Headline');
    expect(toastNode.querySelector('[data-cross-page-action="all"]')).toBeTruthy();
    expect(
      toastNode.querySelector('[data-cross-page-action="just-this"]'),
    ).toBeTruthy();
  });

  it('"All pages" action mutates EVERY similar layer EXCEPT the original', async () => {
    const refLayer = textLayer('ref', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer1 = textLayer('peer-p2', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer2 = textLayer('peer-p3', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer3 = textLayer('peer-p4', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const d = doc([
      page('p1', [refLayer]),
      page('p2', [peer1]),
      page('p3', [peer2]),
      page('p4', [peer3]),
    ]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ff0000',
    });

    const toastNode = await waitForToast();
    const allBtn = toastNode.querySelector<HTMLButtonElement>(
      '[data-cross-page-action="all"]',
    );
    expect(allBtn).toBeTruthy();
    fireEvent.click(allBtn!);

    expect(adapter.applyCalls).toHaveLength(1);
    const call = adapter.applyCalls[0];
    expect(call.matchedLayerIds.sort()).toEqual(
      ['peer-p2', 'peer-p3', 'peer-p4'].sort(),
    );
    expect(call.matchedLayerIds).not.toContain('ref'); // critical: no double-apply
    expect(call.patch).toEqual({ color: '#ff0000' });
    expect(call.matchedPageIds.sort()).toEqual(['p2', 'p3', 'p4']);
  });

  it('"Similar this page only" mutates same-page peers only and excludes the original', async () => {
    const refLayer = textLayer('ref', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const samePagePeer = textLayer('same-p1', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const otherPagePeer = textLayer('peer-p2', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const d = doc([
      page('p1', [refLayer, samePagePeer]),
      page('p2', [otherPagePeer]),
    ]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#0000ff',
    });

    const toastNode = await waitForToast();
    const thisPageBtn = toastNode.querySelector<HTMLButtonElement>(
      '[data-cross-page-action="this-page"]',
    );
    expect(thisPageBtn).toBeTruthy();
    fireEvent.click(thisPageBtn!);

    expect(adapter.applyCalls).toHaveLength(1);
    const call = adapter.applyCalls[0];
    expect(call.matchedLayerIds).toEqual(['same-p1']);
    expect(call.matchedLayerIds).not.toContain('ref');
    expect(call.matchedLayerIds).not.toContain('peer-p2');
    expect(call.matchedPageIds).toEqual(['p1']);
    expect(call.patch).toEqual({ color: '#0000ff' });
  });

  it('"Just this layer" dismisses the toast without firing applyLayerPatchAcrossPages', async () => {
    const refLayer = textLayer('ref', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer = textLayer('peer', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const d = doc([page('p1', [refLayer]), page('p2', [peer])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ffff00',
    });
    const toastNode = await waitForToast();
    const justThisBtn = toastNode.querySelector<HTMLButtonElement>(
      '[data-cross-page-action="just-this"]',
    );
    fireEvent.click(justThisBtn!);

    expect(adapter.applyCalls).toHaveLength(0);
  });

  it('"this page only" button only renders when there IS a same-page peer', async () => {
    const refLayer = textLayer('ref', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const peer = textLayer('peer', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const d = doc([page('p1', [refLayer]), page('p2', [peer])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#abcabc',
    });
    const toastNode = await waitForToast();
    expect(
      toastNode.querySelector('[data-cross-page-action="this-page"]'),
    ).toBeNull();
    expect(toastNode.querySelector('[data-cross-page-action="all"]')).toBeTruthy();
  });
});

// ─── Recovery via _lockedBindings ─────────────────────────────────────

describe('triggerCrossPagePromptIfApplicable — recovers via _lockedBindings', () => {
  it('fires when prevLayer.color is a literal but _lockedBindings.color is a SlotRef', async () => {
    // Programmatic override path: layer was brand-locked, an
    // adapter call replaced the SlotRef with a literal but the
    // adapter recorded the original SlotRef in _lockedBindings.
    const refLayer = textLayer('ref', {
      color: '#abcdef',
      _lockedBindings: { color: SLOT_PRIMARY },
    } as Partial<TextLayer>);
    const peer = textLayer('peer', {
      color: SLOT_PRIMARY as unknown as TextLayer['color'],
    });
    const d = doc([page('p1', [refLayer]), page('p2', [peer])]);
    const adapter = stubAdapter(d);

    render(<Toaster />);
    triggerCrossPagePromptIfApplicable(adapter, 'p1', refLayer, {
      color: '#ff0000',
    });
    const toastNode = await waitForToast();
    expect(toastNode).toBeTruthy();

    fireEvent.click(
      toastNode.querySelector<HTMLButtonElement>(
        '[data-cross-page-action="all"]',
      )!,
    );
    expect(adapter.applyCalls[0].matchedLayerIds).toEqual(['peer']);
  });
});
