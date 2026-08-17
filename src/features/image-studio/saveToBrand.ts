// "Save to Brand Assets" — the explicit step that turns a generation into
// brand material.
//
// Every output is already durable in storage; saving is about intent, not
// bytes. It registers the image in the Library with its provenance — the prompt
// that made it, the model, and the references that fed it — through the
// canonical `saveGeneratedMedia`, so a generated asset is never a second-class
// copy of something.

import type { IAssetsService } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';
import { saveGeneratedMedia } from '@/application/brand/generativeMedia';
import type { GeneratedOutput, GenerationJob } from '@/features/image-generation';

export async function saveOutputToBrand(input: {
  assets: IAssetsService;
  brand: Brand;
  job: GenerationJob;
  output: GeneratedOutput;
}): Promise<void> {
  const { assets, brand, job, output } = input;
  const name = job.userPrompt.trim().slice(0, 60) || 'Generated image';

  await saveGeneratedMedia(assets, {
    brandId: brand.id,
    name,
    url: output.url,
    storagePath: output.storagePath,
    size: output.bytes,
    type: 'image',
    prompt: job.compiledPrompt ?? job.userPrompt,
    model: job.model,
  });
}
