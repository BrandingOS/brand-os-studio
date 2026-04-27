// Anthropic-specific Edge Function helpers.
//
// Pull this in only when a function actually calls Anthropic. For
// rate-limiting / identity / logging / CORS that don't need the SDK,
// import from `_shared/rate_limit.ts` directly to keep the npm fetch
// off the cold-start path.
//
// Re-exports the rate-limit helpers as a convenience so AI functions
// only need one import.

import Anthropic from 'npm:@anthropic-ai/sdk@^0.81.0';

export * from './rate_limit.ts';

// ─── Model whitelist ───────────────────────────────────────────────────────

/** Allowed model tiers — clients pick a tier, server picks the model. */
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

const TIER_TO_MODEL: Record<ModelTier, string> = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus:   'claude-opus-4-7',
};

/** Hard server cap on max_tokens regardless of what the client requests. */
export const MAX_TOKENS_CEILING = 4096;

/**
 * Resolve a tier name to a concrete model id. Throws 400 on invalid
 * tier — clients must request `'haiku' | 'sonnet' | 'opus'`, never a
 * raw model string. This is the model whitelist.
 */
export function resolveModel(tier: unknown): string {
  if (typeof tier !== 'string' || !(tier in TIER_TO_MODEL)) {
    throw new Response(
      `Invalid tier — must be one of ${Object.keys(TIER_TO_MODEL).join(', ')}`,
      { status: 400 },
    );
  }
  return TIER_TO_MODEL[tier as ModelTier];
}

/**
 * Cap a client-supplied max_tokens at the server ceiling. Returns the
 * effective value to send upstream.
 */
export function capMaxTokens(requested: number | undefined): number {
  const r = typeof requested === 'number' && requested > 0 ? requested : 1024;
  return Math.min(r, MAX_TOKENS_CEILING);
}

// ─── Anthropic client ──────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;

/**
 * Lazy-instantiated Anthropic client. Reads ANTHROPIC_API_KEY from
 * Edge Function env. The key value is never logged.
 */
export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) throw new Response('Server misconfigured', { status: 500 });
    _anthropic = new Anthropic({ apiKey: key });
  }
  return _anthropic;
}
