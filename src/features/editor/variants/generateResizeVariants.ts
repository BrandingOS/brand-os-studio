// Phase 5.1a — Resize Variants core.
//
// Given a source document and a list of target dimension presets,
// produces one variant document per preset. Every variant + the source
// share a `familyId`; each variant carries `sourceDesignId` pointing
// back at the source.
//
// Reflow strategy in 5.1a is "dumb clone with proportional layer
// scaling" — we read the source page's dimensions, compute scaleX
// and scaleY for the target, and apply them to every layer's
// transform. This will distort layers (text squashes, images warp)
// and is intentionally a stand-in for the AI reflow engine in 5.2.
// What the user sees in 5.1a: the variant grid populates instantly
// with on-brand-but-imperfect-layout designs they can then edit.
// 5.2 replaces this with semantic-aware AI reflow (which understands
// "this is a hero text — keep it large; this image fills the canvas;
// this CTA stays bottom-right").
//
// All variant generation is pure — no IDesignStorage, no toast, no
// React. The caller is responsible for persistence + navigation.
import type { BrandOSDocument, Page, Layer } from '../schema';
import type { DimensionPreset } from '../content-types/types';

export interface VariantGenerationInput {
  source: BrandOSDocument;
  targets: DimensionPreset[];
  /** Optional override; defaults to a freshly-minted UUID. */
  familyId?: string;
}

export interface VariantGenerationResult {
  /** The familyId all docs (source + variants) share. */
  familyId: string;
  /**
   * The source document with `familyId` set. Caller should persist
   * this update so the source ↔ variants link survives.
   */
  sourceWithFamily: BrandOSDocument;
  /**
   * One variant per target preset, in the same order as `input.targets`.
   * Each variant has a fresh id, the input familyId, and
   * sourceDesignId pointing at the source.
   */
  variants: BrandOSDocument[];
}

/**
 * Generate a sibling document for each target preset.
 *
 * Determinism note: we do NOT mint UUIDs inside scaleLayers — UUIDs
 * are minted once per variant document at the top level so layer ids
 * stay STABLE across variants in the same family (5.3 needs this for
 * propagating edits source → variants).
 */
export function generateResizeVariants(
  input: VariantGenerationInput,
): VariantGenerationResult {
  const { source, targets } = input;
  const familyId = input.familyId ?? crypto.randomUUID();

  const sourceWithFamily: BrandOSDocument = {
    ...source,
    familyId,
  };

  const sourcePage = source.pages[0];
  const sourceWidth = sourcePage?.width ?? source.pages[0]?.width ?? 1080;
  const sourceHeight = sourcePage?.height ?? source.pages[0]?.height ?? 1080;

  const variants: BrandOSDocument[] = targets.map((target) => {
    const scaleX = target.width / sourceWidth;
    const scaleY = target.height / sourceHeight;

    const newPages: Page[] = source.pages.map((page) => ({
      ...page,
      // Each page in the variant takes the target dimensions; if the
      // source had multiple pages of varying sizes, all variant pages
      // get the same target. Multi-page mixed-size docs aren't a
      // primary 5.1a use case (those are usually presentations where
      // every page is the same size anyway).
      width: target.width,
      height: target.height,
      layers: page.layers.map((layer) => scaleLayer(layer, scaleX, scaleY)),
    }));

    return {
      ...source,
      id: crypto.randomUUID(),
      pages: newPages,
      familyId,
      sourceDesignId: source.id,
      // Discard preview-mode brand resolution if present — variants
      // are fresh authoring contexts, not preview snapshots.
      brandResolution: undefined,
    };
  });

  return { familyId, sourceWithFamily, variants };
}

/**
 * Apply proportional scaling to a layer's transform. Layer ids and
 * all non-geometry fields stay identical; only x/y/width/height get
 * multiplied. scaleX and scaleY are independent — that's the
 * "dumb clone" part. 5.2's AI reflow keeps layer identity but moves
 * each layer somewhere semantically correct in the new aspect ratio.
 */
function scaleLayer(layer: Layer, scaleX: number, scaleY: number): Layer {
  const scaledTransform = {
    ...layer.transform,
    x: layer.transform.x * scaleX,
    y: layer.transform.y * scaleY,
    width: layer.transform.width * scaleX,
    height: layer.transform.height * scaleY,
  };

  // Preserve the discriminated-union shape — TS narrows on `kind`.
  if (layer.kind === 'group') {
    return {
      ...layer,
      transform: scaledTransform,
      children: layer.children.map((child) => scaleLayer(child, scaleX, scaleY)),
    };
  }
  return { ...layer, transform: scaledTransform };
}

/**
 * Suggest a human-readable name for a variant. Concatenates the source
 * name with the preset label. Used by the "Generate variants" UI when
 * persisting variants to IDesignStorage so the saved-designs list is
 * scannable ("Spring campaign — Story 9:16").
 */
export function variantName(sourceName: string, preset: DimensionPreset): string {
  return `${sourceName} — ${preset.label}`;
}
