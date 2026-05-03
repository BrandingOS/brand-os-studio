// Edge Function: ai-generate-image (Phase 4.3 — MOCK ONLY).
//
// ─── Status: vendor-pending ───────────────────────────────────────────
//
// Phase 4.3 ships this surface as a deterministic mock so the
// browser-side AI image generation UI works end-to-end without a
// real vendor wired. Anthropic does not have an image-gen API; the
// vendor selection (OpenAI DALL-E, Replicate, Stable Diffusion via
// Stability AI, Recraft, etc.) is a separate billing/legal/quality
// decision. Once a vendor is picked, swapping the mock for a real
// call is a single function-body change inside this file — the
// browser contract is unchanged.
//
// ─── Mock behavior ────────────────────────────────────────────────────
//
// Returns a JSON payload with an SVG data URI that visually shows the
// prompt text on a brand-color band. Browser-side renders it as a
// regular ImageLayer (or download button). No real generation.
//
// Per request body field `mock` (true|undefined): always-mock path.
// Per env var `AI_IMAGE_VENDOR` (unset → mock; set → would dispatch
// to the real vendor in a future swap).

import { corsHeaders } from '../_shared/cors.ts';
import {
  enforceRateLimit,
  getClientIp,
  logCall,
  requireSession,
  withCors,
} from '../_shared/ai.ts';

const FUNCTION_NAME = 'ai-generate-image';

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GenerateImageBody {
  sessionId?: string;
  prompt?: string;
  /** width × height — defaults to 1024×1024. */
  width?: number;
  height?: number;
}

interface GenerateImageResult {
  /** SVG (mock) or PNG (real vendor) data URI or absolute URL. */
  imageUrl: string;
  /** True when the response came from the mock fallback (no real vendor configured). */
  mock: boolean;
  /** Echo of the prompt for client-side captioning. */
  prompt: string;
}

function buildMockSvg(prompt: string, width: number, height: number): string {
  const safePrompt = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 120);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='xMidYMid slice'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#1a1a2e'/>
        <stop offset='1' stop-color='#6366f1'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='40%' text-anchor='middle' fill='#ffffff' font-family='-apple-system, sans-serif' font-size='${Math.round(height * 0.04)}' font-weight='600'>AI image (mock)</text>
    <text x='50%' y='52%' text-anchor='middle' fill='#ffffffcc' font-family='-apple-system, sans-serif' font-size='${Math.round(height * 0.025)}'>${safePrompt}</text>
    <text x='50%' y='62%' text-anchor='middle' fill='#ffffff88' font-family='-apple-system, sans-serif' font-size='${Math.round(height * 0.018)}'>Set AI_IMAGE_VENDOR to swap to a real vendor.</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: GenerateImageBody;
  try {
    body = (await req.json()) as GenerateImageBody;
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);
  const prompt = (body.prompt ?? '').trim();
  if (prompt.length === 0) {
    return Response.json({ error: 'prompt is required' }, { status: 400, headers: cors });
  }
  const width = Math.min(Math.max(body.width ?? 1024, 64), 4096);
  const height = Math.min(Math.max(body.height ?? 1024, 64), 4096);

  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 30 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 200 },
  });

  // ─── Vendor dispatch ────────────────────────────────────────────────
  // For Phase 4.3 we always return a mock. When AI_IMAGE_VENDOR is set
  // (e.g. 'openai', 'replicate', 'stability'), switch on it and call
  // the real provider. Single change here; browser shape unchanged.
  const vendor = Deno.env.get('AI_IMAGE_VENDOR');
  const isMock = !vendor;

  if (!isMock) {
    // Future: dispatch to real vendor. For now, return mock with
    // a different message so we can spot drift in production logs.
    await logCall({ sessionId, ipAddress, functionName: FUNCTION_NAME, model: vendor, inputTokens: 0, outputTokens: 0 });
    const result: GenerateImageResult = {
      imageUrl: buildMockSvg(`(vendor=${vendor} not yet wired) ${prompt}`, width, height),
      mock: true,
      prompt,
    };
    return Response.json(result, { headers: cors });
  }

  await logCall({ sessionId, ipAddress, functionName: FUNCTION_NAME, model: 'mock', inputTokens: 0, outputTokens: 0 });
  const result: GenerateImageResult = {
    imageUrl: buildMockSvg(prompt, width, height),
    mock: true,
    prompt,
  };
  return Response.json(result, { headers: cors });
}));
