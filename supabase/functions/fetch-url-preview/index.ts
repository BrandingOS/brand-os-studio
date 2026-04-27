// Edge Function: fetch a URL and extract OG metadata.
// Input: { sessionId: string, url: string }
// Output: JSON { title, description, imageUrl, faviconUrl }
//
// Onboarding (session-keyed). Limit: 30 calls per session per hour.
// Hardened in step 1 of the AI proxy migration:
//   • Session age check — reject sessions older than 24h since first call
//   • IP secondary cap — 60 calls per IP per day (preview is light, but
//     a script could still scrape thousands)
import { corsHeaders } from '../_shared/cors.ts';
import {
  enforceRateLimit,
  getClientIp,
  logCall,
  requireSession,
  requireSessionAge,
  withCors,
} from '../_shared/rate_limit.ts';

const FUNCTION_NAME = 'fetch-url-preview';

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '0.0.0.0') return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
  return false;
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: { sessionId?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);
  if (!body.url) return new Response('url required', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
    return new Response('Disallowed URL', { status: 400 });
  }

  await requireSessionAge({ sessionId, maxAgeHours: 24 });
  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 30 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 60 },
  });

  const res = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'BrandOSPreviewBot/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return new Response(`Upstream ${res.status}`, { status: 502 });
  const html = await res.text();

  const title =
    pickMeta(html, 'og:title') ?? html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? parsed.hostname;
  const description = pickMeta(html, 'og:description') ?? pickMeta(html, 'description') ?? '';
  const image = pickMeta(html, 'og:image');
  const favicon = `${parsed.origin}/favicon.ico`;

  // Log AFTER success so a failed upstream doesn't burn the rate-limit budget.
  await logCall({ sessionId, ipAddress, functionName: FUNCTION_NAME });

  return new Response(
    JSON.stringify({ title, description, imageUrl: image, faviconUrl: favicon }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}));
