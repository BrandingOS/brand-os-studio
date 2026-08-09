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
// Auth + rate-limit mirror ai-apply-command: `requireSession` (body sessionId) +
// per-session/IP windows. Returns Anthropic's raw messages response so callers
// parse it exactly as they did the direct fetch.

import { corsHeaders } from '../_shared/cors.ts';
import {
  capMaxTokens,
  enforceRateLimit,
  getAnthropic,
  getClientIp,
  logCall,
  requireSession,
  resolveModel,
  withCors,
} from '../_shared/ai.ts';

const FUNCTION_NAME = 'anthropic-proxy';
const cors = { ...corsHeaders };

interface ProxyBody {
  sessionId?: string;
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

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages[] required' }, { status: 400, headers: cors });
  }

  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 40 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 300 },
  });

  const model = resolveModel(body.model);
  const maxTokens = capMaxTokens(body.max_tokens);

  // Mock when no server key (dev): echo an empty text block so callers degrade
  // gracefully instead of 500ing.
  if (body.mock === true || !Deno.env.get('ANTHROPIC_API_KEY')) {
    await logCall({ sessionId, ipAddress, functionName: FUNCTION_NAME, model: 'mock', inputTokens: 0, outputTokens: 0 });
    return Response.json(
      { id: 'mock', type: 'message', role: 'assistant', model, content: [{ type: 'text', text: '' }], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 } },
      { headers: cors },
    );
  }

  try {
    const response = await getAnthropic().messages.create({
      model,
      max_tokens: maxTokens,
      ...(body.system !== undefined ? { system: body.system as never } : {}),
      messages: body.messages as never,
    });
    await logCall({
      sessionId,
      ipAddress,
      functionName: FUNCTION_NAME,
      model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });
    return Response.json(response, { headers: cors });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'anthropic call failed' },
      { status: 502, headers: cors },
    );
  }
}));
