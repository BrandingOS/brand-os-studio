// Step 5b — adapter integration tests for the Re-apply brand action.
//
// Verifies the contract that the Editor's `handleReapplyBrand` relies on:
//   • applyBrandToDocument is called with respectLocks=true
//   • The result flows into adapter.loadDocument inside adapter.batch(...)
//   • Exactly ONE 'change' event is emitted across the whole operation
//   • The history entry is labeled "Re-apply brand kit"
//   • undo restores the pre-re-apply document in one step
//
// The Fabric runtime is stubbed inline (vi.mock factories can't reach
// outer scope, so the same mock shape used by FabricAdapter.test.ts
// is duplicated here).

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

// Dynamically import AFTER the mock is in place.
import { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import { applyBrandToDocument } from '@/features/editor/brand/applyBrandToDocument';
import { brandToBrandKit } from '@/features/editor/brand/brandToBrandKit';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import { raqmBrand } from '@/data/brands/raqm';

function loadFixture(): BrandOSDocument {
  return BrandOSDocumentSchema.parse(socialPostFixture);
}

async function bootAdapter(doc: BrandOSDocument) {
  const adapter = new FabricAdapter();
  const container = document.createElement('div');
  document.body.appendChild(container);
  await adapter.mount(container);
  await adapter.loadDocument(doc);
  return { adapter, container };
}

describe('Step 5b — Re-apply brand kit (adapter integration)', () => {
  it('applyBrandToDocument runs once with respectLocks: true and the result loads via the adapter', async () => {
    const { adapter } = await bootAdapter(loadFixture());
    const before = adapter.getDocument();

    const kit = brandToBrandKit(raqmBrand);
    const next = applyBrandToDocument(before, kit, { respectLocks: true });

    // Same code path the Editor uses — wrap loadDocument in batch so
    // the entire op is one undo step + one change event.
    let changeEvents = 0;
    const off = adapter.on('change', () => {
      changeEvents++;
    });

    adapter.batch('Re-apply brand kit', () => {
      void adapter.replaceDocument(next);
    });

    expect(changeEvents, 'expected exactly one change event').toBe(1);
    off();

    // Result has slot refs resolved — first text layer's color started
    // as a SlotRef in the fixture and is now a literal string.
    const resolved = adapter.getDocument();
    const resolvedHeadline = resolved.pages[0].layers.find(
      (l) => l.id === before.pages[0].layers[0].id,
    );
    expect(resolvedHeadline).toBeDefined();
    expect(typeof (resolvedHeadline as { color: unknown }).color).toBe('string');
  });

  it('respectLocks=true is the contract the Editor uses (default + explicit match)', () => {
    const doc = loadFixture();
    const kit = brandToBrandKit(raqmBrand);
    const explicit = applyBrandToDocument(doc, kit, { respectLocks: true });
    const defaulted = applyBrandToDocument(doc, kit);
    expect(stripTimestamps(explicit)).toEqual(stripTimestamps(defaulted));
  });

  it('history entry is labeled "Re-apply brand kit" and undo reverses in one step', async () => {
    const { adapter } = await bootAdapter(loadFixture());
    const beforeJson = JSON.stringify(adapter.getDocument());

    const kit = brandToBrandKit(raqmBrand);
    const next = applyBrandToDocument(adapter.getDocument(), kit, {
      respectLocks: true,
    });

    adapter.batch('Re-apply brand kit', () => {
      void adapter.replaceDocument(next);
    });

    expect(JSON.stringify(adapter.getDocument())).not.toBe(beforeJson);

    // Internal label exposed for tests via historyRing.currentLabel().
    const history = (adapter as unknown as {
      history: { currentLabel(): string | undefined };
    }).history;
    expect(history.currentLabel()).toBe('Re-apply brand kit');

    expect(adapter.canUndo()).toBe(true);
    adapter.undo();
    expect(JSON.stringify(adapter.getDocument())).toBe(beforeJson);
  });
});

function stripTimestamps(doc: BrandOSDocument): BrandOSDocument {
  const cloned = JSON.parse(JSON.stringify(doc)) as BrandOSDocument & {
    brandResolution?: { resolvedAt?: string };
  };
  if (cloned.brandResolution) {
    delete cloned.brandResolution.resolvedAt;
  }
  return cloned;
}
