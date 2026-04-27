// Edge Function: stream a 1–2 sentence brand description via Claude.
// Onboarding (session-keyed). Limit: 10 calls per session per hour.
//
// Hardened in step 1 of the AI proxy migration:
//   • Session age check — reject sessions older than 24h since first call
//   • IP secondary cap — 30 calls per IP per day
//   • Token usage logged to `ai_rate_limits` with USD cost estimate
import { corsHeaders } from '../_shared/cors.ts';
import {
  capMaxTokens,
  enforceRateLimit,
  getAnthropic,
  getClientIp,
  logCall,
  requireSession,
  requireSessionAge,
  withCors,
} from '../_shared/ai.ts';

const FUNCTION_NAME = 'generate-description';
// Behavior parity with the pre-migration version. Switching to a newer
// Sonnet (4.6) is a separate decision tracked elsewhere.
const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM = `You are a world-class brand copywriter. Given a brand name
and optional context, write a single 1–2 sentence description of the brand
that is concrete, specific, and free of marketing fluff. No emojis, no
hashtags, no lists. Plain prose only.`;

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: { sessionId?: string; brandName?: string; assetContext?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);
  if (!body.brandName) return new Response('brandName required', { status: 400 });

  await requireSessionAge({ sessionId, maxAgeHours: 24 });
  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 10 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 30 },
  });

  const userMsg = `Brand name: ${body.brandName}${
    body.assetContext && body.assetContext.length
      ? `\nContext from uploaded assets: ${body.assetContext.join('; ')}`
      : ''
  }`;

  const stream = await getAnthropic().messages.stream({
    model: MODEL,
    max_tokens: capMaxTokens(200),
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  let inputTokens = 0;
  let outputTokens = 0;

  const out = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === 'message_start') {
            inputTokens = ev.message.usage?.input_tokens ?? 0;
          } else if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(ev.delta.text));
          } else if (ev.type === 'message_delta') {
            outputTokens = ev.usage?.output_tokens ?? 0;
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        await logCall({
          sessionId,
          ipAddress,
          functionName: FUNCTION_NAME,
          model: MODEL,
          inputTokens,
          outputTokens,
        });
      }
    },
  });

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}));
