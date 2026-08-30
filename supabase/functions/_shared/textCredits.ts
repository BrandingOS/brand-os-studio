// ============================================================================
// Metering for the text-AI functions (docs/access-architecture/04 §2.4).
//
// Image generation has been paid for since 025; Anthropic calls were free and bounded
// only by a rate-limit bucket the browser chooses for itself. Same wallet, same
// reserve → run → settle shape, so there is one story about what an AI call costs.
//
// Prices are per million tokens, in USD, and are converted to credits by the same
// USD_PER_CREDIT the image path uses. They are deliberately conservative: an estimate
// that is too low means work is done that was not paid for.
// ============================================================================
import { createServiceClient } from './supabase.ts';
import { PRICING_VERSION, USD_PER_CREDIT } from './pricing.ts';
import { MODEL_PRICING } from './rate_limit.ts';

// Prices come from the ONE table that already had them. A second copy here silently
// mispriced opus for every call: its key was a model id that resolveModel() does not
// return ('claude-opus-4-1-20250805' vs 'claude-opus-4-7'), so every opus request missed
// the table and fell back to the sonnet rate — a fifth of the real cost, on both the
// estimate and the settle. (Pass B, F2.)
export { MODEL_PRICING as TEXT_PRICING };

// Deliberately the most expensive tier, not the cheapest: an unknown model must not be
// cheap by accident, and settle_credits clamps to the reservation, so under-pricing here
// means under-charging there.
const FALLBACK = { inputPerMTok: 15, outputPerMTok: 75 };

/** Credits, rounded up, minimum 1 for any non-zero cost — the image path's rule. */
export function creditsFor(model: string, inputTokens: number, outputTokens: number): number {
  const rule = MODEL_PRICING[model] ?? FALLBACK;
  const usd = (inputTokens / 1_000_000) * rule.inputPerMTok +
              (outputTokens / 1_000_000) * rule.outputPerMTok;
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd / USD_PER_CREDIT));
}

/**
 * What to hold before the call. The output length is unknown, so the estimate assumes the
 * model returns its full max_tokens: reserving too little would let a long answer run past
 * the balance, and the unused part comes straight back at settlement.
 */
export function estimateCredits(model: string, promptChars: number, maxTokens: number): number {
  const approxInputTokens = Math.ceil(promptChars / 3.5);
  return Math.max(1, creditsFor(model, approxInputTokens, maxTokens));
}

export type TextHold = {
  ok: boolean;
  error?: string;
  detail?: Record<string, unknown>;
  refId?: string;
  reserved?: number;
};

export async function holdTextCredits(args: {
  workspaceId: string;
  brandId?: string | null;
  userId: string;
  model: string;
  estimate: number;
  idempotencyKey: string;
}): Promise<TextHold> {
  const service = createServiceClient();
  const refId = `text:${args.idempotencyKey}`;
  const { data, error } = await service.rpc('reserve_credits', {
    _workspace_id: args.workspaceId,
    _job_id: null,
    _amount: args.estimate,
    _idem_key: `reserve:${refId}`,
    // deadline (120s) + 60s: expiry can only precede settlement after a genuine hang
    _ttl: '00:03:00',
    _purpose: 'text',
    _brand_id: args.brandId ?? null,
    _user_id: args.userId,
    _ref_kind: 'text_call',
    _ref_id: refId,
  });
  if (error) return { ok: false, error: 'storage_failure', detail: { message: error.message } };
  if (!data?.ok) {
    return {
      ok: false,
      error: String(data?.error ?? 'insufficient_credits'),
      detail: { required: data?.required, balance: data?.balance, cap: data?.cap, used: data?.used },
    };
  }
  return { ok: true, refId, reserved: args.estimate };
}

/** Settle at the real usage and write the telemetry row. Never throws into the caller. */
export async function settleTextCredits(args: {
  workspaceId: string;
  brandId?: string | null;
  userId: string;
  model: string;
  refId: string;
  reserved: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'succeeded' | 'failed';
  operation: string;
}): Promise<{ charged: number; expired: boolean }> {
  const service = createServiceClient();
  const charged = args.status === 'succeeded'
    ? creditsFor(args.model, args.inputTokens, args.outputTokens)
    : 0;

  const { data } = await service.rpc('settle_credits', {
    _workspace_id: args.workspaceId,
    _job_id: null,
    _reserved: args.reserved,
    _actual: charged,
    _idem_key: `settle:${args.refId}`,
    _ref_id: args.refId,
  });

  // The reaper won: the customer keeps their credits and the loss is visible in telemetry
  // rather than silently absorbed.
  const expired = data?.error === 'reservation_expired';

  await service.from('ai_usage_events').insert({
    workspace_id: args.workspaceId,
    brand_id: args.brandId ?? null,
    user_id: args.userId,
    provider: 'anthropic',
    model: args.model,
    operation: args.operation,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    credits_charged: expired ? 0 : charged,
    pricing_version: PRICING_VERSION,
    latency_ms: args.latencyMs,
    status: expired ? 'expired_unbilled' : args.status,
  });

  // The caller MUST know: an expired reservation means nothing was charged, and shipping
  // the model's answer anyway is free work. (Pass B, F1.)
  return { charged: expired ? 0 : charged, expired };
}

export async function releaseTextCredits(args: {
  workspaceId: string;
  refId: string;
  reserved: number;
  reason: string;
}): Promise<void> {
  const service = createServiceClient();
  await service.rpc('release_credits', {
    _workspace_id: args.workspaceId,
    _job_id: null,
    _reserved: args.reserved,
    _reason: args.reason,
    _idem_key: `release:${args.refId}`,
    _ref_id: args.refId,
  });
}
