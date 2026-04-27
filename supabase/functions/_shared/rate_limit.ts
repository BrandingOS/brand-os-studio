// Shared rate-limit / identity / logging helpers for Edge Functions.
//
// No Anthropic dependency — used by both AI and non-AI functions.
// AI-specific helpers (client, tier whitelist, max_tokens cap) live in
// `_shared/ai.ts`.
//
// Errors are thrown as `Response` objects so handlers can let them bubble.
// Caller wraps in try/catch and applies CORS headers — see `withCors`.

import { createServiceClient, createUserClient } from './supabase.ts';

// ─── Pricing (used by logCall for cost estimate) ──────────────────────────

/**
 * Per-million-token pricing in USD. SOURCE OF TRUTH: verify against
 * https://www.anthropic.com/pricing before relying on these for billing.
 * Last verified: 2026-04-27.
 */
const MODEL_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  'claude-haiku-4-5-20251001':  { inputPerMTok: 1.0,  outputPerMTok: 5.0 },
  'claude-sonnet-4-20250514':   { inputPerMTok: 3.0,  outputPerMTok: 15.0 }, // legacy — used by generate-description
  'claude-sonnet-4-6':          { inputPerMTok: 3.0,  outputPerMTok: 15.0 },
  'claude-opus-4-7':            { inputPerMTok: 15.0, outputPerMTok: 75.0 },
};

// ─── Identity ──────────────────────────────────────────────────────────────

/**
 * Validate the Authorization header and return the user id, or throw a
 * 401 Response. Use in functions that require a logged-in user.
 */
export async function requireUser(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization');
  if (!auth) throw new Response('Unauthorized', { status: 401 });
  const supabase = createUserClient(auth);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Response('Unauthorized', { status: 401 });
  return data.user.id;
}

/**
 * Read sessionId from the request body and return it, or throw 400.
 * For onboarding (auth-light) functions only.
 */
export function requireSession(body: Record<string, unknown>): string {
  const id = body.sessionId;
  if (typeof id !== 'string' || !id) {
    throw new Response('sessionId required', { status: 400 });
  }
  return id;
}

/**
 * Return the requester IP from forwarded headers, or null. Supabase
 * Edge Functions receive these from the platform's HTTP proxy.
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? null;
}

// ─── Rate limit ────────────────────────────────────────────────────────────

export interface RateLimitWindow {
  /** Window length in minutes. */
  windowMinutes: number;
  /** Max calls allowed inside this window. */
  maxCalls: number;
}

export interface RateLimitArgs {
  userId?: string;
  sessionId?: string;
  ipAddress?: string | null;
  functionName: string;
  /** One or more windows — if any is exceeded the call is denied. */
  windows: RateLimitWindow[];
  /**
   * Optional secondary cap applied to the IP regardless of primary
   * identity. Set on session-keyed onboarding functions.
   */
  ipWindow?: RateLimitWindow;
}

/**
 * Enforce one or more sliding-window rate limits. Throws a 429 Response
 * if any window is exceeded. Caller should call `logCall` AFTER the
 * upstream call resolves so we record true usage.
 */
export async function enforceRateLimit(args: RateLimitArgs): Promise<void> {
  const supabase = createServiceClient();

  for (const window of args.windows) {
    const since = new Date(Date.now() - window.windowMinutes * 60_000).toISOString();
    let q = supabase
      .from('ai_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('function_name', args.functionName)
      .gte('called_at', since);

    if (args.userId) q = q.eq('user_id', args.userId);
    else if (args.sessionId) q = q.eq('session_id', args.sessionId);
    else throw new Response('Rate limit identity missing', { status: 500 });

    const { count, error } = await q;
    if (error) throw new Response('Rate limit check failed', { status: 500 });
    if ((count ?? 0) >= window.maxCalls) {
      throw new Response(
        `Rate limit exceeded (${window.maxCalls} per ${window.windowMinutes}m)`,
        { status: 429 },
      );
    }
  }

  if (args.ipWindow && args.ipAddress) {
    const since = new Date(Date.now() - args.ipWindow.windowMinutes * 60_000).toISOString();
    const { count, error } = await supabase
      .from('ai_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('function_name', args.functionName)
      .eq('ip_address', args.ipAddress)
      .gte('called_at', since);
    if (error) throw new Response('Rate limit check failed', { status: 500 });
    if ((count ?? 0) >= args.ipWindow.maxCalls) {
      throw new Response(
        `IP rate limit exceeded (${args.ipWindow.maxCalls} per ${args.ipWindow.windowMinutes}m)`,
        { status: 429 },
      );
    }
  }
}

/**
 * Reject sessions older than `maxAgeHours` since their first recorded
 * call. Fresh sessions (no rows yet) pass — the IP cap is the catch
 * for session-rotation attacks.
 */
export async function requireSessionAge(args: {
  sessionId: string;
  maxAgeHours: number;
}): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ai_rate_limits')
    .select('called_at')
    .eq('session_id', args.sessionId)
    .order('called_at', { ascending: true })
    .limit(1);
  if (error) throw new Response('Session check failed', { status: 500 });
  if (data && data.length > 0) {
    const first = new Date(data[0].called_at).getTime();
    if (Date.now() - first > args.maxAgeHours * 3_600_000) {
      throw new Response('Session expired', { status: 403 });
    }
  }
}

/**
 * Reject session-keyed calls when the session has not previously made a
 * call to one of `mustHaveCalled`. Forces the natural onboarding flow
 * and breaks "skip straight to expensive endpoint" attacks.
 */
export async function requireSessionFingerprint(args: {
  sessionId: string;
  mustHaveCalled: string[];
}): Promise<void> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('ai_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', args.sessionId)
    .in('function_name', args.mustHaveCalled);
  if (error) throw new Response('Session check failed', { status: 500 });
  if ((count ?? 0) === 0) {
    throw new Response('Onboarding flow not started', { status: 403 });
  }
}

// ─── Logging ───────────────────────────────────────────────────────────────

export interface LogCallArgs {
  userId?: string;
  sessionId?: string;
  ipAddress?: string | null;
  functionName: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Insert a row into `ai_rate_limits` with token counts and the
 * estimated cost in USD. Call AFTER the upstream call completes
 * (success or failure). Logging failures are swallowed — they should
 * not block the user's request.
 */
export async function logCall(args: LogCallArgs): Promise<void> {
  const supabase = createServiceClient();
  let cost: number | null = null;
  if (args.model && args.inputTokens != null && args.outputTokens != null) {
    const pricing = MODEL_PRICING[args.model];
    if (pricing) {
      cost =
        (args.inputTokens / 1_000_000) * pricing.inputPerMTok +
        (args.outputTokens / 1_000_000) * pricing.outputPerMTok;
    }
  }
  const { error } = await supabase.from('ai_rate_limits').insert({
    user_id: args.userId ?? null,
    session_id: args.sessionId ?? null,
    ip_address: args.ipAddress ?? null,
    function_name: args.functionName,
    model: args.model ?? null,
    input_tokens: args.inputTokens ?? null,
    output_tokens: args.outputTokens ?? null,
    cost_estimate_usd: cost,
  });
  if (error) console.error('logCall failed', error);
}

// ─── CORS wrapper ──────────────────────────────────────────────────────────

/**
 * Wrap a handler so:
 *   • OPTIONS preflight gets the right CORS headers automatically
 *   • Thrown `Response` instances (auth/rate-limit/validation errors)
 *     are returned with CORS headers attached
 *   • Unhandled errors return 500 with CORS headers
 */
export function withCors(
  cors: HeadersInit,
  fn: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  const corsObj = cors as Record<string, string>;
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      const res = await fn(req);
      const h = new Headers(res.headers);
      for (const [k, v] of Object.entries(corsObj)) h.set(k, v);
      return new Response(res.body, { status: res.status, headers: h });
    } catch (e) {
      if (e instanceof Response) {
        const h = new Headers(e.headers);
        for (const [k, v] of Object.entries(corsObj)) h.set(k, v);
        return new Response(e.body, { status: e.status, headers: h });
      }
      console.error('Unhandled error', e);
      return new Response('Internal error', { status: 500, headers: cors });
    }
  };
}
