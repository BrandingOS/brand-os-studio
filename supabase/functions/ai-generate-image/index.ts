// Edge Function: ai-generate-image.
//
// ─── Status: pollinations default, mock fallback ──────────────────────
//
// Real image generation via Pollinations.ai (free, no key) by default.
// Swap to any other vendor by setting AI_IMAGE_VENDOR (see vendors
// table below). The browser contract is unchanged across vendors.
//
// ─── Vendor dispatch ──────────────────────────────────────────────────
//
// AI_IMAGE_VENDOR=…    Behavior
//   (unset)            → openai if OPENAI_API_KEY is set
//                        else fal if FAL_API_KEY is set
//                        else pollinations (free fallback; stretches)
//   openai             → OpenAI gpt-image-1 (needs OPENAI_API_KEY,
//                        ~$0.04/image medium quality, respects aspect)
//   fal                → Fal.ai Flux Schnell (needs FAL_API_KEY,
//                        $0.003/image, respects aspect)
//   pollinations       → Pollinations.ai (free, no key; SANA model
//                        silently stretches non-square aspects)
//   cloudflare         → Cloudflare Workers AI (Flux schnell; needs
//                        CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN)
//   huggingface        → HF Inference API (needs HUGGINGFACE_API_KEY)
//   mock               → deterministic SVG mock (no network)
//
// To add a paid/better vendor (Replicate, Fal, Stability, OpenAI),
// add a `dispatchX` function below and a case in `dispatchVendor`.
// Everything else stays the same.

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
  /** Vendor model. Pollinations: 'flux' | 'turbo' | 'gptimage' | 'kontext'. */
  model?: string;
  /** Optional seed for reproducibility — random when omitted. */
  seed?: number;
  /** Optional reference image URL — when set, dispatches the image-to-
   *  image model (Pollinations Kontext) and passes the URL as the
   *  `image` param. The URL must be publicly fetchable from
   *  Pollinations' servers. */
  referenceImageUrl?: string;
}

interface GenerateImageResult {
  /** SVG (mock) or PNG (real vendor) data URI or absolute URL. */
  imageUrl: string;
  /** True when the response came from the mock fallback (no real vendor configured). */
  mock: boolean;
  /** Echo of the prompt for client-side captioning. */
  prompt: string;
  /** Actual pixel dimensions of the generated image. Pollinations often
   *  returns at a smaller size than requested; the browser uses these
   *  to size the page exactly so there's never any stretch / crop. */
  width?: number;
  height?: number;
}

// ─── Image header parsing ───────────────────────────────────────────
// Read native dimensions out of the raw bytes so the browser gets
// reliable W×H without having to load + measure the image. Supports
// PNG (IHDR) and JPEG (SOF markers). Returns null on unrecognized
// formats — the caller falls back to the requested size.

function readImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A signature; IHDR starts at byte 8.
  // width = big-endian uint32 at offset 16, height at offset 20.
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  // JPEG: starts with 0xFF 0xD8. Scan for SOF markers (FFC0..FFCF
  // except FFC4/C8/CC). The two bytes after marker + length give
  // precision then height (BE16) then width (BE16).
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker === 0xd8 || marker === 0x01) { i += 2; continue; }
      if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
      if (segLen < 2) break;
      const isSof =
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        const h = (bytes[i + 5] << 8) | bytes[i + 6];
        const w = (bytes[i + 7] << 8) | bytes[i + 8];
        if (w > 0 && h > 0) return { width: w, height: h };
        break;
      }
      i += 2 + segLen;
    }
  }
  return null;
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

// ─── Vendor: Pollinations.ai ─────────────────────────────────────────
// Free, no API key, no signup.
//
// IMPORTANT: Pollinations returns 403 to browser requests that include
// an `Origin` header (i.e. `<img crossOrigin="anonymous">` or fetch
// from JS). To make the response usable in both <img> tags AND on a
// Fabric canvas (which needs CORS for untainted export), we fetch the
// PNG bytes server-side here and return a data URI. The browser then
// gets a same-origin-equivalent payload, no CORS handshake needed.
async function dispatchPollinations(
  prompt: string,
  width: number,
  height: number,
  opts: { model?: string; seed?: number; referenceImageUrl?: string } = {},
): Promise<string> {
  const encoded = encodeURIComponent(prompt).slice(0, 1500);
  const allowedModels = new Set(['flux', 'turbo', 'gptimage', 'kontext']);
  // Kontext is paid (enter.pollinations.ai). For the free tier we use
  // the requested model (default flux) and pass `image` for img2img
  // when a reference is provided — Pollinations Flux accepts the
  // image= param on the free endpoint.
  const model = opts.model && allowedModels.has(opts.model) ? opts.model : 'flux';
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
    enhance: 'true',
    model,
    referrer: 'brandos',
  });
  if (typeof opts.seed === 'number' && Number.isFinite(opts.seed)) {
    params.set('seed', String(Math.trunc(opts.seed)));
  }
  if (opts.referenceImageUrl) {
    params.set('image', opts.referenceImageUrl);
  }
  const url = `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'brandos-edge/1.0' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Response(`pollinations ${res.status}: ${body.slice(0, 200)}`, { status: 502 });
  }
  const ct = res.headers.get('content-type') ?? 'image/jpeg';
  const buf = new Uint8Array(await res.arrayBuffer());
  const dims = readImageDimensions(buf);
  return {
    dataUrl: `data:${ct};base64,${base64Encode(buf)}`,
    width: dims?.width,
    height: dims?.height,
  };
}

// ─── Vendor: Cloudflare Workers AI ───────────────────────────────────
// Free tier (10k neurons/day). Real Flux schnell. Returns the image
// bytes; we re-encode to a data URI so the browser contract is the
// same (`imageUrl` is renderable directly).
async function dispatchCloudflare(prompt: string, width: number, height: number): Promise<string> {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
  if (!accountId || !apiToken) {
    throw new Response('cloudflare vendor selected but CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN missing', { status: 500 });
  }
  const model = '@cf/black-forest-labs/flux-1-schnell';
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    body: JSON.stringify({ prompt, width, height }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Response(`cloudflare ${res.status}: ${body.slice(0, 200)}`, { status: 502 });
  }
  // Workers AI returns either binary image/png or { result: { image: <base64> } } depending on model.
  const ct = res.headers.get('content-type') ?? '';
  if (ct.startsWith('image/')) {
    const buf = new Uint8Array(await res.arrayBuffer());
    return `data:${ct};base64,${base64Encode(buf)}`;
  }
  const j = await res.json() as { result?: { image?: string } };
  const b64 = j?.result?.image;
  if (!b64) throw new Response('cloudflare returned no image', { status: 502 });
  return `data:image/png;base64,${b64}`;
}

// ─── Vendor: Hugging Face Inference API ──────────────────────────────
async function dispatchHuggingFace(prompt: string, _width: number, _height: number): Promise<string> {
  const key = Deno.env.get('HUGGINGFACE_API_KEY');
  if (!key) throw new Response('huggingface vendor selected but HUGGINGFACE_API_KEY missing', { status: 500 });
  const model = Deno.env.get('HUGGINGFACE_MODEL') ?? 'black-forest-labs/FLUX.1-schnell';
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ inputs: prompt }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Response(`huggingface ${res.status}: ${body.slice(0, 200)}`, { status: 502 });
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const ct = res.headers.get('content-type') ?? 'image/png';
  return `data:${ct};base64,${base64Encode(buf)}`;
}

function base64Encode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ─── Vendor: OpenAI ──────────────────────────────────────────────────
// gpt-image-1 (preferred) and dall-e-3 both honour aspect ratio via
// their fixed `size` enum — output content is properly composed, not
// stretched. gpt-image-1 always returns base64; dall-e-3 returns a
// URL by default but we request b64_json for a consistent path.
//
// Sizes:
//   gpt-image-1 → 1024x1024 | 1024x1536 | 1536x1024 | auto
//   dall-e-3    → 1024x1024 | 1024x1792 | 1792x1024
async function dispatchOpenAi(
  prompt: string,
  width: number,
  height: number,
  opts: { referenceImageUrl?: string } = {},
): Promise<{ dataUrl: string; width?: number; height?: number }> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Response('OPENAI vendor selected but OPENAI_API_KEY missing', { status: 500 });

  const model = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
  const quality = Deno.env.get('OPENAI_IMAGE_QUALITY') || (model === 'gpt-image-1' ? 'medium' : 'standard');

  // Snap our requested aspect to the nearest OpenAI-supported size.
  // OpenAI is strict about the `size` value — it errors on anything
  // not in its enum.
  const aspect = width / height;
  const isGpt = model === 'gpt-image-1';
  let size: string;
  if (Math.abs(aspect - 1) < 0.2) {
    size = '1024x1024';
  } else if (aspect > 1) {
    size = isGpt ? '1536x1024' : '1792x1024';
  } else {
    size = isGpt ? '1024x1536' : '1024x1792';
  }

  const body: Record<string, unknown> = {
    model,
    prompt,
    size,
    n: 1,
  };
  if (isGpt) {
    body.quality = quality;          // 'low' | 'medium' | 'high' | 'auto'
    // gpt-image-1 always returns b64_json; no response_format field.
  } else {
    body.response_format = 'b64_json';
    if (quality === 'hd') body.quality = 'hd';
  }
  // Reference image: gpt-image-1 supports it via the dedicated /edits
  // endpoint, not /generations. Keep this commit scoped to text-to-
  // image; img2img can land as a follow-up.
  void opts.referenceImageUrl;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Response(`openai ${res.status}: ${errBody.slice(0, 300)}`, { status: 502 });
  }
  const out = await res.json() as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = out.data?.[0];
  if (!first?.b64_json && !first?.url) {
    throw new Response('openai returned no image', { status: 502 });
  }

  let bytes: Uint8Array;
  let contentType = 'image/png'; // OpenAI returns PNG
  if (first.b64_json) {
    const bin = atob(first.b64_json);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    // dall-e-3 URL fallback (shouldn't hit since we requested b64).
    const imgRes = await fetch(first.url!);
    if (!imgRes.ok) throw new Response(`openai image fetch ${imgRes.status}`, { status: 502 });
    contentType = imgRes.headers.get('content-type') ?? 'image/png';
    bytes = new Uint8Array(await imgRes.arrayBuffer());
  }
  const parsed = readImageDimensions(bytes);
  return {
    dataUrl: `data:${contentType};base64,${base64Encode(bytes)}`,
    width: parsed?.width,
    height: parsed?.height,
  };
}

// ─── Vendor: Fal.ai ──────────────────────────────────────────────────
// Flux Schnell at $0.003 / image; honours custom width × height
// natively so the output is never stretched. We submit and
// synchronously wait for the result (Schnell averages ~2-4 s).
async function dispatchFal(
  prompt: string,
  width: number,
  height: number,
  opts: { seed?: number; referenceImageUrl?: string } = {},
): Promise<{ dataUrl: string; width?: number; height?: number }> {
  const key = Deno.env.get('FAL_API_KEY');
  if (!key) throw new Response('FAL vendor selected but FAL_API_KEY missing', { status: 500 });

  // Schnell accepts custom dimensions clamped to 256–2048 in steps
  // of 64. Pin to the closest valid bucket so the request never gets
  // rejected for a fractional value.
  const clamp = (n: number) => {
    const lo = 256;
    const hi = 2048;
    const step = 64;
    const r = Math.round(n / step) * step;
    return Math.max(lo, Math.min(hi, r));
  };
  const body: Record<string, unknown> = {
    prompt,
    image_size: { width: clamp(width), height: clamp(height) },
    num_inference_steps: 4,
    enable_safety_checker: false,
  };
  if (typeof opts.seed === 'number' && Number.isFinite(opts.seed)) body.seed = Math.trunc(opts.seed);
  if (opts.referenceImageUrl) body.image_url = opts.referenceImageUrl;

  // Use the synchronous run endpoint so we don't have to poll. Falls
  // back to flux-dev if the user picked a richer model in opts later.
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Response(`fal ${res.status}: ${errBody.slice(0, 200)}`, { status: 502 });
  }
  const out = await res.json() as {
    images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
  };
  const first = out.images?.[0];
  if (!first?.url) throw new Response('fal returned no image', { status: 502 });

  // Fetch the actual bytes so we can return a data URI (browser-side
  // contract is unchanged). Fal CDN allows direct GETs.
  const imgRes = await fetch(first.url);
  if (!imgRes.ok) throw new Response(`fal image fetch ${imgRes.status}`, { status: 502 });
  const ct = imgRes.headers.get('content-type') ?? first.content_type ?? 'image/jpeg';
  const buf = new Uint8Array(await imgRes.arrayBuffer());
  const parsed = readImageDimensions(buf);
  return {
    dataUrl: `data:${ct};base64,${base64Encode(buf)}`,
    width: parsed?.width ?? first.width,
    height: parsed?.height ?? first.height,
  };
}

async function dispatchVendor(
  vendor: string,
  prompt: string,
  width: number,
  height: number,
  opts: { model?: string; seed?: number; referenceImageUrl?: string },
): Promise<{ imageUrl: string; model: string; width?: number; height?: number }> {
  switch (vendor) {
    case 'openai': {
      const out = await dispatchOpenAi(prompt, width, height, {
        referenceImageUrl: opts.referenceImageUrl,
      });
      const m = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
      return {
        imageUrl: out.dataUrl,
        model: `openai:${m}`,
        width: out.width,
        height: out.height,
      };
    }
    case 'fal': {
      const out = await dispatchFal(prompt, width, height, {
        seed: opts.seed,
        referenceImageUrl: opts.referenceImageUrl,
      });
      return {
        imageUrl: out.dataUrl,
        model: 'fal:flux-schnell',
        width: out.width,
        height: out.height,
      };
    }
    case 'pollinations': {
      const out = await dispatchPollinations(prompt, width, height, opts);
      const effectiveModel = opts.referenceImageUrl ? 'kontext' : (opts.model ?? 'flux');
      return {
        imageUrl: out.dataUrl,
        model: `pollinations:${effectiveModel}`,
        width: out.width,
        height: out.height,
      };
    }
    case 'cloudflare':
      return { imageUrl: await dispatchCloudflare(prompt, width, height), model: 'cf:flux-1-schnell' };
    case 'huggingface':
      return { imageUrl: await dispatchHuggingFace(prompt, width, height), model: 'hf:flux-schnell' };
    default:
      throw new Response(`unknown AI_IMAGE_VENDOR: ${vendor}`, { status: 500 });
  }
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
  // Auto-pick the best wired vendor when AI_IMAGE_VENDOR is unset:
  //   1. OpenAI gpt-image-1 when OPENAI_API_KEY is set
  //   2. Fal Flux Schnell when FAL_API_KEY is set
  //   3. Pollinations as the no-cost fallback (note: free tier
  //      silently uses NVIDIA SANA which stretches non-square)
  // An explicit AI_IMAGE_VENDOR always wins.
  const explicitVendor = Deno.env.get('AI_IMAGE_VENDOR');
  const hasOpenAiKey = !!Deno.env.get('OPENAI_API_KEY');
  const hasFalKey = !!Deno.env.get('FAL_API_KEY');
  const vendor = (
    explicitVendor ?? (hasOpenAiKey ? 'openai' : (hasFalKey ? 'fal' : 'pollinations'))
  ).toLowerCase();

  if (vendor === 'mock') {
    await logCall({ sessionId, ipAddress, functionName: FUNCTION_NAME, model: 'mock', inputTokens: 0, outputTokens: 0 });
    const result: GenerateImageResult = {
      imageUrl: buildMockSvg(prompt, width, height),
      mock: true,
      prompt,
    };
    return Response.json(result, { headers: cors });
  }

  try {
    const dispatch = await dispatchVendor(vendor, prompt, width, height, {
      model: typeof body.model === 'string' ? body.model : undefined,
      seed: typeof body.seed === 'number' ? body.seed : undefined,
      referenceImageUrl: typeof body.referenceImageUrl === 'string' ? body.referenceImageUrl : undefined,
    });
    await logCall({ sessionId, ipAddress, functionName: FUNCTION_NAME, model: dispatch.model, inputTokens: 0, outputTokens: 0 });
    const result: GenerateImageResult = {
      imageUrl: dispatch.imageUrl,
      mock: false,
      prompt,
      width: dispatch.width,
      height: dispatch.height,
    };
    return Response.json(result, { headers: cors });
  } catch (err) {
    // dispatchVendor throws a Response on misconfig / upstream failure;
    // re-emit with CORS so the browser sees a proper error body.
    if (err instanceof Response) {
      const body = await err.text().catch(() => 'vendor error');
      return new Response(body, { status: err.status, headers: cors });
    }
    return new Response(`vendor error: ${(err as Error).message}`, { status: 502, headers: cors });
  }
}));
