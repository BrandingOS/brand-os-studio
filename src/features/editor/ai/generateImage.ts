// Browser-side wrapper for the ai-generate-image Edge Function.
//
// The Edge Function is a model-routed dispatcher (see
// `supabase/functions/ai-generate-image/index.ts` + the registry in
// `_shared/imageModels.ts`). This wrapper stays thin: it resolves the
// session id, attaches auth, applies the browser-side style suffix, and
// normalizes the response so `images[]` is ALWAYS present (older
// responses only carried `imageUrl`).

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import type { ImageModelAvailability } from './imageModels';

/** Kept for older call sites — the Model dropdown now reads the registry. */
export const IMAGE_MODELS = ['flux', 'turbo', 'gptimage'] as const;
export type ImageModel = (typeof IMAGE_MODELS)[number];

/** Built-in style presets. Applied browser-side by appending the
 *  suffix so the Edge Function payload stays vendor-agnostic. */
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

export type ReferenceRole = 'logo' | 'palette' | 'style' | 'image' | 'previous';

export interface ImageReference {
  role: ReferenceRole;
  /** Inline image — reaches every vendor that accepts references. */
  dataUrl?: string;
  /** Public URL — Pollinations / fal read these directly. */
  url?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  /** Registry id (`google:nano-banana`, `openai:gpt-image`, …), a legacy
   *  alias (`flux`), or `'auto'` (server picks the best available). */
  model?: string;
  /** 1–4 candidates. Default 1. */
  count?: number;
  seed?: number;
  /** Style preset id from IMAGE_STYLES — appended browser-side. */
  styleId?: string;
  negativePrompt?: string;
  references?: ImageReference[];
  /** Legacy single public reference URL — still honoured. */
  referenceImageUrl?: string;
}

export interface GeneratedImage {
  imageUrl: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface GenerateImageResult {
  /** Always ≥ 1 entry on success. */
  images: GeneratedImage[];
  /** = images[0].imageUrl (legacy). */
  imageUrl: string;
  mock: boolean;
  prompt: string;
  /** Registry id the server actually used (resolves 'auto'). */
  model?: string;
  width?: number;
  height?: number;
  /** e.g. 'refs-unsupported', '1 of 4 candidates failed'. */
  warnings?: string[];
}

export class GenerateImageError extends Error {
  status: number;
  code?: string;
  model?: string;
  keyEnv?: string;
  constructor(message: string, opts: { status: number; code?: string; model?: string; keyEnv?: string }) {
    super(message);
    this.name = 'GenerateImageError';
    this.status = opts.status;
    this.code = opts.code;
    this.model = opts.model;
    this.keyEnv = opts.keyEnv;
  }
}

const ENDPOINT_PATH = '/functions/v1/ai-generate-image';
const TIMEOUT_MS = 180_000; // paid vendors with 4 candidates can take a while

function endpointUrl(override?: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
  return override ?? `${baseUrl}${ENDPOINT_PATH}`;
}

// The Edge Function gateway verifies a JWT on every call (Supabase
// default), so ALWAYS send one: the user's session token when signed in,
// the anon key otherwise (dev bypass / guests). `apikey` rides along like
// supabase-js does.
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch { /* anon */ }
  return headers;
}

export async function generateImage(
  args: GenerateImageRequest,
  opts: { fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<GenerateImageResult> {
  const fetcher = opts.fetchImpl ?? fetch;
  const url = endpointUrl(opts.endpoint);
  const sessionId = await resolveSessionId();
  const headers = await authHeaders();

  const style = args.styleId ? IMAGE_STYLES.find((s) => s.id === args.styleId) : undefined;
  const effectivePrompt = `${args.prompt}${style?.suffix ?? ''}`;

  const payload: Record<string, unknown> = {
    sessionId,
    prompt: effectivePrompt,
    negativePrompt: args.negativePrompt || undefined,
    width: args.width,
    height: args.height,
    model: args.model,
    count: args.count,
    seed: args.seed,
    references: args.references?.length ? args.references : undefined,
    referenceImageUrl: args.referenceImageUrl,
  };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers,
      signal: ctrl.signal,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let parsed: { error?: string; message?: string; model?: string; keyEnv?: string } | null = null;
      try { parsed = JSON.parse(text); } catch { /* plain text */ }
      const detail = parsed?.message ?? text;
      throw new GenerateImageError(
        `AI image service ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        { status: res.status, code: parsed?.error, model: parsed?.model, keyEnv: parsed?.keyEnv },
      );
    }
    const raw = (await res.json()) as Partial<GenerateImageResult> & { imageUrl?: string };
    const images: GeneratedImage[] = raw.images?.length
      ? raw.images
      : raw.imageUrl
        ? [{ imageUrl: raw.imageUrl, width: raw.width, height: raw.height }]
        : [];
    if (images.length === 0) {
      throw new GenerateImageError('AI image service returned no image', { status: 502 });
    }
    return {
      images,
      imageUrl: images[0].imageUrl,
      width: raw.width ?? images[0].width,
      height: raw.height ?? images[0].height,
      mock: !!raw.mock,
      prompt: raw.prompt ?? effectivePrompt,
      model: raw.model,
      warnings: raw.warnings,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Ask the server which models are unlocked (keys set). Cached per page
 *  load; a failure resolves to "everything unknown" so the picker still
 *  renders (free models are assumed available). */
let availabilityCache: Promise<{ models: ImageModelAvailability[]; auto: string }> | null = null;
export function fetchImageModelAvailability(
  opts: { fetchImpl?: typeof fetch; endpoint?: string; force?: boolean } = {},
): Promise<{ models: ImageModelAvailability[]; auto: string }> {
  if (availabilityCache && !opts.force) return availabilityCache;
  const fetcher = opts.fetchImpl ?? fetch;
  availabilityCache = (async () => {
    try {
      const headers = await authHeaders();
      const res = await fetcher(endpointUrl(opts.endpoint), {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'models' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { models: ImageModelAvailability[]; auto: string };
    } catch {
      availabilityCache = null; // let a later call retry
      return { models: [], auto: 'pollinations:flux' };
    }
  })();
  return availabilityCache;
}

/** Test hook. */
export function _resetAvailabilityCache(): void {
  availabilityCache = null;
}

const ANON_KEY = 'brandos.ai-image.anon-session';
async function resolveSessionId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch { /* fall through */ }
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const fresh = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(ANON_KEY, fresh);
    return fresh;
  } catch {
    return `anon-${crypto.randomUUID()}`;
  }
}
