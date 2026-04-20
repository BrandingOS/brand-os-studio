// Edge Function: generate a 1–2 sentence brand description via Claude.
// Input: { sessionId: string, brandName: string, assetContext?: string[] }
// Output: text/plain streaming body
import Anthropic from '@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
});

const SYSTEM = `You are a world-class brand copywriter. Given a brand name
and optional context, write a single 1–2 sentence description of the brand
that is concrete, specific, and free of marketing fluff. No emojis, no
hashtags, no lists. Plain prose only.`;

async function rateLimit(sessionId: string): Promise<boolean> {
  const url = `${Deno.env.get('SUPABASE_URL')}/rest/v1/onboarding_rate_limits`;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const count = await fetch(
    `${url}?session_id=eq.${sessionId}&function_name=eq.generate-description&called_at=gte.${since}&select=id`,
    { headers: { ...headers, Prefer: 'count=exact' } },
  );
  const contentRange = count.headers.get('content-range') ?? '*/0';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);
  if (total >= 10) return false;
  await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id: sessionId, function_name: 'generate-description' }),
  });
  return true;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') return new Response('Method not allowed', { status: 405 });
  const cors = {
    ...corsHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  let body: { sessionId?: string; brandName?: string; assetContext?: string[] };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

  const { sessionId, brandName, assetContext } = body;
  if (!sessionId || !brandName) {
    return new Response('sessionId and brandName required', { status: 400, headers: cors });
  }
  if (!(await rateLimit(sessionId))) {
    return new Response('Rate limit exceeded', { status: 429, headers: cors });
  }

  const user = `Brand name: ${brandName}${
    assetContext && assetContext.length ? `\nContext from uploaded assets: ${assetContext.join('; ')}` : ''
  }`;

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });

  const body$ = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(ev.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  return new Response(body$, { headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
});
