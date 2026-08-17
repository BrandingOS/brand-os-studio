// The one place the browser talks to the generation service.
//
// Everything that matters is decided server-side: which models exist and what
// each can do, what a generation costs, whether the caller can afford it, and
// what the outputs are. This module carries intent up and results back — it
// never computes a price or a balance.

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import {
  ImageGenerationError,
  type EstimateResult,
  type GenerationRequest,
  type ImageCapabilities,
  type JobResult,
} from './types';

const ENDPOINT_PATH = '/functions/v1/ai-generate-image';
/** Slightly above the server's own provider deadline so the server always wins. */
const REQUEST_TIMEOUT_MS = 190_000;

function endpoint(override?: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
  return override ?? `${base}${ENDPOINT_PATH}`;
}

/**
 * The Edge Function gateway verifies a JWT on every call, so a bearer is always
 * sent: the user's token when signed in, the anon key otherwise. Actions that
 * spend money additionally require a REAL user server-side — the anon key alone
 * will be refused with `authentication`.
 */
async function headers(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) h.Authorization = `Bearer ${data.session.access_token}`;
  } catch { /* anon */ }
  return h;
}

export interface CallOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function call<T>(body: unknown, opts: CallOptions = {}): Promise<T> {
  const fetcher = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
  // A caller-supplied signal (the Cancel button) also aborts this request.
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetcher(endpoint(opts.endpoint), {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => '');
    let parsed: Record<string, unknown> | null = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

    if (!res.ok) {
      throw new ImageGenerationError({
        code: (parsed?.error as never) ?? 'unknown',
        message: (parsed?.message as string) ?? `Image service error (${res.status}).`,
        retryable: Boolean(parsed?.retryable),
        status: res.status,
        requiredCredits: parsed?.requiredCredits as number | undefined,
        balance: parsed?.balance as number | undefined,
        jobId: parsed?.jobId as string | undefined,
      });
    }
    if (!parsed) {
      throw new ImageGenerationError({
        code: 'unknown', message: 'The image service returned an unreadable response.', status: res.status,
      });
    }
    return parsed as T;
  } catch (err) {
    if (err instanceof ImageGenerationError) throw err;
    const aborted = (err as Error)?.name === 'AbortError';
    throw new ImageGenerationError({
      code: aborted ? 'timeout' : 'provider_unavailable',
      message: aborted
        ? 'The request was stopped before it finished.'
        : 'Could not reach the image service. Check your connection and try again.',
      retryable: true,
      status: aborted ? 504 : 503,
    });
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

// ─── Capabilities ────────────────────────────────────────────────────────────

let capabilitiesCache: Promise<ImageCapabilities> | null = null;

/** Cached per page load; the picker renders entirely from this. */
export function fetchImageCapabilities(opts: CallOptions & { force?: boolean } = {}): Promise<ImageCapabilities> {
  if (capabilitiesCache && !opts.force) return capabilitiesCache;
  capabilitiesCache = call<ImageCapabilities>({ action: 'models' }, { ...opts, timeoutMs: 15_000 })
    .catch((err) => {
      capabilitiesCache = null; // let a later call retry rather than cache a lie
      throw err;
    });
  return capabilitiesCache;
}

export function resetCapabilitiesCache(): void {
  capabilitiesCache = null;
}

// ─── Estimate / generate / cancel ────────────────────────────────────────────

export function estimateGeneration(
  input: Pick<GenerationRequest, 'model' | 'aspectRatio' | 'size' | 'quality' | 'count' | 'seed' | 'negativePrompt'>
    & { referenceCount?: number },
  opts: CallOptions = {},
): Promise<EstimateResult> {
  return call<EstimateResult>({
    action: 'estimate',
    model: input.model,
    aspectRatio: input.aspectRatio,
    size: input.size,
    quality: input.quality,
    count: input.count,
    seed: input.seed,
    negativePrompt: input.negativePrompt,
    references: Array.from({ length: input.referenceCount ?? 0 }, () => ({ role: 'image' })),
  }, { ...opts, timeoutMs: opts.timeoutMs ?? 20_000 });
}

export function runGeneration(request: GenerationRequest, opts: CallOptions = {}): Promise<JobResult> {
  return call<JobResult>({ action: 'generate', ...request }, opts);
}

export function cancelGeneration(jobId: string, opts: CallOptions = {}): Promise<JobResult> {
  return call<JobResult>({ action: 'cancel', jobId }, { ...opts, timeoutMs: 20_000 });
}

/** Stable per submit: reused on retry so a repeat never charges twice. */
export function newIdempotencyKey(): string {
  return `gen_${crypto.randomUUID()}`;
}
