// FabricAdapter integration tests.
//
// jsdom does not provide a working Canvas 2D context, so we mock the
// `fabric` module with a minimal-but-faithful stand-in. The mock
// records every add/remove/event subscription so we can assert
// adapter behavior against it. Real pixel rendering is not exercised
// here — that's a manual eyes step.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fabric mock ────────────────────────────────────────────────────────
// Defined inline so vi.mock's factory restriction (no outer-scope
// references) is satisfied.
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
      const inst = new FabricObjectBase({ width: 100, height: 100 });
      return inst;
    },
  };
  class Canvas {
    private _objects: FabricObjectBase[] = [];
    private _listeners = new Map<string, (payload: unknown) => void>();
    private _activeObjects: FabricObjectBase[] = [];
    width: number;
    height: number;
    backgroundColor: string;
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
    /** Test-only: fire an event with a payload. */
    __fire(event: string, payload: unknown) {
      this._listeners.get(event)?.(payload);
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
    toDataURL(opts: { multiplier?: number; format?: string }) {
      // Encode the multiplier as a length-varying payload so the export tests
      // can confirm scale is honored via blob.size differences (jsdom's Blob
      // does not always expose .text(); .size is reliable).
      const m = opts.multiplier ?? 1;
      const payload = 'A'.repeat(m * 100);
      const b64 = Buffer.from(`multiplier=${m}|${payload}`, 'utf-8').toString('base64');
      return `data:image/${opts.format ?? 'png'};base64,${b64}`;
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

// Dynamically import AFTER the mock is in place.
import { FabricAdapter } from './FabricAdapter';
import { BrandOSDocumentSchema, type BrandOSDocument, type Layer } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';

const FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

// fetch stub for adapter.exportAs PNG path (toDataURL → fetch → blob).
function installFetchStub() {
  global.fetch = vi.fn(async (url: string) => {
    const dataUrl = String(url);
    const [, b64] = dataUrl.split(',');
    const bytes = Buffer.from(b64, 'base64');
    return {
      blob: async () =>
        new Blob([bytes], { type: dataUrl.match(/data:([^;]+);/)?.[1] ?? 'image/png' }),
    } as unknown as Response;
  }) as unknown as typeof global.fetch;
}

async function makeMountedAdapter() {
  const adapter = new FabricAdapter();
  const container = document.createElement('div');
  document.body.appendChild(container);
  await adapter.mount(container);
  await adapter.loadDocument(FIXTURE);
  // FabricImage.fromURL is async inside renderPage; let pending microtasks flush.
  await flushPromises();
  return { adapter, container };
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('FabricAdapter — load + getDocument round-trip', () => {
  beforeEach(installFetchStub);

  it('getDocument returns the loaded fixture (deep equal)', async () => {
    const { adapter } = await makeMountedAdapter();
    const got = adapter.getDocument();
    expect(got).toEqual(FIXTURE);
  });

  it('getDocument returns a CLONE — mutating the returned doc does not affect adapter', async () => {
    const { adapter } = await makeMountedAdapter();
    const a = adapter.getDocument();
    a.pages[0].layers.push({ ...a.pages[0].layers[0], id: 'tampered' } as Layer);
    expect(adapter.getDocument().pages[0].layers).toHaveLength(FIXTURE.pages[0].layers.length);
  });

  it('full round-trip: load → mutate → getDocument → load → identical', async () => {
    const { adapter } = await makeMountedAdapter();
    const pageId = FIXTURE.pages[0].id;
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(pageId, layerId, {
      transform: {
        x: 999,
        y: 888,
        width: 500,
        height: 200,
        rotation: 30,
        scaleX: 1,
        scaleY: 1,
      },
    });
    const mutated = adapter.getDocument();
    await adapter.loadDocument(mutated);
    await flushPromises();
    const reloaded = adapter.getDocument();
    expect(reloaded).toEqual(mutated);
  });
});

describe('FabricAdapter — addLayer / updateLayer / removeLayer / reorderLayer', () => {
  beforeEach(installFetchStub);

  it('addLayer pushes to the page mirror and emits change', async () => {
    const { adapter } = await makeMountedAdapter();
    const onChange = vi.fn();
    adapter.on('change', onChange);

    const newLayer: Layer = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f3001',
      kind: 'shape',
      name: 'fresh',
      transform: { x: 10, y: 20, width: 30, height: 40, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      shape: 'rectangle',
      fill: '#ff0000',
      stroke: null,
      strokeWidth: 0,
      cornerRadius: 0,
    };
    adapter.addLayer(FIXTURE.pages[0].id, newLayer);

    const doc = adapter.getDocument();
    expect(doc.pages[0].layers.map((l) => l.id)).toContain(newLayer.id);
    expect(onChange).toHaveBeenCalled();
  });

  it('updateLayer applies a patch to the mirror and emits change', async () => {
    const { adapter } = await makeMountedAdapter();
    const onChange = vi.fn();
    adapter.on('change', onChange);

    const pageId = FIXTURE.pages[0].id;
    const layerId = FIXTURE.pages[0].layers[0].id;
    const newTransform = {
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
    adapter.updateLayer(pageId, layerId, { transform: newTransform });

    const layer = adapter.getDocument().pages[0].layers.find((l) => l.id === layerId)!;
    expect(layer.transform).toEqual(newTransform);
    expect(onChange).toHaveBeenCalled();
  });

  it('removeLayer drops from the mirror and emits change', async () => {
    const { adapter } = await makeMountedAdapter();
    const onChange = vi.fn();
    adapter.on('change', onChange);

    const pageId = FIXTURE.pages[0].id;
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.removeLayer(pageId, layerId);

    expect(adapter.getDocument().pages[0].layers.find((l) => l.id === layerId)).toBeUndefined();
    expect(onChange).toHaveBeenCalled();
  });

  it('reorderLayer moves a layer to the requested index', async () => {
    const { adapter } = await makeMountedAdapter();
    const pageId = FIXTURE.pages[0].id;
    const layers = FIXTURE.pages[0].layers;
    // Move first layer to last position
    adapter.reorderLayer(pageId, layers[0].id, layers.length - 1);

    const after = adapter.getDocument().pages[0].layers.map((l) => l.id);
    expect(after[after.length - 1]).toBe(layers[0].id);
  });
});

describe('FabricAdapter — locked layers', () => {
  beforeEach(installFetchStub);

  it('locked layer maps to a Fabric object with selectable=false and lockMovement=true', async () => {
    const { adapter } = await makeMountedAdapter();
    // The fixture's logo layer is brandLocked but not locked — we add a fresh locked one.
    const lockedLayer: Layer = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f4001',
      kind: 'shape',
      name: 'locked-rect',
      transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: true,
      brandLocked: false,
      shape: 'rectangle',
      fill: '#000',
      stroke: null,
      strokeWidth: 0,
      cornerRadius: 0,
    };
    adapter.addLayer(FIXTURE.pages[0].id, lockedLayer);
    await flushPromises();

    // Reach into the adapter's private fabric map. Cast is justified: this
    // is a behavior verification at the Fabric boundary, not a runtime path.
    const fabricByLayerId = (adapter as unknown as {
      fabricByLayerId: Map<string, Record<string, unknown>>;
    }).fabricByLayerId;
    const fabricObj = fabricByLayerId.get(lockedLayer.id);
    expect(fabricObj).toBeDefined();
    expect(fabricObj!.selectable).toBe(false);
    expect(fabricObj!.evented).toBe(false);
    expect(fabricObj!.lockMovementX).toBe(true);
    expect(fabricObj!.lockMovementY).toBe(true);
    expect(fabricObj!.lockScalingX).toBe(true);
    expect(fabricObj!.lockScalingY).toBe(true);
    expect(fabricObj!.lockRotation).toBe(true);
  });

  it('toggling locked via updateLayer updates the Fabric object lock flags', async () => {
    const { adapter } = await makeMountedAdapter();
    const pageId = FIXTURE.pages[0].id;
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(pageId, layerId, { locked: true });

    const fabricByLayerId = (adapter as unknown as {
      fabricByLayerId: Map<string, Record<string, unknown>>;
    }).fabricByLayerId;
    const fabricObj = fabricByLayerId.get(layerId);
    expect(fabricObj!.selectable).toBe(false);
    expect(fabricObj!.lockMovementX).toBe(true);
  });
});

describe('FabricAdapter — undo / redo at the document level', () => {
  beforeEach(() => {
    installFetchStub();
    // No fake timers here — adapter mutations call history.commit() (immediate,
    // not debounced), and the renderActivePage promise we await uses
    // setImmediate which would hang under fake timers.
  });

  it('undo restores the pre-mutation document; redo restores the post-mutation document', async () => {
    const { adapter } = await makeMountedAdapter();
    const pageId = FIXTURE.pages[0].id;
    const layerId = FIXTURE.pages[0].layers[0].id;

    const before = adapter.getDocument();
    adapter.updateLayer(pageId, layerId, {
      transform: {
        x: 555,
        y: 666,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });
    const after = adapter.getDocument();
    expect(after).not.toEqual(before);

    adapter.undo();
    await flushPromises();
    expect(adapter.getDocument()).toEqual(before);

    adapter.redo();
    await flushPromises();
    expect(adapter.getDocument()).toEqual(after);
  });

  it('canUndo / canRedo flip correctly across mutations', async () => {
    const { adapter } = await makeMountedAdapter();
    expect(adapter.canUndo()).toBe(false);
    expect(adapter.canRedo()).toBe(false);

    adapter.updateLayer(FIXTURE.pages[0].id, FIXTURE.pages[0].layers[0].id, {
      transform: { x: 1, y: 1, width: 1, height: 1, rotation: 0, scaleX: 1, scaleY: 1 },
    });
    expect(adapter.canUndo()).toBe(true);
    expect(adapter.canRedo()).toBe(false);

    adapter.undo();
    await flushPromises();
    expect(adapter.canUndo()).toBe(false);
    expect(adapter.canRedo()).toBe(true);
  });
});

describe('FabricAdapter — updateLayer reaches the Fabric object (regression)', () => {
  // Phase 1 review surfaced a real bug: the Properties panel calls
  // adapter.updateLayer({ fontSize: 98 }), the mirror got patched, but
  // the Fabric object on the canvas was never updated because the old
  // applyPatchToFabric only forwarded transform/opacity/visible/locked.
  // This block guards every per-kind property the panel can edit.
  beforeEach(installFetchStub);

  function fabricObjFor(adapter: FabricAdapter, layerId: string) {
    const fabricByLayerId = (adapter as unknown as {
      fabricByLayerId: Map<string, Record<string, unknown>>;
    }).fabricByLayerId;
    return fabricByLayerId.get(layerId);
  }

  it('text: fontSize change reaches the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id; // headline (text)
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { fontSize: 98 });
    expect(fabricObjFor(adapter, layerId)!.fontSize).toBe(98);
  });

  it('text: fontWeight change reaches the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { fontWeight: 200 });
    expect(fabricObjFor(adapter, layerId)!.fontWeight).toBe(200);
  });

  it('text: fontFamily literal change reaches the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { fontFamily: 'Inter, sans-serif' });
    expect(fabricObjFor(adapter, layerId)!.fontFamily).toBe('Inter, sans-serif');
  });

  it('text: text content change reaches the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { text: 'Replaced!' });
    expect(fabricObjFor(adapter, layerId)!.text).toBe('Replaced!');
  });

  it('text: literal color change reaches the Fabric Textbox fill', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { color: '#ff00ff' });
    expect(fabricObjFor(adapter, layerId)!.fill).toBe('#ff00ff');
  });

  it('text: textAlign change reaches the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { textAlign: 'center' });
    expect(fabricObjFor(adapter, layerId)!.textAlign).toBe('center');
  });

  it('text: lineHeight change reaches the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { lineHeight: 1.6 });
    expect(fabricObjFor(adapter, layerId)!.lineHeight).toBe(1.6);
  });

  it('text: letterSpacing change converts to Fabric charSpacing (1/1000 em)', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { letterSpacing: 0.05 });
    expect(fabricObjFor(adapter, layerId)!.charSpacing).toBe(50);
  });

  it('text: direction=rtl propagates to the Fabric Textbox', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.updateLayer(FIXTURE.pages[0].id, layerId, { direction: 'rtl' });
    expect(fabricObjFor(adapter, layerId)!.direction).toBe('rtl');
  });

  it('shape: fill change reaches the Fabric object', async () => {
    const { adapter } = await makeMountedAdapter();
    const newShape: Layer = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f5001',
      kind: 'shape',
      name: 'r',
      transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      shape: 'rectangle',
      fill: '#000',
      stroke: null,
      strokeWidth: 0,
      cornerRadius: 0,
    };
    adapter.addLayer(FIXTURE.pages[0].id, newShape);
    await flushPromises();
    adapter.updateLayer(FIXTURE.pages[0].id, newShape.id, { fill: '#abcdef' });
    expect(fabricObjFor(adapter, newShape.id)!.fill).toBe('#abcdef');
  });

  it('shape: stroke and strokeWidth changes reach the Fabric object', async () => {
    const { adapter } = await makeMountedAdapter();
    const newShape: Layer = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f5002',
      kind: 'shape',
      name: 'r',
      transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      shape: 'rectangle',
      fill: '#000',
      stroke: null,
      strokeWidth: 0,
      cornerRadius: 0,
    };
    adapter.addLayer(FIXTURE.pages[0].id, newShape);
    await flushPromises();
    adapter.updateLayer(FIXTURE.pages[0].id, newShape.id, {
      stroke: '#0000ff',
      strokeWidth: 4,
    });
    const obj = fabricObjFor(adapter, newShape.id)!;
    expect(obj.stroke).toBe('#0000ff');
    expect(obj.strokeWidth).toBe(4);
  });

  it('rectangle: cornerRadius change reaches the Fabric object as rx/ry', async () => {
    const { adapter } = await makeMountedAdapter();
    const newShape: Layer = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f5003',
      kind: 'shape',
      name: 'r',
      transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      shape: 'rectangle',
      fill: '#000',
      stroke: null,
      strokeWidth: 0,
      cornerRadius: 0,
    };
    adapter.addLayer(FIXTURE.pages[0].id, newShape);
    await flushPromises();
    adapter.updateLayer(FIXTURE.pages[0].id, newShape.id, { cornerRadius: 16 });
    const obj = fabricObjFor(adapter, newShape.id)!;
    expect(obj.rx).toBe(16);
    expect(obj.ry).toBe(16);
  });

  it('image: src change triggers a recreate (Fabric image src is construction-time)', async () => {
    const { adapter } = await makeMountedAdapter();
    const newImage: Layer = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f5010',
      kind: 'image',
      name: 'img',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      src: 'https://example.com/a.png',
      fit: 'cover',
    };
    adapter.addLayer(FIXTURE.pages[0].id, newImage);
    await flushPromises();
    const oldObj = fabricObjFor(adapter, newImage.id);
    adapter.updateLayer(FIXTURE.pages[0].id, newImage.id, { src: 'https://example.com/b.png' });
    await flushPromises();
    const newObj = fabricObjFor(adapter, newImage.id);
    expect(newObj).toBeDefined();
    // Recreate path replaces the Fabric object with a fresh instance.
    expect(newObj).not.toBe(oldObj);
  });
});

describe('FabricAdapter — change event payload', () => {
  beforeEach(installFetchStub);

  it('change event delivers a deep clone with the latest mutation', async () => {
    const { adapter } = await makeMountedAdapter();
    const handler = vi.fn();
    const off = adapter.on('change', handler);

    adapter.updateLayer(FIXTURE.pages[0].id, FIXTURE.pages[0].layers[0].id, {
      transform: { x: 42, y: 0, width: 0, height: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    });

    expect(handler).toHaveBeenCalled();
    const lastDoc = handler.mock.lastCall![0] as BrandOSDocument;
    expect(lastDoc.pages[0].layers[0].transform.x).toBe(42);

    off();
    handler.mockClear();
    adapter.updateLayer(FIXTURE.pages[0].id, FIXTURE.pages[0].layers[0].id, {
      transform: { x: 99, y: 0, width: 0, height: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('FabricAdapter — exportAs', () => {
  beforeEach(installFetchStub);

  it('PNG export returns a non-empty Blob with the right MIME type and honors scale', async () => {
    const { adapter } = await makeMountedAdapter();
    const blob1x = await adapter.exportAs({ format: 'png', scale: 1 });
    const blob2x = await adapter.exportAs({ format: 'png', scale: 2 });
    expect(blob1x.type).toBe('image/png');
    expect(blob2x.type).toBe('image/png');
    expect(blob1x.size).toBeGreaterThan(0);
    // Mock encodes the multiplier as a length-varying payload, so 2× produces
    // a bigger blob than 1×. (Real Blob.text() isn't reliable in jsdom; size is.)
    expect(blob2x.size).toBeGreaterThan(blob1x.size);
  });

  it('SVG export returns a Blob with the correct MIME type', async () => {
    const { adapter } = await makeMountedAdapter();
    const blob = await adapter.exportAs({ format: 'svg' });
    expect(blob.type).toBe('image/svg+xml');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('FabricAdapter — multi-page CRUD (Phase 2)', () => {
  beforeEach(installFetchStub);

  function makeBlankPage(name = 'Slide 2') {
    return {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f9001',
      name,
      width: 1920,
      height: 1080,
      background: '#ffffff' as const,
      masterPageId: null,
      layers: [],
    };
  }

  it('addPage appends to pages and emits change', async () => {
    const { adapter } = await makeMountedAdapter();
    const onChange = vi.fn();
    adapter.on('change', onChange);
    adapter.addPage(makeBlankPage());
    const doc = adapter.getDocument();
    expect(doc.pages).toHaveLength(2);
    expect(doc.pages[1].name).toBe('Slide 2');
    expect(onChange).toHaveBeenCalled();
  });

  it('addPage with explicit index inserts at that index', async () => {
    const { adapter } = await makeMountedAdapter();
    adapter.addPage(makeBlankPage('Inserted'), 0);
    const doc = adapter.getDocument();
    expect(doc.pages[0].name).toBe('Inserted');
  });

  it('removePage drops the page; falls through to a different active page if active was removed', async () => {
    const { adapter } = await makeMountedAdapter();
    adapter.addPage(makeBlankPage('Slide 2'));
    adapter.addPage(makeBlankPage('Slide 3'));
    expect(adapter.getDocument().pages).toHaveLength(3);
    adapter.removePage(adapter.getActivePageId()); // remove the original active page
    await flushPromises();
    expect(adapter.getDocument().pages).toHaveLength(2);
    expect(adapter.getActivePageId()).toBeTruthy();
  });

  it('removePage refuses to remove the last remaining page', async () => {
    const { adapter } = await makeMountedAdapter();
    expect(() => adapter.removePage(adapter.getActivePageId())).toThrow(/last page/);
  });

  it('duplicatePage clones layers with fresh ids', async () => {
    const { adapter } = await makeMountedAdapter();
    const originalId = adapter.getActivePageId();
    const newId = adapter.duplicatePage(originalId);
    const doc = adapter.getDocument();
    expect(doc.pages).toHaveLength(2);
    const original = doc.pages.find((p) => p.id === originalId)!;
    const copy = doc.pages.find((p) => p.id === newId)!;
    expect(copy.layers.length).toBe(original.layers.length);
    // Every layer id in the copy must be DIFFERENT from the original.
    const originalIds = new Set(original.layers.map((l) => l.id));
    for (const l of copy.layers) {
      expect(originalIds.has(l.id)).toBe(false);
    }
  });

  it('reorderPage moves a page to the requested index', async () => {
    const { adapter } = await makeMountedAdapter();
    const p1 = adapter.getActivePageId();
    adapter.addPage(makeBlankPage('Slide 2'));
    const p2 = adapter.getDocument().pages[1].id;
    adapter.reorderPage(p1, 1); // move page 1 to last position
    expect(adapter.getDocument().pages.map((p) => p.id)).toEqual([p2, p1]);
  });

  it('updatePageDimensions writes to the mirror and resizes the active canvas', async () => {
    const { adapter } = await makeMountedAdapter();
    const pageId = adapter.getActivePageId();
    adapter.updatePageDimensions(pageId, 800, 600);
    const page = adapter.getDocument().pages[0];
    expect(page.width).toBe(800);
    expect(page.height).toBe(600);
  });

  it('setActivePage triggers a re-render and emits change', async () => {
    const { adapter } = await makeMountedAdapter();
    adapter.addPage(makeBlankPage('Second'));
    const newPageId = adapter.getDocument().pages[1].id;
    const onChange = vi.fn();
    adapter.on('change', onChange);
    adapter.setActivePage(newPageId);
    await flushPromises();
    expect(adapter.getActivePageId()).toBe(newPageId);
    expect(onChange).toHaveBeenCalled();
  });
});

describe('FabricAdapter — master pages (Phase 2)', () => {
  beforeEach(installFetchStub);

  function makeMaster(): Page {
    return {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1fA001',
      name: 'Default master',
      width: 1080,
      height: 1080,
      background: '#000000',
      masterPageId: null,
      layers: [
        {
          id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1fA002',
          kind: 'shape',
          name: 'master-rect',
          transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1,
          visible: true,
          locked: false,
          brandLocked: false,
          shape: 'rectangle',
          fill: '#ff0000',
          stroke: null,
          strokeWidth: 0,
          cornerRadius: 0,
        },
      ],
    } as Page;
  }

  type Page = typeof FIXTURE.pages[0];

  it('addMasterPage / removeMasterPage round-trip via the mirror', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    expect(adapter.getDocument().masterPages).toHaveLength(1);
    adapter.removeMasterPage(master.id);
    expect(adapter.getDocument().masterPages).toHaveLength(0);
  });

  it('applyMasterToPage records the masterPageId on the page', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    const pageId = adapter.getActivePageId();
    adapter.applyMasterToPage(pageId, master.id);
    expect(adapter.getDocument().pages[0].masterPageId).toBe(master.id);
    adapter.applyMasterToPage(pageId, null);
    expect(adapter.getDocument().pages[0].masterPageId).toBe(null);
  });

  it('removeMasterPage detaches every page that referenced it', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    adapter.applyMasterToPage(adapter.getActivePageId(), master.id);
    adapter.removeMasterPage(master.id);
    expect(adapter.getDocument().pages[0].masterPageId).toBe(null);
  });

  it('master layers render as part of the canvas when a page references them', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    adapter.applyMasterToPage(adapter.getActivePageId(), master.id);
    await flushPromises();
    const objects = (adapter as unknown as {
      canvas: { getObjects(): Array<{ width?: number; height?: number; selectable?: boolean }> };
    }).canvas.getObjects();
    // Original fixture had 3 page-layer objects; with the master overlay
    // we should have at least one MORE (the master's red rect).
    expect(objects.length).toBeGreaterThanOrEqual(4);
    // The master overlay objects must not be selectable from the page view.
    const masterOverlay = objects.find(
      (o) => o.width === 100 && o.height === 100,
    );
    expect(masterOverlay).toBeDefined();
    expect(masterOverlay!.selectable).toBe(false);
  });

  it('enterMasterMode + exitMasterMode flip the editing state and re-render', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    expect(adapter.getEditingMasterId()).toBe(null);
    adapter.enterMasterMode(master.id);
    expect(adapter.getEditingMasterId()).toBe(master.id);
    adapter.exitMasterMode();
    expect(adapter.getEditingMasterId()).toBe(null);
  });

  it('layer mutations during master mode go to the master, not the active page', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    adapter.enterMasterMode(master.id);
    await flushPromises();

    // Mutate a layer inside the master — pageId is the masterId here.
    adapter.updateLayer(master.id, master.layers[0].id, { fill: '#0000ff' });
    expect(adapter.getDocument().masterPages[0].layers[0]).toMatchObject({
      fill: '#0000ff',
    });
    // The original page's layers are untouched.
    expect(adapter.getDocument().pages[0].layers[0]).not.toMatchObject({
      fill: '#0000ff',
    });
  });

  it('master edits propagate visually: after editing master, switching to a page using it shows the new master state', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    adapter.applyMasterToPage(adapter.getActivePageId(), master.id);
    adapter.enterMasterMode(master.id);
    await flushPromises();

    adapter.updateLayer(master.id, master.layers[0].id, { fill: '#00ff00' });
    adapter.exitMasterMode();
    await flushPromises();

    // Find the master-overlay object on the canvas and verify its fill
    // reflects the post-edit value.
    const objects = (adapter as unknown as {
      canvas: { getObjects(): Array<{ width?: number; height?: number; fill?: unknown }> };
    }).canvas.getObjects();
    const masterOverlay = objects.find((o) => o.width === 100 && o.height === 100);
    expect(masterOverlay).toBeDefined();
    expect(masterOverlay!.fill).toBe('#00ff00');
  });

  it('setActivePage exits master mode if it was active', async () => {
    const { adapter } = await makeMountedAdapter();
    const master = makeMaster();
    adapter.addMasterPage(master);
    adapter.enterMasterMode(master.id);
    expect(adapter.getEditingMasterId()).toBe(master.id);
    adapter.setActivePage(adapter.getActivePageId());
    expect(adapter.getEditingMasterId()).toBe(null);
  });
});

describe('FabricAdapter — batch (Phase 3 step 3)', () => {
  beforeEach(installFetchStub);

  it('multiple mutations inside batch produce ONE history entry', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    const pageId = FIXTURE.pages[0].id;
    const historyBefore = (adapter as unknown as { history: { getStateForTesting(): { past: number[] } } })
      .history.getStateForTesting().past.length;

    adapter.batch('test-bulk', () => {
      adapter.updateLayer(pageId, layerId, { fontSize: 50 });
      adapter.updateLayer(pageId, layerId, { fontSize: 60 });
      adapter.updateLayer(pageId, layerId, { fontSize: 70 });
    });

    const historyAfter = (adapter as unknown as { history: { getStateForTesting(): { past: number[]; labels: (string | undefined)[] } } })
      .history.getStateForTesting();
    expect(historyAfter.past.length - historyBefore).toBe(1);
    expect(historyAfter.labels[historyAfter.labels.length - 1]).toBe('test-bulk');
  });

  it('batch fires ONE change event regardless of how many mutations inside', async () => {
    const { adapter } = await makeMountedAdapter();
    const onChange = vi.fn();
    adapter.on('change', onChange);
    const layerId = FIXTURE.pages[0].layers[0].id;
    const pageId = FIXTURE.pages[0].id;

    adapter.batch('three-edits', () => {
      adapter.updateLayer(pageId, layerId, { fontSize: 11 });
      adapter.updateLayer(pageId, layerId, { fontSize: 22 });
      adapter.updateLayer(pageId, layerId, { fontSize: 33 });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    // The single emitted document carries the LAST mutation.
    const lastDoc = onChange.mock.lastCall![0] as BrandOSDocument;
    expect((lastDoc.pages[0].layers[0] as { fontSize: number }).fontSize).toBe(33);
  });

  it('undo after batch reverts ALL mutations as one step', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    const pageId = FIXTURE.pages[0].id;
    const before = (adapter.getDocument().pages[0].layers[0] as { fontSize: number }).fontSize;

    adapter.batch('triple', () => {
      adapter.updateLayer(pageId, layerId, { fontSize: 50 });
      adapter.updateLayer(pageId, layerId, { fontSize: 60 });
      adapter.updateLayer(pageId, layerId, { fontSize: 70 });
    });
    expect((adapter.getDocument().pages[0].layers[0] as { fontSize: number }).fontSize).toBe(70);

    adapter.undo();
    await flushPromises();
    expect((adapter.getDocument().pages[0].layers[0] as { fontSize: number }).fontSize).toBe(before);
  });

  it('mutations OUTSIDE batch still produce per-mutation history entries', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    const pageId = FIXTURE.pages[0].id;
    const histBefore = (adapter as unknown as { history: { getStateForTesting(): { past: number[] } } })
      .history.getStateForTesting().past.length;

    adapter.updateLayer(pageId, layerId, { fontSize: 50 });
    adapter.updateLayer(pageId, layerId, { fontSize: 60 });

    const histAfter = (adapter as unknown as { history: { getStateForTesting(): { past: number[] } } })
      .history.getStateForTesting().past.length;
    expect(histAfter - histBefore).toBe(2);
  });

  it('nested batches collapse into the outer batch — single commit', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    const pageId = FIXTURE.pages[0].id;
    const onChange = vi.fn();
    adapter.on('change', onChange);

    adapter.batch('outer', () => {
      adapter.updateLayer(pageId, layerId, { fontSize: 10 });
      adapter.batch('inner', () => {
        adapter.updateLayer(pageId, layerId, { fontSize: 20 });
        adapter.updateLayer(pageId, layerId, { fontSize: 30 });
      });
      adapter.updateLayer(pageId, layerId, { fontSize: 40 });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const labels = (adapter as unknown as { history: { getStateForTesting(): { labels: (string | undefined)[] } } })
      .history.getStateForTesting().labels;
    // Outer label wins.
    expect(labels[labels.length - 1]).toBe('outer');
  });

  it('errors inside batch propagate AND clean up batch state', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    const pageId = FIXTURE.pages[0].id;

    expect(() =>
      adapter.batch('boom', () => {
        adapter.updateLayer(pageId, layerId, { fontSize: 99 });
        throw new Error('boom');
      }),
    ).toThrow('boom');

    // Mutations after a thrown batch behave normally — batch depth was reset.
    const onChange = vi.fn();
    adapter.on('change', onChange);
    adapter.updateLayer(pageId, layerId, { fontSize: 88 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('FabricAdapter — _lockedBindings recording (Phase 3 step 4c.2)', () => {
  beforeEach(installFetchStub);

  function getLayer(adapter: FabricAdapter, pageId: string, layerId: string): Layer {
    const layer = adapter
      .getDocument()
      .pages.find((p) => p.id === pageId)
      ?.layers.find((l) => l.id === layerId);
    if (!layer) throw new Error(`Layer ${layerId} not found in page ${pageId}`);
    return layer;
  }

  /** Replace the fixture's first layer with a brandLocked text layer carrying SlotRef-bound props. */
  async function makeAdapterWithLockedText(brandLocked: boolean): Promise<{
    adapter: FabricAdapter;
    pageId: string;
    layerId: string;
  }> {
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages[0].layers = [
      {
        id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f4c01',
        name: 'locked-headline',
        kind: 'text',
        transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked,
        text: 'hi',
        fontFamily: { type: 'brand.font.heading' },
        fontSize: 24,
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: { type: 'brand.color.primary' },
      },
    ];
    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();
    return {
      adapter,
      pageId: baseDoc.pages[0].id,
      layerId: baseDoc.pages[0].layers[0].id,
    };
  }

  it('updateLayer records the original SlotRef when overriding a brand-locked property with a literal', async () => {
    const { adapter, pageId, layerId } = await makeAdapterWithLockedText(true);
    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
    expect(layer._lockedBindings?.color).toEqual({ type: 'brand.color.primary' });
  });

  it('records multiple property paths in a single patch', async () => {
    const { adapter, pageId, layerId } = await makeAdapterWithLockedText(true);
    adapter.updateLayer(pageId, layerId, {
      color: '#ff00ff',
      fontFamily: 'Impact, sans-serif',
    });
    const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
    expect(layer._lockedBindings).toEqual({
      color: { type: 'brand.color.primary' },
      fontFamily: { type: 'brand.font.heading' },
    });
  });

  it('does NOT record bindings on unlocked layers (overrides on unlocked layers are user authority, not drift)', async () => {
    const { adapter, pageId, layerId } = await makeAdapterWithLockedText(false);
    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
    expect(layer._lockedBindings).toBeUndefined();
  });

  it('does NOT record when the previous value was a literal (nothing to recover)', async () => {
    const { adapter, pageId, layerId } = await makeAdapterWithLockedText(true);
    // First override: SlotRef → literal. Records.
    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    // Second override: literal → another literal. Should NOT replace
    // the existing recording with anything (current value is already a literal).
    adapter.updateLayer(pageId, layerId, { color: '#00ff00' });
    const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
    // The original SlotRef recorded on the first override is preserved.
    expect(layer._lockedBindings?.color).toEqual({ type: 'brand.color.primary' });
  });

  it('preserves existing bindings when recording a new property', async () => {
    const { adapter, pageId, layerId } = await makeAdapterWithLockedText(true);
    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    adapter.updateLayer(pageId, layerId, { fontFamily: 'Impact' });
    const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
    expect(layer._lockedBindings).toEqual({
      color: { type: 'brand.color.primary' },
      fontFamily: { type: 'brand.font.heading' },
    });
  });

  it('records SvgLayer fillOverrides with the dotted property path', async () => {
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages[0].layers = [
      {
        id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f4c10',
        name: 'svg',
        kind: 'svg',
        transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: true,
        src: 'https://example.com/i.svg',
        fillOverrides: {
          '#path-1': { type: 'brand.color.primary' },
          '#path-2': { type: 'brand.color.accent' },
        },
      },
    ];
    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();
    const pageId = baseDoc.pages[0].id;
    const layerId = baseDoc.pages[0].layers[0].id;

    // Override only #path-1 — leave #path-2 intact.
    adapter.updateLayer(pageId, layerId, {
      fillOverrides: {
        '#path-1': '#abcdef',
        '#path-2': { type: 'brand.color.accent' },
      },
    });
    const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
    expect(layer._lockedBindings).toEqual({
      'fillOverrides.#path-1': { type: 'brand.color.primary' },
    });
  });

  it('applyLayerPatchAcrossPages also records bindings on brandLocked layers', async () => {
    // Two brandLocked text layers across two pages, both overridden.
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    const makeLockedText = (id: string) => ({
      id,
      name: id,
      kind: 'text' as const,
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: true,
      text: '',
      fontFamily: 'Helvetica',
      fontSize: 24,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'left' as const,
      direction: 'auto' as const,
      color: { type: 'brand.color.primary' as const },
    });
    baseDoc.pages = [
      { id: 'p1', name: 'p1', width: 1080, height: 1080, background: '#ffffff', masterPageId: null, layers: [makeLockedText('l-p1')] },
      { id: 'p2', name: 'p2', width: 1080, height: 1080, background: '#ffffff', masterPageId: null, layers: [makeLockedText('l-p2')] },
    ];
    baseDoc.masterPages = [];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    adapter.applyLayerPatchAcrossPages(
      (l) => l.kind === 'text',
      { color: '#deadbe' },
      'bulk-override',
    );

    for (const pageId of ['p1', 'p2']) {
      const layerId = pageId === 'p1' ? 'l-p1' : 'l-p2';
      const layer = getLayer(adapter, pageId, layerId) as { _lockedBindings?: Record<string, unknown> };
      expect(layer._lockedBindings?.color).toEqual({ type: 'brand.color.primary' });
    }
  });

  it('applyLayerPatchAcrossPages does NOT record on UNLOCKED layers', async () => {
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages = [
      {
        id: 'p1',
        name: 'p1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers: [
          {
            id: 'l',
            name: 'l',
            kind: 'text',
            transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1,
            visible: true,
            locked: false,
            brandLocked: false, // UNLOCKED
            text: '',
            fontFamily: 'Helvetica',
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            direction: 'auto',
            color: { type: 'brand.color.primary' },
          },
        ],
      },
    ];
    baseDoc.masterPages = [];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    adapter.applyLayerPatchAcrossPages(
      (l) => l.kind === 'text',
      { color: '#abcdef' },
      'bulk-unlocked',
    );

    const layer = getLayer(adapter, 'p1', 'l') as { _lockedBindings?: Record<string, unknown> };
    expect(layer._lockedBindings).toBeUndefined();
  });
});

describe('FabricAdapter — full round-trip with locked-bindings recovery (Phase 3 step 4c.3)', () => {
  beforeEach(installFetchStub);

  function getLayer(adapter: FabricAdapter, pageId: string, layerId: string): Layer {
    const layer = adapter
      .getDocument()
      .pages.find((p) => p.id === pageId)
      ?.layers.find((l) => l.id === layerId);
    if (!layer) throw new Error(`Layer ${layerId} not found in page ${pageId}`);
    return layer;
  }

  it('end-to-end: override locked color → adapter.loadDocument(applyBrandToDocument(doc, kit)) → original color restored', async () => {
    const { applyBrandToDocument } = await import('@/features/editor/brand/applyBrandToDocument');

    const kit = {
      id: 'k1',
      name: 'k',
      colors: {
        primary: { hex: '#3366ff' },
        neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
      },
      typography: { heading: { family: 'Inter' }, body: { family: 'Georgia' } },
      logos: { mono: {} },
      spacing: { unit: 8, cornerRadius: 4 },
      _diagnostics: { warnings: [] },
    };

    // Document starts with a brandLocked text layer carrying a SlotRef color.
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages[0].layers = [
      {
        id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f4d01',
        name: 'locked-headline',
        kind: 'text',
        transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: true,
        text: 'hi',
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: { type: 'brand.color.primary' },
      },
    ];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    const pageId = baseDoc.pages[0].id;
    const layerId = baseDoc.pages[0].layers[0].id;

    // Step 1 — User (or AI) overrides the brand-locked color with a literal.
    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    expect((getLayer(adapter, pageId, layerId) as { color: unknown }).color).toBe('#ff00ff');
    // _lockedBindings was recorded by 4c.2.
    expect((getLayer(adapter, pageId, layerId) as { _lockedBindings?: unknown })._lockedBindings)
      .toEqual({ color: { type: 'brand.color.primary' } });

    // Step 2 — Re-apply brand. 4c.3 recovers the SlotRef from
    // _lockedBindings, then resolves it back to the brand primary.
    const repaired = applyBrandToDocument(adapter.getDocument(), kit);
    await adapter.loadDocument(repaired);
    await flushPromises();

    // Color is back to the brand primary; _lockedBindings is cleared.
    const after = getLayer(adapter, pageId, layerId) as { color: unknown; _lockedBindings?: unknown };
    expect(after.color).toBe('#3366ff');
    expect(after._lockedBindings).toBeUndefined();

    // And the Fabric Textbox on the canvas reflects it.
    const fabricByLayerId = (adapter as unknown as {
      fabricByLayerId: Map<string, Record<string, unknown>>;
    }).fabricByLayerId;
    expect(fabricByLayerId.get(layerId)!.fill).toBe('#3366ff');
  });

  it('end-to-end: unlocking the layer + override + re-apply leaves the override intact', async () => {
    const { applyBrandToDocument } = await import('@/features/editor/brand/applyBrandToDocument');

    const kit = {
      id: 'k1',
      name: 'k',
      colors: {
        primary: { hex: '#3366ff' },
        neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
      },
      typography: { heading: { family: 'Inter' }, body: { family: 'Georgia' } },
      logos: { mono: {} },
      spacing: { unit: 8, cornerRadius: 4 },
      _diagnostics: { warnings: [] },
    };

    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages[0].layers = [
      {
        id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f4d02',
        name: 'unlockable-headline',
        kind: 'text',
        transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: true,
        text: 'hi',
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: { type: 'brand.color.primary' },
      },
    ];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    const pageId = baseDoc.pages[0].id;
    const layerId = baseDoc.pages[0].layers[0].id;

    // Override (records into _lockedBindings since brandLocked=true)
    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    // Now unlock the layer.
    adapter.updateLayer(pageId, layerId, { brandLocked: false });

    // Re-apply brand. The layer is now unlocked; recovery is skipped.
    const repaired = applyBrandToDocument(adapter.getDocument(), kit);
    await adapter.loadDocument(repaired);
    await flushPromises();

    // The literal override persists.
    expect((getLayer(adapter, pageId, layerId) as { color: unknown }).color).toBe('#ff00ff');
  });

  it('respectLocks: false bypasses recovery (template-authoring escape hatch)', async () => {
    const { applyBrandToDocument } = await import('@/features/editor/brand/applyBrandToDocument');

    const kit = {
      id: 'k1',
      name: 'k',
      colors: {
        primary: { hex: '#3366ff' },
        neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
      },
      typography: { heading: { family: 'Inter' }, body: { family: 'Georgia' } },
      logos: { mono: {} },
      spacing: { unit: 8, cornerRadius: 4 },
      _diagnostics: { warnings: [] },
    };

    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages[0].layers = [
      {
        id: '0d9b9b1c-2bbf-4c9a-9a0e-4f0b8b1f4d03',
        name: 'l',
        kind: 'text',
        transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: true,
        text: 'hi',
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: { type: 'brand.color.primary' },
      },
    ];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    const pageId = baseDoc.pages[0].id;
    const layerId = baseDoc.pages[0].layers[0].id;

    adapter.updateLayer(pageId, layerId, { color: '#ff00ff' });
    const repaired = applyBrandToDocument(adapter.getDocument(), kit, { respectLocks: false });
    await adapter.loadDocument(repaired);
    await flushPromises();

    // Override persists even though the layer is brandLocked, because
    // respectLocks: false explicitly disabled recovery.
    expect((getLayer(adapter, pageId, layerId) as { color: unknown }).color).toBe('#ff00ff');
    // _lockedBindings stays untouched (no recovery happened).
    expect((getLayer(adapter, pageId, layerId) as { _lockedBindings?: unknown })._lockedBindings)
      .toEqual({ color: { type: 'brand.color.primary' } });
  });
});

describe('FabricAdapter — applyLayerPatchAcrossPages (Phase 3 step 4b)', () => {
  beforeEach(installFetchStub);

  function makeText(id: string, color: unknown) {
    return {
      id,
      name: id,
      kind: 'text' as const,
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      text: '',
      fontFamily: 'Helvetica',
      fontSize: 24,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'left' as const,
      direction: 'auto' as const,
      color,
    };
  }

  /** Build a fixture-shaped doc with N pages each carrying a brand-color text layer. */
  async function makeMultiPageDoc(pageCount: number) {
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    const pages = Array.from({ length: pageCount }, (_, i) => ({
      id: `page-${i}`,
      name: `Slide ${i + 1}`,
      width: 1080,
      height: 1080,
      background: '#ffffff' as const,
      masterPageId: null,
      layers: [makeText(`text-p${i}`, { type: 'brand.color.primary' as const })],
    }));
    baseDoc.pages = pages;
    baseDoc.masterPages = [];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();
    return adapter;
  }

  it('mutation across multiple pages produces exactly ONE change event', async () => {
    const adapter = await makeMultiPageDoc(3);
    const onChange = vi.fn();
    adapter.on('change', onChange);

    const result = adapter.applyLayerPatchAcrossPages(
      (l) => l.kind === 'text' && (l as { color: unknown }).color != null
        && typeof (l as { color: unknown }).color === 'object',
      { color: '#ff00ff' },
      'reapply-brand',
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(result.mutatedLayerIds).toHaveLength(3);
    expect(result.affectedPageIds.sort()).toEqual(['page-0', 'page-1', 'page-2']);

    // The single change event payload reflects all three mutations.
    const lastDoc = onChange.mock.lastCall![0] as BrandOSDocument;
    for (const page of lastDoc.pages) {
      expect((page.layers[0] as { color: unknown }).color).toBe('#ff00ff');
    }
  });

  it('single undo entry restores ALL changes', async () => {
    const adapter = await makeMultiPageDoc(3);
    const before = adapter.getDocument();
    adapter.applyLayerPatchAcrossPages(
      () => true,
      { color: '#aabbcc' },
      'bulk',
    );
    expect(adapter.getDocument()).not.toEqual(before);
    adapter.undo();
    await flushPromises();
    expect(adapter.getDocument()).toEqual(before);
  });

  it('predicate matching no layers is a no-op (no change event, no history entry)', async () => {
    const adapter = await makeMultiPageDoc(3);
    const onChange = vi.fn();
    adapter.on('change', onChange);
    const histBefore = (adapter as unknown as {
      history: { getStateForTesting(): { past: unknown[] } };
    }).history.getStateForTesting().past.length;

    const result = adapter.applyLayerPatchAcrossPages(
      () => false,
      { color: '#000000' },
      'should-not-fire',
    );

    expect(result.mutatedLayerIds).toEqual([]);
    expect(result.affectedPageIds).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
    const histAfter = (adapter as unknown as {
      history: { getStateForTesting(): { past: unknown[] } };
    }).history.getStateForTesting().past.length;
    expect(histAfter).toBe(histBefore);
  });

  it('predicate matching layers on a single page still uses batch (one event, one history entry)', async () => {
    // Build a doc with multiple text layers on the SAME page; apply a
    // patch to all of them. Must still be a single batch.
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages = [{
      id: 'p1',
      name: 'p',
      width: 1080,
      height: 1080,
      background: '#ffffff',
      masterPageId: null,
      layers: [
        makeText('a', { type: 'brand.color.primary' as const }),
        makeText('b', { type: 'brand.color.primary' as const }),
        makeText('c', { type: 'brand.color.primary' as const }),
      ],
    }];
    baseDoc.masterPages = [];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    const onChange = vi.fn();
    adapter.on('change', onChange);
    const histBefore = (adapter as unknown as {
      history: { getStateForTesting(): { past: unknown[] } };
    }).history.getStateForTesting().past.length;

    const result = adapter.applyLayerPatchAcrossPages(
      (l) => l.kind === 'text',
      { color: '#abcdef' },
      'single-page-bulk',
    );

    expect(result.mutatedLayerIds).toHaveLength(3);
    expect(result.affectedPageIds).toEqual(['p1']);
    expect(onChange).toHaveBeenCalledTimes(1);
    const histAfter = (adapter as unknown as {
      history: { getStateForTesting(): { past: unknown[]; labels: (string | undefined)[] } };
    }).history.getStateForTesting();
    expect(histAfter.past.length - histBefore).toBe(1);
    expect(histAfter.labels[histAfter.labels.length - 1]).toBe('single-page-bulk');
  });

  it('master-page exclusion holds at the adapter layer (predicate not even called for master layers)', async () => {
    // 2 master-page layers + 5 regular-page layers.
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages = Array.from({ length: 5 }, (_, i) => ({
      id: `page-${i}`,
      name: `p${i}`,
      width: 1080,
      height: 1080,
      background: '#ffffff' as const,
      masterPageId: null,
      layers: [makeText(`reg-${i}`, '#ffffff')],
    }));
    baseDoc.masterPages = [
      {
        id: 'master-1',
        name: 'master 1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers: [
          makeText('master-l1', '#ffffff'),
          makeText('master-l2', '#ffffff'),
        ],
      },
    ];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    // Predicate returns true for everything AND records every layer
    // it sees, so we can assert it was NEVER asked about master layers.
    const seenLayerIds: string[] = [];
    const result = adapter.applyLayerPatchAcrossPages(
      (l) => {
        seenLayerIds.push(l.id);
        return true;
      },
      { color: '#deadbe' },
      'master-exclusion',
    );

    expect(seenLayerIds).toHaveLength(5);
    expect(seenLayerIds.sort()).toEqual(['reg-0', 'reg-1', 'reg-2', 'reg-3', 'reg-4']);
    expect(result.mutatedLayerIds).toHaveLength(5);
    // Master pages stayed untouched.
    const after = adapter.getDocument();
    for (const m of after.masterPages) {
      for (const l of m.layers) {
        expect((l as { color: unknown }).color).toBe('#ffffff');
      }
    }
  });

  it('returns mutatedLayerIds and affectedPageIds correctly for AI/UI consumption', async () => {
    const adapter = await makeMultiPageDoc(4);
    // Predicate matches only pages 0 and 2.
    const result = adapter.applyLayerPatchAcrossPages(
      (_l, pageId) => pageId === 'page-0' || pageId === 'page-2',
      { color: '#444444' },
      'targeted',
    );
    expect(result.mutatedLayerIds.sort()).toEqual(['text-p0', 'text-p2']);
    expect(result.affectedPageIds.sort()).toEqual(['page-0', 'page-2']);
  });

  it('group children ARE mutated (predicate sees them via recursion)', async () => {
    const baseDoc = JSON.parse(JSON.stringify(FIXTURE)) as BrandOSDocument;
    baseDoc.pages = [{
      id: 'p1',
      name: 'p',
      width: 1080,
      height: 1080,
      background: '#ffffff',
      masterPageId: null,
      layers: [
        {
          id: 'g',
          name: 'g',
          kind: 'group',
          transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1,
          visible: true,
          locked: false,
          brandLocked: false,
          children: [
            makeText('inner-1', '#ffffff'),
            makeText('inner-2', '#ffffff'),
          ],
        },
      ],
    }];
    baseDoc.masterPages = [];

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(baseDoc);
    await flushPromises();

    const result = adapter.applyLayerPatchAcrossPages(
      (l) => l.kind === 'text',
      { color: '#abcdef' },
      'group-recurse',
    );
    expect(result.mutatedLayerIds.sort()).toEqual(['inner-1', 'inner-2']);
    const doc = adapter.getDocument();
    const group = doc.pages[0].layers[0] as { children: Array<{ color: unknown }> };
    expect(group.children[0].color).toBe('#abcdef');
    expect(group.children[1].color).toBe('#abcdef');
  });
});

describe('FabricAdapter — brand engine integration (Phase 3 step 2)', () => {
  beforeEach(installFetchStub);

  it('loadDocument(applyBrandToDocument(template, brandKit)) → Fabric object reads the resolved literal', async () => {
    // Dynamically import so the Phase 3 module is treated as a peer
    // of the adapter, not a hard import dependency on the test file.
    const { applyBrandToDocument } = await import('@/features/editor/brand/applyBrandToDocument');

    const kit = {
      id: 'k1',
      name: 'k',
      colors: {
        primary: { hex: '#aa00ff' },
        neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
      },
      typography: {
        heading: { family: 'Inter, sans-serif' },
        body: { family: 'Georgia, serif' },
      },
      logos: { mono: {} },
      spacing: { unit: 8, cornerRadius: 4 },
      _diagnostics: { warnings: [] },
    };

    // Build a template-style document with a TextLayer carrying a SlotRef.
    const templateDoc = {
      ...FIXTURE,
      pages: [
        {
          ...FIXTURE.pages[0],
          layers: [
            {
              ...FIXTURE.pages[0].layers[0],
              fontFamily: { type: 'brand.font.heading' as const },
              color: { type: 'brand.color.primary' as const },
            },
          ],
        },
      ],
    };

    const resolved = applyBrandToDocument(templateDoc, kit);
    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    await adapter.mount(container);
    await adapter.loadDocument(resolved);
    await flushPromises();

    const layerId = templateDoc.pages[0].layers[0].id;
    const fabricByLayerId = (adapter as unknown as {
      fabricByLayerId: Map<string, Record<string, unknown>>;
    }).fabricByLayerId;
    const obj = fabricByLayerId.get(layerId)!;
    expect(obj.fill).toBe('#aa00ff');
    expect(obj.fontFamily).toBe('Inter, sans-serif');
  });

  it("preview mode renders with the placeholder color (SlotRef stays); annotation lives in metadata", async () => {
    const { applyBrandToDocument } = await import('@/features/editor/brand/applyBrandToDocument');
    const kit = {
      id: 'k1',
      name: 'k',
      colors: {
        primary: { hex: '#00ff00' },
        neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
      },
      typography: {
        heading: { family: 'Inter, sans-serif' },
        body: { family: 'Georgia, serif' },
      },
      logos: { mono: {} },
      spacing: { unit: 8, cornerRadius: 4 },
      _diagnostics: { warnings: [] },
    };
    const previewed = applyBrandToDocument(
      {
        ...FIXTURE,
        pages: [
          {
            ...FIXTURE.pages[0],
            layers: [
              {
                ...FIXTURE.pages[0].layers[0],
                color: { type: 'brand.color.primary' as const },
              },
            ],
          },
        ],
      },
      kit,
      { mode: 'preview' },
    );

    // SlotRef stays on the layer.
    expect((previewed.pages[0].layers[0] as { color: unknown }).color).toEqual({
      type: 'brand.color.primary',
    });
    // Resolution annotation is stashed in the typed `brandResolution`
    // field (lifted from `metadata._brandResolution` in Phase 3 step 3).
    const annotation = previewed.brandResolution as {
      brandKitId: string;
      layers: Record<string, Record<string, string>>;
    };
    expect(annotation.brandKitId).toBe('k1');
    const layerId = FIXTURE.pages[0].layers[0].id;
    expect(annotation.layers[layerId].color).toBe('#00ff00');
  });
});

describe('FabricAdapter — selection sync', () => {
  beforeEach(installFetchStub);

  it('setSelection followed by getSelection round-trips a single layer id', async () => {
    const { adapter } = await makeMountedAdapter();
    const layerId = FIXTURE.pages[0].layers[0].id;
    adapter.setSelection([layerId]);
    expect(adapter.getSelection().layerIds).toEqual([layerId]);
  });

  it('setSelection([]) clears the selection', async () => {
    const { adapter } = await makeMountedAdapter();
    adapter.setSelection([FIXTURE.pages[0].layers[0].id]);
    adapter.setSelection([]);
    expect(adapter.getSelection().layerIds).toEqual([]);
  });
});

describe('FabricAdapter — teardown must not reject', () => {
  it('handles an async dispose that rejects, instead of leaving it unhandled', async () => {
    // Reproduces the CI-only failure: Fabric v6's dispose() is async and
    // internally clears the canvas, so a host that has already removed the
    // element makes it throw. Unhandled, that rejection can fail an unrelated
    // test file — which is exactly how it surfaced.
    const rejections: unknown[] = [];
    const onRejection = (e: PromiseRejectionEvent) => {
      rejections.push(e.reason);
      e.preventDefault();
    };
    globalThis.addEventListener?.('unhandledrejection', onRejection);

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    adapter.mount(container);

    // Force the failure mode: dispose rejects the way a torn-down canvas does.
    const canvas = (adapter as unknown as { canvas: { dispose: () => Promise<void> } }).canvas;
    if (canvas) {
      canvas.dispose = () =>
        Promise.reject(new TypeError("Cannot read properties of undefined (reading 'clearRect')"));
    }

    expect(() => adapter.unmount()).not.toThrow();

    // Let any rejection propagate before asserting.
    await new Promise((r) => setTimeout(r, 20));
    expect(rejections).toEqual([]);

    globalThis.removeEventListener?.('unhandledrejection', onRejection);
    container.remove();
  });

  it('cancels an in-flight render so it cannot draw into a disposed canvas', async () => {
    // The other half of the teardown race: `renderActivePage` holds a canvas
    // reference across an await (image loading), then clears it. Unmounting
    // during that window disposed the canvas under a live render, and the
    // clear reached for a context that was gone — surfacing as an unhandled
    // rejection that can fail an unrelated test file.
    const rejections: unknown[] = [];
    const onRejection = (e: PromiseRejectionEvent) => {
      rejections.push(e.reason);
      e.preventDefault();
    };
    globalThis.addEventListener?.('unhandledrejection', onRejection);

    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    adapter.mount(container);

    const load = adapter.loadDocument(FIXTURE);
    // Unmount while the load is still in flight.
    adapter.unmount();
    await load.catch(() => undefined);

    await new Promise((r) => setTimeout(r, 20));
    expect(rejections).toEqual([]);

    globalThis.removeEventListener?.('unhandledrejection', onRejection);
    container.remove();
  });

  it('clears adapter state synchronously even though disposal is async', () => {
    const adapter = new FabricAdapter();
    const container = document.createElement('div');
    document.body.appendChild(container);
    adapter.mount(container);

    adapter.unmount();

    // Immediately unusable — callers must not be able to touch a disposed canvas.
    expect((adapter as unknown as { canvas: unknown }).canvas).toBeNull();
    container.remove();
  });
});
