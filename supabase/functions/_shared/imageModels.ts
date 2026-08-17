// Image model registry — the SERVER truth for which image models exist, which
// vendor serves each, WHAT EACH ONE CAN DO, and which secret unlocks it.
//
// The capability block is the contract the UI renders from: the browser must
// never offer a control the active model cannot honour. Adding a model = one
// entry here + one display entry in `src/features/editor/ai/imageModels.ts`
// (a test pins the two together) + a provider adapter if the vendor is new.
//
// Pure module: no Deno imports, so the browser test can read it as text.

export type ImageVendor =
  | 'openai'
  | 'google'
  | 'fal'
  | 'pollinations'
  | 'cloudflare'
  | 'huggingface'
  | 'mock';

/** Aspect ratios the product offers. A model declares which it can honour. */
export const ALL_ASPECT_RATIOS = [
  '1:1', '4:5', '2:3', '9:16', '4:3', '3:2', '16:9', '21:9',
] as const;
export type AspectRatio = (typeof ALL_ASPECT_RATIOS)[number];

export type ImageQuality = 'low' | 'medium' | 'high';

export interface ImageModelCaps {
  /** Can the model take reference images at all. */
  supportsReferenceImages: boolean;
  /** How many the vendor call accepts (0 when unsupported). */
  maxReferenceImages: number;
  /** Aspect ratios the model can actually produce. */
  supportedAspectRatios: AspectRatio[];
  /** Long edge in px the model can target. Empty = it decides. */
  supportedSizes: number[];
  /** Quality tiers, or [] when the vendor has none. */
  supportedQualities: ImageQuality[];
  /** More than one image per request (via vendor `n` or our fan-out). */
  supportsMultipleOutputs: boolean;
  /** Max candidates we will ask for in one job. */
  maxOutputs: number;
  /** Candidates the vendor returns in ONE call; above this we fan out. */
  nPerCall: number;
  /** The provider call can be aborted mid-flight and stops billing. */
  supportsCancellation: boolean;
  supportsSeed: boolean;
  supportsNegativePrompt: boolean;
  /** Re-imagine an input image (variations / refine). */
  supportsImageToImage: boolean;
  /** How well it renders legible text and logos. */
  textRendering: 'strong' | 'ok' | 'weak';
}

export interface ImageModelDef {
  /** `vendor:model` — the ONLY id the browser sends. */
  id: string;
  vendor: ImageVendor;
  /** What the vendor API receives. Overridable via `vendorModelEnv`. */
  vendorModel: string;
  vendorModelEnv?: string;
  tier: 'free' | 'paid';
  /** Secret that unlocks the model. Unset → always available. */
  keyEnv?: string;
  caps: ImageModelCaps;
}

const SQUARE_ONLY: AspectRatio[] = ['1:1'];
const COMMON: AspectRatio[] = ['1:1', '4:5', '2:3', '9:16', '4:3', '3:2', '16:9', '21:9'];
/** Gemini's imageConfig enum covers every ratio we offer. */
const GEMINI_RATIOS: AspectRatio[] = COMMON;

export const IMAGE_MODELS: ImageModelDef[] = [
  // ── Google — Nano Banana ──────────────────────────────────────────────────
  {
    id: 'google:nano-banana',
    vendor: 'google',
    vendorModel: 'gemini-2.5-flash-image',
    vendorModelEnv: 'GEMINI_IMAGE_MODEL',
    tier: 'paid',
    keyEnv: 'GEMINI_API_KEY',
    caps: {
      supportsReferenceImages: true, maxReferenceImages: 5,
      supportedAspectRatios: GEMINI_RATIOS, supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
      supportsImageToImage: true, textRendering: 'strong',
    },
  },
  {
    id: 'google:nano-banana-pro',
    vendor: 'google',
    vendorModel: 'gemini-3-pro-image-preview',
    vendorModelEnv: 'GEMINI_IMAGE_PRO_MODEL',
    tier: 'paid',
    keyEnv: 'GEMINI_API_KEY',
    caps: {
      supportsReferenceImages: true, maxReferenceImages: 8,
      supportedAspectRatios: GEMINI_RATIOS, supportedSizes: [1024, 2048],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
      supportsImageToImage: true, textRendering: 'strong',
    },
  },
  // ── OpenAI — GPT Image ────────────────────────────────────────────────────
  {
    id: 'openai:gpt-image',
    vendor: 'openai',
    vendorModel: 'gpt-image-1.5',
    vendorModelEnv: 'OPENAI_IMAGE_MODEL',
    tier: 'paid',
    keyEnv: 'OPENAI_API_KEY',
    caps: {
      supportsReferenceImages: true, maxReferenceImages: 8,
      supportedAspectRatios: COMMON, supportedSizes: [1024, 1536],
      supportedQualities: ['low', 'medium', 'high'],
      supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 4,
      supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
      supportsImageToImage: true, textRendering: 'strong',
    },
  },
  {
    id: 'openai:gpt-image-mini',
    vendor: 'openai',
    vendorModel: 'gpt-image-1-mini',
    vendorModelEnv: 'OPENAI_IMAGE_MINI_MODEL',
    tier: 'paid',
    keyEnv: 'OPENAI_API_KEY',
    caps: {
      supportsReferenceImages: true, maxReferenceImages: 8,
      supportedAspectRatios: COMMON, supportedSizes: [1024],
      supportedQualities: ['low', 'medium', 'high'],
      supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 4,
      supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
      supportsImageToImage: true, textRendering: 'ok',
    },
  },
  // ── fal.ai ────────────────────────────────────────────────────────────────
  {
    id: 'fal:flux-schnell',
    vendor: 'fal',
    vendorModel: 'fal-ai/flux/schnell',
    tier: 'paid',
    keyEnv: 'FAL_API_KEY',
    caps: {
      supportsReferenceImages: false, maxReferenceImages: 0,
      supportedAspectRatios: COMMON, supportedSizes: [1024, 1536, 2048],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 4,
      supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: false,
      supportsImageToImage: false, textRendering: 'weak',
    },
  },
  // ── Pollinations — free, no key ───────────────────────────────────────────
  {
    id: 'pollinations:flux',
    vendor: 'pollinations',
    vendorModel: 'flux',
    tier: 'free',
    caps: {
      supportsReferenceImages: false, maxReferenceImages: 0,
      supportedAspectRatios: COMMON, supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: true,
      supportsImageToImage: false, textRendering: 'weak',
    },
  },
  {
    id: 'pollinations:turbo',
    vendor: 'pollinations',
    vendorModel: 'turbo',
    tier: 'free',
    caps: {
      supportsReferenceImages: false, maxReferenceImages: 0,
      supportedAspectRatios: COMMON, supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: true,
      supportsImageToImage: false, textRendering: 'weak',
    },
  },
  // ── Cloudflare Workers AI ─────────────────────────────────────────────────
  {
    id: 'cloudflare:flux-schnell',
    vendor: 'cloudflare',
    vendorModel: '@cf/black-forest-labs/flux-1-schnell',
    tier: 'free',
    keyEnv: 'CLOUDFLARE_API_TOKEN',
    caps: {
      supportsReferenceImages: false, maxReferenceImages: 0,
      supportedAspectRatios: SQUARE_ONLY, supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: false,
      supportsImageToImage: false, textRendering: 'weak',
    },
  },
  // ── Hugging Face Inference ────────────────────────────────────────────────
  {
    id: 'huggingface:flux-schnell',
    vendor: 'huggingface',
    vendorModel: 'black-forest-labs/FLUX.1-schnell',
    vendorModelEnv: 'HUGGINGFACE_MODEL',
    tier: 'free',
    keyEnv: 'HUGGINGFACE_API_KEY',
    caps: {
      supportsReferenceImages: false, maxReferenceImages: 0,
      supportedAspectRatios: SQUARE_ONLY, supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
      supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: false,
      supportsImageToImage: false, textRendering: 'weak',
    },
  },
  // ── Deterministic mock (no network) ───────────────────────────────────────
  {
    id: 'mock:svg',
    vendor: 'mock',
    vendorModel: 'mock',
    tier: 'free',
    caps: {
      supportsReferenceImages: true, maxReferenceImages: 8,
      supportedAspectRatios: COMMON, supportedSizes: [1024],
      supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 4,
      supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: true,
      supportsImageToImage: true, textRendering: 'weak',
    },
  },
];

/** Legacy ids older callers sent (`model: 'flux'`) → registry ids. */
export const LEGACY_MODEL_ALIASES: Record<string, string> = {
  flux: 'pollinations:flux',
  turbo: 'pollinations:turbo',
  gptimage: 'pollinations:flux',
  kontext: 'pollinations:flux',
  'pollinations:gptimage': 'pollinations:flux',
  'pollinations:kontext': 'pollinations:flux',
};

/** Order `auto` resolves in — best brand fidelity first, free last. */
export const AUTO_ORDER: string[] = [
  'google:nano-banana-pro',
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

/** `getEnv` is injected so this stays a pure module (Deno.env on the server). */
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

// ─── Settings coercion ───────────────────────────────────────────────────────
// The server never trusts the client to have respected the capabilities. Every
// requested setting is snapped to something the model can actually do, and the
// adjustments are reported so the UI can say what happened.

export interface RequestedSettings {
  aspectRatio?: string;
  size?: number;
  quality?: string;
  count?: number;
  seed?: number;
  negativePrompt?: string;
  referenceCount?: number;
}

export interface CoercedSettings {
  aspectRatio: AspectRatio;
  size: number;
  quality?: ImageQuality;
  count: number;
  seed?: number;
  negativePrompt?: string;
  maxReferences: number;
  adjustments: string[];
}

export function aspectToDimensions(ratio: AspectRatio, longEdge: number): { width: number; height: number } {
  const [w, h] = ratio.split(':').map(Number);
  const scale = longEdge / Math.max(w, h);
  // Keep both edges divisible by 16 — every vendor is happier, and OpenAI
  // rejects anything else outright.
  const round16 = (n: number) => Math.max(256, Math.round(n / 16) * 16);
  return { width: round16(w * scale), height: round16(h * scale) };
}

export function coerceSettings(def: ImageModelDef, req: RequestedSettings): CoercedSettings {
  const adjustments: string[] = [];
  const caps = def.caps;

  let aspectRatio = (req.aspectRatio ?? '1:1') as AspectRatio;
  if (!caps.supportedAspectRatios.includes(aspectRatio)) {
    const fallback = caps.supportedAspectRatios[0] ?? '1:1';
    adjustments.push(`aspect ${aspectRatio} → ${fallback}`);
    aspectRatio = fallback;
  }

  const sizes = caps.supportedSizes.length ? caps.supportedSizes : [1024];
  let size = req.size ?? sizes[0];
  if (!sizes.includes(size)) {
    const nearest = sizes.reduce((a, b) => (Math.abs(b - size) < Math.abs(a - size) ? b : a), sizes[0]);
    if (req.size) adjustments.push(`size ${size} → ${nearest}`);
    size = nearest;
  }

  let quality: ImageQuality | undefined;
  if (caps.supportedQualities.length) {
    quality = (req.quality as ImageQuality) ?? 'medium';
    if (!caps.supportedQualities.includes(quality)) {
      quality = caps.supportedQualities.includes('medium') ? 'medium' : caps.supportedQualities[0];
      adjustments.push(`quality → ${quality}`);
    }
  } else if (req.quality) {
    adjustments.push('quality not supported by this model');
  }

  let count = Math.trunc(req.count ?? 1) || 1;
  if (count < 1) count = 1;
  if (!caps.supportsMultipleOutputs && count > 1) {
    adjustments.push(`${count} outputs → 1 (model returns one image)`);
    count = 1;
  }
  if (count > caps.maxOutputs) {
    adjustments.push(`${count} outputs → ${caps.maxOutputs}`);
    count = caps.maxOutputs;
  }

  let seed: number | undefined;
  if (typeof req.seed === 'number' && Number.isFinite(req.seed)) {
    if (caps.supportsSeed) seed = Math.trunc(req.seed);
    else adjustments.push('seed not supported by this model');
  }

  let negativePrompt: string | undefined;
  if (req.negativePrompt?.trim()) {
    if (caps.supportsNegativePrompt) negativePrompt = req.negativePrompt.trim();
    else adjustments.push('negative prompt not supported by this model');
  }

  const maxReferences = caps.supportsReferenceImages ? caps.maxReferenceImages : 0;
  if ((req.referenceCount ?? 0) > maxReferences) {
    adjustments.push(
      maxReferences === 0
        ? 'reference images ignored — this model is prompt-only'
        : `${req.referenceCount} references → ${maxReferences}`,
    );
  }

  return { aspectRatio, size, quality, count, seed, negativePrompt, maxReferences, adjustments };
}
