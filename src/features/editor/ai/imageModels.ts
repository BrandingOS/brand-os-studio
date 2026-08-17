// Image model registry — BROWSER mirror of
// `supabase/functions/_shared/imageModels.ts`.
//
// The server owns which models exist, their vendor, capabilities and
// unlocking secret. This file owns only what the UI needs to DRAW a
// model: label, short label, hint, badge, and a local copy of the caps
// so the panel can decide (before any network call) whether brand
// reference images are worth building. `imageModels.test.ts` pins that
// every id here exists on the server and that caps agree.
//
// Availability (is the key set?) is NOT known here — ask the server via
// `fetchImageModelAvailability()` in `generateImage.ts`.

export type ImageVendor =
  | 'openai' | 'google' | 'fal' | 'pollinations' | 'cloudflare' | 'huggingface' | 'mock';

export interface ImageModelCaps {
  maxRefs: number;
  text: 'strong' | 'ok' | 'weak';
  aspect: 'free' | 'enum';
  nMax: number;
  img2img: boolean;
}

export interface ImageModelInfo {
  id: string;
  vendor: ImageVendor;
  tier: 'free' | 'paid';
  /** Secret that unlocks it (owner-facing hint when unavailable). */
  keyEnv?: string;
  label: string;
  /** ≤ 7 chars — toolbar trigger. */
  short: string;
  hint: string;
  caps: ImageModelCaps;
  /** Show in the picker. Hidden entries still resolve if a doc recorded them. */
  listed: boolean;
}

export const AUTO_MODEL_ID = 'auto';

export const IMAGE_MODEL_INFOS: ImageModelInfo[] = [
  {
    id: 'google:nano-banana', vendor: 'google', tier: 'paid', keyEnv: 'GEMINI_API_KEY',
    label: 'Nano Banana', short: 'Nano', hint: 'Best with brand refs',
    caps: { maxRefs: 5, text: 'strong', aspect: 'enum', nMax: 1, img2img: true }, listed: true,
  },
  {
    id: 'google:nano-banana-pro', vendor: 'google', tier: 'paid', keyEnv: 'GEMINI_API_KEY',
    label: 'Nano Banana Pro', short: 'Nano+', hint: 'Highest fidelity',
    caps: { maxRefs: 8, text: 'strong', aspect: 'enum', nMax: 1, img2img: true }, listed: true,
  },
  {
    id: 'openai:gpt-image', vendor: 'openai', tier: 'paid', keyEnv: 'OPENAI_API_KEY',
    label: 'GPT Image', short: 'GPT', hint: 'Text + logo faithful',
    caps: { maxRefs: 8, text: 'strong', aspect: 'free', nMax: 4, img2img: true }, listed: true,
  },
  {
    id: 'openai:gpt-image-mini', vendor: 'openai', tier: 'paid', keyEnv: 'OPENAI_API_KEY',
    label: 'GPT Image Mini', short: 'GPT-m', hint: 'Cheaper, faster',
    caps: { maxRefs: 8, text: 'ok', aspect: 'free', nMax: 4, img2img: true }, listed: true,
  },
  {
    id: 'fal:flux-schnell', vendor: 'fal', tier: 'paid', keyEnv: 'FAL_API_KEY',
    label: 'Flux Schnell (fal)', short: 'Flux+', hint: 'Fast, sharp',
    caps: { maxRefs: 1, text: 'weak', aspect: 'free', nMax: 4, img2img: true }, listed: true,
  },
  {
    id: 'pollinations:flux', vendor: 'pollinations', tier: 'free',
    label: 'Flux (free)', short: 'Flux', hint: 'Free · no key',
    caps: { maxRefs: 1, text: 'weak', aspect: 'free', nMax: 1, img2img: true }, listed: true,
  },
  {
    id: 'pollinations:turbo', vendor: 'pollinations', tier: 'free',
    label: 'Flux Turbo (free)', short: 'Turbo', hint: 'Fastest',
    caps: { maxRefs: 0, text: 'weak', aspect: 'free', nMax: 1, img2img: false }, listed: true,
  },
  {
    id: 'pollinations:gptimage', vendor: 'pollinations', tier: 'free',
    label: 'GPT Image (free)', short: 'GPT-f', hint: 'Text-aware, free',
    caps: { maxRefs: 0, text: 'ok', aspect: 'free', nMax: 1, img2img: false }, listed: true,
  },
  {
    id: 'pollinations:kontext', vendor: 'pollinations', tier: 'free',
    label: 'Flux Kontext (free)', short: 'Kontxt', hint: 'Image-to-image',
    caps: { maxRefs: 1, text: 'weak', aspect: 'free', nMax: 1, img2img: true }, listed: false,
  },
  {
    id: 'cloudflare:flux-schnell', vendor: 'cloudflare', tier: 'free', keyEnv: 'CLOUDFLARE_API_TOKEN',
    label: 'Flux (Cloudflare)', short: 'CF', hint: 'Workers AI',
    caps: { maxRefs: 0, text: 'weak', aspect: 'free', nMax: 1, img2img: false }, listed: false,
  },
  {
    id: 'huggingface:flux-schnell', vendor: 'huggingface', tier: 'free', keyEnv: 'HUGGINGFACE_API_KEY',
    label: 'Flux (Hugging Face)', short: 'HF', hint: 'Inference API',
    caps: { maxRefs: 0, text: 'weak', aspect: 'free', nMax: 1, img2img: false }, listed: false,
  },
  {
    id: 'mock:svg', vendor: 'mock', tier: 'free',
    label: 'Mock', short: 'Mock', hint: 'No network',
    caps: { maxRefs: 8, text: 'weak', aspect: 'free', nMax: 4, img2img: true }, listed: false,
  },
];

/** Legacy ids older docs / callers used (`'flux'`) → registry ids. */
export const LEGACY_MODEL_ALIASES: Record<string, string> = {
  flux: 'pollinations:flux',
  turbo: 'pollinations:turbo',
  gptimage: 'pollinations:gptimage',
  kontext: 'pollinations:kontext',
};

export function findImageModelInfo(id: string | undefined | null): ImageModelInfo | undefined {
  if (!id) return undefined;
  const resolved = LEGACY_MODEL_ALIASES[id] ?? id;
  return IMAGE_MODEL_INFOS.find((m) => m.id === resolved);
}

/** Caps used when the model is 'auto' (unknown until the server picks) —
 *  assume refs are welcome so the brand refs get built; the server drops
 *  them for vendors that can't take them and warns. */
export const AUTO_CAPS: ImageModelCaps = { maxRefs: 8, text: 'strong', aspect: 'free', nMax: 4, img2img: true };

export function capsFor(id: string | undefined | null): ImageModelCaps {
  if (!id || id === AUTO_MODEL_ID) return AUTO_CAPS;
  return findImageModelInfo(id)?.caps ?? AUTO_CAPS;
}

export interface ImageModelAvailability {
  id: string;
  available: boolean;
  reason?: 'missing-key' | 'disabled';
  keyEnv?: string;
}
