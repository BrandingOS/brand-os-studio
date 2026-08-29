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

/**
 * Call Anthropic via the server proxy. Throws on transport/function error.
 *
 * The proxy now requires a real user JWT and meters the call against the workspace
 * wallet, so `sessionId` is no longer an identity — supabase-js attaches the session
 * automatically. Pass `brandId` when the call is about a brand: it decides which wallet
 * pays and requires `ai.generate` on that brand.
 *
 * A refusal for money rather than transport (`insufficient_credits`,
 * `member_credit_cap_reached`) arrives as a 402 with a semantic reason; it is surfaced
 * as an AiCreditError so callers can tell "you cannot afford this" from "it broke".
 */
export async function callAnthropic(
  req: AnthropicRequest & { brandId?: string; operation?: string },
): Promise<AnthropicResponse> {
  // Fail before the round trip when there is no session: the proxy requires a JWT, and
  // public surfaces (Logo Maker) fall back to their deterministic suggestions on throw.
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) throw new AiAuthRequiredError();

  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { model: 'sonnet', ...req },
  });
  if (error) {
    const reason = await readFunctionError(error);
    if (reason) throw new AiCreditError(reason.error, reason);
    throw new Error(`anthropic-proxy failed: ${error.message}`);
  }
  if (!data) throw new Error('anthropic-proxy: empty response');
  return data as AnthropicResponse;
}

/** No session: AI is a signed-in feature since the proxy stopped accepting a body id. */
export class AiAuthRequiredError extends Error {
  readonly reason = 'not_authenticated';
  constructor() {
    super('not_authenticated');
    this.name = 'AiAuthRequiredError';
  }
}

export class AiCreditError extends Error {
  constructor(readonly reason: string, readonly detail: Record<string, unknown>) {
    super(reason);
    this.name = 'AiCreditError';
  }
}

/** supabase-js hides the body of a non-2xx function response inside `context`. */
async function readFunctionError(error: unknown): Promise<Record<string, unknown> | null> {
  const ctx = (error as { context?: unknown })?.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') return null;
  try {
    const body = await (ctx as Response).json();
    return body && typeof body.error === 'string' ? body : null;
  } catch {
    return null;
  }
}

/** Convenience: first text block of the response (the common case). */
export function firstText(res: AnthropicResponse): string {
  return res.content?.find((b) => b.type === 'text')?.text ?? '';
}
