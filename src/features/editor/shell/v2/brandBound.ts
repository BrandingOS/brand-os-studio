// brandBound — predicate that decides whether a property on a layer
// is brand-managed. Used by the floating toolbar (Step 5c) to mute
// controls when `layer.brandLocked === true`.
//
// A property is brand-bound if:
//   • Its current value is a SlotRef (resolved at render time
//     against the BrandKit), OR
//   • The layer has a recoverable SlotRef for it in `_lockedBindings`
//     (the lock-recovery field populated by the adapter when a
//     brand-managed property is overridden — Phase 3 step 4c.2).
//   • For Logo layers: the `variant` field is ALWAYS brand-bound —
//     the logo asset itself comes from the brand kit no matter what
//     variant is selected.
//
// Properties NOT brand-bound stay editable when brandLocked is on:
//   • Position, size, rotation (transform)
//   • Opacity, visibility
//   • Image src + fit, SVG src
//   • Text content, line height, alignment, etc.

import type { Layer } from '@/features/editor/schema';

/** Property keys the toolbar can ask about. Keeps callers honest. */
export type BrandBoundProperty =
  | 'color'
  | 'fontFamily'
  | 'fill'
  | 'stroke'
  | 'variant';

/**
 * Returns `true` when the toolbar should mute the control for this
 * property on this layer. Always `false` when `brandLocked` is off —
 * locking is the only thing that activates the mute.
 */
export function isBrandBound(layer: Layer, prop: BrandBoundProperty): boolean {
  if (!layer.brandLocked) return false;
  // Logo variants are always brand-managed; the layer kind itself is
  // a brand concept.
  if (layer.kind === 'logo' && prop === 'variant') return true;

  // Recoverable SlotRef bindings (4c.2) → brand-bound even after a
  // literal override. This is what re-apply restores.
  const recovery = (layer as { _lockedBindings?: Record<string, unknown> })
    ._lockedBindings;
  if (recovery && Object.prototype.hasOwnProperty.call(recovery, prop)) {
    return true;
  }

  // Current value is a SlotRef → brand-bound. SlotRefs are objects;
  // literal hex/family strings are strings.
  switch (prop) {
    case 'color':
      return layer.kind === 'text' && isSlotShape(layer.color);
    case 'fontFamily':
      return layer.kind === 'text' && isSlotShape(layer.fontFamily);
    case 'fill':
      return layer.kind === 'shape' && isSlotShape(layer.fill);
    case 'stroke':
      return layer.kind === 'shape' && isSlotShape(layer.stroke);
    default:
      return false;
  }
}

function isSlotShape(v: unknown): boolean {
  return v != null && typeof v === 'object';
}
