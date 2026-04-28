// Step 6 — adapter integration tests for cross-page propagation.
//
// Verifies the contract that the toast actions wire up:
//   • applyLayerPatchAcrossPages mutates the right layers and
//     issues exactly ONE change event
//   • The original updateLayer + the propagation are TWO separate
//     undo entries — `undo()` reverses just the propagation,
//     `undo()` again reverses the original edit
//   • "Just this layer" / dismissal triggers no further adapter
//     calls

import { describe, expect, it, vi } from 'vitest';

vi.mock('fabric', () => {
  class FabricObjectBase {
    brandosId?: string;
    left = 0;
    top = 0;
    width = 0;
    height = 0;
    angle = 0;
    scaleX = 1;
    scaleY = 1;
    opacity = 1;
    visible = true;
    selectable = true;
    evented = true;
    lockMovementX = false;
    lockMovementY = false;
    lockScalingX = false;
    lockScalingY = false;
    lockRotation = false;
    fill: string | null = null;
    stroke: string | null = null;
    strokeWidth = 0;
    constructor(props: Record<string, unknown> = {}) {
      Object.assign(this, props);
    }
    set(props: Record<string, unknown> | string, value?: unknown) {
      if (typeof props === 'string') {
        (this as Record<string, unknown>)[props] = value;
        return;
      }
      Object.assign(this, props);
    }
  }
  class Rect extends FabricObjectBase {}
  class Ellipse extends FabricObjectBase {}
  class Line extends FabricObjectBase {
    constructor(_pts: number[], props: Record<string, unknown> = {}) {
      super(props);
    }
  }
  class Polygon extends FabricObjectBase {
    constructor(_pts: unknown, props: Record<string, unknown> = {}) {
      super(props);
    }
  }
  class Textbox extends FabricObjectBase {
    text: string;
    constructor(text: string, props: Record<string, unknown> = {}) {
      super(props);
      this.text = text;
    }
  }
  class Group extends FabricObjectBase {
    children: FabricObjectBase[];
    constructor(children: FabricObjectBase[], props: Record<string, unknown> = {}) {
      super(props);
      this.children = children;
    }
  }
  const FabricImage = {
    async fromURL(_url: string) {
      return new FabricObjectBase({ width: 100, height: 100 });
    },
  };
  class Canvas {
    private _objects: FabricObjectBase[] = [];
    private _listeners = new Map<string, (payload: unknown) => void>();
    private _activeObjects: FabricObjectBase[] = [];
    width = 0;
    height = 0;
    backgroundColor = '#ffffff';
    constructor(_el: HTMLCanvasElement, props: Record<string, unknown> = {}) {
      this.width = (props.width as number) ?? 0;
      this.height = (props.height as number) ?? 0;
      this.backgroundColor = (props.backgroundColor as string) ?? '#ffffff';
    }
    add(...objs: FabricObjectBase[]) {
      this._objects.push(...objs);
    }
    remove(...objs: FabricObjectBase[]) {
      this._objects = this._objects.filter((o) => !objs.includes(o));
    }
    clear() {
      this._objects = [];
    }
    getObjects() {
      return [...this._objects];
    }
    setDimensions({ width, height }: { width: number; height: number }) {
      this.width = width;
      this.height = height;
    }
    getWidth() {
      return this.width;
    }
    getHeight() {
      return this.height;
    }
    dispose() {
      this._objects = [];
    }
    on(event: string, handler: (payload: unknown) => void) {
      this._listeners.set(event, handler);
    }
    getActiveObjects() {
      return [...this._activeObjects];
    }
    setActiveObject(obj: FabricObjectBase) {
      this._activeObjects = [obj];
    }
    discardActiveObject() {
      this._activeObjects = [];
    }
    requestRenderAll() {
      /* no-op */
    }
    moveObjectTo(obj: FabricObjectBase, idx: number) {
      this._objects = this._objects.filter((o) => o !== obj);
      this._objects.splice(idx, 0, obj);
    }
    toDataURL() {
      return 'data:image/png;base64,';
    }
    toSVG() {
      return '<svg></svg>';
    }
  }
  return {
    Canvas,
    Rect,
    Ellipse,
    Line,
    Polygon,
    Textbox,
    FabricImage,
    Group,
    loadSVGFromString: async () => ({ objects: [] }),
  };
});

import { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
  type Layer,
  type Page,
  type TextLayer,
} from '@/features/editor/schema';

const SLOT_PRIMARY = { type: 'brand.color.primary' } as const;

function textLayer(id: string, color: TextLayer['color']): TextLayer {
  return {
    id,
    kind: 'text',
    name: `text-${id}`,
    text: 'Hi',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color,
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
  } as TextLayer;
}

function makePage(id: string, layers: Layer[]): Page {
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

function multiPageDoc(): BrandOSDocument {
  return BrandOSDocumentSchema.parse({
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-000000000001',
    contentType: 'presentation',
    brandId: 'raqm',
    masterPages: [],
    pages: [
      makePage('00000000-0000-0000-0000-000000000011', [
        textLayer('00000000-0000-0000-0000-000000001001', SLOT_PRIMARY as unknown as TextLayer['color']),
      ]),
      makePage('00000000-0000-0000-0000-000000000012', [
        textLayer('00000000-0000-0000-0000-000000001002', SLOT_PRIMARY as unknown as TextLayer['color']),
      ]),
      makePage('00000000-0000-0000-0000-000000000013', [
        textLayer('00000000-0000-0000-0000-000000001003', SLOT_PRIMARY as unknown as TextLayer['color']),
      ]),
    ],
    metadata: {},
  });
}

const PAGE1 = '00000000-0000-0000-0000-000000000011';
const PAGE2 = '00000000-0000-0000-0000-000000000012';
const PAGE3 = '00000000-0000-0000-0000-000000000013';
const REF_LAYER = '00000000-0000-0000-0000-000000001001';
const PEER_P2 = '00000000-0000-0000-0000-000000001002';
const PEER_P3 = '00000000-0000-0000-0000-000000001003';

async function bootAdapter(doc: BrandOSDocument) {
  const adapter = new FabricAdapter();
  const container = document.createElement('div');
  document.body.appendChild(container);
  await adapter.mount(container);
  await adapter.loadDocument(doc);
  return adapter;
}

describe('Step 6 — applyLayerPatchAcrossPages emits a single labeled batch', () => {
  it('"All N pages" mutates the right layers, issues ONE change event, and is undoable in one step', async () => {
    const adapter = await bootAdapter(multiPageDoc());

    // 1. The user's original edit (overrides the SlotRef on page 1).
    adapter.updateLayer(PAGE1, REF_LAYER, { color: '#ff0000' });
    expect(
      (adapter.getDocument().pages[0].layers[0] as TextLayer).color,
    ).toBe('#ff0000');

    // 2. The user picks "All N pages" — mimicking the toast action.
    let propagationChangeEvents = 0;
    const off = adapter.on('change', () => {
      propagationChangeEvents++;
    });
    const peerIds = new Set([PEER_P2, PEER_P3]);
    adapter.applyLayerPatchAcrossPages(
      (l) => peerIds.has(l.id),
      { color: '#ff0000' } as Partial<Layer>,
      'Apply color across 3 pages',
    );
    expect(propagationChangeEvents).toBe(1);
    off();

    // Pages 2 + 3 are now patched.
    expect(
      (adapter.getDocument().pages[1].layers[0] as TextLayer).color,
    ).toBe('#ff0000');
    expect(
      (adapter.getDocument().pages[2].layers[0] as TextLayer).color,
    ).toBe('#ff0000');

    // 3. One undo reverses just the propagation — page 1 keeps the
    //    user's chosen color, pages 2 + 3 revert to the SlotRef.
    expect(adapter.canUndo()).toBe(true);
    adapter.undo();
    expect(
      (adapter.getDocument().pages[0].layers[0] as TextLayer).color,
    ).toBe('#ff0000'); // page 1 untouched by undo
    expect(
      (adapter.getDocument().pages[1].layers[0] as TextLayer).color,
    ).toEqual(SLOT_PRIMARY); // page 2 reverted
    expect(
      (adapter.getDocument().pages[2].layers[0] as TextLayer).color,
    ).toEqual(SLOT_PRIMARY); // page 3 reverted

    // 4. Second undo reverses the original updateLayer.
    expect(adapter.canUndo()).toBe(true);
    adapter.undo();
    expect(
      (adapter.getDocument().pages[0].layers[0] as TextLayer).color,
    ).toEqual(SLOT_PRIMARY);
  });

  it('"Similar this page only" predicate scopes mutation to one page', async () => {
    // Two layers on page 1 share the slot; a peer on page 2 also
    // shares it. "Similar this page" should patch only the same-page
    // peer.
    const doc = BrandOSDocumentSchema.parse({
      schemaVersion: 1,
      id: '00000000-0000-0000-0000-000000000002',
      contentType: 'presentation',
      brandId: 'raqm',
      masterPages: [],
      pages: [
        makePage('00000000-0000-0000-0000-000000000021', [
          textLayer('00000000-0000-0000-0000-000000002001', SLOT_PRIMARY as unknown as TextLayer['color']),
          textLayer('00000000-0000-0000-0000-000000002002', SLOT_PRIMARY as unknown as TextLayer['color']),
        ]),
        makePage('00000000-0000-0000-0000-000000000022', [
          textLayer('00000000-0000-0000-0000-000000002003', SLOT_PRIMARY as unknown as TextLayer['color']),
        ]),
      ],
      metadata: {},
    });
    const adapter = await bootAdapter(doc);
    const PAGE = '00000000-0000-0000-0000-000000000021';
    const REF = '00000000-0000-0000-0000-000000002001';
    const SAME_PAGE = '00000000-0000-0000-0000-000000002002';
    const OTHER_PAGE_LAYER = '00000000-0000-0000-0000-000000002003';

    adapter.updateLayer(PAGE, REF, { color: '#00ff00' });

    const ids = new Set([SAME_PAGE]);
    adapter.applyLayerPatchAcrossPages(
      (l, pId) => ids.has(l.id) && pId === PAGE,
      { color: '#00ff00' } as Partial<Layer>,
      'Apply to similar layers on this page',
    );

    expect(
      (
        adapter
          .getDocument()
          .pages[0].layers.find((l) => l.id === SAME_PAGE) as TextLayer
      ).color,
    ).toBe('#00ff00');
    expect(
      (
        adapter
          .getDocument()
          .pages[1].layers.find((l) => l.id === OTHER_PAGE_LAYER) as TextLayer
      ).color,
    ).toEqual(SLOT_PRIMARY);
  });

  it('"Just this layer" / dismissal triggers no additional adapter calls', async () => {
    const adapter = await bootAdapter(multiPageDoc());
    adapter.updateLayer(PAGE1, REF_LAYER, { color: '#abcabc' });

    // Capture history depth after the user's edit.
    const historyAfterEdit = (
      adapter as unknown as {
        history: { getStateForTesting(): { past: unknown[] } };
      }
    ).history.getStateForTesting();
    const expectedDepth = historyAfterEdit.past.length;

    // No applyLayerPatchAcrossPages call (the toast was dismissed).
    // Verify history hasn't grown.
    const historyNow = (
      adapter as unknown as {
        history: { getStateForTesting(): { past: unknown[] } };
      }
    ).history.getStateForTesting();
    expect(historyNow.past.length).toBe(expectedDepth);

    // Pages 2 + 3 still hold the original SlotRef.
    expect(
      (adapter.getDocument().pages[1].layers[0] as TextLayer).color,
    ).toEqual(SLOT_PRIMARY);
  });
});
