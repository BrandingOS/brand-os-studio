// Browser E2E for the AI mode wirings — Phase 3.5 commits 6/7/8.
//
// Each describe block exercises one mode end-to-end through the full
// editor (real adapter, real Fabric, real prompt bar) using a stub
// agent that returns a deterministic AICommandResult on submit. The
// test asserts the doc state on the adapter after the AI flow
// completes, plus the single-undo-entry invariant from Phase 3.
//
// Mode 1 (zero-state generation) is intentionally absent — it ships
// in Phase 5 alongside templates per the vision doc.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Editor } from '@/features/editor/shell/Editor';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
  type Layer,
  type Page,
} from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Brand } from '@/shared/types/brand';
import type {
  AIAgent,
  AICommandResult,
} from '@/features/editor/ai/types';

// Domain-layer stubs — see src/test/imageGenerationStubs.ts. Without these the
// suite calls the REAL deployed Edge Function and the REAL credits tables.
vi.mock('@/features/image-generation', async (orig) => ({
  ...(await orig<typeof import('@/features/image-generation')>()),
  ...(await import('@/test/imageGenerationStubs')).imageGenerationBarrelStubs(),
}));
vi.mock('@/features/image-generation/credits', async (orig) => ({
  ...(await orig<typeof import('@/features/image-generation/credits')>()),
  ...(await import('@/test/imageGenerationStubs')).creditsModuleStubs(),
}));

const SOCIAL_FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => cleanup());

function mockBrand(): Brand {
  return {
    id: 'brand-test', slug: 'test', name: 'Test Brand',
    primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function stubAgent(result: AICommandResult): AIAgent {
  return {
    applyCommand: vi.fn(async () => result),
  };
}

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
  agent: AIAgent;
}

async function mount(args: {
  doc?: BrandOSDocument;
  result: AICommandResult;
}): Promise<MountResult> {
  const agent = stubAgent(args.result);
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => { resolveAdapter = r; });

  // Force a wide viewport so the prompt bar renders inline.
  Object.defineProperty(window, 'innerWidth', {
    writable: true, configurable: true, value: 1440,
  });
  window.dispatchEvent(new Event('resize'));

  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={args.doc ?? SOCIAL_FIXTURE}
        save={async () => {}}
        brand={mockBrand()}
        aiAgent={agent}
        // The Image / Editable switch is no longer rendered, so these flows
        // reach Editable the way the Design hero hand-off does: through
        // `?mode=editable`. That also proves the path survives the switch
        // being hidden.
        initialAi={{ mode: 'editable' }}
        onAdapterReady={(a) => resolveAdapter(a)}
      />
      <Toaster />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 60));
  return { adapter, container, agent };
}

/**
 * Drives the CURRENT AI entry point.
 *
 * These tests used to open a floating "Ask AI" pill
 * (`[data-editor-ai-floating-trigger]`). That affordance was deliberately
 * removed — see `Editor.tsx`: "EditorAiFloatingButton removed — AI now lives
 * in the Generate sidebar panel via EditorSecondaryPanel → GeneratePanel."
 * The flows under test (ops → adapter → single-step undo, rejection handling,
 * cross-page deltas, selection scoping) are unchanged product behaviour; only
 * the way a user reaches them moved, so the helper moved with it.
 */
async function submitPrompt(container: HTMLElement, text: string): Promise<void> {
  // Open the Generate panel from the app rail if it is not already mounted.
  if (!container.querySelector('[data-generate-prompt]')) {
    const railBtn = container.querySelector<HTMLButtonElement>(
      'button[data-rail-item="generate"]',
    );
    if (!railBtn) throw new Error('Generate rail item not in DOM');
    fireEvent.click(railBtn);
    await waitFor(() => {
      if (!container.querySelector('[data-generate-prompt]')) {
        throw new Error('Generate panel did not open');
      }
    });
  }

  // The panel is mounted in Editable mode via `initialAi`. When the switch is
  // rendered again, honour it; while it is hidden, there is nothing to click.
  const editable = container.querySelector<HTMLButtonElement>('[data-generate-mode="editable"]');
  if (editable && editable.getAttribute('aria-checked') !== 'true') fireEvent.click(editable);

  const input = container.querySelector<HTMLTextAreaElement>('[data-generate-prompt]');
  if (!input) throw new Error('Generate prompt input not in DOM');
  fireEvent.change(input, { target: { value: text } });

  const submit = container.querySelector<HTMLButtonElement>('[data-generate-submit]');
  if (!submit) throw new Error('Generate submit button not in DOM');
  fireEvent.click(submit);
}

// ─── Multi-page presentation fixture for Mode 3 cross-page ─────────────

function multiPageDoc(): BrandOSDocument {
  const slot = { type: 'brand.color.primary' } as const;
  const blank = (id: string, layerId: string): Page => ({
    id, name: id, width: 1080, height: 1080,
    background: '#ffffff', masterPageId: null,
    layers: [{
      id: layerId, kind: 'text', name: 'Headline', text: 'Hi',
      fontFamily: 'Inter', fontSize: 48, fontWeight: 600,
      lineHeight: 1.2, letterSpacing: 0, textAlign: 'left',
      direction: 'ltr',
      color: slot as unknown as never,
      transform: { x: 80, y: 80, width: 600, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
    } as Layer],
  });
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-0000000000aa',
    contentType: 'presentation',
    brandId: 'brand-test',
    masterPages: [],
    pages: [
      blank('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000a01'),
      blank('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000a02'),
      blank('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000a03'),
    ],
    metadata: {},
  };
}

// ────────────────────────────────────────────────────────────────────────
// Mode 2 — additive in-doc generation (Phase 3.5 commit 6)
// ────────────────────────────────────────────────────────────────────────

describe('Mode 2 — additive in-doc (no selection + add intent)', () => {
  it('AI emits add-layer ops → adapter receives them → single-step undo reverts the entire delta', async () => {
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    const newLayerId = '00000000-0000-0000-0000-000000000c01';
    const result: AICommandResult = {
      kind: 'delta',
      label: 'AI: add CTA',
      ops: [
        {
          op: 'add-layer',
          pageId: SOCIAL_FIXTURE.pages[0].id,
          layer: {
            id: newLayerId,
            kind: 'shape',
            shape: 'rectangle',
            name: 'CTA bg',
            transform: { x: 80, y: 720, width: 220, height: 56, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
            fill: { type: 'brand.color.accent' },
            stroke: null, strokeWidth: 0, cornerRadius: 8,
          } as Layer,
        },
      ],
      message: 'Added a CTA button.',
    };

    const { adapter, container, agent } = await mount({ result });

    // Sanity — pre-submit count.
    const layersBefore = adapter.getDocument().pages[0].layers.length;
    expect(layersBefore).toBeGreaterThan(0);

    await submitPrompt(container, 'add a CTA button below the headline');
    await waitFor(() => {
      expect(agent.applyCommand).toHaveBeenCalledTimes(1);
    });

    // Layer landed.
    await waitFor(() => {
      const layers = adapter.getDocument().pages[0].layers;
      expect(layers.length).toBe(layersBefore + 1);
      expect(layers[layers.length - 1].id).toBe(newLayerId);
    });

    // Undo reverses the entire AI delta in one step.
    expect(adapter.canUndo()).toBe(true);
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().pages[0].layers.length).toBe(layersBefore);
    // The original headline still there.
    expect(
      adapter.getDocument().pages[0].layers.some((l) => l.id === headlineId),
    ).toBe(true);
  });

  it('Mode 2 negative path: AI returns rejected → no adapter mutation, error shown inline', async () => {
    const result: AICommandResult = {
      kind: 'rejected', reason: 'unsupported',
      message: 'Image generation is not in Phase 3.5 scope.',
    };
    const { adapter, container } = await mount({ result });
    const docBefore = JSON.stringify(adapter.getDocument());

    await submitPrompt(container, 'generate a hero image');

    await waitFor(() => {
      const err = container.querySelector('[data-generate-error]');
      expect(err?.textContent).toContain('Image generation is not in Phase 3.5 scope');
    });
    // Adapter untouched.
    expect(JSON.stringify(adapter.getDocument())).toBe(docBefore);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Mode 3 — edit by command (Phase 3.5 commit 7)
// ────────────────────────────────────────────────────────────────────────

describe('Mode 3 — edit by command (broad change, optional selection)', () => {
  it('cross-page change: delta with one update-layer op per page lands across all pages as ONE undo entry', async () => {
    const HEADLINE_1 = '00000000-0000-0000-0000-000000000a01';
    const HEADLINE_2 = '00000000-0000-0000-0000-000000000a02';
    const HEADLINE_3 = '00000000-0000-0000-0000-000000000a03';
    const PAGE_1 = '00000000-0000-0000-0000-0000000000a1';
    const PAGE_2 = '00000000-0000-0000-0000-0000000000a2';
    const PAGE_3 = '00000000-0000-0000-0000-0000000000a3';

    const result: AICommandResult = {
      kind: 'delta',
      label: 'AI: white all headlines',
      ops: [
        { op: 'update-layer', pageId: PAGE_1, layerId: HEADLINE_1,
          patch: { color: { type: 'brand.color.neutral', neutralIndex: 0 } } as Partial<Layer> },
        { op: 'update-layer', pageId: PAGE_2, layerId: HEADLINE_2,
          patch: { color: { type: 'brand.color.neutral', neutralIndex: 0 } } as Partial<Layer> },
        { op: 'update-layer', pageId: PAGE_3, layerId: HEADLINE_3,
          patch: { color: { type: 'brand.color.neutral', neutralIndex: 0 } } as Partial<Layer> },
      ],
      message: 'Changed every headline to white across 3 pages.',
      disambiguation: { mode4_alternative: 'Change just this headline white instead?' },
    };

    const { adapter, container } = await mount({ doc: multiPageDoc(), result });
    await submitPrompt(container, 'change all headlines color to white');

    await waitFor(() => {
      const docNow = adapter.getDocument();
      for (const id of [HEADLINE_1, HEADLINE_2, HEADLINE_3]) {
        const layer = docNow.pages
          .flatMap((p) => p.layers)
          .find((l) => l.id === id) as { color: unknown } | undefined;
        expect(layer).toBeTruthy();
        const c = layer!.color as { type?: string; neutralIndex?: number };
        expect(c?.type).toBe('brand.color.neutral');
        expect(c?.neutralIndex).toBe(0);
      }
    });

    // Disambiguation alternative surfaces as a chip.
    await waitFor(() => {
      // Chips moved with the surface: GeneratePanel renders them as buttons
      // inside [data-generate-suggestions]. The BEHAVIOUR is unchanged — it
      // still appends disambiguation.mode4_alternative (GeneratePanel:438).
      const chips = Array.from(container.querySelectorAll('[data-generate-suggestions] button'));
      const labels = chips.map((c) => c.textContent ?? '');
      expect(labels).toContain('Change just this headline white instead?');
    });

    // Single undo reverts ALL three pages.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    for (const id of [HEADLINE_1, HEADLINE_2, HEADLINE_3]) {
      const layer = adapter
        .getDocument()
        .pages.flatMap((p) => p.layers)
        .find((l) => l.id === id) as { color: unknown };
      // Original SlotRef restored.
      const c = layer.color as { type?: string };
      expect(c?.type).toBe('brand.color.primary');
    }
  });

  it('Mode 3 negative path: malformed AI response gets caught by Mode 5 → rejected schema_invalid', async () => {
    // Stub agent that bypasses Mode 5 by returning an already-validated
    // rejected variant — this tests the dispatcher's no-op behavior on
    // schema-invalid pass-through (Mode 5 itself is unit-tested
    // separately at modeFive.test.ts).
    const result: AICommandResult = {
      kind: 'rejected', reason: 'schema_invalid',
      message: 'The AI returned malformed JSON.',
    };
    const { adapter, container } = await mount({ doc: multiPageDoc(), result });
    const docBefore = JSON.stringify(adapter.getDocument());
    await submitPrompt(container, 'do something');
    await waitFor(() => {
      expect(container.querySelector('[data-generate-error]')?.textContent).toContain('malformed JSON');
    });
    expect(JSON.stringify(adapter.getDocument())).toBe(docBefore);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Mode 4 — refine selection (Phase 3.5 commit 8)
// ────────────────────────────────────────────────────────────────────────

describe('Mode 4 — refine selection (with selection + refine intent)', () => {
  it('selection-scoped delta: update-layer op targeting the selected layer lands cleanly', async () => {
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    // Capture the fixture's pre-AI fontSize so the assertion isn't
    // brittle to fixture drift (was 96 in 2026-05-01 — verified
    // before write).
    const originalFontSize = (
      SOCIAL_FIXTURE.pages[0].layers[0] as { fontSize: number }
    ).fontSize;
    const targetFontSize = originalFontSize + 48;
    const result: AICommandResult = {
      kind: 'delta',
      label: 'AI: enlarge headline',
      ops: [
        {
          op: 'update-layer',
          pageId: SOCIAL_FIXTURE.pages[0].id,
          layerId: headlineId,
          patch: { fontSize: targetFontSize },
        },
      ],
      message: `Bumped the headline from ${originalFontSize} to ${targetFontSize}px.`,
    };

    const { adapter, container } = await mount({ result });

    // Pre-select the headline (Mode 4 needs a selection).
    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    await submitPrompt(container, 'make this text bigger');

    await waitFor(() => {
      const layer = adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as { fontSize: number };
      expect(layer.fontSize).toBe(targetFontSize);
    });

    // Single undo reverts to the original fontSize.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    const reverted = adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as { fontSize: number };
    expect(reverted.fontSize).toBe(originalFontSize);
  });

  it('Mode 4 negative path: AI returns out_of_selection_scope → no adapter mutation, error shown', async () => {
    const result: AICommandResult = {
      kind: 'rejected',
      reason: 'out_of_selection_scope',
      message: "The command refines the selection but the AI tried to update a different layer.",
    };
    const { adapter, container } = await mount({ result });
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    const docBefore = JSON.stringify(adapter.getDocument());
    await submitPrompt(container, 'rotate this layer 45deg');

    await waitFor(() => {
      expect(container.querySelector('[data-generate-error]')?.textContent).toMatch(
        /out_of_selection_scope|tried to update/i,
      );
    });
    expect(JSON.stringify(adapter.getDocument())).toBe(docBefore);
  });
});
