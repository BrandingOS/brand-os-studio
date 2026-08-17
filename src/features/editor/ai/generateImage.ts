// Editor-facing wrapper over the image generation domain layer.
//
// The editor's Generate panel deals in "give me N images for this page"; the
// domain layer deals in jobs, credits and durable storage. This adapter is the
// seam. It exists so the editor keeps one import while all the policy — auth,
// tenancy, idempotency, metering — lives in one place for every caller.

import {
  runGeneration,
  cancelGeneration,
  newIdempotencyKey,
  fetchImageCapabilities,
  ImageGenerationError,
  type GenerationRequest,
  type GeneratedOutput,
  type JobResult,
} from '@/features/image-generation';

export { ImageGenerationError, newIdempotencyKey, fetchImageCapabilities };
export type { GeneratedOutput, JobResult, GenerationRequest };

/** Style presets, applied browser-side by appending to the prompt. */
export const IMAGE_STYLES: { id: string; label: string; suffix: string }[] = [
  { id: 'none',         label: 'No style',     suffix: '' },
  { id: 'photographic', label: 'Photographic', suffix: ', photographic, professional photography, natural lighting, ultra-detailed' },
  { id: 'cinematic',    label: 'Cinematic',    suffix: ', cinematic, dramatic lighting, film grain, depth of field, color graded' },
  { id: 'illustration', label: 'Illustration', suffix: ', vector illustration, flat design, bold colors, clean lines' },
  { id: '3d',           label: '3D render',    suffix: ', 3D render, octane render, soft global illumination, depth of field' },
  { id: 'anime',        label: 'Anime',        suffix: ', anime style, studio ghibli inspired, soft colors' },
  { id: 'watercolor',   label: 'Watercolor',   suffix: ', watercolor painting, soft brush strokes, paper texture' },
  { id: 'pixar',        label: 'Pixar 3D',     suffix: ', pixar 3d animation style, vibrant, family friendly, expressive' },
];

export interface GenerateImageArgs extends GenerationRequest {
  /** Style preset id from IMAGE_STYLES. */
  styleId?: string;
}

export interface GenerateImageResult {
  /** Durable outputs: a storage path plus a long-lived signed URL. */
  images: GeneratedOutput[];
  jobId: string;
  model: string;
  chargedCredits: number;
  balance: number;
  warnings?: string[];
}

export async function generateImage(
  args: GenerateImageArgs,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<GenerateImageResult> {
  const style = args.styleId ? IMAGE_STYLES.find((s) => s.id === args.styleId) : undefined;
  const suffix = style?.suffix ?? '';
  const compiled = `${args.compiledPrompt || args.userPrompt}${suffix}`;

  const result: JobResult = await runGeneration(
    {
      ...args,
      compiledPrompt: compiled,
      idempotencyKey: args.idempotencyKey ?? newIdempotencyKey(),
    },
    opts,
  );

  if (result.job.status !== 'succeeded') {
    throw new ImageGenerationError({
      code: result.job.errorCode ?? 'unknown',
      message: result.job.errorMessage ?? 'Generation did not complete.',
      jobId: result.job.id,
    });
  }

  return {
    images: result.job.outputs,
    jobId: result.job.id,
    model: result.job.model,
    chargedCredits: result.job.chargedCredits,
    balance: result.credits.balance,
    warnings: result.warnings,
  };
}

export { cancelGeneration };
