// Edge Function: ai-generate-image.
//
// ─── Model-routed, multi-reference, multi-candidate ───────────────────
//
// The browser sends a registry model id (`google:nano-banana`,
// `openai:gpt-image`, `pollinations:flux`, … — see
// `_shared/imageModels.ts`) plus optional reference images (brand logo,
// palette swatch, a previous generation, a user upload) and a candidate
// count (1–4). This function routes to the vendor, fans the count out,
// and always answers the SAME shape:
//
//   { images: [{ imageUrl, width, height, seed? }], imageUrl /*legacy*/,
//     mock, prompt, model, warnings? }
//
// Every vendor's bytes are fetched server-side and returned as data URIs
// so Fabric can export without tainting the canvas (Pollinations 403s
// browser fetches that carry an Origin header).
//
// Two actions:
//   { action: 'models' }  → { models: [{ id, available, reason? }] }
//   default               → generate
//
// Secrets (set with `supabase secrets set …`): OPENAI_API_KEY,
// GEMINI_API_KEY, FAL_API_KEY, CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN,
// HUGGINGFACE_API_KEY. A model whose key is missing reports
// `available:false` and refuses with 409 — never silently falls back to a
// different vendor than the one the user chose. `model:'auto'` picks the
// best AVAILABLE model (AUTO_ORDER). AI_IMAGE_VENDOR=mock forces the
// deterministic mock for every request (dev / CI).

import { corsHeaders } from '../_shared/cors.ts';
import {
  enforceRateLimit,
  getClientIp,
  logCall,
  requireSession,
  withCors,
} from '../_shared/ai.ts';
import {
  IMAGE_MODELS,
  findImageModel,
  isModelAvailable,
  resolveAutoModel,
  vendorModelFor,
  type ImageModelDef,
} from '../_shared/imageModels.ts';

const FUNCTION_NAME = 'ai-generate-image';
const MAX_COUNT = 4;
const MAX_REFS_BYTES = 6 * 1024 * 1024;

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getEnv = (k: string) => Deno.env.get(k);

// ─── Contract ────────────────────────────────────────────────────────

export type ReferenceRole = 'logo' | 'palette' | 'style' | 'image' | 'previous';

interface ReferenceInput {
  role?: ReferenceRole;
  /** Inline image (preferred — reaches every vendor that accepts refs). */
  dataUrl?: string;
  /** Public URL (only Pollinations / fal consume URLs directly). */
  url?: string;
}

interface GenerateImageBody {
  action?: 'models' | 'generate';
  sessionId?: string;
  prompt?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  /** Registry id, legacy alias ('flux'), or 'auto'. */
  model?: string;
  count?: number;
  seed?: number;
  references?: ReferenceInput[];
  /** Legacy single public reference URL — still honoured. */
  referenceImageUrl?: string;
}

interface GeneratedImage {
  imageUrl: string;
  width?: number;
  height?: number;
  seed?: number;
}

interface GenerateImageResult {
  images: GeneratedImage[];
  /** = images[0].imageUrl — kept for older callers. */
  imageUrl: string;
  width?: number;
  height?: number;
  mock: boolean;
  prompt: string;
  model: string;
  warnings?: string[];
}

interface Ref {
  role: ReferenceRole;
  bytes?: Uint8Array;
  mime?: string;
  url?: string;
}

interface VendorOut { dataUrl: string; width?: number; height?: number; seed?: number }

interface DispatchArgs {
  def: ImageModelDef;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  count: number;
  seed?: number;
  refs: Ref[];
  warnings: string[];
}

// ─── Byte helpers ────────────────────────────────────────────────────

function readImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker === 0xd8 || marker === 0x01) { i += 2; continue; }
      if (marker === 0xd9 || marker === 0xda) break;
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
  // WebP (VP8X / VP8 / VP8L) — RIFF....WEBP
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === 'VP8X') {
      const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width: w, height: h };
    }
    if (chunk === 'VP8 ') {
      const w = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      const h = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
      if (w > 0 && h > 0) return { width: w, height: h };
    }
    if (chunk === 'VP8L') {
      const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
      const w = 1 + (((b1 & 0x3f) << 8) | b0);
      const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width: w, height: h };
    }
  }
  return null;
}

function base64Encode(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  if (!m[2]) return { mime, bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
  try {
    return { mime, bytes: base64Decode(m[3]) };
  } catch {
    return null;
  }
}

function toOut(bytes: Uint8Array, mime: string, seed?: number): VendorOut {
  const dims = readImageDimensions(bytes);
  return {
    dataUrl: `data:${mime};base64,${base64Encode(bytes)}`,
    width: dims?.width,
    height: dims?.height,
    seed,
  };
}

async function fetchBytes(url: string, init?: RequestInit): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Response(`upstream ${res.status}: ${body.slice(0, 200)}`, { status: 502 });
  }
  const mime = res.headers.get('content-type')?.split(';')[0] ?? 'image/png';
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime };
}

/** Bytes for refs that arrived as URLs (vendors that need inline data). */
async function inlineRefs(refs: Ref[]): Promise<Ref[]> {
  const out: Ref[] = [];
  for (const r of refs) {
    if (r.bytes) { out.push(r); continue; }
    if (r.url) {
      try {
        const { bytes, mime } = await fetchBytes(r.url);
        out.push({ ...r, bytes, mime });
      } catch { /* skip an unreachable ref rather than fail the run */ }
    }
  }
  return out;
}

/** Nearest vendor aspect label from a W×H. */
function aspectLabel(width: number, height: number, allowed: string[]): string {
  const target = width / height;
  let best = allowed[0];
  let bestDiff = Infinity;
  for (const a of allowed) {
    const [w, h] = a.split(':').map(Number);
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) { bestDiff = diff; best = a; }
  }
  return best;
}

async function fanOut(count: number, one: (i: number) => Promise<VendorOut>, warnings: string[]): Promise<VendorOut[]> {
  const settled = await Promise.allSettled(Array.from({ length: count }, (_, i) => one(i)));
  const ok: VendorOut[] = [];
  let firstErr: unknown = null;
  for (const s of settled) {
    if (s.status === 'fulfilled') ok.push(s.value);
    else if (!firstErr) firstErr = s.reason;
  }
  if (ok.length === 0) throw firstErr ?? new Response('vendor returned no image', { status: 502 });
  if (ok.length < count) warnings.push(`${count - ok.length} of ${count} candidates failed`);
  return ok;
}

// ─── Mock ────────────────────────────────────────────────────────────

function buildMockSvg(prompt: string, width: number, height: number, i: number): string {
  const safePrompt = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 120);
  const hues = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b'];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='xMidYMid slice'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1a1a2e'/><stop offset='1' stop-color='${hues[i % hues.length]}'/></linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='40%' text-anchor='middle' fill='#ffffff' font-family='-apple-system, sans-serif' font-size='${Math.round(height * 0.04)}' font-weight='600'>AI image (mock ${i + 1})</text>
    <text x='50%' y='52%' text-anchor='middle' fill='#ffffffcc' font-family='-apple-system, sans-serif' font-size='${Math.round(height * 0.025)}'>${safePrompt}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function dispatchMock(a: DispatchArgs): VendorOut[] {
  return Array.from({ length: a.count }, (_, i) => ({
    dataUrl: buildMockSvg(a.prompt, a.width, a.height, i),
    width: a.width,
    height: a.height,
    seed: (a.seed ?? 0) + i,
  }));
}

// ─── Vendor: Pollinations.ai (free) ──────────────────────────────────

async function dispatchPollinations(a: DispatchArgs): Promise<VendorOut[]> {
  const model = vendorModelFor(a.def, getEnv);
  const publicRef = a.refs.find((r) => r.url)?.url;
  if (a.refs.length > 0 && !publicRef) a.warnings.push('refs-unsupported');
  const encodedPrompt = encodeURIComponent(
    a.negativePrompt ? `${a.prompt} --no ${a.negativePrompt}` : a.prompt,
  ).slice(0, 1500);
  const one = async (i: number): Promise<VendorOut> => {
    const seed = typeof a.seed === 'number' ? Math.trunc(a.seed) + i : Math.floor(Math.random() * 1e9);
    const params = new URLSearchParams({
      width: String(a.width), height: String(a.height),
      nologo: 'true', enhance: 'true', model, referrer: 'brandos', seed: String(seed),
    });
    if (publicRef) params.set('image', publicRef);
    const { bytes, mime } = await fetchBytes(
      `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`,
      { headers: { 'User-Agent': 'brandos-edge/1.0' } },
    );
    return toOut(bytes, mime, seed);
  };
  return fanOut(a.count, one, a.warnings);
}

// ─── Vendor: Google Gemini (Nano Banana) ─────────────────────────────

const GEMINI_ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

async function dispatchGemini(a: DispatchArgs): Promise<VendorOut[]> {
  const key = getEnv('GEMINI_API_KEY');
  if (!key) throw new Response('GEMINI_API_KEY missing', { status: 409 });
  const model = vendorModelFor(a.def, getEnv);
  const refs = (await inlineRefs(a.refs)).slice(0, a.def.caps.maxRefs);
  const parts: Record<string, unknown>[] = [];
  for (const r of refs) {
    parts.push({ inline_data: { mime_type: r.mime ?? 'image/png', data: base64Encode(r.bytes!) } });
  }
  const text = a.negativePrompt ? `${a.prompt}\n\nAvoid: ${a.negativePrompt}` : a.prompt;
  parts.push({ text });
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: aspectLabel(a.width, a.height, GEMINI_ASPECTS) },
    },
  };
  const one = async (): Promise<VendorOut> => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Response(`gemini ${res.status}: ${errBody.slice(0, 300)}`, { status: 502 });
    }
    const out = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> } }>;
      promptFeedback?: { blockReason?: string };
    };
    const img = out.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!img?.data) {
      const reason = out.promptFeedback?.blockReason
        ?? out.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text?.slice(0, 200)
        ?? 'no image part';
      throw new Response(`gemini returned no image (${reason})`, { status: 502 });
    }
    return toOut(base64Decode(img.data), img.mimeType ?? 'image/png');
  };
  return fanOut(a.count, one, a.warnings);
}

// ─── Vendor: OpenAI GPT Image ────────────────────────────────────────

/** GPT-image accepts arbitrary WxH divisible by 16 within 1:3..3:1. */
function openAiSize(width: number, height: number): string {
  const snap = (n: number) => Math.max(256, Math.min(2560, Math.round(n / 16) * 16));
  let w = snap(width), h = snap(height);
  const ratio = w / h;
  if (ratio > 3) w = snap(h * 3);
  if (ratio < 1 / 3) h = snap(w * 3);
  return `${w}x${h}`;
}

async function dispatchOpenAi(a: DispatchArgs): Promise<VendorOut[]> {
  const key = getEnv('OPENAI_API_KEY');
  if (!key) throw new Response('OPENAI_API_KEY missing', { status: 409 });
  const model = vendorModelFor(a.def, getEnv);
  const quality = getEnv('OPENAI_IMAGE_QUALITY') || 'medium';
  const size = openAiSize(a.width, a.height);
  const prompt = a.negativePrompt ? `${a.prompt}\n\nDo not include: ${a.negativePrompt}` : a.prompt;
  const refs = (await inlineRefs(a.refs)).slice(0, a.def.caps.maxRefs);

  const parse = async (res: Response): Promise<VendorOut[]> => {
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Response(`openai ${res.status}: ${errBody.slice(0, 300)}`, { status: 502 });
    }
    const out = await res.json() as { data?: Array<{ b64_json?: string; url?: string }> };
    const items = out.data ?? [];
    if (items.length === 0) throw new Response('openai returned no image', { status: 502 });
    const results: VendorOut[] = [];
    for (const it of items) {
      if (it.b64_json) results.push(toOut(base64Decode(it.b64_json), 'image/png'));
      else if (it.url) {
        const { bytes, mime } = await fetchBytes(it.url);
        results.push(toOut(bytes, mime));
      }
    }
    return results;
  };

  const n = Math.min(a.count, a.def.caps.nMax);
  if (refs.length > 0) {
    const form = new FormData();
    form.set('model', model);
    form.set('prompt', prompt);
    form.set('size', size);
    form.set('quality', quality);
    form.set('n', String(n));
    form.set('input_fidelity', 'high');
    refs.forEach((r, i) => {
      const ext = (r.mime ?? 'image/png').split('/')[1] ?? 'png';
      form.append('image[]', new Blob([r.bytes!], { type: r.mime ?? 'image/png' }), `ref-${i}.${ext}`);
    });
    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    return parse(res);
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt, size, quality, n }),
  });
  return parse(res);
}

// ─── Vendor: fal.ai ──────────────────────────────────────────────────

async function dispatchFal(a: DispatchArgs): Promise<VendorOut[]> {
  const key = getEnv('FAL_API_KEY');
  if (!key) throw new Response('FAL_API_KEY missing', { status: 409 });
  const clamp = (n: number) => Math.max(256, Math.min(2048, Math.round(n / 64) * 64));
  const publicRef = a.refs.find((r) => r.url)?.url;
  if (a.refs.length > 0 && !publicRef) a.warnings.push('refs-unsupported');
  const body: Record<string, unknown> = {
    prompt: a.prompt,
    image_size: { width: clamp(a.width), height: clamp(a.height) },
    num_inference_steps: 4,
    num_images: Math.min(a.count, a.def.caps.nMax),
    enable_safety_checker: false,
  };
  if (typeof a.seed === 'number') body.seed = Math.trunc(a.seed);
  if (publicRef) body.image_url = publicRef;
  const res = await fetch(`https://fal.run/${vendorModelFor(a.def, getEnv)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Response(`fal ${res.status}: ${errBody.slice(0, 200)}`, { status: 502 });
  }
  const out = await res.json() as {
    images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
    seed?: number;
  };
  const items = out.images ?? [];
  if (items.length === 0) throw new Response('fal returned no image', { status: 502 });
  const results: VendorOut[] = [];
  for (const it of items) {
    const { bytes, mime } = await fetchBytes(it.url);
    const o = toOut(bytes, mime, out.seed);
    results.push({ ...o, width: o.width ?? it.width, height: o.height ?? it.height });
  }
  return results;
}

// ─── Vendor: Cloudflare Workers AI ───────────────────────────────────

async function dispatchCloudflare(a: DispatchArgs): Promise<VendorOut[]> {
  const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = getEnv('CLOUDFLARE_API_TOKEN');
  if (!accountId || !apiToken) throw new Response('CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN missing', { status: 409 });
  if (a.refs.length > 0) a.warnings.push('refs-unsupported');
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${vendorModelFor(a.def, getEnv)}`;
  const one = async (): Promise<VendorOut> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt: a.prompt, width: a.width, height: a.height }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Response(`cloudflare ${res.status}: ${body.slice(0, 200)}`, { status: 502 });
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct.startsWith('image/')) return toOut(new Uint8Array(await res.arrayBuffer()), ct.split(';')[0]);
    const j = await res.json() as { result?: { image?: string } };
    if (!j?.result?.image) throw new Response('cloudflare returned no image', { status: 502 });
    return toOut(base64Decode(j.result.image), 'image/png');
  };
  return fanOut(a.count, one, a.warnings);
}

// ─── Vendor: Hugging Face Inference ──────────────────────────────────

async function dispatchHuggingFace(a: DispatchArgs): Promise<VendorOut[]> {
  const key = getEnv('HUGGINGFACE_API_KEY');
  if (!key) throw new Response('HUGGINGFACE_API_KEY missing', { status: 409 });
  if (a.refs.length > 0) a.warnings.push('refs-unsupported');
  const one = async (): Promise<VendorOut> => {
    const { bytes, mime } = await fetchBytes(
      `https://api-inference.huggingface.co/models/${vendorModelFor(a.def, getEnv)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ inputs: a.prompt, parameters: { width: a.width, height: a.height } }),
      },
    );
    return toOut(bytes, mime);
  };
  return fanOut(a.count, one, a.warnings);
}

// ─── Router ──────────────────────────────────────────────────────────

async function dispatchVendor(a: DispatchArgs): Promise<VendorOut[]> {
  switch (a.def.vendor) {
    case 'mock': return dispatchMock(a);
    case 'pollinations': return dispatchPollinations(a);
    case 'google': return dispatchGemini(a);
    case 'openai': return dispatchOpenAi(a);
    case 'fal': return dispatchFal(a);
    case 'cloudflare': return dispatchCloudflare(a);
    case 'huggingface': return dispatchHuggingFace(a);
    default: throw new Response(`unknown vendor for ${a.def.id}`, { status: 500 });
  }
}

function modelsResponse() {
  const forceMock = (getEnv('AI_IMAGE_VENDOR') ?? '').toLowerCase() === 'mock';
  return {
    models: IMAGE_MODELS.map((m) => {
      const available = forceMock ? m.vendor === 'mock' : isModelAvailable(m, getEnv);
      return {
        id: m.id,
        available,
        reason: available ? undefined : (m.keyEnv ? 'missing-key' : 'disabled'),
        keyEnv: m.keyEnv,
        caps: m.caps,
        tier: m.tier,
      };
    }),
    auto: forceMock ? 'mock:svg' : resolveAutoModel(getEnv).id,
  };
}

function normalizeRefs(body: GenerateImageBody): Ref[] {
  const refs: Ref[] = [];
  let bytesTotal = 0;
  for (const r of body.references ?? []) {
    const role: ReferenceRole = r.role ?? 'image';
    if (typeof r.dataUrl === 'string' && r.dataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(r.dataUrl);
      if (!parsed) continue;
      bytesTotal += parsed.bytes.length;
      if (bytesTotal > MAX_REFS_BYTES) throw new Response('references exceed 6 MB', { status: 413 });
      refs.push({ role, bytes: parsed.bytes, mime: parsed.mime });
    } else if (typeof r.url === 'string' && /^https?:\/\//.test(r.url)) {
      refs.push({ role, url: r.url });
    }
  }
  if (typeof body.referenceImageUrl === 'string' && /^https?:\/\//.test(body.referenceImageUrl)) {
    refs.push({ role: 'image', url: body.referenceImageUrl });
  }
  return refs;
}

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: GenerateImageBody;
  try {
    body = (await req.json()) as GenerateImageBody;
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  if (body.action === 'models') {
    return Response.json(modelsResponse(), { headers: cors });
  }

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);
  const prompt = (body.prompt ?? '').trim();
  if (prompt.length === 0) {
    return Response.json({ error: 'prompt is required' }, { status: 400, headers: cors });
  }
  const width = Math.min(Math.max(body.width ?? 1024, 64), 4096);
  const height = Math.min(Math.max(body.height ?? 1024, 64), 4096);
  const count = Math.min(Math.max(Math.trunc(body.count ?? 1) || 1, 1), MAX_COUNT);

  // Resolve the model BEFORE rate limiting so a misconfigured pick is a
  // cheap 409, not a consumed quota slot.
  const forceMock = (getEnv('AI_IMAGE_VENDOR') ?? '').toLowerCase() === 'mock';
  let def: ImageModelDef | undefined;
  if (forceMock) def = findImageModel('mock:svg');
  else if (!body.model || body.model === 'auto') def = resolveAutoModel(getEnv);
  else def = findImageModel(body.model);
  if (!def) {
    return Response.json({ error: `unknown model: ${body.model}` }, { status: 400, headers: cors });
  }
  if (!isModelAvailable(def, getEnv)) {
    return Response.json(
      { error: 'model-unavailable', model: def.id, keyEnv: def.keyEnv,
        message: `${def.id} needs ${def.keyEnv ?? 'configuration'} set as a Supabase secret.` },
      { status: 409, headers: cors },
    );
  }

  let refs: Ref[];
  try {
    refs = normalizeRefs(body);
  } catch (e) {
    if (e instanceof Response) return new Response(await e.text(), { status: e.status, headers: cors });
    throw e;
  }
  if (def.caps.maxRefs === 0) refs = refs.filter((r) => r.url); // vendors read URLs only via legacy path

  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 60 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 400 },
  });

  const warnings: string[] = [];
  try {
    const outs = await dispatchVendor({
      def, prompt, negativePrompt: body.negativePrompt?.trim() || undefined,
      width, height, count,
      seed: typeof body.seed === 'number' && Number.isFinite(body.seed) ? body.seed : undefined,
      refs, warnings,
    });
    // Charge one quota slot per delivered image.
    await Promise.all(outs.map(() => logCall({
      sessionId, ipAddress, functionName: FUNCTION_NAME, model: def!.id, inputTokens: 0, outputTokens: 0,
    })));
    const images: GeneratedImage[] = outs.map((o) => ({
      imageUrl: o.dataUrl, width: o.width, height: o.height, seed: o.seed,
    }));
    const result: GenerateImageResult = {
      images,
      imageUrl: images[0].imageUrl,
      width: images[0].width,
      height: images[0].height,
      mock: def.vendor === 'mock',
      prompt,
      model: def.id,
      warnings: warnings.length ? warnings : undefined,
    };
    return Response.json(result, { headers: cors });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text().catch(() => 'vendor error');
      return Response.json({ error: 'vendor-error', model: def.id, message: text }, { status: err.status, headers: cors });
    }
    return Response.json(
      { error: 'vendor-error', model: def.id, message: (err as Error).message },
      { status: 502, headers: cors },
    );
  }
}));
