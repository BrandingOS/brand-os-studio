// Step 5c — adapter integration tests for the Brand-managed toggle.
//
// These tests prove the contract the floating toolbar's switch
// depends on:
//   • Toggling brandLocked on/off via adapter.updateLayer roundtrips
//     correctly through the document mirror.
//   • Each toggle emits exactly one 'change' event.
//   • Toggling brandLocked ON then overriding a brand-bound property
//     populates `_lockedBindings` (the Phase 3 step 4c.2 recovery
//     state). 5c's UI mute is one defense; 4c.2's recovery is the
//     other. This regression-tests that 4c.2 still works alongside
//     the new toggle.

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
  type TextLayer,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';

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

describe('Step 5c — brandLocked toggle (adapter integration)', () => {
  it('toggling brandLocked off → on → off roundtrips correctly', async () => {
    const { adapter } = await bootAdapter(loadFixture());
    const page = adapter.getDocument().pages[0];
    const headlineId = page.layers[0].id;

    // Headline starts unlocked.
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          brandLocked: boolean;
        }
      ).brandLocked,
    ).toBe(false);

    let changeEvents = 0;
    const off = adapter.on('change', () => {
      changeEvents++;
    });

    adapter.updateLayer(page.id, headlineId, { brandLocked: true });
    expect(changeEvents).toBe(1);
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          brandLocked: boolean;
        }
      ).brandLocked,
    ).toBe(true);

    adapter.updateLayer(page.id, headlineId, { brandLocked: false });
    expect(changeEvents).toBe(2);
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          brandLocked: boolean;
        }
      ).brandLocked,
    ).toBe(false);

    adapter.updateLayer(page.id, headlineId, { brandLocked: true });
    expect(changeEvents).toBe(3);
    off();
  });

  it('overriding a brand-bound property on a brandLocked layer populates _lockedBindings (4c.2 recovery survives 5c)', async () => {
    const { adapter } = await bootAdapter(loadFixture());
    const page = adapter.getDocument().pages[0];
    const headlineId = page.layers[0].id;

    // Headline carries a SlotRef color in the fixture. Capture the
    // SlotRef before any override so we can compare it to the
    // recovery binding the adapter stores.
    const before = adapter
      .getDocument()
      .pages[0].layers.find((l) => l.id === headlineId) as TextLayer & {
      _lockedBindings?: Record<string, unknown>;
    };
    expect(typeof before.color).toBe('object');
    const originalColorRef = before.color;
    expect(before._lockedBindings ?? {}).toEqual({});

    // Lock the layer.
    adapter.updateLayer(page.id, headlineId, { brandLocked: true });

    // Override the brand-bound color with a literal — same code path
    // the floating toolbar's color picker triggers (which the
    // LockedGate prevents in 5c, but bypasses-via-direct-adapter
    // still need 4c.2 recovery to work).
    adapter.updateLayer(page.id, headlineId, { color: '#ff00ff' });

    const after = adapter
      .getDocument()
      .pages[0].layers.find((l) => l.id === headlineId) as TextLayer & {
      _lockedBindings?: Record<string, unknown>;
    };
    expect(after.color).toBe('#ff00ff');
    expect(after._lockedBindings).toBeDefined();
    expect(after._lockedBindings?.color).toEqual(originalColorRef);
  });

  it('overriding on an UNLOCKED layer does NOT populate _lockedBindings', async () => {
    const { adapter } = await bootAdapter(loadFixture());
    const page = adapter.getDocument().pages[0];
    const headlineId = page.layers[0].id;

    // brandLocked is false by default in the fixture for this layer.
    adapter.updateLayer(page.id, headlineId, { color: '#ff00ff' });

    const after = adapter
      .getDocument()
      .pages[0].layers.find((l) => l.id === headlineId) as TextLayer & {
      _lockedBindings?: Record<string, unknown>;
    };
    expect(after.color).toBe('#ff00ff');
    // Unlocked overrides don't earn a recovery binding — _lockedBindings
    // stays empty (or absent).
    expect(after._lockedBindings ?? {}).toEqual({});
  });
});
