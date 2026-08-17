// Edge Function logic under the same gate as everything else.
//
// These modules are plain TypeScript with no Deno globals, so they run in the
// jsdom `unit` project. What is covered here is the part that decides money,
// safety and correctness: capability coercion, pricing, the error taxonomy,
// reference validation (SSRF + magic bytes), and every provider adapter
// against a mocked fetch — success, rate limit, quota, safety, malformed
// response, timeout and partial failure.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  IMAGE_MODELS, ALL_ASPECT_RATIOS,
  coerceSettings, findImageModel, isModelAvailable, resolveAutoModel,
  aspectToDimensions, vendorModelFor,
} from './imageModels.ts';
import {
  computeCost, settleCost, usdToCredits, creditsToUsd,
  PRICING_RULES, PRICING_VERSION, USD_PER_CREDIT, ruleFor,
} from './pricing.ts';
import {
  imageError, normalizeProviderFailure, normalizeThrown, ImageGenerationError,
} from './imageErrors.ts';
import {
  isPathAllowedForBrand, sniffImageMime, resolveReferences, storeOutputs,
} from './imageRefs.ts';
import { providerFor, readImageDimensions, base64Encode } from './imageProviders.ts';

// A 1×1 PNG — real bytes, so the magic-byte sniffer and dimension reader work.
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
function pngBytes(): Uint8Array {
  const bin = atob(PNG_B64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;

const env = (vars: Record<string, string>) => (k: string) => vars[k];

// ═══════════════════════════════════════════════════════════════════════════
describe('capability registry', () => {
  it('every model declares a coherent capability block', () => {
    for (const m of IMAGE_MODELS) {
      expect(m.id, 'id is vendor:model').toMatch(/^[a-z]+:[a-z0-9.-]+$/);
      expect(m.caps.supportedAspectRatios.length).toBeGreaterThan(0);
      for (const r of m.caps.supportedAspectRatios) {
        expect(ALL_ASPECT_RATIOS).toContain(r);
      }
      expect(m.caps.maxOutputs).toBeGreaterThanOrEqual(1);
      expect(m.caps.nPerCall).toBeGreaterThanOrEqual(1);
      // A model that cannot take references must not claim a positive max.
      if (!m.caps.supportsReferenceImages) expect(m.caps.maxReferenceImages).toBe(0);
      if (m.caps.maxReferenceImages > 0) expect(m.caps.supportsReferenceImages).toBe(true);
      // Every paid model must be priced (an unpriced paid model would be free).
      if (m.tier === 'paid') expect(PRICING_RULES[m.id]?.usdPerImage).toBeGreaterThan(0);
      if (m.tier === 'free') expect(PRICING_RULES[m.id]?.usdPerImage).toBe(0);
    }
  });

  it('availability follows the unlocking secret', () => {
    const openai = findImageModel('openai:gpt-image')!;
    expect(isModelAvailable(openai, env({}))).toBe(false);
    expect(isModelAvailable(openai, env({ OPENAI_API_KEY: 'k' }))).toBe(true);
    // Free models need nothing; cloudflare needs BOTH values.
    expect(isModelAvailable(findImageModel('pollinations:flux')!, env({}))).toBe(true);
    const cf = findImageModel('cloudflare:flux-schnell')!;
    expect(isModelAvailable(cf, env({ CLOUDFLARE_API_TOKEN: 't' }))).toBe(false);
    expect(isModelAvailable(cf, env({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'a' }))).toBe(true);
  });

  it('auto picks the best AVAILABLE model and never dead-ends', () => {
    expect(resolveAutoModel(env({})).id).toBe('pollinations:flux');
    expect(resolveAutoModel(env({ OPENAI_API_KEY: 'k' })).id).toBe('openai:gpt-image');
    expect(resolveAutoModel(env({ GEMINI_API_KEY: 'k', OPENAI_API_KEY: 'k' })).id)
      .toBe('google:nano-banana-pro');
  });

  it('legacy model ids still resolve', () => {
    expect(findImageModel('flux')?.id).toBe('pollinations:flux');
    expect(findImageModel('pollinations:kontext')?.id).toBe('pollinations:flux');
    expect(findImageModel('nope')).toBeUndefined();
  });

  it('vendorModelFor honours the env override', () => {
    const def = findImageModel('google:nano-banana-pro')!;
    expect(vendorModelFor(def, env({}))).toBe('gemini-3-pro-image-preview');
    expect(vendorModelFor(def, env({ GEMINI_IMAGE_PRO_MODEL: 'x' }))).toBe('x');
  });
});

describe('settings coercion — the server never trusts the client', () => {
  const pro = findImageModel('google:nano-banana-pro')!;
  const cf = findImageModel('cloudflare:flux-schnell')!;

  it('snaps an unsupported aspect ratio and reports it', () => {
    const out = coerceSettings(cf, { aspectRatio: '16:9' });
    expect(out.aspectRatio).toBe('1:1');
    expect(out.adjustments.join(' ')).toMatch(/aspect 16:9 → 1:1/);
  });

  it('caps the output count at the model maximum', () => {
    const out = coerceSettings(pro, { count: 99 });
    expect(out.count).toBe(pro.caps.maxOutputs);
    expect(out.adjustments.join(' ')).toMatch(/outputs/);
  });

  it('drops settings the model cannot honour instead of sending them', () => {
    const noSeed = coerceSettings(pro, { seed: 42, negativePrompt: 'blurry' });
    expect(noSeed.seed).toBeUndefined();
    expect(noSeed.negativePrompt).toBe('blurry');
    expect(noSeed.adjustments.join(' ')).toMatch(/seed not supported/);

    const noNeg = coerceSettings(findImageModel('fal:flux-schnell')!, { negativePrompt: 'x', seed: 7 });
    expect(noNeg.negativePrompt).toBeUndefined();
    expect(noNeg.seed).toBe(7);
  });

  it('reports when references will be ignored', () => {
    const out = coerceSettings(findImageModel('pollinations:flux')!, { referenceCount: 3 });
    expect(out.maxReferences).toBe(0);
    expect(out.adjustments.join(' ')).toMatch(/prompt-only/);
  });

  it('defaults quality only for models that have tiers', () => {
    expect(coerceSettings(findImageModel('openai:gpt-image')!, {}).quality).toBe('medium');
    expect(coerceSettings(pro, {}).quality).toBeUndefined();
    expect(coerceSettings(pro, { quality: 'high' }).adjustments.join(' ')).toMatch(/quality not supported/);
  });

  it('aspectToDimensions keeps both edges divisible by 16', () => {
    const d = aspectToDimensions('16:9', 1024);
    expect(d.width).toBe(1024);
    expect(d.height % 16).toBe(0);
    expect(Math.abs(d.width / d.height - 16 / 9)).toBeLessThan(0.02);
    expect(aspectToDimensions('1:1', 1024)).toEqual({ width: 1024, height: 1024 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('pricing and credits', () => {
  it('1 credit is one US cent and costs round UP', () => {
    expect(USD_PER_CREDIT).toBe(0.01);
    expect(usdToCredits(0.134)).toBe(14);
    expect(usdToCredits(0.04)).toBe(4);
    expect(usdToCredits(0.0001)).toBe(1);   // anything paid costs at least 1
    expect(usdToCredits(0)).toBe(0);        // free stays free
    expect(creditsToUsd(14)).toBeCloseTo(0.14, 4);
  });

  it('prices a batch and scales with size and quality', () => {
    const one = computeCost({ model: 'google:nano-banana-pro', imageCount: 1, longEdge: 1024 });
    expect(one.usd).toBeCloseTo(0.134, 5);
    expect(one.credits).toBe(14);
    expect(one.pricingVersion).toBe(PRICING_VERSION);

    const four = computeCost({ model: 'google:nano-banana-pro', imageCount: 4, longEdge: 1024 });
    expect(four.credits).toBe(usdToCredits(0.134 * 4));

    const big = computeCost({ model: 'google:nano-banana-pro', imageCount: 1, longEdge: 2048 });
    expect(big.usd).toBeGreaterThan(one.usd);

    const cheap = computeCost({ model: 'openai:gpt-image', imageCount: 1, longEdge: 1024, quality: 'low' });
    const dear = computeCost({ model: 'openai:gpt-image', imageCount: 1, longEdge: 1024, quality: 'high' });
    expect(dear.usd).toBeGreaterThan(cheap.usd);
  });

  it('free models cost nothing', () => {
    expect(computeCost({ model: 'pollinations:flux', imageCount: 4, longEdge: 1024 }).credits).toBe(0);
  });

  it('an unknown model gets the defensive fallback, never free', () => {
    const r = ruleFor('someone:new');
    expect(r.usdPerImage).toBeGreaterThan(0);
    expect(computeCost({ model: 'someone:new', imageCount: 1, longEdge: 1024 }).credits).toBeGreaterThan(0);
  });

  it('the pricing snapshot records exactly what was charged', () => {
    const c = computeCost({ model: 'openai:gpt-image', imageCount: 2, longEdge: 1536, quality: 'high' });
    expect(c.snapshot).toMatchObject({ model: 'openai:gpt-image', imageCount: 2, longEdge: 1536, quality: 'high' });
  });

  describe('settlement', () => {
    const base = { model: 'google:nano-banana-pro', imageCount: 4, longEdge: 1024 };

    it('prices what was DELIVERED, not what was requested', () => {
      const s = settleCost(base, { imageCount: 2 });
      expect(s.source).toBe('calculated');
      expect(s.credits).toBe(usdToCredits(0.134 * 2));
      expect(s.credits).toBeLessThan(computeCost(base).credits);
    });

    it('uses a provider-reported cost verbatim when one exists', () => {
      const s = settleCost(base, { imageCount: 4, providerCostUsd: 0.5 });
      expect(s.source).toBe('provider');
      expect(s.usd).toBe(0.5);
      expect(s.credits).toBe(50);
    });

    it('falls back to the requested count when usage is absent', () => {
      expect(settleCost(base, undefined).credits).toBe(computeCost(base).credits);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('error taxonomy', () => {
  it('maps provider failures onto categories without leaking the body', () => {
    const cases: Array<[number, string, string]> = [
      [401, 'bad key', 'authentication'],
      [403, 'quota exceeded for org-abc', 'insufficient_quota'],
      [429, 'rate limit', 'rate_limited'],
      [429, 'You exceeded your current quota, check billing', 'insufficient_quota'],
      [400, 'blocked by content policy', 'safety_rejection'],
      [400, 'invalid size parameter, not supported', 'unsupported_setting'],
      [400, 'something odd', 'invalid_input'],
      [402, 'payment required', 'insufficient_quota'],
      [500, 'internal', 'provider_unavailable'],
      [503, 'overloaded', 'provider_unavailable'],
      [504, 'gateway timeout', 'timeout'],
    ];
    for (const [status, body, code] of cases) {
      const e = normalizeProviderFailure('openai', status, body);
      expect(e.normalized.code, `${status} ${body}`).toBe(code);
      // The user-facing message must not echo the provider body.
      expect(e.normalized.message.toLowerCase()).not.toContain('org-abc');
      expect(e.normalized.message).not.toContain(body);
      // …but the raw body is retained privately for diagnostics.
      expect(e.normalized.providerError).toContain(body);
    }
  });

  it('classifies aborts as timeouts and network faults as unavailable', () => {
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    expect(normalizeThrown('gemini', abort).normalized.code).toBe('timeout');
    expect(normalizeThrown('gemini', new Error('fetch failed')).normalized.code).toBe('provider_unavailable');
    expect(normalizeThrown('gemini', new Error('weird')).normalized.code).toBe('unknown');
  });

  it('passes an already-normalized error through untouched', () => {
    const e = imageError('safety_rejection');
    expect(normalizeThrown('x', e)).toBe(e);
  });

  it('marks only transient categories retryable and picks sane statuses', () => {
    expect(imageError('rate_limited').normalized.retryable).toBe(true);
    expect(imageError('timeout').normalized.retryable).toBe(true);
    expect(imageError('safety_rejection').normalized.retryable).toBe(false);
    expect(imageError('insufficient_credits').normalized.status).toBe(402);
    expect(imageError('insufficient_credits').normalized.retryable).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('reference resolution — SSRF and content safety', () => {
  const client = (over: Record<string, unknown> = {}) => ({
    storage: {
      from: () => ({
        download: vi.fn(async () => ({ data: new Blob([pngBytes()]), error: null })),
        upload: vi.fn(async () => ({ data: {}, error: null })),
        createSignedUrl: vi.fn(async (p: string) => ({ data: { signedUrl: `https://signed/${p}` }, error: null })),
        ...over,
      }),
    },
  }) as never;

  it('only accepts storage paths inside the caller\'s own brand or ai-refs folder', () => {
    expect(isPathAllowedForBrand('brand-1/generated/x.png', 'brand-1', 'user-1')).toBe(true);
    expect(isPathAllowedForBrand('ai-refs/user-1/x.png', 'brand-1', 'user-1')).toBe(true);
    // Someone else's brand, someone else's uploads, traversal, absolute paths.
    expect(isPathAllowedForBrand('brand-2/generated/x.png', 'brand-1', 'user-1')).toBe(false);
    expect(isPathAllowedForBrand('ai-refs/user-2/x.png', 'brand-1', 'user-1')).toBe(false);
    expect(isPathAllowedForBrand('brand-1/../brand-2/x.png', 'brand-1', 'user-1')).toBe(false);
    expect(isPathAllowedForBrand('/etc/passwd', 'brand-1', 'user-1')).toBe(false);
    expect(isPathAllowedForBrand('x.png', 'brand-1', 'user-1')).toBe(false);
  });

  it('refuses a bare URL reference — this is the SSRF that used to be possible', async () => {
    const { resolved, warnings } = await resolveReferences(
      [{ role: 'image', url: 'http://169.254.169.254/latest/meta-data/' } as never],
      { brandId: 'b', userId: 'u', maxCount: 4, client: client() },
    );
    expect(resolved).toHaveLength(0);
    expect(warnings.join(' ')).toMatch(/unsupported reference form/);
  });

  it('rejects a storage path belonging to another brand', async () => {
    await expect(resolveReferences(
      [{ role: 'logo', path: 'other-brand/logo.png' }],
      { brandId: 'b', userId: 'u', maxCount: 4, client: client() },
    )).rejects.toThrow(ImageGenerationError);
  });

  it('accepts inline data URLs and records an auditable descriptor', async () => {
    const { resolved } = await resolveReferences(
      [{ role: 'logo', dataUrl: PNG_DATA_URL }],
      { brandId: 'b', userId: 'u', maxCount: 4, client: client() },
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0].mime).toBe('image/png');
    expect(resolved[0].descriptor).toMatchObject({ role: 'logo', kind: 'inline', mime: 'image/png' });
  });

  it('sniffs magic bytes and drops anything that is not a real raster image', async () => {
    expect(sniffImageMime(pngBytes())).toBe('image/png');
    expect(sniffImageMime(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    // An SVG declared as image/png must still be rejected.
    const svg = `data:image/png;base64,${base64Encode(new TextEncoder().encode('<svg/>'))}`;
    const { resolved, warnings } = await resolveReferences(
      [{ role: 'style', dataUrl: svg }],
      { brandId: 'b', userId: 'u', maxCount: 4, client: client() },
    );
    expect(resolved).toHaveLength(0);
    expect(warnings.join(' ')).toMatch(/not a PNG/);
  });

  it('drops every reference for a prompt-only model, with a warning', async () => {
    const { resolved, warnings } = await resolveReferences(
      [{ role: 'logo', dataUrl: PNG_DATA_URL }],
      { brandId: 'b', userId: 'u', maxCount: 0, client: client() },
    );
    expect(resolved).toHaveLength(0);
    expect(warnings).toContain('refs-unsupported');
  });

  it('caps the reference count and says so', async () => {
    const refs = Array.from({ length: 5 }, () => ({ role: 'image', dataUrl: PNG_DATA_URL }));
    const { resolved, warnings } = await resolveReferences(
      refs, { brandId: 'b', userId: 'u', maxCount: 2, client: client() },
    );
    expect(resolved).toHaveLength(2);
    expect(warnings.join(' ')).toMatch(/only the first 2/);
  });

  it('rejects an oversized reference', async () => {
    const big = `data:image/png;base64,${base64Encode(new Uint8Array(9 * 1024 * 1024))}`;
    await expect(resolveReferences(
      [{ role: 'image', dataUrl: big }],
      { brandId: 'b', userId: 'u', maxCount: 4, client: client() },
    )).rejects.toThrow(/larger than 8 MB/);
  });
});

describe('output storage', () => {
  it('writes under the brand folder and returns a durable path plus a signed url', async () => {
    const upload = vi.fn(async () => ({ data: {}, error: null }));
    const createSignedUrl = vi.fn(async (p: string) => ({ data: { signedUrl: `https://signed/${p}` }, error: null }));
    const client = { storage: { from: () => ({ upload, createSignedUrl, download: vi.fn() }) } } as never;

    const out = await storeOutputs(
      [{ bytes: pngBytes(), mime: 'image/png' }, { bytes: pngBytes(), mime: 'image/png' }],
      { brandId: 'brand-1', jobId: 'job-9', client },
    );
    expect(out).toHaveLength(2);
    expect(out[0].storagePath).toBe('brand-1/generated/job-9/1.png');
    expect(out[1].storagePath).toBe('brand-1/generated/job-9/2.png');
    expect(out[0].url).toContain('https://signed/');
    expect(out[0].width).toBe(1);   // read from the real PNG header
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('turns an upload failure into storage_failure so credits are released', async () => {
    const client = {
      storage: {
        from: () => ({
          upload: vi.fn(async () => ({ data: null, error: { message: 'disk full' } })),
          createSignedUrl: vi.fn(), download: vi.fn(),
        }),
      },
    } as never;
    await expect(storeOutputs([{ bytes: pngBytes(), mime: 'image/png' }],
      { brandId: 'b', jobId: 'j', client }))
      .rejects.toMatchObject({ normalized: { code: 'storage_failure' } });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('provider adapters (mocked provider)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });
  beforeEach(() => { vi.restoreAllMocks(); });

  const baseReq = (def = findImageModel('google:nano-banana')!, over: Record<string, unknown> = {}) => ({
    def,
    prompt: 'a cat',
    aspectRatio: '1:1' as const,
    size: 1024,
    count: 1,
    references: [],
    getEnv: env({ GEMINI_API_KEY: 'k', OPENAI_API_KEY: 'k', FAL_API_KEY: 'k' }),
    signal: new AbortController().signal,
    ...over,
  });

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('gemini: parses inlineData into bytes', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_B64 } }] } }],
    })) as never;
    const out = await providerFor(findImageModel('google:nano-banana')!)(baseReq() as never);
    expect(out.images).toHaveLength(1);
    expect(out.images[0].mime).toBe('image/png');
    expect(out.images[0].width).toBe(1);
    expect(out.usage?.imageCount).toBe(1);
  });

  it('gemini: a safety block becomes safety_rejection, not "unknown"', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({
      candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'no' }] } }],
      promptFeedback: { blockReason: 'SAFETY' },
    })) as never;
    await expect(providerFor(findImageModel('google:nano-banana')!)(baseReq() as never))
      .rejects.toMatchObject({ normalized: { code: 'safety_rejection' } });
  });

  it('gemini: fans out to N calls because the vendor returns one image per call', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_B64 } }] } }],
    }));
    globalThis.fetch = fetchMock as never;
    const out = await providerFor(findImageModel('google:nano-banana')!)(
      baseReq(findImageModel('google:nano-banana')!, { count: 3 }) as never,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(out.images).toHaveLength(3);
  });

  it('gemini: partial failure still returns what succeeded, with a warning', async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call += 1;
      if (call === 2) return new Response('boom', { status: 500 });
      return jsonResponse({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_B64 } }] } }],
      });
    }) as never;
    const out = await providerFor(findImageModel('google:nano-banana')!)(
      baseReq(findImageModel('google:nano-banana')!, { count: 3 }) as never,
    );
    expect(out.images).toHaveLength(2);
    expect(out.warnings.join(' ')).toMatch(/1 of 3 images failed/);
  });

  it('gemini: total failure surfaces the mapped provider error', async () => {
    globalThis.fetch = vi.fn(async () => new Response('rate limited', { status: 429 })) as never;
    await expect(providerFor(findImageModel('google:nano-banana')!)(baseReq() as never))
      .rejects.toMatchObject({ normalized: { code: 'rate_limited' } });
  });

  it('openai: uses /generations without references and /edits with them', async () => {
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (url: string) => {
      urls.push(String(url));
      return jsonResponse({ data: [{ b64_json: PNG_B64 }], usage: { input_tokens: 10, output_tokens: 20 } });
    }) as never;
    const def = findImageModel('openai:gpt-image')!;

    await providerFor(def)(baseReq(def) as never);
    expect(urls[0]).toContain('/v1/images/generations');

    await providerFor(def)(baseReq(def, {
      references: [{ role: 'logo', bytes: pngBytes(), mime: 'image/png' }],
    }) as never);
    expect(urls[1]).toContain('/v1/images/edits');
  });

  it('openai: normalizes usage so settlement can price real output', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({
      data: [{ b64_json: PNG_B64 }, { b64_json: PNG_B64 }],
      usage: { input_tokens: 5, output_tokens: 1000 },
    })) as never;
    const def = findImageModel('openai:gpt-image')!;
    const out = await providerFor(def)(baseReq(def, { count: 2 }) as never);
    expect(out.images).toHaveLength(2);
    expect(out.usage).toMatchObject({ imageCount: 2, inputTokens: 5, outputTokens: 1000 });
  });

  it('openai: a malformed response is provider_unavailable, not a crash', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ data: [] })) as never;
    const def = findImageModel('openai:gpt-image')!;
    await expect(providerFor(def)(baseReq(def) as never))
      .rejects.toMatchObject({ normalized: { code: 'provider_unavailable' } });
  });

  it('an aborted request becomes timeout', async () => {
    globalThis.fetch = vi.fn(async () => {
      const e = new Error('The operation was aborted');
      e.name = 'AbortError';
      throw e;
    }) as never;
    await expect(providerFor(findImageModel('google:nano-banana')!)(baseReq() as never))
      .rejects.toMatchObject({ normalized: { code: 'timeout' } });
  });

  it('a missing key is authentication, and never reaches the network', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as never;
    await expect(providerFor(findImageModel('openai:gpt-image')!)(
      baseReq(findImageModel('openai:gpt-image')!, { getEnv: env({}) }) as never,
    )).rejects.toMatchObject({ normalized: { code: 'authentication' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pollinations: builds a seeded request per image and needs no key', async () => {
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (url: string) => {
      urls.push(String(url));
      return new Response(pngBytes(), { status: 200, headers: { 'Content-Type': 'image/png' } });
    }) as never;
    const def = findImageModel('pollinations:flux')!;
    const out = await providerFor(def)(baseReq(def, { count: 2, seed: 7, getEnv: env({}) }) as never);
    expect(out.images).toHaveLength(2);
    expect(urls[0]).toContain('seed=7');
    expect(urls[1]).toContain('seed=8');
  });

  it('mock: is deterministic and needs no network at all', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as never;
    const def = findImageModel('mock:svg')!;
    const out = await providerFor(def)(baseReq(def, { count: 3, getEnv: env({}) }) as never);
    expect(out.images).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(new TextDecoder().decode(out.images[0].bytes)).toContain('<svg');
  });
});

describe('image header parsing', () => {
  it('reads PNG dimensions and shrugs at junk', () => {
    expect(readImageDimensions(pngBytes())).toEqual({ width: 1, height: 1 });
    expect(readImageDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
