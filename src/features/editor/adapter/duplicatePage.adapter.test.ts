// Step 7 — adapter integration tests for the three Duplicate paths.
//
// Verifies the adapter contract:
//   • duplicatePage / duplicatePageAsVariant / duplicatePageEmpty
//     all insert at sourceIndex + 1 (not the end)
//   • Each is a single history commit — undo() reverses the new
//     page entirely
//   • The new page's id matches what's in pages[]
//   • Variant rules survive the round-trip (text cleared, images
//     dropped, shapes/logos/SVGs preserved with fresh ids)
//   • Empty preserves dimensions + masterPageId

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

import { FabricAdapter } from './FabricAdapter';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
  type Layer,
  type Page,
  type TextLayer,
} from '@/features/editor/schema';

const newId = (): string => crypto.randomUUID();

function textLayer(name: string): TextLayer {
  return {
    id: newId(),
    kind: 'text',
    name,
    text: 'Hello',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 600,
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
  } as TextLayer;
}

function makePage(name: string, masterPageId: string | null = null): Page {
  return {
    id: newId(),
    name,
    width: 1200,
    height: 800,
    background: '#fafaf9',
    masterPageId,
    layers: [textLayer(`${name}-headline`)],
  };
}

function multiPageDoc(): BrandOSDocument {
  return BrandOSDocumentSchema.parse({
    schemaVersion: 1,
    id: newId(),
    contentType: 'presentation',
    brandId: 'raqm',
    masterPages: [],
    pages: [makePage('A'), makePage('B'), makePage('C')],
    metadata: {},
  });
}

async function bootAdapter(doc: BrandOSDocument) {
  const adapter = new FabricAdapter();
  const container = document.createElement('div');
  document.body.appendChild(container);
  await adapter.mount(container);
  await adapter.loadDocument(doc);
  return adapter;
}

describe('Step 7 — duplicate methods all insert at sourceIndex + 1', () => {
  it('duplicatePage inserts directly after the source, not at the end', async () => {
    const doc = multiPageDoc();
    const adapter = await bootAdapter(doc);
    const sourceId = adapter.getDocument().pages[1].id; // middle page
    const newId = adapter.duplicatePage(sourceId);

    const pages = adapter.getDocument().pages;
    expect(pages).toHaveLength(4);
    // New page sits at index 2 (sourceIndex 1 + 1).
    expect(pages[2].id).toBe(newId);
    // Page C still last.
    expect(pages[3].name).toBe('C');
  });

  it('duplicatePageAsVariant inserts directly after the source', async () => {
    const doc = multiPageDoc();
    const adapter = await bootAdapter(doc);
    const sourceId = adapter.getDocument().pages[0].id; // first page
    const newId = adapter.duplicatePageAsVariant(sourceId);

    const pages = adapter.getDocument().pages;
    expect(pages).toHaveLength(4);
    expect(pages[1].id).toBe(newId);
  });

  it('duplicatePageEmpty inserts directly after the source', async () => {
    const doc = multiPageDoc();
    const adapter = await bootAdapter(doc);
    const sourceId = adapter.getDocument().pages[2].id; // last page
    const newId = adapter.duplicatePageEmpty(sourceId);

    const pages = adapter.getDocument().pages;
    expect(pages).toHaveLength(4);
    expect(pages[3].id).toBe(newId);
  });
});

describe('Step 7 — each duplicate is a single-undo step', () => {
  it.each([
    ['duplicatePage', (a: FabricAdapter, id: string) => a.duplicatePage(id)],
    [
      'duplicatePageAsVariant',
      (a: FabricAdapter, id: string) => a.duplicatePageAsVariant(id),
    ],
    [
      'duplicatePageEmpty',
      (a: FabricAdapter, id: string) => a.duplicatePageEmpty(id),
    ],
  ])('%s — undo() removes the new page entirely in one step', async (_name, fn) => {
    const doc = multiPageDoc();
    const adapter = await bootAdapter(doc);
    const sourceId = adapter.getDocument().pages[1].id;
    const beforeCount = adapter.getDocument().pages.length;

    fn(adapter, sourceId);
    expect(adapter.getDocument().pages).toHaveLength(beforeCount + 1);
    expect(adapter.canUndo()).toBe(true);
    adapter.undo();
    expect(adapter.getDocument().pages).toHaveLength(beforeCount);
  });
});

describe('Step 7 — duplicatePageEmpty preserves dimensions + masterPageId', () => {
  it('layers is empty, width/height/masterPageId match source', async () => {
    const doc = BrandOSDocumentSchema.parse({
      schemaVersion: 1,
      id: newId(),
      contentType: 'presentation',
      brandId: 'raqm',
      masterPages: [
        {
          id: '00000000-0000-0000-0000-000000010001',
          name: 'master',
          width: 1200,
          height: 800,
          background: '#ffffff',
          masterPageId: null,
          layers: [],
        },
      ],
      pages: [
        {
          id: '00000000-0000-0000-0000-000000020001',
          name: 'A',
          width: 1200,
          height: 800,
          background: '#abcdef',
          masterPageId: '00000000-0000-0000-0000-000000010001',
          layers: [textLayer('a-headline')],
        },
      ],
      metadata: {},
    });
    const adapter = await bootAdapter(doc);
    const newPageId = adapter.duplicatePageEmpty(
      '00000000-0000-0000-0000-000000020001',
    );
    const newPage = adapter
      .getDocument()
      .pages.find((p) => p.id === newPageId)!;
    expect(newPage.layers).toEqual([]);
    expect(newPage.width).toBe(1200);
    expect(newPage.height).toBe(800);
    expect(newPage.masterPageId).toBe(
      '00000000-0000-0000-0000-000000010001',
    );
    // Background also clones (not a content-vs-styling concern; the
    // surface itself is structural).
    expect(newPage.background).toBe('#abcdef');
  });
});

describe('Step 7 — duplicatePageAsVariant: variant rules survive roundtrip + ids are fresh', () => {
  it('text content cleared, image removed, shape/logo/svg preserved with fresh ids', async () => {
    const slot = { type: 'brand.color.primary' } as const;
    const doc = BrandOSDocumentSchema.parse({
      schemaVersion: 1,
      id: newId(),
      contentType: 'presentation',
      brandId: 'raqm',
      masterPages: [],
      pages: [
        {
          id: '00000000-0000-0000-0000-000000030001',
          name: 'A',
          width: 1200,
          height: 800,
          background: '#ffffff',
          masterPageId: null,
          layers: [
            {
              id: '00000000-0000-0000-0000-000000031001',
              kind: 'text',
              name: 'headline',
              text: 'Important content',
              fontFamily: 'Inter',
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: 0,
              textAlign: 'left',
              direction: 'auto',
              color: slot,
              transform: { x: 0, y: 0, width: 600, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1,
              visible: true,
              locked: false,
              brandLocked: false,
            },
            {
              id: '00000000-0000-0000-0000-000000031002',
              kind: 'image',
              name: 'photo',
              src: 'https://placehold.co/400/png',
              fit: 'cover',
              transform: { x: 0, y: 100, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1,
              visible: true,
              locked: false,
              brandLocked: false,
            },
            {
              id: '00000000-0000-0000-0000-000000031003',
              kind: 'shape',
              name: 'accent',
              shape: 'rectangle',
              fill: '#3b82f6',
              stroke: null,
              strokeWidth: 0,
              cornerRadius: 4,
              transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1,
              visible: true,
              locked: false,
              brandLocked: false,
            },
            {
              id: '00000000-0000-0000-0000-000000031004',
              kind: 'logo',
              name: 'brand mark',
              variant: 'auto',
              transform: { x: 0, y: 0, width: 120, height: 60, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1,
              visible: true,
              locked: false,
              brandLocked: true,
            },
          ] as Layer[],
        },
      ],
      metadata: {},
    });
    const adapter = await bootAdapter(doc);
    const sourceId = '00000000-0000-0000-0000-000000030001';
    const variantId = adapter.duplicatePageAsVariant(sourceId);

    const variantPage = adapter
      .getDocument()
      .pages.find((p) => p.id === variantId)!;

    // Image is dropped → 3 layers remain (text, shape, logo).
    expect(variantPage.layers).toHaveLength(3);
    const kinds = variantPage.layers.map((l) => l.kind);
    expect(kinds).toEqual(['text', 'shape', 'logo']);

    // Text content cleared, styling kept.
    const variantText = variantPage.layers.find((l) => l.kind === 'text') as TextLayer;
    expect(variantText.text).toBe('');
    expect(variantText.fontSize).toBe(64);
    expect(variantText.fontWeight).toBe(700);
    expect(variantText.color).toEqual(slot); // SlotRef preserved

    // Every layer id in the variant differs from the source.
    const sourceIds = new Set([
      '00000000-0000-0000-0000-000000031001',
      '00000000-0000-0000-0000-000000031002',
      '00000000-0000-0000-0000-000000031003',
      '00000000-0000-0000-0000-000000031004',
    ]);
    for (const l of variantPage.layers) {
      expect(sourceIds.has(l.id)).toBe(false);
    }

    // Source page is untouched.
    const sourcePage = adapter
      .getDocument()
      .pages.find((p) => p.id === sourceId)!;
    expect(sourcePage.layers).toHaveLength(4);
    expect((sourcePage.layers[0] as TextLayer).text).toBe('Important content');
  });
});
