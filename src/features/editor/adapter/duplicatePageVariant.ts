// Pure transform that turns a list of layers into a "variant" copy
// per the Step 7 spec. Used by `FabricAdapter.duplicatePageAsVariant`.
//
// "As variant" semantics — branding survives, content is wiped clean
// so the user can fill the new page in fresh:
//
//   ┌────────────┬─────────────────────────────────────────────────┐
//   │ Layer kind │ Behavior                                        │
//   ├────────────┼─────────────────────────────────────────────────┤
//   │ text       │ Clear `text` to ''. Keep all styling: font,     │
//   │            │ size, weight, color (literal or SlotRef),       │
//   │            │ align, line height, letter spacing.             │
//   │ shape      │ Keep entirely (rect / ellipse / line / polygon).│
//   │ image      │ Remove. (Image content is page-specific.)       │
//   │ svg        │ Keep. (SVGs are typically icons / decoration.)  │
//   │ logo       │ Keep. (Logos are branding, not content.)        │
//   │ group      │ Recurse into `children`. Apply per-kind rules   │
//   │            │ above. If the group ends up with zero children, │
//   │            │ remove the group entirely.                      │
//   └────────────┴─────────────────────────────────────────────────┘
//
// Why these specific choices: the user just had this page rendered
// well in their brand kit. The visual structure (logos, accent
// shapes, decorative SVGs) is part of "the layout"; the words and
// page-specific photos are what they want to replace on the next
// slide / post / page. Clearing text lets the user type fresh
// without losing the typographic system that made the original
// page work.
//
// Generates fresh ids for every kept layer so the new page never
// shares ids with the source — id collisions break the adapter's
// `fabricByLayerId` Map.

import type { GroupLayer, Layer } from '@/features/editor/schema';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
        .toString(36)
        .slice(2)}`;

/**
 * Map a single layer through the variant rules. Returns the new
 * layer or `null` when the layer should be dropped (image kind, or
 * group whose children all dropped out).
 */
function variantOfLayer(layer: Layer): Layer | null {
  // Drop images outright.
  if (layer.kind === 'image') return null;

  // Recurse into groups. If every child drops, the group itself
  // drops with them — empty groups are a smell.
  if (layer.kind === 'group') {
    const newChildren: Layer[] = [];
    for (const child of layer.children) {
      const transformed = variantOfLayer(child);
      if (transformed) newChildren.push(transformed);
    }
    if (newChildren.length === 0) return null;
    // Cast through `unknown` — the schema's z.lazy on GroupLayer
    // breaks TS narrowing on the discriminated union (same workaround
    // used in adapter/layerMapping.ts and brand/applyBrandToDocument.ts).
    const next = {
      ...layer,
      id: newId(),
      children: newChildren,
    } as unknown as GroupLayer;
    return next;
  }

  // Text — clear the content but keep the styling intact (fontFamily,
  // fontSize, fontWeight, lineHeight, letterSpacing, textAlign,
  // direction, color — literal or SlotRef).
  if (layer.kind === 'text') {
    return { ...layer, id: newId(), text: '' };
  }

  // shape / svg / logo — keep as-is, fresh id.
  return { ...layer, id: newId() } as Layer;
}

/**
 * Apply the variant rules to a list of layers. Filters dropped
 * layers (images, empty groups). Order is preserved.
 */
export function transformLayersForVariant(layers: Layer[]): Layer[] {
  const result: Layer[] = [];
  for (const layer of layers) {
    const next = variantOfLayer(layer);
    if (next) result.push(next);
  }
  return result;
}
