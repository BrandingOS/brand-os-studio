// Browser-side applyCommand — Phase 3.5 commit 4.
//
// The single entry point Mode 2 / 3 / 4 wirings call. Builds the
// system prompt locally, posts it to the ai-apply-command Edge
// Function, runs the response through Mode 5's validateAICommandResult
// gate, and returns a canonical AICommandResult to the caller.
//
// Mode 5 (validation) lives in the browser, not the Edge Function —
// it needs the live document for hallucinated-id detection and the
// runtime context for Mode 4 scope clamping. The Edge Function is a
// thin proxy that handles auth/rate-limit/Anthropic call/JSON
// extraction.

import { supabase } from '@/integrations/supabase/client';
import { buildSystemPrompt } from './systemPrompt';
import { buildBrandCard } from './brandCard';
import { validateAICommandResult } from './modeFive';
import type { AIAgent, AICommandContext, AICommandResult } from './types';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { BrandMemorySnapshot } from '@/core/services/IBrandMemoryService';

const ENDPOINT_PATH = '/functions/v1/ai-apply-command';
/** Network timeout — generous because Anthropic calls can take 5-10s. */
const TIMEOUT_MS = 30_000;

/**
 * Production AIAgent implementation backed by the Edge Function.
 *
 * Construction takes a BrandKit because the system prompt builder
 * needs both the Brand (for the brand card block) and the BrandKit
 * (for the brand_resolution block). Both are derived in the editor
 * shell from the active brand prop.
 */
export function createEdgeFunctionAgent(args: {
  brandKit: BrandKit;
  /** Override the endpoint URL — used by tests to point at a stub. */
  endpoint?: string;
  /** Override fetch — used by tests to mock the network. */
  fetchImpl?: typeof fetch;
  /** Force mock mode regardless of Edge Function env. Useful for
   *  client-side testing of the rejected-mock-mode toast UX. */
  forceMock?: boolean;
  /** Phase 6.6 — optional brand-memory getter. Called per applyCommand
   *  call; the result is threaded into the system prompt as the
   *  `<brand_memory>` block. Returning null/undefined skips the block.
   *  The getter is called inside the agent so the snapshot is fresh on
   *  every prompt (the user might have just saved a design that should
   *  shift the AI's tiebreaker). */
  getBrandMemory?: () => Promise<BrandMemorySnapshot | null>;
}): AIAgent {
  const { brandKit, endpoint, fetchImpl, forceMock, getBrandMemory } = args;
  const fetcher = fetchImpl ?? fetch;
  const url =
    endpoint ?? `${import.meta.env.VITE_SUPABASE_URL}${ENDPOINT_PATH}`;

  return {
    async applyCommand(
      doc: BrandOSDocument,
      command: string,
      context: AICommandContext,
    ): Promise<AICommandResult> {
      // Build the full system prompt browser-side. The static spine
      // is identical across calls (cache hits at Anthropic); the
      // dynamic blocks vary per call.
      const brandCard = buildBrandCard(context.brand);
      const brandMemory = getBrandMemory ? await getBrandMemory() : null;
      const systemPrompt = buildSystemPrompt({
        brand: context.brand,
        brandKit,
        brandCardBlock: brandCard.block,
        doc,
        context: {
          activePageId: context.activePageId,
          selection: context.selection,
          modeHint: context.modeHint,
        },
        brandMemory,
      });

      // Resolve a session id for rate-limiting. Auth session is the
      // canonical source; anonymous users get a stable per-session
      // localStorage key.
      const sessionId = await resolveSessionId();

      // Attach the auth bearer if present — same pattern as
      // generateDescription / fetchUrlPreview Edge Function calls.
      const { data: authData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authData?.session?.access_token) {
        headers.Authorization = `Bearer ${authData.session.access_token}`;
      }

      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetcher(url, {
          method: 'POST',
          headers,
          signal: ctrl.signal,
          body: JSON.stringify({
            sessionId,
            command,
            systemPrompt,
            brandId: context.brand.id,
            mock: forceMock === true ? true : undefined,
          }),
        });
      } catch (err) {
        clearTimeout(timeout);
        const aborted = (err as { name?: string })?.name === 'AbortError';
        return {
          kind: 'rejected',
          reason: 'agent_error',
          message: aborted
            ? 'The AI took too long to respond — try again or simplify the prompt.'
            : `Couldn't reach the AI service: ${err instanceof Error ? err.message : String(err)}`,
        };
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        // Read text best-effort for diagnostics.
        let extra = '';
        try {
          extra = (await res.text()).slice(0, 200);
        } catch {
          /* ignore */
        }
        return {
          kind: 'rejected',
          reason: 'agent_error',
          message: `AI service returned ${res.status}${extra ? `: ${extra}` : ''}.`,
        };
      }

      let body: { result?: unknown };
      try {
        body = (await res.json()) as { result?: unknown };
      } catch {
        return {
          kind: 'rejected',
          reason: 'agent_error',
          message: 'AI service returned non-JSON.',
        };
      }

      // Mode 5 — schema validation, scope clamp, brand-rebinding,
      // hallucinated id detection. NEVER throws.
      return validateAICommandResult(body.result, doc, context);
    },
  };
}

// ─── Session id helpers ────────────────────────────────────────────────

const ANON_SESSION_KEY = 'brandos.ai.anon-session';

async function resolveSessionId(): Promise<string> {
  // Authenticated user — use their user id.
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    // Fall through to anonymous.
  }
  // Anonymous — stable per-session id stored in localStorage.
  try {
    const existing = localStorage.getItem(ANON_SESSION_KEY);
    if (existing) return existing;
    const fresh = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(ANON_SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Final fallback — ephemeral session id (will rate-limit per call).
    return `anon-ephemeral-${crypto.randomUUID()}`;
  }
}
