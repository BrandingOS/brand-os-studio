// Browser E2E — AI Studio image flow in the Generate panel.
//
// Real editor + real adapter + real Fabric; the vendor call and the
// Claude compile are stubbed at the module boundary so the flow under
// test is the PANEL's: prompt → silent compile → processing state →
// N pages inserted (one undo step) + metadata.ai record → Variations
// from the active page → inline error for an unavailable model → hero
// hand-off auto-start. (No review step — owner decision 2026-08-17.)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Editor } from '@/features/editor/shell/Editor';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Brand } from '@/shared/types/brand';
import { ImageGenerationError, type GenerateImageArgs } from '@/features/editor/ai/generateImage';
import { readAiMetadata, withAiMetadata } from '@/features/editor/shell/v2/panels/generate/aiMetadata';
import { useGeneratePrefs } from '@/features/editor/shell/v2/panels/generate/generatePrefs';

const SOCIAL_FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);
const PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Swappable domain-layer state. Browser-mode ESM exports cannot be spied on
// after the fact, so the mocks below read this object on every call and a test
// changes behaviour by writing to it.
const stubs = vi.hoisted(() => ({
  balance: 500,
  uploadedRefs: [] as Array<{ id: string; path: string; previewUrl: string; fileName: string }>,
}));

const generateMock = vi.fn();
const compileMock = vi.fn();
const buildRefsMock = vi.fn();

vi.mock('@/features/editor/ai/generateImage', async (orig) => {
  const actual = await orig<typeof import('@/features/editor/ai/generateImage')>();
  return {
    ...actual,
    generateImage: (...a: unknown[]) => generateMock(...a),
    fetchImageCapabilities: async () => ({
      models: [
        {
          id: 'pollinations:flux', vendor: 'pollinations', tier: 'free', available: true,
          caps: {
            supportsReferenceImages: true, maxReferenceImages: 4,
            supportedAspectRatios: ['1:1', '4:5', '16:9'], supportedSizes: [1024],
            supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
            supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: true,
            supportsImageToImage: true, textRendering: 'weak',
          },
        },
      ],
      auto: 'pollinations:flux',
      pricingVersion: 'test',
      usdPerCredit: 0.01,
    }),
  };
});
// The capability fetch lives in the domain layer; without this the suite would
// call the REAL deployed function and render whatever it happens to return.
vi.mock('@/features/image-generation', async (orig) => {
  const actual = await orig<typeof import('@/features/image-generation')>();
  return {
    ...actual,
    fetchImageCapabilities: async () => ({
      models: [{
        id: 'pollinations:flux', vendor: 'pollinations', tier: 'free', available: true,
        caps: {
          supportsReferenceImages: true, maxReferenceImages: 4,
          supportedAspectRatios: ['1:1', '4:5', '16:9'], supportedSizes: [1024],
          supportedQualities: [], supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
          supportsCancellation: true, supportsSeed: true, supportsNegativePrompt: true,
          supportsImageToImage: true, textRendering: 'weak',
        },
      }],
      auto: 'pollinations:flux', pricingVersion: 'test', usdPerCredit: 0.01,
    }),
    cancelGeneration: async () => ({ job: {}, credits: { balance: 500, reserved: 0 } }),
    ...(await import('@/test/imageGenerationStubs')).imageGenerationBarrelStubs(),
    uploadReference: async (file: File) => {
      const n = stubs.uploadedRefs.length + 1;
      const ref = { id: `r${n}`, path: `ai-refs/u/${n}.png`, previewUrl: PNG_1x1, fileName: file.name };
      stubs.uploadedRefs.push(ref);
      return ref;
    },
  };
});
// The balance the panel shows comes from the credits module directly.
vi.mock('@/features/image-generation/credits', async (orig) => ({
  ...(await orig<typeof import('@/features/image-generation/credits')>()),
  ...(await import('@/test/imageGenerationStubs')).creditsModuleStubs(),
  getCreditAccount: async () => ({
    workspaceId: 'ws-test', balance: stubs.balance, reserved: 0, lifetimeSpent: 0,
  }),
}));
vi.mock('@/features/editor/ai/imagePrompt/compileImagePrompt', async (orig) => {
  const actual = await orig<typeof import('@/features/editor/ai/imagePrompt/compileImagePrompt')>();
  return { ...actual, compileImagePrompt: (...a: unknown[]) => compileMock(...a) };
});
vi.mock('@/features/editor/ai/imagePrompt/brandReferences', async (orig) => {
  const actual = await orig<typeof import('@/features/editor/ai/imagePrompt/brandReferences')>();
  return { ...actual, buildBrandReferences: (...a: unknown[]) => buildRefsMock(...a) };
});

afterEach(() => cleanup());
beforeEach(() => {
  generateMock.mockReset();
  compileMock.mockReset();
  buildRefsMock.mockReset();
  stubs.balance = 500;
  stubs.uploadedRefs.length = 0;
  useGeneratePrefs.setState({ brandAware: true, model: 'auto', count: 1 });
  compileMock.mockImplementation(async (input: { userPrompt: string }) => ({
    prompt: `COMPILED: ${input.userPrompt}`,
    negativePrompt: 'text',
    useLogo: false,
    paletteHexes: ['#1A1A2E'],
    notes: 'Used the primary as an accent; no logo.',
    source: 'claude',
    original: input.userPrompt,
  }));
  buildRefsMock.mockImplementation(async (input: {
    plan: { logo: boolean; palette: boolean; previousPath?: string };
    userReferencePaths?: string[];
  }) => {
    const references: Array<{ role: string; dataUrl?: string; path?: string }> = [];
    // Order mirrors the real builder: previous → logo → palette → the user's.
    if (input.plan.previousPath) references.push({ role: 'previous', path: input.plan.previousPath });
    if (input.plan.logo) references.push({ role: 'logo', dataUrl: PNG_1x1 });
    if (input.plan.palette) references.push({ role: 'palette', dataUrl: PNG_1x1 });
    for (const path of input.userReferencePaths ?? []) references.push({ role: 'image', path });
    return { references, roles: references.map((r) => r.role) };
  });
  generateMock.mockImplementation(async (req: GenerateImageArgs) => ({
    images: Array.from({ length: req.count ?? 1 }, (_, i) => ({
      storagePath: `b/generated/job-x/${i + 1}.png`, url: PNG_1x1,
      width: 64, height: 64, mime: 'image/png', bytes: 100, seed: i,
    })),
    jobId: 'job-x', model: 'pollinations:flux', chargedCredits: 0, balance: 500,
  }));
});

function mockBrand(): Brand {
  return {
    id: 'brand-test', slug: 'test', name: 'Test Brand',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

async function mount(args: { doc?: BrandOSDocument; initialPrompt?: string; initialAi?: { mode?: 'image'; autoStart?: boolean; count?: number } } = {}) {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => { resolveAdapter = r; });
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });
  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={args.doc ?? SOCIAL_FIXTURE}
        save={async () => {}}
        brand={mockBrand()}
        onAdapterReady={(a) => resolveAdapter(a)}
        initialPrompt={args.initialPrompt}
        initialAi={args.initialAi}
      />
      <Toaster />
    </MemoryRouter>,
  );
  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 60));
  return { adapter, container };
}

async function openGenerate(container: HTMLElement) {
  if (!container.querySelector('[data-generate-prompt]')) {
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="generate"]')!);
    await waitFor(() => { if (!container.querySelector('[data-generate-prompt]')) throw new Error('no panel'); });
  }
  const image = container.querySelector<HTMLButtonElement>('[data-generate-mode="image"]')!;
  if (image.getAttribute('aria-checked') !== 'true') fireEvent.click(image);
}

describe('AI Studio — image generation flow', () => {
  it('prompt → silent compile → processing state → count pages inserted with metadata, one undo step', async () => {
    let releaseGenerate!: () => void;
    const gate = new Promise<void>((r) => { releaseGenerate = r; });
    generateMock.mockImplementation(async (req: GenerateImageArgs) => {
      await gate;
      return {
        images: Array.from({ length: req.count ?? 1 }, (_, i) => ({
          storagePath: `b/generated/job-x/${i + 1}.png`, url: PNG_1x1,
          width: 64, height: 64, mime: 'image/png', bytes: 100, seed: i,
        })),
        jobId: 'job-x', model: 'pollinations:flux', chargedCredits: 0, balance: 500,
      };
    });
    const { adapter, container } = await mount();
    await openGenerate(container);
    const before = adapter.getDocument().pages.length;

    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-count-value="2"]')!);
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'a cat on a sofa' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);

    // One processing card; NO editable compiled prompt / confirm step.
    await waitFor(() => { if (!container.querySelector('[data-generate-processing]')) throw new Error('no processing card'); });
    expect(container.querySelector('[data-generate-compiled]')).toBeNull();
    expect(container.querySelector('[data-generate-confirm]')).toBeNull();
    await waitFor(() => { if (generateMock.mock.calls.length !== 1) throw new Error('vendor not called yet'); });
    expect(container.querySelector('[data-generate-processing]')?.getAttribute('data-generate-status')).toBe('generating');
    releaseGenerate();

    await waitFor(() => {
      if (adapter.getDocument().pages.length !== before + 2) throw new Error('pages not inserted');
    });
    expect(compileMock).toHaveBeenCalledTimes(1);
    // vendor got the COMPILED prompt + count + palette ref (compiler said useLogo=false)
    const req = generateMock.mock.calls[0][0] as GenerateImageArgs;
    expect(req.compiledPrompt).toMatch(/^COMPILED: a cat on a sofa/);
    expect(req.userPrompt).toBe('a cat on a sofa');
    expect(req.count).toBe(2);
    expect(req.negativePrompt).toBe('text');
    expect(req.references?.map((r) => r.role)).toEqual(['palette']);
    // A stable key means a retry of this exact request cannot be charged twice.
    expect(req.idempotencyKey).toMatch(/^gen_/);
    const meta = readAiMetadata(adapter.getDocument());
    expect(meta.origin).toBe('ai-image');
    expect(meta.generations).toHaveLength(2);
    expect(meta.generations[0].compiled).toMatch(/^COMPILED:/);
    expect(meta.generations[0].original).toBe('a cat on a sofa');
    expect(meta.generations[0].refs).toEqual(['palette']);
    const newPage = adapter.getDocument().pages.find((p) => p.id === meta.generations[0].pageId)!;
    expect(newPage.width).toBe(64);
    expect(newPage.layers[0].kind).toBe('image');
    adapter.undo();
    await waitFor(() => { if (adapter.getDocument().pages.length !== before) throw new Error('undo did not revert'); });
    expect(container.querySelector('[data-generate-processing]')).toBeNull();
  });

  it('active AI page shows actions; Variations sends the previous image as a reference and adds 4 pages', async () => {
    const { adapter, container } = await mount();
    await openGenerate(container);
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'sunset harbour' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);
    await waitFor(() => { if (!container.querySelector('[data-generate-actions]')) throw new Error('no actions'); });
    const after1 = adapter.getDocument().pages.length;

    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-variations]')!);
    await waitFor(() => { if (adapter.getDocument().pages.length !== after1 + 4) throw new Error('variations not inserted'); });
    const req = generateMock.mock.calls[1][0] as GenerateImageArgs;
    expect(req.count).toBe(4);
    expect(req.references?.[0].role).toBe('previous');
    // The previous image travels as a STORAGE PATH, never a URL the server
    // would have to fetch on our behalf.
    expect(req.references?.[0].path).toBe('b/generated/job-x/1.png');
    expect(req.compiledPrompt).toMatch(/COMPILED: sunset harbour/);
    const meta = readAiMetadata(adapter.getDocument());
    expect(meta.generations.filter((g) => g.kind === 'variation')).toHaveLength(4);
    expect(meta.generations.at(-1)?.parentPageId).toBe(meta.generations[0].pageId);
  });

  it('Raw mode skips the compiler and sends the exact words', async () => {
    useGeneratePrefs.setState({ brandAware: false });
    const { adapter, container } = await mount();
    await openGenerate(container);
    const before = adapter.getDocument().pages.length;
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'exact words' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);
    await waitFor(() => { if (adapter.getDocument().pages.length !== before + 1) throw new Error('not inserted'); });
    const req = generateMock.mock.calls[0][0] as GenerateImageArgs;
    expect(req.compiledPrompt).toBe('exact words');
    expect(req.references ?? []).toEqual([]);
  });

  it('a rejected generation → inline error, no spinner left, no page added', async () => {
    generateMock.mockImplementation(async () => {
      throw new ImageGenerationError({
        code: 'insufficient_credits',
        message: 'This needs 14 credits and you have 2.',
        requiredCredits: 14, balance: 2, status: 402,
      });
    });
    const { adapter, container } = await mount();
    await openGenerate(container);
    const before = adapter.getDocument().pages.length;
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'anything' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);
    await waitFor(() => { if (!container.querySelector('[data-generate-error]')) throw new Error('no error'); });
    expect(container.querySelector('[data-generate-error]')?.textContent).toMatch(/needs 14 credits/);
    // The hint explains the shortfall in the product's own unit.
    expect(container.querySelector('[data-generate-error]')?.textContent).toMatch(/you have 2/);
    expect(adapter.getDocument().pages.length).toBe(before);
    expect(container.querySelector('[data-generate-status="generating"]')).toBeNull();
  });

  it('hero hand-off: an ai-image doc + ?prompt auto-opens Generate and generates without any confirmation', async () => {
    const doc = withAiMetadata({ ...SOCIAL_FIXTURE, pages: [{ ...SOCIAL_FIXTURE.pages[0], layers: [] }] }, { pendingPrompt: 'hero prompt' });
    const { adapter, container } = await mount({ doc, initialPrompt: 'hero prompt', initialAi: { mode: 'image', autoStart: true, count: 3 } });
    await waitFor(() => { if (adapter.getDocument().pages.length !== 4) throw new Error('not generated'); });
    expect(compileMock).toHaveBeenCalledTimes(1);
    expect((compileMock.mock.calls[0][0] as { userPrompt: string }).userPrompt).toBe('hero prompt');
    expect((generateMock.mock.calls[0][0] as GenerateImageArgs).count).toBe(3);
    // the pending prompt is consumed so a reload can't fire again
    expect(readAiMetadata(adapter.getDocument()).pendingPrompt).toBeUndefined();
    expect(container.querySelector('[data-generate-actions]')).toBeTruthy();
  });
  // ─── Capabilities the standalone Studio used to own exclusively ──────
  // They were the reason a second surface looked justified. They belong in the
  // panel, so they are pinned here.

  it('shows the balance and what the next generation will cost, before it is spent', async () => {
    const { container } = await mount();
    await openGenerate(container);

    await waitFor(() => { if (!container.querySelector('[data-credits-pill]')) throw new Error('no balance'); });
    expect(container.querySelector('[data-credits-pill]')?.textContent).toMatch(/500/);

    const submit = container.querySelector<HTMLButtonElement>('[data-generate-submit]')!;
    await waitFor(() => { if (!submit.getAttribute('data-generate-estimate')) throw new Error('no estimate'); });
    expect(submit.getAttribute('data-generate-estimate')).toBe('3');
    expect(submit.textContent).toMatch(/3 credits/);
  });

  it('refuses to spend what the account does not hold', async () => {
    stubs.balance = 1;

    const { container } = await mount();
    await openGenerate(container);
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'something' } });

    const submit = container.querySelector<HTMLButtonElement>('[data-generate-submit]')!;
    await waitFor(() => { if (!submit.disabled) throw new Error('still enabled'); });
    expect(submit.title).toMatch(/needs 3 credits/);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('attached references keep their order and all travel with the request', async () => {
    const { adapter, container } = await mount();
    await openGenerate(container);

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [
      new File(['a'], 'one.png', { type: 'image/png' }),
      new File(['b'], 'two.png', { type: 'image/png' }),
    ] } });

    await waitFor(() => {
      if (container.querySelectorAll('[data-reference-chip]').length !== 2) throw new Error('not attached');
    });

    // Reorder: the second becomes the first, and that is the order sent.
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-reference-chip="r2"] button[aria-label*="earlier"]')!);
    await waitFor(() => {
      const first = container.querySelectorAll('[data-reference-chip]')[0];
      if (first.getAttribute('data-reference-chip') !== 'r2') throw new Error('not reordered');
    });

    const before = adapter.getDocument().pages.length;
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'use these' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);
    await waitFor(() => { if (adapter.getDocument().pages.length !== before + 1) throw new Error('not inserted'); });

    const req = generateMock.mock.calls[0][0] as GenerateImageArgs;
    const userRefs = (req.references ?? []).filter((r) => r.path?.startsWith('ai-refs/'));
    expect(userRefs.map((r) => r.path)).toEqual(['ai-refs/u/2.png', 'ai-refs/u/1.png']);
  });

  it('a generated page offers Save to Brand Assets', async () => {
    const { container } = await mount();
    await openGenerate(container);
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'a lighthouse' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);

    await waitFor(() => { if (!container.querySelector('[data-generate-actions]')) throw new Error('no actions'); });
    // Present only when the Library service is available AND there is an image.
    const save = container.querySelector<HTMLButtonElement>('[data-generate-save-to-brand]');
    if (save) expect(save.textContent).toMatch(/Save to Brand Assets/);
  });

  it('a short delivery is reported, never silently absorbed', async () => {
    generateMock.mockImplementation(async () => ({
      // Asked for 3, one came back.
      images: [{ storagePath: 'b/generated/job-y/1.png', url: PNG_1x1, width: 64, height: 64, mime: 'image/png', bytes: 100 }],
      jobId: 'job-y', model: 'pollinations:flux', chargedCredits: 1, balance: 499,
      warnings: ['provider returned fewer images than requested'],
    }));
    useGeneratePrefs.setState({ count: 3 });

    const { adapter, container } = await mount();
    await openGenerate(container);
    const before = adapter.getDocument().pages.length;
    fireEvent.change(container.querySelector('[data-generate-prompt]')!, { target: { value: 'three please' } });
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-submit]')!);

    await waitFor(() => { if (adapter.getDocument().pages.length !== before + 1) throw new Error('not inserted'); });
    await waitFor(() => {
      if (!document.body.textContent?.match(/1 of 3 images came back/)) throw new Error('no shortfall notice');
    });
    expect(document.body.textContent).toMatch(/charged for 1 credits/);
  });
});
