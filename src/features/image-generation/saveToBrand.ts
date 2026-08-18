// "Save to Brand Assets" — the explicit step that turns a generation into
// brand material.
//
// Every output is already durable in storage; saving is about intent, not
// bytes. It registers the image in the Library with its provenance — the prompt
// that made it and the model that made it — through the canonical
// `saveGeneratedMedia`, so a generated asset is never a second-class copy of
// something.

import type { IAssetsService } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';
import { saveGeneratedMedia } from '@/application/brand/generativeMedia';

export interface SaveGeneratedImageInput {
  assets: IAssetsService;
  brand: Brand;
  /** Where the bytes are. `storagePath` is durable; `url` may be a signed URL. */
  url: string;
  storagePath?: string;
  bytes?: number;
  /** Provenance — what was asked for, and what answered. */
  prompt: string;
  model: string;
  /** Falls back to the prompt's first words. */
  name?: string;
}

export async function saveGeneratedImageToBrand(input: SaveGeneratedImageInput): Promise<void> {
  const { assets, brand, url, storagePath, bytes, prompt, model, name } = input;

  await saveGeneratedMedia(assets, {
    brandId: brand.id,
    name: (name ?? prompt).trim().slice(0, 60) || 'Generated image',
    url,
    storagePath,
    size: bytes,
    type: 'image',
    prompt,
    model,
  });
}
