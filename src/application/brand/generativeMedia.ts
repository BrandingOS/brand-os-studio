/**
 * Generative media as first-class Library assets.
 *
 * A generated image is NOT a document. Forcing it into the constructive-output
 * model would lose the thing that makes it useful later — why it exists. So it
 * lives in the Library as a media asset carrying its provenance: the prompt,
 * the brand context that shaped it, the model, and what it went on to be used
 * in.
 *
 * Provenance is written ONCE at creation and immutable afterwards, except
 * `relations`, which accrues as the asset is used. That asymmetry is the point:
 * the circumstances of a generation are historical fact, while its relationships
 * keep growing.
 */
import type { Asset, AssetProvenance } from '@/shared/types/brand';
import type { IAssetsService } from '@/core/types/services';
import type { CreationContext } from './buildCreationContext';

export interface SaveGeneratedMediaInput {
  brandId: string;
  name: string;
  url: string;
  /** 'image' today; 'video' is modelled but not yet produced anywhere. */
  type?: Extract<Asset['type'], 'image' | 'video'>;
  size?: number;
  storagePath?: string;
  prompt?: string;
  model?: string;
  /** The context the generation actually saw. */
  context?: CreationContext;
  /** Library items used as inputs/references. */
  inputRefs?: string[];
  derivedFromAssetId?: string;
}

/** Builds the immutable half of the provenance record. */
export function buildProvenance(
  input: SaveGeneratedMediaInput,
  now: string = new Date().toISOString(),
): AssetProvenance {
  return {
    kind: 'generated',
    generatedAt: now,
    ...(input.prompt ? { prompt: input.prompt } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.inputRefs?.length ? { inputRefs: [...input.inputRefs] } : {}),
    ...(input.context
      ? {
          contextUsed: {
            core: input.context.core.map((c) => c.path),
            businessInfo: Boolean(input.context.businessInfo),
            contextSignals: Object.keys(input.context.preferences).length,
          },
        }
      : {}),
    ...(input.derivedFromAssetId
      ? { relations: { derivedFromAssetId: input.derivedFromAssetId } }
      : {}),
  };
}

/**
 * Saves generated media into the Library. Saving IS the registration — there is
 * no separate copy, so the asset cannot fork from "the one in the Library".
 */
export async function saveGeneratedMedia(
  assets: IAssetsService,
  input: SaveGeneratedMediaInput,
): Promise<Asset> {
  return assets.create({
    brandId: input.brandId,
    name: input.name,
    type: input.type ?? 'image',
    category: 'photo',
    source: 'upload',
    url: input.url,
    storagePath: input.storagePath,
    size: input.size ?? 0,
    tags: ['generated'],
    origin: 'generated',
    provenance: buildProvenance(input),
  });
}

/**
 * Records that a generated asset was placed into a design.
 *
 * Additive and idempotent: relations accrue, and the same design is never
 * recorded twice. Everything else in the provenance is left exactly as written
 * at creation.
 */
export async function recordPlacement(
  assets: IAssetsService,
  assetId: string,
  designId: string,
): Promise<Asset | null> {
  const asset = await assets.getById(assetId);
  if (!asset?.provenance) return asset;

  const placed = asset.provenance.relations?.placedInDesignIds ?? [];
  if (placed.includes(designId)) return asset;

  return assets.update(assetId, {
    provenance: {
      ...asset.provenance,
      relations: {
        ...(asset.provenance.relations ?? {}),
        placedInDesignIds: [...placed, designId],
      },
    },
  });
}
