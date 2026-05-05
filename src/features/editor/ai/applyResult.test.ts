// Adapter-integration tests for applyAICommandResult — Phase 3.5
// commit 6. Uses the real FabricAdapter under jsdom (Fabric is
// mocked at the jsdom layer via the existing vi.mock infrastructure
// inherited from the rest of the adapter tests).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAICommandResult } from './applyResult';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Layer, Page } from '@/features/editor/schema';
import type { AICommandResult } from './types';

// Same Fabric mock the adapter tests use — jsdom has no Canvas 2D
// context, so we stub the constructors to a small object surface
// the adapter manipulates.
vi.mock('fabric', async () => {
  const noop = () => {};
  const baseObj = () => ({
    set: noop, on: noop, off: noop,
    setCoords: noop,
    bringToFront: noop, sendToBack: noop,
  });
  function FabricObjectStub() { return baseObj(); }
  return {
    Canvas: vi.fn(function MockCanvas() {
      const objects: unknown[] = [];
      return {
        getObjects: () => objects,
        add: (o: unknown) => { objects.push(o); },
        remove: (o: unknown) => {
          const i = objects.indexOf(o);
          if (i >= 0) objects.splice(i, 1);
        },
        // Reorder helpers used by FabricAdapter's recreate paths
        // (FabricAdapter.ts:428 + 463). Without these the adapter's
        // post-update render throws "moveObjectTo is not a function"
        // and pollutes the unhandled-rejection log even though the
        // test assertions still pass.
        moveObjectTo: (o: unknown, idx: number) => {
          const i = objects.indexOf(o);
          if (i < 0) return;
          objects.splice(i, 1);
          objects.splice(Math.max(0, Math.min(idx, objects.length)), 0, o);
        },
        bringObjectToFront: (o: unknown) => {
          const i = objects.indexOf(o);
          if (i < 0) return;
          objects.splice(i, 1);
          objects.push(o);
        },
        sendObjectToBack: (o: unknown) => {
          const i = objects.indexOf(o);
          if (i < 0) return;
          objects.splice(i, 1);
          objects.unshift(o);
        },
        clear: () => { objects.length = 0; },
        renderAll: noop,
        requestRenderAll: noop,
        setActiveObject: noop,
        discardActiveObject: noop,
        getActiveObjects: () => [],
        on: noop, off: noop,
        setDimensions: noop,
        setWidth: noop, setHeight: noop,
        getWidth: () => 1080,
        getHeight: () => 1080,
        backgroundColor: '#ffffff',
        loadFromJSON: vi.fn(async () => undefined),
        toJSON: () => ({ objects: [] }),
        dispose: noop,
      };
    }),
    Rect: vi.fn(FabricObjectStub),
    Ellipse: vi.fn(FabricObjectStub),
    Line: vi.fn(FabricObjectStub),
    Polygon: vi.fn(FabricObjectStub),
    Textbox: vi.fn(FabricObjectStub),
    FabricImage: { fromURL: vi.fn(async () => baseObj()) },
    Group: vi.fn(FabricObjectStub),
  };
});

const PAGE_ID = '00000000-0000-0000-0000-000000000aa1';
const PAGE_ID_2 = '00000000-0000-0000-0000-000000000aa2';
const LAYER_ID = '00000000-0000-0000-0000-000000000bb1';
const DOC_ID = '00000000-0000-0000-0000-000000000cc1';

function freshDoc(): BrandOSDocument {
  return {
    schemaVersion: 1, id: DOC_ID, contentType: 'social-post',
    brandId: 'brand-test', masterPages: [], metadata: {},
    pages: [
      {
        id: PAGE_ID, name: 'Page 1', width: 1080, height: 1080,
        background: '#ffffff', masterPageId: null,
        layers: [{
          id: LAYER_ID, kind: 'text', name: 'A', text: 'A',
          fontFamily: 'Inter', fontSize: 48, fontWeight: 600,
          lineHeight: 1.2, letterSpacing: 0, textAlign: 'left',
          direction: 'ltr', color: '#000000',
          transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1, visible: true, locked: false, brandLocked: false,
        }],
      },
    ],
  };
}

let adapter: EditorAdapter;
let container: HTMLDivElement;

beforeEach(async () => {
  // FabricAdapter requires mount() before use. Pattern matches
  // src/features/editor/adapter/FabricAdapter.test.ts:makeMountedAdapter.
  const { FabricAdapter } = await import('@/features/editor/adapter/FabricAdapter');
  const a = new FabricAdapter();
  container = document.createElement('div');
  document.body.appendChild(container);
  await a.mount(container);
  await a.loadDocument(freshDoc());
  // Let FabricImage.fromURL etc. settle.
  await new Promise((r) => setTimeout(r, 0));
  adapter = a as unknown as EditorAdapter;
});

afterEach(() => {
  container?.remove();
});

afterEach(() => {
  // Adapters generally hold no global state, but be tidy.
  vi.clearAllMocks();
});

// ─── kind: 'rejected' — no apply ───────────────────────────────────────

describe('applyAICommandResult — rejected variant', () => {
  it('does NOT mutate the adapter; returns applied=false', () => {
    const docBefore = JSON.stringify(adapter.getDocument());
    const result: AICommandResult = {
      kind: 'rejected', reason: 'no_selection',
      message: 'OK',
    };
    const summary = applyAICommandResult(adapter, result);
    expect(summary).toEqual({ applied: false, kind: 'rejected' });
    expect(JSON.stringify(adapter.getDocument())).toBe(docBefore);
  });
});

// ─── kind: 'delta' — Mode 2/3/4 dispatch ───────────────────────────────

describe('applyAICommandResult — delta variant', () => {
  it('lands an add-layer op as a single batched undo entry', () => {
    const newLayer: Layer = {
      id: '00000000-0000-0000-0000-000000000bb9',
      kind: 'shape', shape: 'rectangle',
      name: 'CTA bg',
      transform: { x: 80, y: 720, width: 220, height: 56, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
      fill: '#ff0000', stroke: null, strokeWidth: 0, cornerRadius: 8,
    };
    const result: AICommandResult = {
      kind: 'delta', label: 'AI: add CTA',
      ops: [{ op: 'add-layer', pageId: PAGE_ID, layer: newLayer }],
      message: 'Added.',
    };

    const summary = applyAICommandResult(adapter, result);
    expect(summary.applied).toBe(true);

    const docAfter = adapter.getDocument();
    expect(docAfter.pages[0].layers).toHaveLength(2);
    expect(docAfter.pages[0].layers[1].id).toBe(newLayer.id);

    // Single undo entry — the next undo reverts the entire delta.
    expect(adapter.canUndo()).toBe(true);
    adapter.undo();
    expect(adapter.getDocument().pages[0].layers).toHaveLength(1);
  });

  it('lands an update-layer op with the patch applied', () => {
    const result: AICommandResult = {
      kind: 'delta', label: 'AI: change color',
      ops: [{
        op: 'update-layer', pageId: PAGE_ID, layerId: LAYER_ID,
        patch: { color: '#ff0000' },
      }],
      message: 'Changed.',
    };
    applyAICommandResult(adapter, result);
    const layer = adapter.getDocument().pages[0].layers[0] as { color: unknown };
    expect(layer.color).toBe('#ff0000');
  });

  it('lands multiple ops as ONE undo entry', () => {
    const result: AICommandResult = {
      kind: 'delta', label: 'AI: multi op',
      ops: [
        { op: 'update-layer', pageId: PAGE_ID, layerId: LAYER_ID, patch: { color: '#ff0000' } },
        { op: 'update-layer', pageId: PAGE_ID, layerId: LAYER_ID, patch: { fontSize: 96 } },
      ],
      message: 'Multi.',
    };
    applyAICommandResult(adapter, result);
    const after = adapter.getDocument().pages[0].layers[0] as { color: unknown; fontSize: number };
    expect(after.color).toBe('#ff0000');
    expect(after.fontSize).toBe(96);
    // ONE undo reverts both.
    adapter.undo();
    const reverted = adapter.getDocument().pages[0].layers[0] as { color: unknown; fontSize: number };
    expect(reverted.color).toBe('#000000');
    expect(reverted.fontSize).toBe(48);
  });

  it('add-page op respects afterPageId by translating to index+1', () => {
    // Mount a 2-page doc then add a page after page 1.
    const newPage: Page = {
      id: PAGE_ID_2, name: 'Inserted', width: 1080, height: 1080,
      background: '#ffffff', masterPageId: null, layers: [],
    };
    const result: AICommandResult = {
      kind: 'delta', label: 'AI: insert page',
      ops: [{ op: 'add-page', page: newPage, afterPageId: PAGE_ID }],
      message: 'Added.',
    };
    applyAICommandResult(adapter, result);
    const pages = adapter.getDocument().pages;
    expect(pages.length).toBe(2);
    expect(pages[0].id).toBe(PAGE_ID);
    expect(pages[1].id).toBe(PAGE_ID_2);
  });

  it('remove-layer op removes the targeted layer', () => {
    const result: AICommandResult = {
      kind: 'delta', label: 'AI: remove layer',
      ops: [{ op: 'remove-layer', pageId: PAGE_ID, layerId: LAYER_ID }],
      message: 'Removed.',
    };
    applyAICommandResult(adapter, result);
    expect(adapter.getDocument().pages[0].layers).toHaveLength(0);
  });
});

// ─── kind: 'replace' — Mode 3 large transformation ─────────────────────

describe('applyAICommandResult — replace variant', () => {
  it('replaces the document inside a labeled batch', async () => {
    const nextDoc: BrandOSDocument = { ...freshDoc(), id: '00000000-0000-0000-0000-000000000cc2' };
    const result: AICommandResult = {
      kind: 'replace', label: 'AI: convert',
      justification: 'Cross-content-type conversion needs full doc rewrite.',
      nextDoc, message: 'Converted.',
    };
    const summary = applyAICommandResult(adapter, result);
    expect(summary.applied).toBe(true);
    // replaceDocument is async; let it settle.
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().id).toBe('00000000-0000-0000-0000-000000000cc2');
  });
});
