// Edge Function: ai-apply-command (Phase 3.5 commit 4).
//
// The single AI call for the unified editor's prompt bar. Receives a
// prompt-bar submission, calls Anthropic, returns an AICommandResult
// shape the browser hands to Mode 5 for validation.
//
// ─── Why send the system prompt over the wire ──────────────────────────
//
// The browser builds the full system prompt via
// `buildSystemPrompt(...)` from src/features/editor/ai/systemPrompt.ts,
// then ships it here as a string. Trade-offs considered:
//
//   • Send-spine-per-call (chosen): ~5KB extra in the request body,
//     but Anthropic's prompt caching keys on content hash so the
//     model-side cost is one cache write + many cache hits within
//     the 5-minute TTL window. Single source of truth lives in the
//     browser-side TypeScript module — no Deno/Vite duplication.
//   • Spine-baked-into-Edge-Function: zero per-call payload but
//     forces duplicating the prompt into a Deno file (separate
//     runtime) or building a shared package — added complexity and
//     drift risk. Rejected for Phase 3.5; revisit if browser→Edge
//     bandwidth becomes a problem.
//
// ─── Mock mode ─────────────────────────────────────────────────────────
//
// Per Phase 3.5 spec Q1, mock mode lives on the Edge Function side,
// not the browser. The function checks for ANTHROPIC_API_KEY at
// invocation time; if absent (or if the request body sets `mock: true`),
// it returns a deterministic AICommandResult so the dev experience
// works without a real key. Keeps the browser code on a single path.
//
// ─── Prompt caching ────────────────────────────────────────────────────
//
// The system prompt is sent with `cache_control: { type: 'ephemeral' }`
// (Anthropic's 5-minute TTL cache). The first call within a window
// pays for the cache write; subsequent calls see ~90% cost reduction.
// Without caching, the per-call cost of the spine alone is ~3,500
// input tokens × $3/1M (Opus) = $0.0105 per call. With caching, the
// cache-hit rate is what matters; Anthropic charges 0.1× for cache
// reads. At any reasonable session volume this is the difference
// between viable Mode-2/3/4 economics and not.

import { corsHeaders } from '../_shared/cors.ts';
import {
  capMaxTokens,
  enforceRateLimit,
  getAnthropic,
  getClientIp,
  logCall,
  requireSession,
  withCors,
} from '../_shared/ai.ts';

const FUNCTION_NAME = 'ai-apply-command';
const MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 2048;

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Mock-mode payload ─────────────────────────────────────────────────

/**
 * Deterministic mock response. Returns an AICommandResult-shaped JSON
 * the browser's Mode 5 layer accepts and the prompt bar can render.
 *
 * The mock chooses `rejected` for empty commands so the empty-prompt
 * UX is testable without a live key, otherwise returns a `delta` with
 * a single update-layer op that tints the active page background to
 * the brand primary (a visible-but-harmless mutation).
 */
function buildMockResult(command: string, body: ApplyCommandBody): unknown {
  const trimmed = command.trim();
  if (trimmed.length === 0) {
    return {
      kind: 'rejected',
      reason: 'empty_prompt',
      message: 'Type something in the prompt bar.',
    };
  }
  return {
    kind: 'rejected',
    reason: 'unsupported',
    message:
      `(Mock mode — no ANTHROPIC_API_KEY set on the Edge Function.) Set the env var or run "npx supabase functions serve ai-apply-command --env-file <path>" with the key. Echo of your prompt: "${trimmed.slice(0, 80)}".`,
    suggestions: ['Set ANTHROPIC_API_KEY and try again'],
  };
}

// ─── Request body shape ────────────────────────────────────────────────

interface ApplyCommandBody {
  /** Session id for rate-limiting. */
  sessionId?: string;
  /** Optional override; defaults to false (real mode). */
  mock?: boolean;
  /** Full system prompt assembled by the browser via
   *  buildSystemPrompt(...). Spine + dynamic blocks. */
  systemPrompt?: string;
  /** User's command text from the prompt bar. */
  command?: string;
  /** Brand id for logging — not used for any logic. */
  brandId?: string;
}

// ─── JSON extraction (mirrors browser-side helper) ─────────────────────

function extractJson(text: string): unknown {
  // Strip markdown fences if Claude inserted one.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    // Fall back to first {...} block.
    const open = raw.indexOf('{');
    const close = raw.lastIndexOf('}');
    if (open >= 0 && close > open) {
      try {
        return JSON.parse(raw.slice(open, close + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── Handler ───────────────────────────────────────────────────────────

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: ApplyCommandBody;
  try {
    body = (await req.json()) as ApplyCommandBody;
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);

  const command = (body.command ?? '').toString();
  const systemPrompt = (body.systemPrompt ?? '').toString();

  if (!systemPrompt) {
    return Response.json(
      {
        result: {
          kind: 'rejected',
          reason: 'agent_error',
          message: 'systemPrompt missing in request body.',
        },
      },
      { headers: cors },
    );
  }

  // Rate limit BEFORE the (potentially expensive) Anthropic call.
  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    // 30 calls per session per hour is generous for an editor session;
    // tune downward if abuse surfaces.
    windows: [{ windowMinutes: 60, maxCalls: 30 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 200 },
  });

  // ─── Mock mode ───────────────────────────────────────────────────────
  const apiKeyMissing = !Deno.env.get('ANTHROPIC_API_KEY');
  if (body.mock === true || apiKeyMissing) {
    const mock = buildMockResult(command, body);
    await logCall({
      sessionId,
      ipAddress,
      functionName: FUNCTION_NAME,
      model: 'mock',
      inputTokens: 0,
      outputTokens: 0,
    });
    return Response.json({ result: mock }, { headers: cors });
  }

  // ─── Real Anthropic call ─────────────────────────────────────────────
  let response;
  try {
    response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: capMaxTokens(MAX_TOKENS),
      // System message sent as an array so we can attach
      // cache_control to the spine. The dynamic blocks are part of
      // the same system message — Anthropic caches the longest
      // prefix that matches; if the dynamic part changes the spine
      // still hits the cache.
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: command }],
    });
  } catch (err) {
    return Response.json(
      {
        result: {
          kind: 'rejected',
          reason: 'agent_error',
          message: `Anthropic call failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      },
      { headers: cors },
    );
  }

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  // Extract text from the first text content block.
  const textBlock = response.content.find(
    (b: { type: string }) => b.type === 'text',
  ) as { text?: string } | undefined;
  const rawText = textBlock?.text ?? '';

  await logCall({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    model: MODEL,
    inputTokens,
    outputTokens,
  });

  const parsed = extractJson(rawText);
  if (parsed == null) {
    return Response.json(
      {
        result: {
          kind: 'rejected',
          reason: 'agent_error',
          message: 'Anthropic returned non-JSON content.',
        },
      },
      { headers: cors },
    );
  }

  return Response.json({ result: parsed }, { headers: cors });
}));
