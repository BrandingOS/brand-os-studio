// Layer operations — the verbs a design editor needs and the adapter
// deliberately does not have.
//
// These compose the `LayerEditingAdapter` primitives rather than
// extending its interface, for two reasons: every renderer would
// otherwise have to implement `group`/`align`/`distribute`, and none of
// this is Fabric-specific — it is arithmetic on the document. A second
// layer-editing renderer inherits the whole file for free.
//
// Every operation that touches more than one layer runs inside
// `adapter.batch(...)`, so it is ONE undo step and ONE change emit no
// matter how many layers it moves. That is the rule this file exists to
// enforce: "align 6 layers" must not cost six presses of ⌘Z.

import type { GroupLayer, Layer, Page } from '@/features/editor/schema';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';

/** Offset applied to a duplicate so it is visibly its own object. */
export const DUPLICATE_OFFSET = 16;

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Geometry ──────────────────────────────────────────────────────────

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A layer's axis-aligned box in document space.
 *
 * `scaleX`/`scaleY` are part of the box, not decoration: after any
 * canvas resize the adapter records the natural size in `width` and the
 * resize in `scaleX`, so reading `width` alone measures the wrong thing
 * for every object the user has touched.
 *
 * Rotation is deliberately ignored. Align and distribute operate on the
 * unrotated box, which is what Figma, Canva and Illustrator all do for
 * these commands — the alternative surprises people more than it helps.
 */
export function layerBox(layer: Layer): Box {
  const t = layer.transform;
  return {
    x: t.x,
    y: t.y,
    width: t.width * (t.scaleX || 1),
    height: t.height * (t.scaleY || 1),
  };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

// ─── Selection helpers ─────────────────────────────────────────────────

function layersOf(page: Page, ids: readonly string[]): Layer[] {
  const wanted = new Set(ids);
  return page.layers.filter((l) => wanted.has(l.id));
}

/** Layers that may be moved — a locked layer ignores every command. */
function editable(layers: Layer[]): Layer[] {
  return layers.filter((l) => !l.locked);
}

// ─── Clone ─────────────────────────────────────────────────────────────

/**
 * A deep copy carrying fresh ids all the way down.
 *
 * Group children need new ids too, or a duplicated group shares layer
 * ids with its source and selecting one selects both.
 */
export function cloneLayer(layer: Layer): Layer {
  const copy = structuredClone(layer) as Layer;
  const reid = (l: Layer): Layer => {
    l.id = newId();
    if (l.kind === 'group') l.children = l.children.map(reid);
    return l;
  };
  return reid(copy);
}

// ─── Destructive ───────────────────────────────────────────────────────

export function deleteLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  ids: readonly string[],
): void {
  const page = findPage(adapter, pageId);
  if (!page) return;
  const targets = editable(layersOf(page, ids));
  if (targets.length === 0) return;
  adapter.batch(targets.length > 1 ? `Delete ${targets.length} layers` : 'Delete layer', () => {
    for (const layer of targets) adapter.removeLayer(pageId, layer.id);
  });
  adapter.setSelection([]);
}

/** Returns the ids of the copies, already selected. */
export function duplicateLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  ids: readonly string[],
  offset = DUPLICATE_OFFSET,
): string[] {
  const page = findPage(adapter, pageId);
  if (!page) return [];
  const targets = layersOf(page, ids);
  if (targets.length === 0) return [];
  const copies = targets.map((layer) => {
    const copy = cloneLayer(layer);
    copy.transform = {
      ...copy.transform,
      x: copy.transform.x + offset,
      y: copy.transform.y + offset,
    };
    return copy;
  });
  adapter.batch(copies.length > 1 ? `Duplicate ${copies.length} layers` : 'Duplicate', () => {
    for (const copy of copies) adapter.addLayer(pageId, copy);
  });
  const newIds = copies.map((c) => c.id);
  adapter.setSelection(newIds);
  return newIds;
}

// ─── Clipboard ─────────────────────────────────────────────────────────
//
// Module-scoped rather than a system-clipboard write. A design layer has
// no text/plain representation worth pasting into another application,
// and `navigator.clipboard.read` needs a permission prompt that would
// interrupt ⌘V. Cross-document paste within the app works because the
// buffer outlives the editor instance.

let clipboard: Layer[] = [];

export function copyLayers(page: Page, ids: readonly string[]): number {
  const targets = layersOf(page, ids);
  clipboard = targets.map((l) => structuredClone(l) as Layer);
  return clipboard.length;
}

export function cutLayers(
  adapter: LayerEditingAdapter,
  page: Page,
  ids: readonly string[],
): number {
  const n = copyLayers(page, ids);
  if (n > 0) deleteLayers(adapter, page.id, ids);
  return n;
}

export function clipboardSize(): number {
  return clipboard.length;
}

/**
 * Paste the buffer onto `pageId`.
 *
 * `at` places the paste under the pointer (context-menu paste); without
 * it the copies land offset from their source, the way ⌘V does in every
 * editor. The buffer is NOT consumed, so ⌘V twice gives two copies.
 */
export function pasteLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  at?: { x: number; y: number },
): string[] {
  if (clipboard.length === 0) return [];
  const copies = clipboard.map((l) => cloneLayer(l));
  if (at) {
    const origin = unionBox(copies.map(layerBox));
    if (origin) {
      const dx = at.x - origin.x - origin.width / 2;
      const dy = at.y - origin.y - origin.height / 2;
      for (const c of copies) {
        c.transform = { ...c.transform, x: c.transform.x + dx, y: c.transform.y + dy };
      }
    }
  } else {
    for (const c of copies) {
      c.transform = {
        ...c.transform,
        x: c.transform.x + DUPLICATE_OFFSET,
        y: c.transform.y + DUPLICATE_OFFSET,
      };
    }
  }
  adapter.batch(copies.length > 1 ? `Paste ${copies.length} layers` : 'Paste', () => {
    for (const copy of copies) adapter.addLayer(pageId, copy);
  });
  const ids = copies.map((c) => c.id);
  adapter.setSelection(ids);
  return ids;
}

// ─── Grouping ──────────────────────────────────────────────────────────
//
// A group's children carry ABSOLUTE document coordinates and the group's
// own transform is their bounding box. That is the convention
// `groupLayerToFabric` already renders against (Fabric derives the same
// box from the same children), so grouping and ungrouping are pure
// document moves that need no coordinate conversion.

export function groupLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  ids: readonly string[],
): string | null {
  const page = findPage(adapter, pageId);
  if (!page) return null;
  // Group in PAINT ORDER, not selection order, so the visual stacking
  // inside the group matches what the user was looking at.
  const targets = page.layers.filter((l) => ids.includes(l.id));
  if (targets.length < 2) return null;
  const box = unionBox(targets.map(layerBox));
  if (!box) return null;

  const group: Layer = {
    id: newId(),
    kind: 'group',
    name: 'Group',
    transform: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    children: targets.map((l) => structuredClone(l) as Layer),
  };

  adapter.batch('Group', () => {
    for (const layer of targets) adapter.removeLayer(pageId, layer.id);
    adapter.addLayer(pageId, group);
  });
  adapter.setSelection([group.id]);
  return group.id;
}

export function ungroupLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  ids: readonly string[],
): string[] {
  const page = findPage(adapter, pageId);
  if (!page) return [];
  const groups = layersOf(page, ids).filter((l): l is GroupLayer => l.kind === 'group');
  if (groups.length === 0) return [];
  const freed: Layer[] = [];
  adapter.batch('Ungroup', () => {
    for (const group of groups) {
      for (const child of group.children) {
        const copy = structuredClone(child) as Layer;
        freed.push(copy);
        adapter.addLayer(pageId, copy);
      }
      adapter.removeLayer(pageId, group.id);
    }
  });
  const freedIds = freed.map((l) => l.id);
  adapter.setSelection(freedIds);
  return freedIds;
}

// ─── Z-order ───────────────────────────────────────────────────────────

export type OrderCommand = 'front' | 'back' | 'forward' | 'backward';

export function orderLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  ids: readonly string[],
  command: OrderCommand,
): void {
  const page = findPage(adapter, pageId);
  if (!page) return;
  // Work in IDS, in paint order. Indices captured up front would be
  // stale after the first move — the array reorders under the loop, so
  // `layers[i]` stops meaning the layer it meant when i was chosen.
  const ordered = page.layers.filter((l) => ids.includes(l.id)).map((l) => l.id);
  if (ordered.length === 0) return;
  const last = page.layers.length - 1;
  const indexOf = (id: string) => page.layers.findIndex((l) => l.id === id);

  adapter.batch(ORDER_LABEL[command], () => {
    if (command === 'front') {
      // Front-most target last, so the moved set keeps its order on top.
      for (const id of ordered) adapter.reorderLayer(pageId, id, last);
      return;
    }
    if (command === 'back') {
      for (const id of [...ordered].reverse()) adapter.reorderLayer(pageId, id, 0);
      return;
    }
    const forward = command === 'forward';
    // Step the frontmost first when moving up, the backmost first when
    // moving down — otherwise a target lands on one already moved and
    // the pair swaps instead of travelling together.
    const walk = forward ? [...ordered].reverse() : ordered;
    for (const id of walk) {
      const from = indexOf(id);
      if (from < 0) continue;
      const to = Math.max(0, Math.min(last, from + (forward ? 1 : -1)));
      if (to !== from) adapter.reorderLayer(pageId, id, to);
    }
  });
}

const ORDER_LABEL: Record<OrderCommand, string> = {
  front: 'Bring to front',
  back: 'Send to back',
  forward: 'Bring forward',
  backward: 'Send backward',
};

// ─── Move ──────────────────────────────────────────────────────────────

export function nudgeLayers(
  adapter: LayerEditingAdapter,
  pageId: string,
  ids: readonly string[],
  dx: number,
  dy: number,
): void {
  const page = findPage(adapter, pageId);
  if (!page) return;
  const targets = editable(layersOf(page, ids));
  if (targets.length === 0) return;
  adapter.batch('Move', () => {
    for (const layer of targets) {
      adapter.updateLayer(pageId, layer.id, {
        transform: {
          ...layer.transform,
          x: layer.transform.x + dx,
          y: layer.transform.y + dy,
        },
      } as Partial<Layer>);
    }
  });
}

// ─── Align & distribute ────────────────────────────────────────────────

export type AlignMode = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';

/**
 * Align to the selection's own bounds, or — when only one layer is
 * selected — to the page.
 *
 * That fallback is the behaviour people expect and the reason align is
 * useful at all on a single object: "centre this on the page" is the
 * single most common alignment request in a design tool.
 */
export function alignLayers(
  adapter: LayerEditingAdapter,
  page: Page,
  ids: readonly string[],
  mode: AlignMode,
): void {
  const targets = editable(layersOf(page, ids));
  if (targets.length === 0) return;
  const boxes = targets.map(layerBox);
  const frame =
    targets.length === 1
      ? { x: 0, y: 0, width: page.width, height: page.height }
      : unionBox(boxes);
  if (!frame) return;

  adapter.batch('Align', () => {
    targets.forEach((layer, i) => {
      const box = boxes[i];
      let { x, y } = box;
      switch (mode) {
        case 'left':
          x = frame.x;
          break;
        case 'center-x':
          x = frame.x + (frame.width - box.width) / 2;
          break;
        case 'right':
          x = frame.x + frame.width - box.width;
          break;
        case 'top':
          y = frame.y;
          break;
        case 'center-y':
          y = frame.y + (frame.height - box.height) / 2;
          break;
        case 'bottom':
          y = frame.y + frame.height - box.height;
          break;
      }
      if (x === box.x && y === box.y) return;
      adapter.updateLayer(page.id, layer.id, {
        transform: { ...layer.transform, x, y },
      } as Partial<Layer>);
    });
  });
}

/**
 * Even GAPS, not even centres.
 *
 * Spacing centres evenly is the naive reading and it looks wrong the
 * moment the objects differ in size — which is nearly always. The outer
 * two layers stay put and everything between them is redistributed so
 * the whitespace is equal.
 */
export function distributeLayers(
  adapter: LayerEditingAdapter,
  page: Page,
  ids: readonly string[],
  axis: 'horizontal' | 'vertical',
): void {
  const targets = editable(layersOf(page, ids));
  if (targets.length < 3) return;
  const horizontal = axis === 'horizontal';
  const withBox = targets
    .map((layer) => ({ layer, box: layerBox(layer) }))
    .sort((a, b) => (horizontal ? a.box.x - b.box.x : a.box.y - b.box.y));

  const first = withBox[0].box;
  const last = withBox[withBox.length - 1].box;
  const span = horizontal
    ? last.x + last.width - first.x
    : last.y + last.height - first.y;
  const used = withBox.reduce(
    (sum, { box }) => sum + (horizontal ? box.width : box.height),
    0,
  );
  const gap = (span - used) / (withBox.length - 1);

  adapter.batch('Distribute', () => {
    let cursor = horizontal ? first.x : first.y;
    for (const { layer, box } of withBox) {
      const next = horizontal
        ? { ...layer.transform, x: cursor }
        : { ...layer.transform, y: cursor };
      const moved = horizontal ? cursor !== box.x : cursor !== box.y;
      if (moved) {
        adapter.updateLayer(page.id, layer.id, { transform: next } as Partial<Layer>);
      }
      cursor += (horizontal ? box.width : box.height) + gap;
    }
  });
}

// ─── Flags ─────────────────────────────────────────────────────────────

/**
 * Toggle a boolean flag across a selection.
 *
 * The whole selection is driven to the SAME value — the inverse of
 * whether every layer already has it. A per-layer toggle on a mixed
 * selection scatters the state and gives the user no way back.
 */
export function toggleFlag(
  adapter: LayerEditingAdapter,
  page: Page,
  ids: readonly string[],
  flag: 'locked' | 'visible',
): void {
  const targets = layersOf(page, ids);
  if (targets.length === 0) return;
  const next = flag === 'locked' ? !targets.every((l) => l.locked) : !targets.every((l) => l.visible);
  adapter.batch(flag === 'locked' ? 'Lock' : 'Hide', () => {
    for (const layer of targets) {
      adapter.updateLayer(page.id, layer.id, { [flag]: next } as Partial<Layer>);
    }
  });
}

// ─── Internal ──────────────────────────────────────────────────────────

function findPage(adapter: LayerEditingAdapter, pageId: string): Page | null {
  const doc = adapter.getDocument();
  return (
    doc.pages.find((p) => p.id === pageId) ??
    doc.masterPages.find((p) => p.id === pageId) ??
    null
  );
}
