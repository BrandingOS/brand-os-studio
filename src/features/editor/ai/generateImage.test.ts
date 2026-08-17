// The editor-facing wrapper over the generation domain layer.
//
// What matters here is the seam: the wrapper must carry the editor's intent
// into a job request, apply the style suffix to the COMPILED prompt (never the
// user's own words), refuse to report success for a job that did not succeed,
// and pass a stable idempotency key so a retry cannot be charged twice.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateImage, IMAGE_STYLES } from './generateImage';
import { ImageGenerationError, type JobResult } from '@/features/image-generation';

const runGeneration = vi.fn();
vi.mock('@/features/image-generation', async (orig) => {
  const actual = await orig<typeof import('@/features/image-generation')>();
  return {
    ...actual,
    runGeneration: (...a: unknown[]) => runGeneration(...a),
    newIdempotencyKey: () => 'gen_fixed',
  };
});

function jobResult(over: Partial<JobResult['job']> = {}, credits = { balance: 480, reserved: 0 }): JobResult {
  return {
    job: {
      id: 'job-1', status: 'succeeded', operation: 'generate',
      provider: 'google', model: 'google:nano-banana',
      userPrompt: 'a cat', compiledPrompt: 'a cat, brand-tuned',
      settings: { aspectRatio: '1:1', count: 1 },
      outputs: [{ storagePath: 'b/generated/job-1/1.png', url: 'https://signed/1.png', width: 1024, height: 1024, mime: 'image/png', bytes: 100 }],
      estimatedCredits: 4, chargedCredits: 4, costUsd: 0.039, costSource: 'calculated',
      latencyMs: 1200, errorCode: null, errorMessage: null,
      createdAt: '2026-08-18T00:00:00Z', completedAt: '2026-08-18T00:00:02Z',
      ...over,
    },
    credits,
  };
}

beforeEach(() => { runGeneration.mockReset(); });

describe('generateImage', () => {
  it('sends the editor intent as a job and returns the durable outputs', async () => {
    runGeneration.mockResolvedValue(jobResult());
    const out = await generateImage({
      brandId: 'brand-1', designId: 'design-9',
      userPrompt: 'a cat', aspectRatio: '1:1', count: 1,
    });

    const [request] = runGeneration.mock.calls[0] as [Record<string, unknown>];
    expect(request.brandId).toBe('brand-1');
    expect(request.designId).toBe('design-9');
    expect(request.userPrompt).toBe('a cat');
    expect(request.idempotencyKey).toBe('gen_fixed');

    expect(out.images[0].url).toBe('https://signed/1.png');
    expect(out.images[0].storagePath).toBe('b/generated/job-1/1.png');
    expect(out.jobId).toBe('job-1');
    expect(out.chargedCredits).toBe(4);
    expect(out.balance).toBe(480);
  });

  it('appends a style suffix to the compiled prompt, leaving the user prompt intact', async () => {
    runGeneration.mockResolvedValue(jobResult());
    await generateImage({
      brandId: 'b', userPrompt: 'a cat', compiledPrompt: 'a cat on a sofa', styleId: 'cinematic',
    });
    const [request] = runGeneration.mock.calls[0] as [Record<string, string>];
    expect(request.userPrompt).toBe('a cat');
    expect(request.compiledPrompt).toBe(`a cat on a sofa${IMAGE_STYLES.find((s) => s.id === 'cinematic')!.suffix}`);
  });

  it('falls back to the user prompt when nothing was compiled', async () => {
    runGeneration.mockResolvedValue(jobResult());
    await generateImage({ brandId: 'b', userPrompt: 'plain' });
    const [request] = runGeneration.mock.calls[0] as [Record<string, string>];
    expect(request.compiledPrompt).toBe('plain');
  });

  it('reuses a caller-supplied idempotency key so a retry is not a second charge', async () => {
    runGeneration.mockResolvedValue(jobResult());
    await generateImage({ brandId: 'b', userPrompt: 'x', idempotencyKey: 'gen_mine' });
    const [request] = runGeneration.mock.calls[0] as [Record<string, string>];
    expect(request.idempotencyKey).toBe('gen_mine');
  });

  it('throws rather than reporting success for a job that did not succeed', async () => {
    runGeneration.mockResolvedValue(jobResult({
      status: 'failed', errorCode: 'safety_rejection', errorMessage: 'Declined by the provider.', outputs: [],
    }));
    await expect(generateImage({ brandId: 'b', userPrompt: 'x' }))
      .rejects.toMatchObject({ code: 'safety_rejection', message: 'Declined by the provider.' });
  });

  it('propagates a typed service failure untouched', async () => {
    runGeneration.mockRejectedValue(new ImageGenerationError({
      code: 'insufficient_credits', message: 'Not enough credits.', requiredCredits: 14, balance: 2,
    }));
    await expect(generateImage({ brandId: 'b', userPrompt: 'x' }))
      .rejects.toMatchObject({ code: 'insufficient_credits', requiredCredits: 14, balance: 2 });
  });
});
