// Edge Function: fetch a URL and extract OG metadata.
// Input: { sessionId: string, url: string }
// Output: JSON { title, description, imageUrl, faviconUrl }
import { corsHeaders } from '../_shared/cors.ts';

function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '0.0.0.0') return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
  return false;
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

async function rateLimit(sessionId: string): Promise<boolean> {
  const url = `${Deno.env.get('SUPABASE_URL')}/rest/v1/onboarding_rate_limits`;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const count = await fetch(
    `${url}?session_id=eq.${sessionId}&function_name=eq.fetch-url-preview&called_at=gte.${since}&select=id`,
    { headers: { ...headers, Prefer: 'count=exact' } },
  );
  const total = parseInt((count.headers.get('content-range') ?? '*/0').split('/')[1] || '0', 10);
  if (total >= 30) return false;
  await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id: sessionId, function_name: 'fetch-url-preview' }),
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

  let body: { sessionId?: string; url?: string };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
  const { sessionId, url } = body;
  if (!sessionId || !url) return new Response('sessionId and url required', { status: 400, headers: cors });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return new Response('Invalid URL', { status: 400, headers: cors }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
    return new Response('Disallowed URL', { status: 400, headers: cors });
  }
  if (!(await rateLimit(sessionId))) {
    return new Response('Rate limit exceeded', { status: 429, headers: cors });
  }

  const res = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'BrandOSPreviewBot/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return new Response(`Upstream ${res.status}`, { status: 502, headers: cors });
  const html = await res.text();

  const title = pickMeta(html, 'og:title') ?? (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? parsed.hostname);
  const description = pickMeta(html, 'og:description') ?? pickMeta(html, 'description') ?? '';
  const image = pickMeta(html, 'og:image');
  const favicon = `${parsed.origin}/favicon.ico`;

  return new Response(JSON.stringify({ title, description, imageUrl: image, faviconUrl: favicon }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
