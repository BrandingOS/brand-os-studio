// Provider adapters — one interface, one function per vendor.
//
//   ImageProvider.generate(request) → GeneratedImage[]
//
// Everything a vendor differs on (endpoint, body shape, how the image comes
// back, how many per call) lives inside its adapter. The orchestrator only
// knows the interface and the capability registry, so adding a vendor is a new
// adapter + a registry entry — nothing else changes.
//
// Rules that bind every adapter:
//   • Never return a vendor's raw error text. Throw through `imageErrors` so
//     the taxonomy decides what the user sees and the raw body goes to the
//     private diagnostics table.
//   • Always honour `signal` so cancellation and the request deadline work.
//   • Return decoded BYTES, not URLs. The orchestrator owns storage.

import {
  aspectToDimensions,
  vendorModelFor,
  type AspectRatio,
  type ImageModelDef,
} from './imageModels.ts';
import {
  imageError,
  normalizeProviderFailure,
  normalizeThrown,
} from './imageErrors.ts';
import type { NormalizedUsage } from './pricing.ts';

export interface ProviderReference {
  role: string;
  bytes: Uint8Array;
  mime: string;
}

export interface ProviderRequest {
  def: ImageModelDef;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  size: number;
  count: number;
  seed?: number;
  quality?: string;
  references: ProviderReference[];
  getEnv: (k: string) => string | undefined;
  signal: AbortSignal;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  mime: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface ProviderResult {
  images: GeneratedImage[];
  usage?: NormalizedUsage;
  providerRequestId?: string;
  warnings: string[];
}

export type ImageProvider = (req: ProviderRequest) => Promise<ProviderResult>;

// ─── Shared helpers ──────────────────────────────────────────────────────────

export function base64Encode(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Read intrinsic dimensions out of the bytes (PNG / JPEG / WebP). */
export function readImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
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
      const isSof = marker >= 0xc0 && marker <= 0xcf &&
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
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === 'VP8X') {
      return {
        width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
      };
    }
    if (chunk === 'VP8 ') {
      const w = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      const h = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
      if (w > 0 && h > 0) return { width: w, height: h };
    }
    if (chunk === 'VP8L') {
      const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
  }
  return null;
}

function toImage(bytes: Uint8Array, mime: string, seed?: number): GeneratedImage {
  const dims = readImageDimensions(bytes);
  return { bytes, mime, width: dims?.width, height: dims?.height, seed };
}

/** Fan a per-call limit out to `count` images, tolerating partial failure. */
async function fanOut(
  count: number,
  perCall: number,
  one: (index: number, n: number) => Promise<GeneratedImage[]>,
  warnings: string[],
): Promise<GeneratedImage[]> {
  const batches: number[] = [];
  let left = count;
  while (left > 0) { const n = Math.min(perCall, left); batches.push(n); left -= n; }

  const settled = await Promise.allSettled(batches.map((n, i) => one(i, n)));
  const ok: GeneratedImage[] = [];
  let firstErr: unknown = null;
  for (const s of settled) {
    if (s.status === 'fulfilled') ok.push(...s.value);
    else if (!firstErr) firstErr = s.reason;
  }
  if (ok.length === 0) throw firstErr ?? imageError('provider_unavailable');
  if (ok.length < count) warnings.push(`${count - ok.length} of ${count} images failed`);
  return ok;
}

async function readError(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}

// ─── Google (Nano Banana / Nano Banana Pro) ──────────────────────────────────

const googleProvider: ImageProvider = async (req) => {
  const key = req.getEnv('GEMINI_API_KEY');
  if (!key) throw imageError('authentication', { providerError: 'GEMINI_API_KEY missing' });
  const model = vendorModelFor(req.def, req.getEnv);
  const warnings: string[] = [];

  const parts: Record<string, unknown>[] = req.references.map((r) => ({
    inline_data: { mime_type: r.mime, data: base64Encode(r.bytes) },
  }));
  parts.push({
    text: req.negativePrompt ? `${req.prompt}\n\nAvoid: ${req.negativePrompt}` : req.prompt,
  });

  // `imageSize` is honoured by gemini-3-pro-image-preview ("1K" | "2K" | "4K")
  // and ignored by 2.5-flash-image. The registry already declared 2048 as a
  // supported size for the Pro model, but nothing ever sent it — so the
  // strongest model we route Auto to was quietly producing 1K all along.
  const imageSize = req.size >= 2048 ? '2K' : '1K';
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: req.aspectRatio, imageSize },
    },
  };

  const images = await fanOut(req.count, req.def.caps.nPerCall, async () => {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
          signal: req.signal,
        },
      );
    } catch (err) { throw normalizeThrown('gemini', err); }

    if (!res.ok) throw normalizeProviderFailure('gemini', res.status, await readError(res));

    const out = await res.json() as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };
    const img = out.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!img?.data) {
      const blocked = out.promptFeedback?.blockReason
        ?? (out.candidates?.[0]?.finishReason === 'SAFETY' ? 'SAFETY' : undefined);
      const detail = JSON.stringify(out).slice(0, 2000);
      throw blocked
        ? imageError('safety_rejection', { providerError: `gemini blocked: ${blocked} ${detail}` })
        : imageError('provider_unavailable', { providerError: `gemini returned no image: ${detail}` });
    }
    return [toImage(base64Decode(img.data), img.mimeType ?? 'image/png')];
  }, warnings);

  return { images, usage: { imageCount: images.length }, warnings };
};

// ─── OpenAI (GPT Image) ──────────────────────────────────────────────────────

const openaiProvider: ImageProvider = async (req) => {
  const key = req.getEnv('OPENAI_API_KEY');
  if (!key) throw imageError('authentication', { providerError: 'OPENAI_API_KEY missing' });
  const model = vendorModelFor(req.def, req.getEnv);
  const warnings: string[] = [];
  const { width, height } = aspectToDimensions(req.aspectRatio, req.size);
  const size = `${width}x${height}`;
  const quality = req.quality ?? req.getEnv('OPENAI_IMAGE_QUALITY') ?? 'medium';
  const prompt = req.negativePrompt
    ? `${req.prompt}\n\nDo not include: ${req.negativePrompt}`
    : req.prompt;

  let usage: NormalizedUsage | undefined;

  const parse = async (res: Response): Promise<GeneratedImage[]> => {
    if (!res.ok) throw normalizeProviderFailure('openai', res.status, await readError(res));
    const out = await res.json() as {
      data?: Array<{ b64_json?: string; url?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    };
    const items = out.data ?? [];
    if (items.length === 0) {
      throw imageError('provider_unavailable', { providerError: 'openai returned no image' });
    }
    if (out.usage) {
      usage = {
        imageCount: items.length,
        inputTokens: out.usage.input_tokens,
        outputTokens: out.usage.output_tokens,
        raw: out.usage,
      };
    }
    const results: GeneratedImage[] = [];
    for (const it of items) {
      if (it.b64_json) {
        results.push(toImage(base64Decode(it.b64_json), 'image/png'));
      } else if (it.url) {
        // Vendor CDN only — this URL came from OpenAI, not from a caller.
        const imgRes = await fetch(it.url, { signal: req.signal });
        if (!imgRes.ok) throw normalizeProviderFailure('openai', imgRes.status, 'image fetch failed');
        results.push(toImage(
          new Uint8Array(await imgRes.arrayBuffer()),
          imgRes.headers.get('content-type')?.split(';')[0] ?? 'image/png',
        ));
      }
    }
    return results;
  };

  const images = await fanOut(req.count, req.def.caps.nPerCall, async (_i, n) => {
    try {
      if (req.references.length > 0) {
        const form = new FormData();
        form.set('model', model);
        form.set('prompt', prompt);
        form.set('size', size);
        form.set('quality', quality);
        form.set('n', String(n));
        form.set('input_fidelity', 'high');
        req.references.forEach((r, i) => {
          const ext = r.mime.split('/')[1] ?? 'png';
          form.append('image[]', new Blob([r.bytes], { type: r.mime }), `ref-${i}.${ext}`);
        });
        return parse(await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}` },
          body: form,
          signal: req.signal,
        }));
      }
      return parse(await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, prompt, size, quality, n }),
        signal: req.signal,
      }));
    } catch (err) { throw normalizeThrown('openai', err); }
  }, warnings);

  return { images, usage: usage ?? { imageCount: images.length }, warnings };
};

// ─── fal.ai ──────────────────────────────────────────────────────────────────

const falProvider: ImageProvider = async (req) => {
  const key = req.getEnv('FAL_API_KEY');
  if (!key) throw imageError('authentication', { providerError: 'FAL_API_KEY missing' });
  const warnings: string[] = [];
  const { width, height } = aspectToDimensions(req.aspectRatio, req.size);
  const clamp = (n: number) => Math.max(256, Math.min(2048, Math.round(n / 64) * 64));

  const body: Record<string, unknown> = {
    prompt: req.prompt,
    image_size: { width: clamp(width), height: clamp(height) },
    num_inference_steps: 4,
    num_images: Math.min(req.count, req.def.caps.nPerCall),
    enable_safety_checker: false,
  };
  if (typeof req.seed === 'number') body.seed = req.seed;

  let res: Response;
  try {
    res = await fetch(`https://fal.run/${vendorModelFor(req.def, req.getEnv)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
      body: JSON.stringify(body),
      signal: req.signal,
    });
  } catch (err) { throw normalizeThrown('fal', err); }

  if (!res.ok) throw normalizeProviderFailure('fal', res.status, await readError(res));

  const out = await res.json() as {
    images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
    seed?: number;
  };
  const items = out.images ?? [];
  if (items.length === 0) {
    throw imageError('provider_unavailable', { providerError: 'fal returned no image' });
  }
  const images: GeneratedImage[] = [];
  for (const it of items) {
    const imgRes = await fetch(it.url, { signal: req.signal });
    if (!imgRes.ok) throw normalizeProviderFailure('fal', imgRes.status, 'image fetch failed');
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get('content-type')?.split(';')[0] ?? it.content_type ?? 'image/jpeg';
    const img = toImage(bytes, mime, out.seed);
    images.push({ ...img, width: img.width ?? it.width, height: img.height ?? it.height });
  }
  return { images, usage: { imageCount: images.length }, warnings };
};

// ─── Pollinations (free) ─────────────────────────────────────────────────────

const pollinationsProvider: ImageProvider = async (req) => {
  const model = vendorModelFor(req.def, req.getEnv);
  const warnings: string[] = [];
  const { width, height } = aspectToDimensions(req.aspectRatio, req.size);
  const text = req.negativePrompt ? `${req.prompt} --no ${req.negativePrompt}` : req.prompt;
  const encoded = encodeURIComponent(text).slice(0, 1500);

  const images = await fanOut(req.count, 1, async (i) => {
    const seed = typeof req.seed === 'number' ? req.seed + i : Math.floor(Math.random() * 1e9);
    const params = new URLSearchParams({
      width: String(width), height: String(height),
      nologo: 'true', enhance: 'true', model, referrer: 'brandos', seed: String(seed),
    });
    let res: Response;
    try {
      res = await fetch(`https://image.pollinations.ai/prompt/${encoded}?${params}`, {
        headers: { 'User-Agent': 'brandos-edge/1.0' },
        signal: req.signal,
      });
    } catch (err) { throw normalizeThrown('pollinations', err); }
    if (!res.ok) throw normalizeProviderFailure('pollinations', res.status, await readError(res));
    const bytes = new Uint8Array(await res.arrayBuffer());
    const mime = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
    return [toImage(bytes, mime, seed)];
  }, warnings);

  return { images, usage: { imageCount: images.length }, warnings };
};

// ─── Cloudflare Workers AI ───────────────────────────────────────────────────

const cloudflareProvider: ImageProvider = async (req) => {
  const accountId = req.getEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = req.getEnv('CLOUDFLARE_API_TOKEN');
  if (!accountId || !apiToken) {
    throw imageError('authentication', { providerError: 'CLOUDFLARE_ACCOUNT_ID/API_TOKEN missing' });
  }
  const warnings: string[] = [];
  const { width, height } = aspectToDimensions(req.aspectRatio, req.size);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${vendorModelFor(req.def, req.getEnv)}`;

  const images = await fanOut(req.count, 1, async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ prompt: req.prompt, width, height }),
        signal: req.signal,
      });
    } catch (err) { throw normalizeThrown('cloudflare', err); }
    if (!res.ok) throw normalizeProviderFailure('cloudflare', res.status, await readError(res));
    const ct = res.headers.get('content-type') ?? '';
    if (ct.startsWith('image/')) {
      return [toImage(new Uint8Array(await res.arrayBuffer()), ct.split(';')[0])];
    }
    const j = await res.json() as { result?: { image?: string } };
    if (!j?.result?.image) {
      throw imageError('provider_unavailable', { providerError: 'cloudflare returned no image' });
    }
    return [toImage(base64Decode(j.result.image), 'image/png')];
  }, warnings);

  return { images, usage: { imageCount: images.length }, warnings };
};

// ─── Hugging Face ────────────────────────────────────────────────────────────

const huggingfaceProvider: ImageProvider = async (req) => {
  const key = req.getEnv('HUGGINGFACE_API_KEY');
  if (!key) throw imageError('authentication', { providerError: 'HUGGINGFACE_API_KEY missing' });
  const warnings: string[] = [];
  const { width, height } = aspectToDimensions(req.aspectRatio, req.size);

  const images = await fanOut(req.count, 1, async () => {
    let res: Response;
    try {
      res = await fetch(
        `https://api-inference.huggingface.co/models/${vendorModelFor(req.def, req.getEnv)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ inputs: req.prompt, parameters: { width, height } }),
          signal: req.signal,
        },
      );
    } catch (err) { throw normalizeThrown('huggingface', err); }
    if (!res.ok) throw normalizeProviderFailure('huggingface', res.status, await readError(res));
    const bytes = new Uint8Array(await res.arrayBuffer());
    return [toImage(bytes, res.headers.get('content-type')?.split(';')[0] ?? 'image/png')];
  }, warnings);

  return { images, usage: { imageCount: images.length }, warnings };
};

// ─── Mock (deterministic, no network) ────────────────────────────────────────

const mockProvider: ImageProvider = (req) => {
  const { width, height } = aspectToDimensions(req.aspectRatio, req.size);
  const hues = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b'];
  const safe = req.prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 120);
  const images: GeneratedImage[] = Array.from({ length: req.count }, (_, i) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1a1a2e'/><stop offset='1' stop-color='${hues[i % hues.length]}'/></linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='46%' text-anchor='middle' fill='#fff' font-family='sans-serif' font-size='${Math.round(height * 0.045)}' font-weight='600'>Mock image ${i + 1}</text>
      <text x='50%' y='56%' text-anchor='middle' fill='#ffffffcc' font-family='sans-serif' font-size='${Math.round(height * 0.026)}'>${safe}</text>
    </svg>`;
    return {
      bytes: new TextEncoder().encode(svg),
      mime: 'image/svg+xml',
      width, height,
      seed: (req.seed ?? 0) + i,
    };
  });
  return Promise.resolve({ images, usage: { imageCount: images.length }, warnings: [] });
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const PROVIDERS: Record<string, ImageProvider> = {
  google: googleProvider,
  openai: openaiProvider,
  fal: falProvider,
  pollinations: pollinationsProvider,
  cloudflare: cloudflareProvider,
  huggingface: huggingfaceProvider,
  mock: mockProvider,
};

export function providerFor(def: ImageModelDef): ImageProvider {
  const p = PROVIDERS[def.vendor];
  if (!p) throw imageError('unsupported_setting', { providerError: `no adapter for ${def.vendor}` });
  return p;
}
