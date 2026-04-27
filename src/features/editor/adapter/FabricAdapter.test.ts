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
