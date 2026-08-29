// Edge Function: anthropic-proxy (E6 — browser AI-secret removal).
//
// A GENERIC server-side Anthropic proxy so browser features stop shipping
// `VITE_ANTHROPIC_API_KEY` in the bundle. Each caller builds its own messages +
// system prompt client-side (single source of truth stays in TS) and POSTs them
// here; the ANTHROPIC key lives ONLY in the server env (`ANTHROPIC_API_KEY`).
//
// Replaces the 5 remaining browser-direct Anthropic calls:
//   - brand-consistency/providers/anthropicProvider.ts
//   - logo-maker/components/AILogoSuggestions.tsx
//   - shared/presentation/v2/ai/generateDeckFromScript.ts
//   - ai/v5/providers/claudeProvider.ts
//   - onboarding-v4/services/parseDescription.ts
// (The editor already uses ai-apply-command / ai-generate-image.)
//
// AUTH: a valid user JWT, unconditionally. This used to accept a `sessionId` the browser
// chose for itself, which meant (a) a signed-in client could simply omit the
// Authorization header to reach a free, unmetered path (threat A31), and (b) the rate
// limit was keyed on a value the caller could rotate at will. All five call sites above
// are signed-in product features; the two genuinely pre-signup functions
// (generate-description, fetch-url-preview) keep the anon session path.
//
// MONEY: metered against the workspace wallet, same reserve → run → settle as image
// generation (docs/access-architecture/04 §2.4), so "what does an AI call cost" has one
// answer. Returns Anthropic's raw messages response so callers parse it as before.

import { corsHeaders } from '../_shared/cors.ts';
import {
  capMaxTokens,
  enforceRateLimit,
  getAnthropic,
  getClientIp,
  logCall,
  resolveModel,
  withCors,
} from '../_shared/ai.ts';
import {
  AuthzError,
  callerBillingWorkspace,
  requireCaller,
  requireCapability,
  resolveBrandContext,
} from '../_shared/authz.ts';
import {
  estimateCredits,
  holdTextCredits,
  releaseTextCredits,
  settleTextCredits,
} from '../_shared/textCredits.ts';

const FUNCTION_NAME = 'anthropic-proxy';
const cors = { ...corsHeaders };

interface ProxyBody {
  brandId?: string;
  operation?: string;
  model?: string;
  max_tokens?: number;
  system?: string | Array<Record<string, unknown>>;
  messages?: Array<{ role: string; content: unknown }>;
  mock?: boolean;
}

Deno.serve(withCors(cors, async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  let body: ProxyBody;
  try {
    body = (await req.json()) as ProxyBody;
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  let caller;
  try {
    caller = await requireCaller(req);
  } catch (err) {
    if (err instanceof AuthzError) return err.toResponse();
    throw err;
  }
  const ipAddress = getClientIp(req);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages[] required' }, { status: 400, headers: cors });
  }

  // The bucket is the verified user id, not a body field, so it cannot be rotated.
  await enforceRateLimit({
    userId: caller.userId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 1, maxCalls: 20 }, { windowMinutes: 60, maxCalls: 200 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 1000 },
  });

  // Which wallet pays: the brand's workspace when the caller named a brand they can
  // reach, otherwise their own. Never a workspace id from the body.
  let workspaceId: string;
  let brandId: string | null = null;
  try {
    if (typeof body.brandId === 'string' && body.brandId) {
      const ctx = await resolveBrandContext(caller, body.brandId);
      workspaceId = ctx.workspaceId;
      brandId = ctx.brandId;
      await requireCapability(caller, 'ai.generate', workspaceId, brandId);
    } else {
      workspaceId = await callerBillingWorkspace(caller);
    }
  } catch (err) {
    if (err instanceof AuthzError) return err.toResponse();
    throw err;
  }

  const model = resolveModel(body.model);
  const maxTokens = capMaxTokens(body.max_tokens);

  // Mock when no server key (dev): echo an empty text block so callers degrade
  // gracefully instead of 500ing.
  if (body.mock === true || !Deno.env.get('ANTHROPIC_API_KEY')) {
    await logCall({ userId: caller.userId, ipAddress, functionName: FUNCTION_NAME, model: 'mock', inputTokens: 0, outputTokens: 0 });
    return Response.json(
      { id: 'mock', type: 'message', role: 'assistant', model, content: [{ type: 'text', text: '' }], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 } },
      { headers: cors },
    );
  }

  // ── reserve → run → settle ────────────────────────────────────────────────
  const promptChars = JSON.stringify(body.messages).length +
    (typeof body.system === 'string' ? body.system.length : JSON.stringify(body.system ?? '').length);
  const estimate = estimateCredits(model, promptChars, maxTokens);
  const idempotencyKey = `${caller.userId}:${Date.now()}:${crypto.randomUUID()}`;

  const hold = await holdTextCredits({
    workspaceId, brandId, userId: caller.userId, model, estimate, idempotencyKey,
  });
  if (!hold.ok) {
    return Response.json({ error: hold.error, ...(hold.detail ?? {}) }, { status: 402, headers: cors });
  }

  const startedAt = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model,
      max_tokens: maxTokens,
      ...(body.system !== undefined ? { system: body.system as never } : {}),
      messages: body.messages as never,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const charged = await settleTextCredits({
      workspaceId, brandId, userId: caller.userId, model,
      refId: hold.refId!, reserved: hold.reserved!,
      inputTokens, outputTokens, latencyMs: Date.now() - startedAt,
      status: 'succeeded', operation: body.operation ?? 'text',
    });
    await logCall({ userId: caller.userId, ipAddress, functionName: FUNCTION_NAME, model, inputTokens, outputTokens });
    return Response.json({ ...response, credits_charged: charged }, { headers: cors });
  } catch (err) {
    // A failed call costs nothing: the whole hold goes back.
    await releaseTextCredits({
      workspaceId, refId: hold.refId!, reserved: hold.reserved!,
      reason: 'anthropic call failed',
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'anthropic call failed' },
      { status: 502, headers: cors },
    );
  }
}));
