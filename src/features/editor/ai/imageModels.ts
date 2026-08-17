// Image model DISPLAY registry.
//
// Capabilities are NOT duplicated here. The server declares what each model can
// do and `fetchImageCapabilities()` delivers it at runtime, so the UI can never
// offer a control the active model cannot honour and the two lists can never
// drift. This file owns only what a human sees: a name, a short name for the
// toolbar, a one-line hint, and whether the model is offered at all.
//
// `imageModels.test.ts` pins that every server model id has an entry here.

import type { ImageModelCaps, ImageModelAvailability } from '@/features/image-generation';

export const AUTO_MODEL_ID = 'auto';

export interface ImageModelDisplay {
  id: string;
  label: string;
  /** ≤ 7 chars — toolbar trigger. */
  short: string;
  hint: string;
  /** Offered in the picker. Hidden entries still resolve for old jobs. */
  listed: boolean;
}

export const IMAGE_MODEL_DISPLAY: ImageModelDisplay[] = [
  { id: 'google:nano-banana-pro', label: 'Nano Banana Pro', short: 'Nano+', hint: 'Highest fidelity, best with brand references', listed: true },
  { id: 'google:nano-banana',     label: 'Nano Banana',     short: 'Nano',  hint: 'Fast, strong with references',                  listed: true },
  { id: 'openai:gpt-image',       label: 'GPT Image',       short: 'GPT',   hint: 'Best text and logo fidelity',                    listed: true },
  { id: 'openai:gpt-image-mini',  label: 'GPT Image Mini',  short: 'GPT-m', hint: 'Cheaper, quicker',                               listed: true },
  { id: 'fal:flux-schnell',       label: 'Flux Schnell',    short: 'Flux+', hint: 'Very fast, no references',                       listed: true },
  { id: 'pollinations:flux',      label: 'Flux (free)',     short: 'Flux',  hint: 'Free — no references, softer results',           listed: true },
  { id: 'pollinations:turbo',     label: 'Flux Turbo (free)', short: 'Turbo', hint: 'Free and fastest',                             listed: true },
  { id: 'cloudflare:flux-schnell',  label: 'Flux (Cloudflare)',   short: 'CF',   hint: 'Workers AI',      listed: false },
  { id: 'huggingface:flux-schnell', label: 'Flux (Hugging Face)', short: 'HF',   hint: 'Inference API',   listed: false },
  { id: 'mock:svg',                 label: 'Mock',                short: 'Mock', hint: 'No network',      listed: false },
];

/** Ids older documents and callers may still carry. */
export const LEGACY_MODEL_ALIASES: Record<string, string> = {
  flux: 'pollinations:flux',
  turbo: 'pollinations:turbo',
  gptimage: 'pollinations:flux',
  kontext: 'pollinations:flux',
  'pollinations:gptimage': 'pollinations:flux',
  'pollinations:kontext': 'pollinations:flux',
};

export function resolveModelId(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return LEGACY_MODEL_ALIASES[id] ?? id;
}

export function displayFor(id: string | null | undefined): ImageModelDisplay | undefined {
  const resolved = resolveModelId(id);
  return IMAGE_MODEL_DISPLAY.find((m) => m.id === resolved);
}

export function modelLabel(id: string | null | undefined, autoTarget?: string): string {
  if (!id || id === AUTO_MODEL_ID) {
    const target = displayFor(autoTarget);
    return target ? `Auto · ${target.label}` : 'Auto';
  }
  return displayFor(id)?.label ?? id;
}

/**
 * Conservative capabilities used only before the server has answered. It claims
 * nothing optional, so no control is offered on a promise we can't keep.
 */
export const PENDING_CAPS: ImageModelCaps = {
  supportsReferenceImages: false,
  maxReferenceImages: 0,
  supportedAspectRatios: ['1:1', '4:5', '9:16', '16:9'],
  supportedSizes: [1024],
  supportedQualities: [],
  supportsMultipleOutputs: true,
  maxOutputs: 4,
  nPerCall: 1,
  supportsCancellation: true,
  supportsSeed: false,
  supportsNegativePrompt: true,
  supportsImageToImage: false,
  textRendering: 'ok',
};

/**
 * Caps for a model from a fetched capability set; `auto` resolves first.
 *
 * A response from an older deployment (mid rolling deploy, or a stale cache)
 * can carry a capability block this build does not understand. Rather than
 * hand the UI a half-shaped object, fall back to PENDING_CAPS — offering no
 * optional control is always safe; reading `undefined.supportedAspectRatios`
 * is not.
 */
export function isUsableCaps(caps: unknown): caps is ImageModelCaps {
  const c = caps as Partial<ImageModelCaps> | undefined;
  return !!c
    && Array.isArray(c.supportedAspectRatios) && c.supportedAspectRatios.length > 0
    && typeof c.maxOutputs === 'number'
    && typeof c.maxReferenceImages === 'number';
}

export function capsFrom(
  models: ImageModelAvailability[] | undefined,
  modelId: string,
  autoTarget?: string,
): ImageModelCaps {
  if (!models?.length) return PENDING_CAPS;
  const wanted = modelId === AUTO_MODEL_ID ? (autoTarget ?? '') : (resolveModelId(modelId) ?? '');
  const caps = models.find((m) => m.id === wanted)?.caps;
  return isUsableCaps(caps) ? caps : PENDING_CAPS;
}

export type { ImageModelCaps, ImageModelAvailability };
