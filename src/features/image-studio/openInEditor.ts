// "Open in the design editor" — the seam between image generation and layered
// design.
//
// A generated image is an ASSET. Taking it further means putting it on a canvas
// where type, shapes and brand slots can sit on top of it, which is what the
// existing editor is for. This creates a one-page document holding the image
// and hands back its id; nothing about the editor changes.

import type { IDesignStorage } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { GeneratedOutput, GenerationJob } from '@/features/image-generation';

export async function openOutputInEditor(input: {
  designStorage: IDesignStorage;
  brand: Brand;
  job: GenerationJob;
  output: GeneratedOutput;
}): Promise<string> {
  const { designStorage, brand, job, output } = input;
  const width = output.width ?? 1024;
  const height = output.height ?? 1024;
  const designId = crypto.randomUUID();
  const name = job.userPrompt.trim().slice(0, 60) || 'Generated image';

  const doc: BrandOSDocument = {
    schemaVersion: 1,
    id: designId,
    contentType: 'social-post',
    brandId: brand.id,
    masterPages: [],
    pages: [{
      id: crypto.randomUUID(),
      name: 'Page 1',
      width, height,
      background: '#ffffff',
      masterPageId: null,
      layers: [{
        id: crypto.randomUUID(),
        kind: 'image',
        name: 'Generated image',
        src: output.url,
        fit: 'cover',
        transform: { x: 0, y: 0, width, height, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, visible: true, locked: false, brandLocked: false,
      }],
    }],
    metadata: {
      // Keep the lineage: which job made this, and where the bytes live.
      generatedFrom: { jobId: job.id, storagePath: output.storagePath, model: job.model },
    },
  };

  await designStorage.saveDesign(brand.id, designId, doc, {
    id: designId, name, contentType: 'social-post', width, height,
  });
  return designId;
}
