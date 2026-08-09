/**
 * Browser → server Anthropic proxy (E6 — no AI secret in the bundle).
 *
 * Every browser AI feature calls Anthropic THROUGH the `anthropic-proxy` Edge
 * Function instead of hitting `api.anthropic.com` directly with a bundled
 * `VITE_ANTHROPIC_API_KEY`. The key lives ONLY in the server env. Callers build
 * their own `messages`/`system` (single source of truth stays in TS) and get back
 * the raw Anthropic messages response — identical shape to the direct API/SDK, so
 * existing response-parsing is unchanged.
 */
import { supabase } from '@/integrations/supabase/client';

/** The server proxy whitelists models by TIER (`resolveModel` in
 *  supabase/functions/_shared/ai.ts) — raw model-id strings are rejected 400. */
export type AnthropicModelTier = 'haiku' | 'sonnet' | 'opus';

export interface AnthropicRequest {
  /** Model TIER, not a raw model id. Defaults to 'sonnet'. */
  model?: AnthropicModelTier;
  max_tokens?: number;
  system?: string | Array<Record<string, unknown>>;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
}

export interface AnthropicResponse {
  id?: string;
  role?: string;
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
  [k: string]: unknown;
}

const ANON_SESSION_KEY = 'brandos.ai.anon-session';

/** Auth user id, or a stable per-browser anonymous session id (the rate-limit
 *  bucket the Edge Functions key on). Mirrors the editor's `resolveSessionId`. */
export async function resolveAiSessionId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    /* fall through to anonymous */
  }
  try {
    const existing = localStorage.getItem(ANON_SESSION_KEY);
    if (existing) return existing;
    const fresh = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(ANON_SESSION_KEY, fresh);
    return fresh;
  } catch {
    return `anon-ephemeral-${crypto.randomUUID()}`;
  }
}

/** Call Anthropic via the server proxy. Throws on transport/function error. */
export async function callAnthropic(req: AnthropicRequest): Promise<AnthropicResponse> {
  const sessionId = await resolveAiSessionId();
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { sessionId, model: 'sonnet', ...req },
  });
  if (error) throw new Error(`anthropic-proxy failed: ${error.message}`);
  if (!data) throw new Error('anthropic-proxy: empty response');
  return data as AnthropicResponse;
}

/** Convenience: first text block of the response (the common case). */
export function firstText(res: AnthropicResponse): string {
  return res.content?.find((b) => b.type === 'text')?.text ?? '';
}
