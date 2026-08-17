// Image model registry — the SERVER truth for which image models exist,
// which vendor serves each, what it can do, and which secret unlocks it.
//
// The browser keeps a display mirror in
// `src/features/editor/ai/imageModels.ts` (labels, badges) keyed by the
// same ids; a unit test there pins that every client id exists here.
// Adding a model = one entry here + one display entry there (+ a
// `dispatchX` in ai-generate-image if it's a new vendor).
//
// Pure module: no Deno imports, so the client test can read it as text.

export type ImageVendor =
  | 'openai'
  | 'google'
  | 'fal'
  | 'pollinations'
  | 'cloudflare'
  | 'huggingface'
  | 'mock';

export interface ImageModelCaps {
  /** How many reference images the vendor call accepts (0 = text only). */
  maxRefs: number;
  /** How well the model renders legible text / logos. */
  text: 'strong' | 'ok' | 'weak';
  /** 'free' honours arbitrary W×H; 'enum' snaps to a fixed size list. */
  aspect: 'free' | 'enum';
  /** Max candidates in ONE vendor call (we fan out above this). */
  nMax: number;
  /** Can take a previous image and re-imagine it (variations / refine). */
  img2img: boolean;
}

export interface ImageModelDef {
  /** `vendor:model` — the ONLY id the browser sends. */
  id: string;
  vendor: ImageVendor;
  /** What the vendor API receives. Env override name in `vendorModelEnv`. */
  vendorModel: string;
  vendorModelEnv?: string;
  tier: 'free' | 'paid';
  /** Secret that unlocks the model. Unset → model unavailable. */
  keyEnv?: string;
  caps: ImageModelCaps;
}

export const IMAGE_MODELS: ImageModelDef[] = [
  // ── Google — Nano Banana ────────────────────────────────────────────
  {
    id: 'google:nano-banana',
    vendor: 'google',
    vendorModel: 'gemini-2.5-flash-image',
    vendorModelEnv: 'GEMINI_IMAGE_MODEL',
    tier: 'paid',
    keyEnv: 'GEMINI_API_KEY',
    caps: { maxRefs: 5, text: 'strong', aspect: 'enum', nMax: 1, img2img: true },
  },
  {
    id: 'google:nano-banana-pro',
    vendor: 'google',
    vendorModel: 'gemini-3-pro-image-preview',
    vendorModelEnv: 'GEMINI_IMAGE_PRO_MODEL',
    tier: 'paid',
    keyEnv: 'GEMINI_API_KEY',
    caps: { maxRefs: 8, text: 'strong', aspect: 'enum', nMax: 1, img2img: true },
  },
  // ── OpenAI — GPT Image ──────────────────────────────────────────────
  {
    id: 'openai:gpt-image',
    vendor: 'openai',
    vendorModel: 'gpt-image-1.5',
    vendorModelEnv: 'OPENAI_IMAGE_MODEL',
    tier: 'paid',
    keyEnv: 'OPENAI_API_KEY',
    caps: { maxRefs: 8, text: 'strong', aspect: 'free', nMax: 4, img2img: true },
  },
  {
    id: 'openai:gpt-image-mini',
    vendor: 'openai',
    vendorModel: 'gpt-image-1-mini',
    vendorModelEnv: 'OPENAI_IMAGE_MINI_MODEL',
    tier: 'paid',
    keyEnv: 'OPENAI_API_KEY',
    caps: { maxRefs: 8, text: 'ok', aspect: 'free', nMax: 4, img2img: true },
  },
  // ── fal.ai — Flux ───────────────────────────────────────────────────
  {
    id: 'fal:flux-schnell',
    vendor: 'fal',
    vendorModel: 'fal-ai/flux/schnell',
    tier: 'paid',
    keyEnv: 'FAL_API_KEY',
    caps: { maxRefs: 1, text: 'weak', aspect: 'free', nMax: 4, img2img: true },
  },
  // ── Pollinations — free, no key ─────────────────────────────────────
  {
    id: 'pollinations:flux',
    vendor: 'pollinations',
    vendorModel: 'flux',
    tier: 'free',
    caps: { maxRefs: 1, text: 'weak', aspect: 'free', nMax: 1, img2img: true },
  },
  {
    id: 'pollinations:turbo',
    vendor: 'pollinations',
    vendorModel: 'turbo',
    tier: 'free',
    caps: { maxRefs: 0, text: 'weak', aspect: 'free', nMax: 1, img2img: false },
  },
  {
    id: 'pollinations:gptimage',
    vendor: 'pollinations',
    vendorModel: 'gptimage',
    tier: 'free',
    caps: { maxRefs: 0, text: 'ok', aspect: 'free', nMax: 1, img2img: false },
  },
  {
    id: 'pollinations:kontext',
    vendor: 'pollinations',
    vendorModel: 'kontext',
    tier: 'free',
    caps: { maxRefs: 1, text: 'weak', aspect: 'free', nMax: 1, img2img: true },
  },
  // ── Cloudflare Workers AI ───────────────────────────────────────────
  {
    id: 'cloudflare:flux-schnell',
    vendor: 'cloudflare',
    vendorModel: '@cf/black-forest-labs/flux-1-schnell',
    tier: 'free',
    keyEnv: 'CLOUDFLARE_API_TOKEN',
    caps: { maxRefs: 0, text: 'weak', aspect: 'free', nMax: 1, img2img: false },
  },
  // ── Hugging Face Inference ──────────────────────────────────────────
  {
    id: 'huggingface:flux-schnell',
    vendor: 'huggingface',
    vendorModel: 'black-forest-labs/FLUX.1-schnell',
    vendorModelEnv: 'HUGGINGFACE_MODEL',
    tier: 'free',
    keyEnv: 'HUGGINGFACE_API_KEY',
    caps: { maxRefs: 0, text: 'weak', aspect: 'free', nMax: 1, img2img: false },
  },
  // ── Deterministic mock (no network) ─────────────────────────────────
  {
    id: 'mock:svg',
    vendor: 'mock',
    vendorModel: 'mock',
    tier: 'free',
    caps: { maxRefs: 8, text: 'weak', aspect: 'free', nMax: 4, img2img: true },
  },
];

/** Legacy ids the browser used to send (`model: 'flux'`) → registry ids. */
export const LEGACY_MODEL_ALIASES: Record<string, string> = {
  flux: 'pollinations:flux',
  turbo: 'pollinations:turbo',
  gptimage: 'pollinations:gptimage',
  kontext: 'pollinations:kontext',
};

/** Order `auto` resolves in — best brand fidelity first, free last. */
export const AUTO_ORDER: string[] = [
  'google:nano-banana',
  'openai:gpt-image',
  'fal:flux-schnell',
  'pollinations:flux',
];

export function findImageModel(id: string | undefined): ImageModelDef | undefined {
  if (!id) return undefined;
  const resolved = LEGACY_MODEL_ALIASES[id] ?? id;
  return IMAGE_MODELS.find((m) => m.id === resolved);
}

/** `getEnv` is injected so this stays a pure module (Deno.env on the
 *  server, a stub in tests). */
export function isModelAvailable(def: ImageModelDef, getEnv: (k: string) => string | undefined): boolean {
  if (def.vendor === 'mock') return true;
  if (def.vendor === 'cloudflare') {
    return !!getEnv('CLOUDFLARE_ACCOUNT_ID') && !!getEnv('CLOUDFLARE_API_TOKEN');
  }
  if (!def.keyEnv) return true;
  return !!getEnv(def.keyEnv);
}

export function resolveAutoModel(getEnv: (k: string) => string | undefined): ImageModelDef {
  for (const id of AUTO_ORDER) {
    const def = findImageModel(id);
    if (def && isModelAvailable(def, getEnv)) return def;
  }
  return findImageModel('pollinations:flux')!;
}

export function vendorModelFor(def: ImageModelDef, getEnv: (k: string) => string | undefined): string {
  if (def.vendorModelEnv) {
    const override = getEnv(def.vendorModelEnv);
    if (override) return override;
  }
  return def.vendorModel;
}
