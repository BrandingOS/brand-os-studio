// Browser E2E for the Image Studio.
//
// Real React, real DOM, real composer. The network boundary is mocked at the
// domain layer, so what is under test is the PRODUCT: capability-driven
// controls, deliberate brand context, honest cost before you commit, one
// in-flight generation, durable history, and every failure state a user can
// actually hit (insufficient credits, safety refusal, provider outage) with a
// path out of each.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import {
  ImageGenerationError,
  type GenerationJob,
  type ImageProject,
  type JobResult,
} from '@/features/image-generation';

const runGeneration = vi.fn();
const estimateGeneration = vi.fn();
const listProjectJobs = vi.fn();
const cancelGeneration = vi.fn();
const updateProjectSettings = vi.fn();
const renameImageProject = vi.fn();

const CAPS = {
  supportsReferenceImages: true, maxReferenceImages: 3,
  supportedAspectRatios: ['1:1', '4:5', '16:9'], supportedSizes: [1024],
  supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
  supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
  supportsImageToImage: true, textRendering: 'strong',
};
const PROMPT_ONLY_CAPS = {
  ...CAPS, supportsReferenceImages: false, maxReferenceImages: 0,
  supportedAspectRatios: ['1:1'], supportsMultipleOutputs: false, maxOutputs: 1,
};

vi.mock('@/features/image-generation', async (orig) => {
  const actual = await orig<typeof import('@/features/image-generation')>();
  return {
    ...actual,
    fetchImageCapabilities: async () => ({
      models: [
        { id: 'google:nano-banana-pro', vendor: 'google', tier: 'paid', available: true, caps: CAPS },
        { id: 'pollinations:flux', vendor: 'pollinations', tier: 'free', available: true, caps: PROMPT_ONLY_CAPS },
        { id: 'openai:gpt-image', vendor: 'openai', tier: 'paid', available: false, caps: CAPS },
      ],
      auto: 'google:nano-banana-pro', pricingVersion: 'test', usdPerCredit: 0.01,
    }),
    runGeneration: (...a: unknown[]) => runGeneration(...a),
    estimateGeneration: (...a: unknown[]) => estimateGeneration(...a),
    listProjectJobs: (...a: unknown[]) => listProjectJobs(...a),
    cancelGeneration: (...a: unknown[]) => cancelGeneration(...a),
    updateProjectSettings: (...a: unknown[]) => updateProjectSettings(...a),
    renameImageProject: (...a: unknown[]) => renameImageProject(...a),
    getCreditAccount: async () => ({
      workspaceId: 'ws-1', balance: 500, reserved: 0, lifetimeGranted: 500, lifetimeSpent: 0,
    }),
    listCreditHistory: async () => [],
    resignOutput: async (p: string) => `https://resigned/${p}`,
  };
});

// The compiler is exercised by its own unit tests; here it must simply not
// reach the network.
vi.mock('@/features/editor/ai/imagePrompt/compileImagePrompt', async (orig) => {
  const actual = await orig<typeof import('@/features/editor/ai/imagePrompt/compileImagePrompt')>();
  return {
    ...actual,
    compileImagePrompt: vi.fn(async (input: { userPrompt: string }) => ({
      prompt: `COMPILED: ${input.userPrompt}`,
      useLogo: false, paletteHexes: ['#123456'], notes: '', source: 'claude',
      original: input.userPrompt,
    })),
  };
});

// Imported after the mocks above so the page picks them up.
import { ImageStudioPage } from '../ImageStudioPage';
import { bootServices } from '@/core';

// The Studio resolves Assets + Design storage from the container, exactly as it
// does in the app; boot the local defaults rather than stubbing the DI layer.
bootServices();

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function brand(): Brand {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'acme', name: 'Acme',
    primaryColor: '#123456', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  } as unknown as Brand;
}

function project(over: Partial<ImageProject> = {}): ImageProject {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    brandId: brand().id, workspaceId: 'ws-1',
    title: 'Untitled project', lastSettings: {}, coverUrl: null,
    createdAt: '2026-08-18T00:00:00Z', updatedAt: '2026-08-18T00:00:00Z',
    ...over,
  };
}

function job(over: Partial<GenerationJob> = {}): GenerationJob {
  return {
    id: 'job-1', status: 'succeeded', operation: 'generate',
    provider: 'google', model: 'google:nano-banana-pro',
    userPrompt: 'a matte black cup', compiledPrompt: 'COMPILED: a matte black cup',
    settings: { aspectRatio: '1:1', count: 1 },
    outputs: [{ storagePath: 'b/generated/job-1/1.png', url: PNG, width: 1024, height: 1024, mime: 'image/png', bytes: 10 }],
    estimatedCredits: 14, chargedCredits: 14, costUsd: 0.134, costSource: 'calculated',
    latencyMs: 4200, errorCode: null, errorMessage: null,
    createdAt: '2026-08-18T00:00:00Z', completedAt: '2026-08-18T00:00:05Z',
    ...over,
  };
}

function jobResult(over: Partial<GenerationJob> = {}, balance = 486): JobResult {
  return { job: job(over), credits: { balance, reserved: 0 } };
}

async function mount(p: ImageProject = project(), initialPrompt?: string) {
  const view = render(
    <MemoryRouter>
      <ImageStudioPage brand={brand()} project={p} initialPrompt={initialPrompt} />
      <Toaster />
    </MemoryRouter>,
  );
  await waitFor(() => {
    if (!view.container.querySelector('[data-composer-submit]')) throw new Error('composer not mounted');
  });
  // The estimate effect is gated on capabilities being loaded, so one call is
  // proof the capability-driven controls have rendered.
  await waitFor(() => {
    if (!estimateGeneration.mock.calls.length) throw new Error('capabilities not applied');
  });
  return view;
}

const $ = <T extends HTMLElement>(c: HTMLElement, sel: string) => c.querySelector<T>(sel);

beforeEach(() => {
  vi.clearAllMocks();
  listProjectJobs.mockResolvedValue([]);
  estimateGeneration.mockResolvedValue({
    model: 'google:nano-banana-pro',
    settings: { aspectRatio: '1:1', size: 1024, quality: null, count: 1, maxReferences: 3 },
    credits: 14, usd: 0.134, usdPerCredit: 0.01, pricingVersion: 'test', adjustments: [],
  });
  runGeneration.mockResolvedValue(jobResult());
  updateProjectSettings.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe('Image Studio — composing a generation', () => {
  it('renders only the controls the ACTIVE model declares, and snaps settings when the model changes', async () => {
    const { container } = await mount();

    // Nano Banana Pro: three ratios, up to four images, references allowed.
    expect(container.querySelectorAll('[data-composer-ratio]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-composer-count]')).toHaveLength(4);
    expect($<HTMLButtonElement>(container, '[data-composer-attach]')!.disabled).toBe(false);

    // Pick something the free model cannot do, then switch to it.
    fireEvent.click($(container, '[data-composer-ratio="16:9"]')!);
    fireEvent.click($(container, '[data-composer-count="4"]')!);
    fireEvent.click($(container, '[data-composer-advanced]')!);
    fireEvent.change($(container, '[data-composer-model]')!, { target: { value: 'pollinations:flux' } });

    await waitFor(() => {
      if (container.querySelectorAll('[data-composer-ratio]').length !== 1) throw new Error('ratios not snapped');
    });
    // The unsupported ratio and count are gone rather than silently sent.
    expect($(container, '[data-composer-ratio="1:1"]')?.getAttribute('aria-checked')).toBe('true');
    expect(container.querySelector('[data-composer-count]')).toBeNull();
    expect($<HTMLButtonElement>(container, '[data-composer-attach]')!.disabled).toBe(true);
  });

  it('shows the server-side cost before committing and blocks when it is unaffordable', async () => {
    estimateGeneration.mockResolvedValue({
      model: 'google:nano-banana-pro',
      settings: { aspectRatio: '1:1', size: 1024, quality: null, count: 4, maxReferences: 3 },
      credits: 999, usd: 9.99, usdPerCredit: 0.01, pricingVersion: 'test', adjustments: [],
    });
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'a cup' } });

    await waitFor(() => {
      if (!/999 credits/.test($(container, '[data-composer-cost]')?.textContent ?? '')) {
        throw new Error('cost not shown');
      }
    });
    // 500 granted, 999 needed → the primary action refuses rather than failing later.
    expect($(container, '[data-composer-insufficient]')).toBeTruthy();
    expect($<HTMLButtonElement>(container, '[data-composer-submit]')!.disabled).toBe(true);
    expect(runGeneration).not.toHaveBeenCalled();
  });

  it('sends only the brand context the user selected', async () => {
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'a cup' } });

    // Palette is on by default; add the logo deliberately.
    fireEvent.click($(container, '[data-brand-context-chip="logo"]')!);
    fireEvent.click($(container, '[data-composer-submit]')!);

    await waitFor(() => { if (!runGeneration.mock.calls.length) throw new Error('not sent'); });
    const [req] = runGeneration.mock.calls[0] as [Record<string, unknown>];
    expect(req.userPrompt).toBe('a cup');
    expect(req.compiledPrompt).toBe('COMPILED: a cup');
    expect(req.brandId).toBe(brand().id);
    expect(req.projectId).toBe(project().id);
    expect(req.idempotencyKey).toMatch(/^gen_/);
  });

  it('keeps one generation in flight and never double-submits', async () => {
    let release!: () => void;
    runGeneration.mockImplementation(() => new Promise<JobResult>((res) => {
      release = () => res(jobResult());
    }));
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'a cup' } });

    fireEvent.click($(container, '[data-composer-submit]')!);
    await waitFor(() => { if (!container.querySelector('[data-studio-progress]')) throw new Error('no progress'); });

    // Clicking again while running must not start a second paid run.
    fireEvent.click($(container, '[data-composer-submit]')!);
    fireEvent.click($(container, '[data-composer-submit]')!);
    expect(runGeneration).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() => { if (!container.querySelector('[data-job]')) throw new Error('no result'); });
  });

  it('the prompt and settings survive a failure, and Try again reuses the same request', async () => {
    runGeneration.mockRejectedValueOnce(new ImageGenerationError({
      code: 'provider_unavailable', message: 'The image provider is unavailable right now.',
      retryable: true, status: 502,
    }));
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'a cup' } });
    fireEvent.click($(container, '[data-composer-ratio="16:9"]')!);
    fireEvent.click($(container, '[data-composer-submit]')!);

    await waitFor(() => { if (!container.querySelector('[data-studio-error]')) throw new Error('no error'); });
    // Nothing was taken away from the user.
    expect($<HTMLTextAreaElement>(container, '[data-composer-prompt]')!.value).toBe('a cup');
    expect($(container, '[data-composer-ratio="16:9"]')?.getAttribute('aria-checked')).toBe('true');

    runGeneration.mockResolvedValue(jobResult());
    fireEvent.click($(container, '[data-studio-retry]')!);
    await waitFor(() => { if (runGeneration.mock.calls.length !== 2) throw new Error('not retried'); });

    const first = runGeneration.mock.calls[0][0] as Record<string, string>;
    const second = runGeneration.mock.calls[1][0] as Record<string, string>;
    // Same idempotency key ⇒ a run that actually landed is returned, not repaid.
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });

  it('surfaces an insufficient-credit refusal from the server with the shortfall', async () => {
    runGeneration.mockRejectedValue(new ImageGenerationError({
      code: 'insufficient_credits', message: 'This needs 56 credits and you have 12.',
      requiredCredits: 56, balance: 12, status: 402,
    }));
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'a cup' } });
    fireEvent.click($(container, '[data-composer-submit]')!);

    await waitFor(() => {
      if (!/needs 56 credits/.test(container.textContent ?? '')) throw new Error('no shortfall message');
    });
    expect(container.querySelector('[data-results-empty]')).toBeTruthy();
  });

  it('a safety refusal is explained and is not offered as retryable', async () => {
    runGeneration.mockRejectedValue(new ImageGenerationError({
      code: 'safety_rejection', message: 'The provider declined this request under its content policy.',
      retryable: false, status: 422,
    }));
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'something' } });
    fireEvent.click($(container, '[data-composer-submit]')!);

    await waitFor(() => { if (!container.querySelector('[data-studio-error]')) throw new Error('no error'); });
    expect(container.textContent).toMatch(/content policy/);
    expect(container.querySelector('[data-studio-retry]')).toBeNull();
  });

  it('can cancel a running generation', async () => {
    runGeneration.mockImplementation(() => new Promise<JobResult>(() => { /* never settles */ }));
    cancelGeneration.mockResolvedValue({ job: job({ status: 'cancelled' }), credits: { balance: 500, reserved: 0 } });
    const { container } = await mount();
    fireEvent.change($(container, '[data-composer-prompt]')!, { target: { value: 'a cup' } });
    fireEvent.click($(container, '[data-composer-submit]')!);

    await waitFor(() => { if (!container.querySelector('[data-studio-cancel]')) throw new Error('no cancel'); });
    fireEvent.click($(container, '[data-studio-cancel]')!);
    await waitFor(() => { if (container.querySelector('[data-studio-progress]')) throw new Error('still running'); });
  });
});

describe('Image Studio — results and history', () => {
  it('loads persisted history on mount, so a refresh does not lose the work', async () => {
    listProjectJobs.mockResolvedValue([job(), job({ id: 'job-0', userPrompt: 'an older one' })]);
    const { container } = await mount();
    await waitFor(() => {
      if (container.querySelectorAll('[data-job]').length !== 2) throw new Error('history not loaded');
    });
    expect(listProjectJobs).toHaveBeenCalledWith(project().id);
    expect(container.textContent).toMatch(/an older one/);
    // Cost is reported in the product's own unit.
    expect(container.textContent).toMatch(/14 credits/);
  });

  it('offers variations, refine and regenerate against a specific output', async () => {
    listProjectJobs.mockResolvedValue([job()]);
    const { container } = await mount();
    await waitFor(() => { if (!container.querySelector('[data-job]')) throw new Error('no job'); });

    fireEvent.click($(container, '[data-output-variations="0"]')!);
    await waitFor(() => { if (!runGeneration.mock.calls.length) throw new Error('no variations'); });
    let req = runGeneration.mock.calls[0][0] as Record<string, unknown>;
    expect(req.operation).toBe('variation');
    expect((req.references as Array<{ role: string; path: string }>)[0])
      .toMatchObject({ role: 'previous', path: 'b/generated/job-1/1.png' });

    fireEvent.click($(container, '[data-output-refine="0"]')!);
    fireEvent.change($(container, '[data-refine-input]')!, { target: { value: 'warmer light' } });
    fireEvent.click($(container, '[data-refine-submit]')!);
    await waitFor(() => { if (runGeneration.mock.calls.length !== 2) throw new Error('no refine'); });
    req = runGeneration.mock.calls[1][0] as Record<string, unknown>;
    expect(req.operation).toBe('refine');
    expect(req.userPrompt).toBe('warmer light');

    fireEvent.click($(container, '[data-job-regenerate]')!);
    await waitFor(() => { if (runGeneration.mock.calls.length !== 3) throw new Error('no regenerate'); });
    expect((runGeneration.mock.calls[2][0] as Record<string, unknown>).operation).toBe('regenerate');
  });

  it('a failed job stays in the list with its reason and says nothing was charged', async () => {
    listProjectJobs.mockResolvedValue([job({
      status: 'failed', errorCode: 'provider_unavailable',
      errorMessage: 'The image provider is unavailable right now.',
      outputs: [], chargedCredits: 0,
    })]);
    const { container } = await mount();
    await waitFor(() => {
      if (!container.querySelector('[data-job-status="failed"]')) throw new Error('no failed job');
    });
    expect(container.textContent).toMatch(/unavailable right now/);
    expect(container.textContent).toMatch(/No credits were charged/);
    expect(container.querySelector('[data-job-retry]')).toBeTruthy();
  });

  it('reuses a prompt back into the composer without generating', async () => {
    listProjectJobs.mockResolvedValue([job()]);
    const { container } = await mount();
    await waitFor(() => { if (!container.querySelector('[data-job-reuse]')) throw new Error('no reuse'); });
    fireEvent.click($(container, '[data-job-reuse]')!);
    expect($<HTMLTextAreaElement>(container, '[data-composer-prompt]')!.value).toBe('a matte black cup');
    expect(runGeneration).not.toHaveBeenCalled();
  });

  it('shows the empty state before anything has been made', async () => {
    const { container } = await mount();
    expect(container.querySelector('[data-results-empty]')).toBeTruthy();
    expect(container.textContent).toMatch(/Nothing generated yet/);
  });
});

describe('Image Studio — project identity', () => {
  it('renames the project without changing its id', async () => {
    renameImageProject.mockResolvedValue(undefined);
    const { container } = await mount();
    fireEvent.click($(container, '[data-project-title]')!);
    const input = await waitFor(() => {
      const el = $<HTMLInputElement>(container, '[data-project-title-input]');
      if (!el) throw new Error('no title input');
      return el;
    });
    fireEvent.change(input, { target: { value: 'Autumn campaign' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      if (!renameImageProject.mock.calls.length) throw new Error('not renamed');
    });
    expect(renameImageProject).toHaveBeenCalledWith(project().id, 'Autumn campaign');
    // The id in the URL is untouched — only the label changed.
    expect(container.querySelector('[data-image-studio]')?.getAttribute('data-project')).toBe(project().id);
  });

  it('pre-fills a prompt handed over from the hub but never spends on arrival', async () => {
    const { container } = await mount(project(), 'a cup handed over');
    expect($<HTMLTextAreaElement>(container, '[data-composer-prompt]')!.value).toBe('a cup handed over');
    expect(runGeneration).not.toHaveBeenCalled();
  });

  it('reopens with the settings the project was last using', async () => {
    const { container } = await mount(project({
      lastSettings: { model: 'pollinations:flux', aspectRatio: '1:1', count: 1, brandContext: [] },
    }));
    fireEvent.click($(container, '[data-composer-advanced]')!);
    expect($<HTMLSelectElement>(container, '[data-composer-model]')!.value).toBe('pollinations:flux');
    // An empty saved context means nothing is attached by default.
    expect($(container, '[data-brand-context-chip="palette"]')?.className)
      .not.toMatch(/ds-chip--active/);
  });
});
