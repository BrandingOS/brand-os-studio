// findSimilarLayers — find layers in a document that share the
// reference's brand-binding for cross-layer propagation.
//
// Used by Phase 3 step 4b's `applyLayerPatchAcrossPages` and the
// Phase 3 step 6 cross-page consistency Sonner prompt: when a user
// edits a brand-managed property on one layer, we ask "apply to all
// similar layers across N pages?" — this function is the "find the
// similar layers" half.
//
// Pure function. No DOM, no Fabric, no side effects. Same hosting
// constraints as `applyBrandToDocument` — runs in Edge Functions for
// AI agents that need to reason about which layers a brand-kit change
// would affect.

import type {
  BrandOSDocument,
  GroupLayer,
  Layer,
  SlotRef,
} from '@/features/editor/schema';

/**
 * Similarity matching strategy. Phase 3 step 4a ships `'exact'`;
 * later phases add the broader levels.
 *
 *   • `'exact'`         — same layer kind, same SlotRef on the same
 *                          property. The default everywhere in
 *                          Phase 3.
 *   • `'slot-family'`   — Phase 4+. Any layer using any SlotRef in
 *                          the same family (e.g. any `brand.color.*`
 *                          on any color property). Currently throws
 *                          NotImplementedError.
 *   • `'brand-context'` — Phase 4+. Any brand-managed layer affected
 *                          by this brand kit field. Currently throws
 *                          NotImplementedError.
 */
export type SimilarityLevel = 'exact' | 'slot-family' | 'brand-context';

export interface SimilarityReference {
  /** The layer the user/AI is propagating FROM. */
  layer: Layer;
  /** The page that contains the reference layer. */
  pageId: string;
  /**
   * Property path on the layer to match. Top-level properties are
   * named directly (`'color'`, `'fontFamily'`, `'fill'`, `'stroke'`).
   * For SvgLayer fill overrides use the dotted form
   * `'fillOverrides.<key>'`.
   */
  property: string;
}

export interface SimilarLayerMatch {
  pageId: string;
  layerId: string;
}

/**
 * Find layers in `doc` similar to `reference.layer` per the given
 * similarity level. Reference layer itself is never returned.
 *
 * Search scope: `doc.pages` only. Master pages are intentionally
 * excluded — master layers have their own propagation model (edit
 * master → all pages using it reflect via the master overlay
 * rendering). Cross-page propagation is a page-scoped concept;
 * including masters would conflate the two models.
 *
 * Group layer children are recursed. A text layer inside a group
 * with `brand.color.primary` IS a candidate for the same reason any
 * other text layer is.
 */
export function findSimilarLayers(
  doc: BrandOSDocument,
  reference: SimilarityReference,
  level: SimilarityLevel,
): SimilarLayerMatch[] {
  if (level === 'slot-family' || level === 'brand-context') {
    throw new Error(
      `SimilarityLevel '${level}' is not implemented yet. Phase 3 step 4a ships 'exact' only; the other levels arrive in a later phase.`,
    );
  }
  if (level !== 'exact') {
    throw new Error(`Unknown SimilarityLevel: ${level as string}`);
  }

  const refSlot = readPropertyAsSlotRef(reference.layer, reference.property);
  if (!refSlot) {
    // No SlotRef on the reference → there's no exact-similarity
    // concept (literals are intentional one-off design choices).
    return [];
  }

  const matches: SimilarLayerMatch[] = [];
  for (const page of doc.pages) {
    walkLayers(page.id, page.layers, reference, refSlot, matches);
  }
  return matches;
}

// ─── Internal walker ────────────────────────────────────────────────────

function walkLayers(
  pageId: string,
  layers: Layer[],
  reference: SimilarityReference,
  refSlot: SlotRef,
  matches: SimilarLayerMatch[],
): void {
  for (const layer of layers) {
    // Same kind + same SlotRef on the same property → match.
    if (layer.id !== reference.layer.id && layer.kind === reference.layer.kind) {
      const slot = readPropertyAsSlotRef(layer, reference.property);
      if (slot && slotsEqual(slot, refSlot)) {
        matches.push({ pageId, layerId: layer.id });
      }
    }
    // Recurse into group children regardless of kind match — a group
    // doesn't itself bind brand properties; its children do.
    if (layer.kind === 'group') {
      walkLayers(pageId, (layer as GroupLayer).children, reference, refSlot, matches);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function readPropertyAsSlotRef(layer: Layer, property: string): SlotRef | null {
  // SvgLayer fill overrides — dotted access path.
  if (property.startsWith('fillOverrides.')) {
    if (layer.kind !== 'svg') return null;
    const key = property.slice('fillOverrides.'.length);
    const overrides = (layer as { fillOverrides: Record<string, unknown> }).fillOverrides;
    return isSlotRef(overrides[key]) ? (overrides[key] as SlotRef) : null;
  }
  const value = (layer as unknown as Record<string, unknown>)[property];
  return isSlotRef(value) ? value : null;
}

function isSlotRef(value: unknown): value is SlotRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
}

function slotsEqual(a: SlotRef, b: SlotRef): boolean {
  if (a.type !== b.type) return false;
  // `neutralIndex` is the only field besides `type`; only the neutral
  // slot uses it. Two `brand.color.neutral` SlotRefs with different
  // neutralIndex values are NOT equal — they refer to different
  // entries in the neutral ramp.
  if (a.type === 'brand.color.neutral') {
    const ai = (a as SlotRef & { neutralIndex?: number }).neutralIndex ?? 2;
    const bi = (b as SlotRef & { neutralIndex?: number }).neutralIndex ?? 2;
    return ai === bi;
  }
  return true;
}
