// crossPagePropagation — Step 6's "apply this change to similar
// layers across the document?" prompt.
//
// Wired into the editor's per-edit path (the floating toolbar's
// update callback). After a brand-bound property is overridden on a
// layer that has multi-page siblings sharing the same SlotRef, this
// module fires a Sonner toast with three actions:
//
//   • All N pages (similar brand-managed layers)
//   • Similar layers on this page only
//   • Just this layer
//
// "Just this layer" is a no-op (the change already landed). Auto-
// dismisses after 8s — same effect as Just this layer. The "All
// pages" / "Similar this page" actions go through
// adapter.applyLayerPatchAcrossPages which produces a single batch
// with one undo entry, distinct from the user's original edit. So
// undo reverses just the propagation; a second undo reverses the
// original edit. Recursion is avoided structurally: the trigger is
// only invoked from user-initiated single-layer edits (the toolbar
// wrapper), never from the change-event listener — bulk mutation
// from applyLayerPatchAcrossPages doesn't loop back.

import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Layer, SlotRef } from '@/features/editor/schema';
import {
  findSimilarLayers,
  type SimilarLayerMatch,
} from './findSimilarLayers';

/** Property names eligible for the cross-page prompt. */
export type BrandBoundProperty = 'color' | 'fontFamily' | 'fill' | 'stroke';

const BRAND_BOUND_PROPERTIES: ReadonlyArray<BrandBoundProperty> = [
  'color',
  'fontFamily',
  'fill',
  'stroke',
];

/**
 * Inspect a single-layer edit and surface a cross-page propagation
 * prompt when all conditions hold:
 *
 *   • doc.pages.length > 1
 *   • patch touches a brand-bound property (color/font/fill/stroke)
 *   • prevLayer's value for that property was a SlotRef (or had a
 *     recoverable SlotRef in _lockedBindings)
 *   • findSimilarLayers returns at least 1 match
 *
 * `prevLayer` is the layer state BEFORE the patch was applied. The
 * caller (the toolbar's update wrapper) captures it from the
 * adapter snapshot taken just before adapter.updateLayer.
 */
export function triggerCrossPagePromptIfApplicable(
  adapter: EditorAdapter,
  pageId: string,
  prevLayer: Layer,
  patch: Partial<Layer>,
): void {
  const doc = adapter.getDocument();
  if (doc.pages.length <= 1) return;

  // Find the first brand-bound property that the patch touches AND
  // for which prevLayer had a SlotRef (or recoverable one).
  for (const prop of BRAND_BOUND_PROPERTIES) {
    if (!Object.prototype.hasOwnProperty.call(patch, prop)) continue;
    const refSlot = readReferenceSlot(prevLayer, prop);
    if (!refSlot) continue;
    const newValue = (patch as Record<string, unknown>)[prop];
    if (newValue === undefined) continue;

    // findSimilarLayers reads `reference.layer[prop]` to extract the
    // canonical SlotRef. When prevLayer's prop is already a SlotRef
    // we can pass prevLayer directly; when the SlotRef came from
    // _lockedBindings (the layer was brand-locked and the prop was
    // overridden programmatically), synthesize a reference layer
    // whose prop carries the recovered SlotRef so findSimilarLayers
    // walks the doc against the right key.
    const currentValue = (prevLayer as Record<string, unknown>)[prop];
    const referenceLayer = isSlotRef(currentValue)
      ? prevLayer
      : ({ ...prevLayer, [prop]: refSlot } as Layer);
    const matches = findSimilarLayers(
      doc,
      { layer: referenceLayer, pageId, property: prop },
      'exact',
    );
    if (matches.length === 0) continue;

    showCrossPageToast({
      adapter,
      matches,
      property: prop,
      newValue,
      layerName: prevLayer.name,
      referencePageId: pageId,
    });
    return;
  }
}

// ─── Internals ─────────────────────────────────────────────────────────

/**
 * Reads the SlotRef that "represents" a brand-bound property on the
 * pre-edit layer. Two sources, in priority order:
 *
 *   1. The current value, if it's a SlotRef.
 *   2. `_lockedBindings.{prop}` — populated by the adapter when a
 *      brand-managed property was previously overridden on a
 *      brandLocked layer (Phase 3 step 4c.2). This lets the prompt
 *      still fire after a programmatic override on a locked layer.
 */
function readReferenceSlot(layer: Layer, prop: string): SlotRef | null {
  const value = (layer as Record<string, unknown>)[prop];
  if (isSlotRef(value)) return value;
  const recovered = (layer as { _lockedBindings?: Record<string, unknown> })
    ._lockedBindings?.[prop];
  if (isSlotRef(recovered)) return recovered;
  return null;
}

function isSlotRef(value: unknown): value is SlotRef {
  return (
    value != null && typeof value === 'object' && 'type' in (value as object)
  );
}

interface ShowToastParams {
  adapter: EditorAdapter;
  matches: SimilarLayerMatch[];
  property: BrandBoundProperty;
  newValue: unknown;
  layerName: string;
  referencePageId: string;
}

function showCrossPageToast(params: ShowToastParams): void {
  const { adapter, matches, property, newValue, layerName, referencePageId } =
    params;

  // Two scopes — pre-compute the layer-id sets so each action's
  // predicate is a constant-time lookup at apply time.
  const allMatchIds = new Set(matches.map((m) => m.layerId));
  const samePageMatchIds = new Set(
    matches.filter((m) => m.pageId === referencePageId).map((m) => m.layerId),
  );
  const affectedPageCount = new Set(matches.map((m) => m.pageId)).size + 1; // +1 for the originating page

  const patch = { [property]: newValue } as Partial<Layer>;
  const propertyLabel = humanProperty(property);

  toast.custom(
    (toastId) => (
      <CrossPageToast
        property={propertyLabel}
        layerName={layerName}
        affectedPageCount={affectedPageCount}
        sameThisPageCount={samePageMatchIds.size}
        onApplyAll={() => {
          if (allMatchIds.size > 0) {
            adapter.applyLayerPatchAcrossPages(
              (layer) => allMatchIds.has(layer.id),
              patch,
              `Apply ${propertyLabel} across ${affectedPageCount} pages`,
            );
          }
          toast.dismiss(toastId);
        }}
        onApplyThisPage={() => {
          if (samePageMatchIds.size > 0) {
            adapter.applyLayerPatchAcrossPages(
              (layer, pId) =>
                samePageMatchIds.has(layer.id) && pId === referencePageId,
              patch,
              `Apply ${propertyLabel} to similar layers on this page`,
            );
          }
          toast.dismiss(toastId);
        }}
        onJustThis={() => toast.dismiss(toastId)}
      />
    ),
    { duration: 8000 },
  );
}

function humanProperty(prop: BrandBoundProperty): string {
  switch (prop) {
    case 'color':
      return 'color';
    case 'fontFamily':
      return 'font';
    case 'fill':
      return 'fill';
    case 'stroke':
      return 'stroke';
  }
}

// ─── Toast component ──────────────────────────────────────────────────
//
// Defined inline so the module owns the markup and the action wiring
// stays a single concern. Style matches the Re-apply success toast
// from Step 5b — same surface, border, shadow, radius.

interface CrossPageToastProps {
  property: string;
  layerName: string;
  affectedPageCount: number;
  sameThisPageCount: number;
  onApplyAll: () => void;
  onApplyThisPage: () => void;
  onJustThis: () => void;
}

function CrossPageToast({
  property,
  layerName,
  affectedPageCount,
  sameThisPageCount,
  onApplyAll,
  onApplyThisPage,
  onJustThis,
}: CrossPageToastProps) {
  return (
    <div
      data-cross-page-toast
      data-property={property}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--surface-elevated, #fff)',
        border: '1px solid var(--border, rgba(13,13,13,0.12))',
        boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.10))',
        color: 'var(--text-primary, #0d0d0d)',
        minWidth: 320,
        maxWidth: 380,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <div>
        You changed <strong>{property}</strong> on{' '}
        <strong>{layerName || 'this layer'}</strong>.
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary, #6e6a69)',
        }}
      >
        Apply to:
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <button
          type="button"
          data-cross-page-action="all"
          onClick={onApplyAll}
          style={{
            textAlign: 'left',
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--border, rgba(13,13,13,0.12))',
            background: 'var(--accent, #0d0d0d)',
            color: 'var(--accent-contrast, #fff)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 12.5,
          }}
        >
          All {affectedPageCount} pages (similar brand-managed layers)
        </button>
        {sameThisPageCount > 0 ? (
          <button
            type="button"
            data-cross-page-action="this-page"
            onClick={onApplyThisPage}
            style={{
              textAlign: 'left',
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid var(--border, rgba(13,13,13,0.12))',
              background: 'var(--surface, #fff)',
              color: 'var(--text-primary, #0d0d0d)',
              cursor: 'pointer',
              fontSize: 12.5,
            }}
          >
            Similar layers on this page only ({sameThisPageCount})
          </button>
        ) : null}
        <button
          type="button"
          data-cross-page-action="just-this"
          onClick={onJustThis}
          style={{
            textAlign: 'left',
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--text-secondary, #6e6a69)',
            cursor: 'pointer',
            fontSize: 12.5,
          }}
        >
          Just this layer
        </button>
      </div>
    </div>
  );
}
