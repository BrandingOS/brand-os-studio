// Phase 5.3b — Source → variants edit propagation.
//
// Pure rebuilder. Given a source doc + the family's existing variant
// docs (loaded fresh from IDesignStorage), produces NEW variant docs
// derived from the current source state, preserving each variant's
// id. The caller persists the result, overwriting prior variant
// bodies — this is the destructive "republish" semantics:
// source-of-truth wins, variant edits are clobbered.
//
// Smart-merge (variant-keeps-its-edits) is 5.3c. The semantics there:
//   - source.text changes → propagate (likely the common edit case)
//   - source.color / fill changes → propagate
//   - source.transform changes → keep variant's transform (variant
//     has been re-flowed for its aspect ratio; propagating would undo)
// 5.3c needs careful UX (which fields propagate? user override?) —
// out of scope for the v1 destructive ship.
import { generateResizeVariants } from './generateResizeVariants';
import type { BrandOSDocument } from '../schema';
import type { DimensionPreset } from '../content-types/types';

export interface RepublishFamilyInput {
  source: BrandOSDocument;
  existingVariants: BrandOSDocument[];
  /**
   * Optional preset-label resolver. For each variant, called with its
   * width/height to look up a human-readable label (e.g. "Story 9:16"
   * from ContentTypeConfig.dimensionPresets). When omitted the label
   * falls back to "<width>x<height>".
   *
   * The label survives in the variant's metadata for naming /
   * filenames; it doesn't affect the geometry transform itself.
   */
  resolvePresetLabel?: (width: number, height: number) => string | null;
}

export interface RepublishFamilyOutput {
  /** Source with familyId stamp re-applied. Caller persists. */
  source: BrandOSDocument;
  /**
   * Variants in the same order as `input.existingVariants`. Each
   * variant's id is PRESERVED from its existing doc — the doc body
   * (pages, layers, etc.) is freshly computed from the current source.
   */
  variants: BrandOSDocument[];
  /** Preset labels resolved (or fabricated) per variant — useful for
   *  naming the persisted variants in My Designs. */
  presetLabels: string[];
}

/**
 * Throws if the source has no `familyId` — caller should hide the
 * Republish UI in that case.
 */
export function republishFamilyFromSource(
  input: RepublishFamilyInput,
): RepublishFamilyOutput {
  const { source, existingVariants, resolvePresetLabel } = input;
  if (!source.familyId) {
    throw new Error(
      'republishFamilyFromSource: source has no familyId. Generate variants first.',
    );
  }
  if (existingVariants.length === 0) {
    return { source, variants: [], presetLabels: [] };
  }

  const presetLabels: string[] = [];
  const targets: DimensionPreset[] = existingVariants.map((v) => {
    const page = v.pages[0];
    const width = page?.width ?? source.pages[0]?.width ?? 1080;
    const height = page?.height ?? source.pages[0]?.height ?? 1080;
    const label =
      resolvePresetLabel?.(width, height) ?? `${width}×${height}`;
    presetLabels.push(label);
    return { label, width, height };
  });

  const generated = generateResizeVariants({
    source,
    targets,
    familyId: source.familyId,
  });

  // Preserve identity — each new variant body inherits the existing
  // variant's id so URLs, IDesignStorage keys, and the My Designs
  // grid all stay stable.
  const variants = generated.variants.map((newDoc, i) => ({
    ...newDoc,
    id: existingVariants[i].id,
  }));

  return {
    source: generated.sourceWithFamily,
    variants,
    presetLabels,
  };
}
