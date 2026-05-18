// Browser-side wrapper for the ai-generate-image Edge Function.
// Phase 4.3 — mock-only at the Edge Function layer; this wrapper
// stays vendor-agnostic so swapping to a real vendor is a single
// Edge Function change.

import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

/** Pollinations.ai models — exposed so UIs can populate dropdowns. */
export const IMAGE_MODELS = ['flux', 'turbo', 'gptimage'] as const;
export type ImageModel = (typeof IMAGE_MODELS)[number];

/** Built-in style presets. The browser appends these to the prompt
 *  before sending; the Edge Function doesn't need to know about
 *  styles so swapping vendors stays a function-body-only change. */
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

export interface GenerateImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  /** Optional vendor model. Pollinations: 'flux' | 'turbo' | 'gptimage'. */
  model?: ImageModel;
  /** Optional seed for reproducibility. Random when omitted. */
  seed?: number;
  /** Optional style preset id from IMAGE_STYLES — applied browser-side
   *  by appending the matching suffix to the prompt. */
  styleId?: string;
  /** Optional negative prompt — appended via "--no <terms>" syntax
   *  that Pollinations / SDXL families respect. */
  negativePrompt?: string;
  /** Optional reference image URL — when set, dispatches the image-to-
   *  image flow (Pollinations Kontext). Must be publicly reachable. */
  referenceImageUrl?: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  mock: boolean;
  prompt: string;
}

const ENDPOINT_PATH = '/functions/v1/ai-generate-image';
const TIMEOUT_MS = 60_000;

export async function generateImage(
  args: GenerateImageRequest,
  opts: { fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<GenerateImageResult> {
  const fetcher = opts.fetchImpl ?? fetch;
  // VITE_SUPABASE_URL is not populated in .env; fall back to the
  // hard-coded URL exported by the supabase client.
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
  const url = opts.endpoint ?? `${baseUrl}${ENDPOINT_PATH}`;

  const sessionId = await resolveSessionId();
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;

  // Apply style suffix + negative prompt on the browser side so the
  // Edge Function payload stays vendor-agnostic.
  const style = args.styleId ? IMAGE_STYLES.find((s) => s.id === args.styleId) : undefined;
  const styleSuffix = style?.suffix ?? '';
  const negSuffix = args.negativePrompt ? ` --no ${args.negativePrompt}` : '';
  const effectivePrompt = `${args.prompt}${styleSuffix}${negSuffix}`;

  const payload: Record<string, unknown> = {
    sessionId,
    prompt: effectivePrompt,
    width: args.width,
    height: args.height,
    model: args.model,
    seed: args.seed,
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
      throw new Error(`AI image service ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
    }
    return (await res.json()) as GenerateImageResult;
  } finally {
    clearTimeout(timeout);
  }
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
