// Browser E2E for Phase 4.3 — AI generation surface in TemplatesPanel.
//
// Mode 1 (zero-state generate) end-to-end via a stub agent: open
// Templates panel → click "Generate with AI" → fill prompt → submit
// "Editable design" → assert IDesignStorage.saveDesign was called
// with the AI-emitted doc + navigation lands on the design route.
//
// Plus: clicking an AI prompt-preset card prefills the generator
// instead of opening a doc.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { Editor } from '@/features/editor/shell/Editor';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService, IDesignStorage } from '@/core';
import type { AIAgent, AICommandResult } from '@/features/editor/ai/types';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import { LocalTemplatesService } from '@/core/adapters/templates/LocalTemplatesService';

const FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => {
  cleanup();
  serviceContainer.clear();
  try {
    localStorage.removeItem('brandos:templates:bootstrapped-v1');
    localStorage.removeItem('brandos:templates:templates');
    localStorage.removeItem('brandos:templates:categories');
  } catch { /* ignore */ }
});

function brand(): Brand {
  return {
    id: 'brand-raqm', slug: 'raqm', name: 'Raqm',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function aiResultDoc(): BrandOSDocument {
  return {
    schemaVersion: 1, id: '00000000-0000-0000-0000-0000000ad001',
    contentType: 'social-post', brandId: 'brand-raqm',
    masterPages: [], pages: [{
      id: '00000000-0000-0000-0000-0000000ad002',
      name: 'Page 1', width: 1080, height: 1080,
      background: { type: 'brand.color.primary' } as never,
      masterPageId: null, layers: [],
    }], metadata: {},
  };
}

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

async function mountWithAgent(agentResult: AICommandResult) {
  const b = brand();
  const brands: IBrandsService = {
    list: vi.fn(async () => [b]),
    getById: vi.fn(async () => b),
    getBySlug: vi.fn(async () => b),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  } as unknown as IBrandsService;

  const saveDesign = vi.fn(async () => {});
  const designStorage: IDesignStorage = {
    saveDesign,
    loadDesign: vi.fn(async () => null),
    listDesigns: vi.fn(async () => []),
    deleteDesign: vi.fn(async () => {}),
  };

  const stubAgent: AIAgent = { applyCommand: vi.fn(async () => agentResult) };

  serviceContainer.register(SERVICE_KEYS.BRANDS, () => brands);
  serviceContainer.register(SERVICE_KEYS.DESIGN_STORAGE, () => designStorage);
  serviceContainer.register(SERVICE_KEYS.TEMPLATES, () => new LocalTemplatesService());
  // Phase 5 — AI agent DI override. The panels' useAiAgent hook
  // picks this up before falling back to a real EdgeFunctionAgent.
  serviceContainer.register(SERVICE_KEYS.AI_AGENT, () => stubAgent);

  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => { resolveAdapter = r; });
  let lastPath = '/b/raqm';

  const { container } = render(
    <MemoryRouter initialEntries={['/b/raqm']}>
      <Routes>
        <Route path="/b/:slug" element={
          <Editor
            initialDocument={FIXTURE}
            save={async () => {}}
            brand={b}
            aiAgent={stubAgent}
            onAdapterReady={(a) => resolveAdapter(a)}
          />
        } />
        <Route path="/b/:slug/design/:designSlug" element={<div data-testid="design-route">opened</div>} />
      </Routes>
      <LocationProbe onChange={(p) => { lastPath = p; }} />
      <Toaster />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 80));
  return { adapter, container, saveDesign, getLastPath: () => lastPath };
}

// ─── Flow 1 — Editable design ──────────────────────────────────────────

describe('Phase 4.3 — Generate with AI: editable design (Mode 1)', () => {
  // Phase 5 closed Phase 4.3's debt: SERVICE_KEYS.AI_AGENT can be
  // registered in DI and useAiAgent picks it up. The test now
  // injects the stub directly — no more fetch mocking required.
  it('agent.applyCommand returns replace → saveDesign called with the AI doc → navigate to /design/:id', async () => {
    const replaceResult: AICommandResult = {
      kind: 'replace', label: 'AI: zero-state',
      justification: 'Mode 1 — zero-state generation; full doc.',
      nextDoc: aiResultDoc(), message: 'Generated a fresh post.',
    };

    const { container, saveDesign, getLastPath } = await mountWithAgent(replaceResult);

    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => container.querySelector('[data-templates-panel]'));

    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-with-ai-trigger]')!);
    await waitFor(() => container.querySelector('[data-generate-with-ai]'));

    const promptInput = container.querySelector<HTMLTextAreaElement>('[data-generate-with-ai-prompt]')!;
    fireEvent.change(promptInput, { target: { value: 'Create an Instagram post for our launch' } });

    const submit = container.querySelector<HTMLButtonElement>('[data-generate-with-ai-submit]')!;
    fireEvent.click(submit);

    await waitFor(() => {
      expect(saveDesign).toHaveBeenCalledTimes(1);
    }, { timeout: 5000 });
    const [savedBrandId, savedDesignId, savedDoc] = saveDesign.mock.calls[0];
    expect(savedBrandId).toBe('brand-raqm');
    expect(savedDesignId.length).toBeGreaterThan(20);
    expect(BrandOSDocumentSchema.safeParse(savedDoc).success).toBe(true);

    await waitFor(() => {
      expect(getLastPath()).toBe(`/b/raqm/design/${savedDesignId}`);
    });
  });

  it('agent rejection → no saveDesign, error toast (no crash, surface stays open)', async () => {
    const rejectResult: AICommandResult = {
      kind: 'rejected', reason: 'agent_error',
      message: 'AI service offline — please try again in a moment.',
    };
    const { container, saveDesign } = await mountWithAgent(rejectResult);

    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => container.querySelector('[data-templates-panel]'));
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-with-ai-trigger]')!);
    await waitFor(() => container.querySelector('[data-generate-with-ai]'));

    fireEvent.change(
      container.querySelector<HTMLTextAreaElement>('[data-generate-with-ai-prompt]')!,
      { target: { value: 'X' } },
    );
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-generate-with-ai-submit]')!);

    // Brief wait — no saveDesign call ever.
    await new Promise((r) => setTimeout(r, 200));
    expect(saveDesign).not.toHaveBeenCalled();
    // Surface still mounted.
    expect(container.querySelector('[data-generate-with-ai]')).toBeTruthy();
  });
});

// ─── Flow 2 — Prompt preset prefill ────────────────────────────────────

describe('Phase 4.3 — AI prompt preset cards prefill the generator', () => {
  it('clicking an ai_prompt_preset template card opens the generator with the prompt prefilled', async () => {
    const { container } = await mountWithAgent({
      kind: 'rejected', reason: 'agent_error', message: 'unused',
    });

    fireEvent.click(container.querySelector<HTMLButtonElement>('button[data-rail-item="templates"]')!);
    await waitFor(() => container.querySelector('[data-templates-panel]'));

    // Filter to AI prompt presets only.
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-templates-filter-chip="preset"]')!);

    let presetCard: HTMLElement | null = null;
    await waitFor(() => {
      presetCard = container.querySelector<HTMLElement>('[data-template-card]');
      expect(presetCard).toBeTruthy();
    }, { timeout: 3000 });

    // Click "Use this template" on the first preset.
    const useBtn = presetCard!.querySelector<HTMLButtonElement>('[data-template-use]')!;
    fireEvent.click(useBtn);

    // Generator opens with prompt prefilled (presets always carry a prompt).
    await waitFor(() => {
      const promptInput = container.querySelector<HTMLTextAreaElement>('[data-generate-with-ai-prompt]');
      expect(promptInput?.value.length).toBeGreaterThan(10);
    });
  });
});
