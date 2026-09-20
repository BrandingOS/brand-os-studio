// layerOps — document arithmetic, tested against a fake adapter.
//
// A fake rather than the FabricAdapter on purpose: these operations are
// about what lands in the document, and a fake lets each test assert the
// BATCH LABELS too. "One undo step per command" is the contract that
// makes undo feel right, and it is invisible to a test that only checks
// the final document.

import { describe, expect, it, beforeEach } from 'vitest';
import type { GroupLayer, Layer, Page } from '@/features/editor/schema';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';
import {
  alignLayers,
  cloneLayer,
  copyLayers,
  cutLayers,
  deleteLayers,
  distributeLayers,
  duplicateLayers,
  groupLayers,
  layerBox,
  nudgeLayers,
  orderLayers,
  pasteLayers,
  toggleFlag,
  ungroupLayers,
  unionBox,
} from './layerOps';

// ─── Fake adapter ──────────────────────────────────────────────────────

function rect(id: string, x: number, y: number, w = 100, h = 100): Layer {
  return {
    id,
    name: id,
    kind: 'shape',
    shape: 'rectangle',
    fill: '#000000',
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
    transform: { x, y, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
  } as Layer;
}

function makeFake(layers: Layer[], pageSize = { width: 1000, height: 1000 }) {
  const page: Page = {
    id: 'page-1',
    name: 'Page 1',
    width: pageSize.width,
    height: pageSize.height,
    background: '#ffffff',
    masterPageId: null,
    layers,
  };
  const doc = {
    schemaVersion: 1 as const,
    id: 'doc-1',
    contentType: 'social-post',
    brandId: null,
    masterPages: [],
    pages: [page],
    metadata: {},
  };
  const batches: string[] = [];
  let selection: string[] = [];
  let depth = 0;

  const adapter = {
    getDocument: () => doc,
    batch(label: string, fn: () => void) {
      if (depth === 0) batches.push(label);
      depth += 1;
      try {
        fn();
      } finally {
        depth -= 1;
      }
    },
    addLayer(_pageId: string, layer: Layer) {
      page.layers.push(layer);
    },
    removeLayer(_pageId: string, id: string) {
      page.layers = page.layers.filter((l) => l.id !== id);
    },
    updateLayer(_pageId: string, id: string, patch: Partial<Layer>) {
      const i = page.layers.findIndex((l) => l.id === id);
      if (i >= 0) page.layers[i] = { ...page.layers[i], ...patch } as Layer;
    },
    reorderLayer(_pageId: string, id: string, index: number) {
      const i = page.layers.findIndex((l) => l.id === id);
      if (i < 0) return;
      const [l] = page.layers.splice(i, 1);
      page.layers.splice(index, 0, l);
    },
    setSelection(ids: string[]) {
      selection = ids;
    },
    getSelection: () => ({ layerIds: selection, pageId: page.id }),
  } as unknown as LayerEditingAdapter;

  return {
    adapter,
    page,
    batches,
    ids: () => page.layers.map((l) => l.id),
    selection: () => selection,
  };
}

// ─── Geometry ──────────────────────────────────────────────────────────

describe('layerBox', () => {
  it('folds scale into the box', () => {
    const l = rect('a', 10, 20, 100, 50);
    l.transform.scaleX = 2;
    l.transform.scaleY = 3;
    // After any canvas resize the adapter records natural size + scale,
    // so reading `width` alone measures the wrong thing.
    expect(layerBox(l)).toEqual({ x: 10, y: 20, width: 200, height: 150 });
  });
});

describe('unionBox', () => {
  it('spans every box', () => {
    expect(
      unionBox([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 40, y: 20, width: 10, height: 10 },
      ]),
    ).toEqual({ x: 0, y: 0, width: 50, height: 30 });
  });
  it('is null for nothing', () => {
    expect(unionBox([])).toBeNull();
  });
});

// ─── Clone ─────────────────────────────────────────────────────────────

describe('cloneLayer', () => {
  it('re-ids nested group children, not just the top level', () => {
    const group = {
      ...rect('g', 0, 0),
      kind: 'group',
      children: [rect('c1', 0, 0), { ...rect('c2', 0, 0), kind: 'group', children: [rect('c3', 0, 0)] }],
    } as unknown as Layer;
    const copy = cloneLayer(group) as GroupLayer;
    expect(copy.id).not.toBe('g');
    expect(copy.children[0].id).not.toBe('c1');
    const nested = copy.children[1] as GroupLayer;
    expect(nested.children[0].id).not.toBe('c3');
  });
});

// ─── Destructive ───────────────────────────────────────────────────────

describe('deleteLayers', () => {
  it('removes the selection in ONE undo step and clears selection', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0), rect('c', 0, 0)]);
    deleteLayers(f.adapter, 'page-1', ['a', 'c']);
    expect(f.ids()).toEqual(['b']);
    expect(f.batches).toEqual(['Delete 2 layers']);
    expect(f.selection()).toEqual([]);
  });

  it('refuses to delete a locked layer', () => {
    const locked = rect('a', 0, 0);
    locked.locked = true;
    const f = makeFake([locked, rect('b', 0, 0)]);
    deleteLayers(f.adapter, 'page-1', ['a', 'b']);
    expect(f.ids()).toEqual(['a']);
  });

  it('does nothing — not even a history entry — when everything is locked', () => {
    const locked = rect('a', 0, 0);
    locked.locked = true;
    const f = makeFake([locked]);
    deleteLayers(f.adapter, 'page-1', ['a']);
    expect(f.batches).toEqual([]);
  });
});

describe('duplicateLayers', () => {
  it('offsets the copy, gives it a new id, and selects it', () => {
    const f = makeFake([rect('a', 10, 20)]);
    const [newId] = duplicateLayers(f.adapter, 'page-1', ['a']);
    expect(newId).not.toBe('a');
    const copy = f.page.layers.find((l) => l.id === newId);
    expect(copy?.transform).toMatchObject({ x: 26, y: 36 });
    expect(f.selection()).toEqual([newId]);
    expect(f.batches).toEqual(['Duplicate']);
  });

  it('duplicates a locked layer — locking stops edits, not copying', () => {
    const locked = rect('a', 0, 0);
    locked.locked = true;
    const f = makeFake([locked]);
    expect(duplicateLayers(f.adapter, 'page-1', ['a'])).toHaveLength(1);
  });
});

// ─── Clipboard ─────────────────────────────────────────────────────────

describe('clipboard', () => {
  beforeEach(() => {
    copyLayers({ layers: [] } as unknown as Page, []);
  });

  it('pastes offset from the source and keeps the buffer for a second paste', () => {
    const f = makeFake([rect('a', 10, 10)]);
    expect(copyLayers(f.page, ['a'])).toBe(1);
    pasteLayers(f.adapter, 'page-1');
    pasteLayers(f.adapter, 'page-1');
    expect(f.page.layers).toHaveLength(3);
    expect(f.page.layers[1].transform.x).toBe(26);
    expect(f.page.layers[2].transform.x).toBe(26);
    // Two distinct objects, not the same id twice.
    expect(f.page.layers[1].id).not.toBe(f.page.layers[2].id);
  });

  it('pastes CENTRED on a point when one is given', () => {
    const f = makeFake([rect('a', 0, 0, 100, 100)]);
    copyLayers(f.page, ['a']);
    pasteLayers(f.adapter, 'page-1', { x: 500, y: 300 });
    const pasted = f.page.layers[1];
    expect(pasted.transform.x).toBe(450);
    expect(pasted.transform.y).toBe(250);
  });

  it('cut removes the original but still pastes', () => {
    const f = makeFake([rect('a', 0, 0)]);
    cutLayers(f.adapter, f.page, ['a']);
    expect(f.page.layers).toHaveLength(0);
    pasteLayers(f.adapter, 'page-1');
    expect(f.page.layers).toHaveLength(1);
  });

  it('pasting an empty buffer is a no-op, not an empty history entry', () => {
    const f = makeFake([rect('a', 0, 0)]);
    expect(pasteLayers(f.adapter, 'page-1')).toEqual([]);
    expect(f.batches).toEqual([]);
  });
});

// ─── Grouping ──────────────────────────────────────────────────────────

describe('groupLayers', () => {
  it("takes the children's bounding box as the group transform", () => {
    const f = makeFake([rect('a', 0, 0, 100, 100), rect('b', 200, 50, 100, 100)]);
    const id = groupLayers(f.adapter, 'page-1', ['a', 'b']);
    expect(id).toBeTruthy();
    expect(f.page.layers).toHaveLength(1);
    const group = f.page.layers[0] as GroupLayer;
    expect(group.kind).toBe('group');
    expect(group.transform).toMatchObject({ x: 0, y: 0, width: 300, height: 150 });
    expect(group.children.map((c) => c.id)).toEqual(['a', 'b']);
    expect(f.batches).toEqual(['Group']);
  });

  it('groups in PAINT order, not the order they were clicked', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0), rect('c', 0, 0)]);
    groupLayers(f.adapter, 'page-1', ['c', 'a']);
    const group = f.page.layers.find(
      (l) => l.kind === 'group',
    ) as GroupLayer;
    expect(group.children.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('refuses a group of one', () => {
    const f = makeFake([rect('a', 0, 0)]);
    expect(groupLayers(f.adapter, 'page-1', ['a'])).toBeNull();
    expect(f.batches).toEqual([]);
  });

  it('round-trips through ungroup with coordinates intact', () => {
    const f = makeFake([rect('a', 10, 20), rect('b', 200, 50)]);
    const gid = groupLayers(f.adapter, 'page-1', ['a', 'b'])!;
    ungroupLayers(f.adapter, 'page-1', [gid]);
    const byId = Object.fromEntries(f.page.layers.map((l) => [l.id, l]));
    expect(Object.keys(byId).sort()).toEqual(['a', 'b']);
    expect(byId.a.transform).toMatchObject({ x: 10, y: 20 });
    expect(byId.b.transform).toMatchObject({ x: 200, y: 50 });
  });
});

// ─── Z-order ───────────────────────────────────────────────────────────

describe('orderLayers', () => {
  it('brings to front preserving the relative order of the moved set', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0), rect('c', 0, 0), rect('d', 0, 0)]);
    orderLayers(f.adapter, 'page-1', ['a', 'b'], 'front');
    expect(f.ids()).toEqual(['c', 'd', 'a', 'b']);
  });

  it('sends to back preserving relative order', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0), rect('c', 0, 0), rect('d', 0, 0)]);
    orderLayers(f.adapter, 'page-1', ['c', 'd'], 'back');
    expect(f.ids()).toEqual(['c', 'd', 'a', 'b']);
  });

  it('steps one place forward', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0), rect('c', 0, 0)]);
    orderLayers(f.adapter, 'page-1', ['a'], 'forward');
    expect(f.ids()).toEqual(['b', 'a', 'c']);
  });

  it('stops at the top instead of wrapping', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0)]);
    orderLayers(f.adapter, 'page-1', ['b'], 'forward');
    expect(f.ids()).toEqual(['a', 'b']);
  });

  it('is one undo step for the whole command', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 0, 0), rect('c', 0, 0)]);
    orderLayers(f.adapter, 'page-1', ['a', 'b'], 'front');
    expect(f.batches).toEqual(['Bring to front']);
  });
});

// ─── Move ──────────────────────────────────────────────────────────────

describe('nudgeLayers', () => {
  it('moves the whole selection as one history entry', () => {
    const f = makeFake([rect('a', 10, 10), rect('b', 50, 50)]);
    nudgeLayers(f.adapter, 'page-1', ['a', 'b'], 5, -5);
    expect(f.page.layers[0].transform).toMatchObject({ x: 15, y: 5 });
    expect(f.page.layers[1].transform).toMatchObject({ x: 55, y: 45 });
    expect(f.batches).toEqual(['Move']);
  });

  it('leaves locked layers where they are', () => {
    const locked = rect('a', 10, 10);
    locked.locked = true;
    const f = makeFake([locked]);
    nudgeLayers(f.adapter, 'page-1', ['a'], 5, 5);
    expect(f.page.layers[0].transform).toMatchObject({ x: 10, y: 10 });
  });
});

// ─── Align ─────────────────────────────────────────────────────────────

describe('alignLayers', () => {
  it('aligns a SINGLE layer to the page — the common case', () => {
    const f = makeFake([rect('a', 0, 0, 100, 100)], { width: 1000, height: 600 });
    alignLayers(f.adapter, f.page, ['a'], 'center-x');
    expect(f.page.layers[0].transform.x).toBe(450);
    alignLayers(f.adapter, f.page, ['a'], 'center-y');
    expect(f.page.layers[0].transform.y).toBe(250);
  });

  it('aligns MULTIPLE layers to the selection, leaving the page out of it', () => {
    const f = makeFake([rect('a', 100, 0, 100, 100), rect('b', 300, 0, 50, 50)]);
    alignLayers(f.adapter, f.page, ['a', 'b'], 'left');
    expect(f.page.layers[0].transform.x).toBe(100);
    expect(f.page.layers[1].transform.x).toBe(100);
  });

  it('aligns right by the layer’s own width', () => {
    const f = makeFake([rect('a', 0, 0, 100, 100), rect('b', 300, 0, 50, 50)]);
    alignLayers(f.adapter, f.page, ['a', 'b'], 'right');
    // Selection spans 0..350; each layer's RIGHT edge lands on 350.
    expect(f.page.layers[0].transform.x).toBe(250);
    expect(f.page.layers[1].transform.x).toBe(300);
  });

  it('writes nothing when everything is already aligned', () => {
    const f = makeFake([rect('a', 100, 0), rect('b', 100, 0)]);
    alignLayers(f.adapter, f.page, ['a', 'b'], 'left');
    // The batch opens, but no layer moves — and no second batch is
    // opened per layer.
    expect(f.batches).toEqual(['Align']);
  });
});

// ─── Distribute ────────────────────────────────────────────────────────

describe('distributeLayers', () => {
  it('equalises the GAPS, not the centres', () => {
    // Widths 100 / 200 / 100 across 0..700: 400 used, 300 spare, gap 150.
    const f = makeFake([
      rect('a', 0, 0, 100, 100),
      rect('b', 150, 0, 200, 100),
      rect('c', 600, 0, 100, 100),
    ]);
    distributeLayers(f.adapter, f.page, ['a', 'b', 'c'], 'horizontal');
    const byId = Object.fromEntries(f.page.layers.map((l) => [l.id, l.transform.x]));
    expect(byId.a).toBe(0);
    expect(byId.b).toBe(250);
    expect(byId.c).toBe(600);
    // Gap a→b === gap b→c.
    expect(byId.b - 100).toBe(150);
    expect(byId.c - (byId.b + 200)).toBe(150);
  });

  it('needs three layers to mean anything', () => {
    const f = makeFake([rect('a', 0, 0), rect('b', 500, 0)]);
    distributeLayers(f.adapter, f.page, ['a', 'b'], 'horizontal');
    expect(f.batches).toEqual([]);
  });

  it('distributes vertically too', () => {
    const f = makeFake([
      rect('a', 0, 0, 100, 100),
      rect('b', 0, 150, 100, 100),
      rect('c', 0, 500, 100, 100),
    ]);
    // Heights 100/100/100 across 0..600: 300 used, 300 spare, gap 150.
    distributeLayers(f.adapter, f.page, ['a', 'b', 'c'], 'vertical');
    expect(f.page.layers[1].transform.y).toBe(250);
  });
});

// ─── Flags ─────────────────────────────────────────────────────────────

describe('toggleFlag', () => {
  it('drives a MIXED selection to one value instead of scattering it', () => {
    const a = rect('a', 0, 0);
    a.locked = true;
    const f = makeFake([a, rect('b', 0, 0)]);
    toggleFlag(f.adapter, f.page, ['a', 'b'], 'locked');
    // Not every layer was locked, so the command locks everything.
    expect(f.page.layers.map((l) => l.locked)).toEqual([true, true]);
    toggleFlag(f.adapter, f.page, ['a', 'b'], 'locked');
    expect(f.page.layers.map((l) => l.locked)).toEqual([false, false]);
  });

  it('can hide and re-show', () => {
    const f = makeFake([rect('a', 0, 0)]);
    toggleFlag(f.adapter, f.page, ['a'], 'visible');
    expect(f.page.layers[0].visible).toBe(false);
  });
});
