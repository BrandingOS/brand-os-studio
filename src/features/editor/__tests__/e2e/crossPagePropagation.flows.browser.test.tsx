// Step 8 Commit 2 — Cross-page propagation flows (E2E).
//
// Phase 3 step 6's Sonner-based "apply to all pages" prompt. Three
// flow-grouped tests, one per spec flow. Real DOM, real canvas, real
// Fabric.js.
//
// Flow 4 — All-pages with two-step undo: 3-page presentation, change
//         a brand-bound color on page 1, click "All N pages" on the
//         toast, assert pages 2+3 receive the same literal AND page 1
//         is not double-mutated. First Cmd+Z reverses pages 2+3 only,
//         second Cmd+Z reverses page 1's edit. The two-step undo is
//         the key invariant — the bug class would be a single-step
//         undo that leaves the propagation half-reverted.
//
// Flow 5 — Just-this-layer: same setup, click "Just this layer" → only
//         page 1 changes; pages 2+3 retain their SlotRefs.
//
// Flow 6 — Single-page never triggers the toast: social-post fixture
//         (pageModel: 'single'). Override a brand-bound color, wait a
//         realistic toast window, assert no Sonner cross-page toast
//         appeared.

import { afterEach, describe, expect, it } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
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

const SOCIAL_FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => {
  cleanup();
});

function mockBrand(): Brand {
  return {
    id: 'brand-mock',
    slug: 'mock',
    name: 'Mock Brand',
    primaryColor: '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
}

async function mountEditor(doc: BrandOSDocument): Promise<MountResult> {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });
  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={doc}
        save={async () => {}}
        brand={mockBrand()}
        onAdapterReady={(a) => resolveAdapter(a)}
      />
      <Toaster />
    </MemoryRouter>,
  );
  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 60));
  return { adapter, container };
}

// ─── Multi-page presentation fixture: each page has a brand-bound headline.
function multiPagePresentation(): BrandOSDocument {
  const slot = { type: 'brand.color.primary' } as const;
  const blank = (id: string, layerId: string): Page => ({
    id,
    name: id,
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [
      {
        id: layerId,
        kind: 'text',
        name: 'Headline',
        text: 'Hello',
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: slot as unknown as never,
        transform: {
          x: 80, y: 80, width: 600, height: 80,
          rotation: 0, scaleX: 1, scaleY: 1,
        },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: false,
      } as Layer,
    ],
  });
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-0000000000aa',
    contentType: 'presentation',
    brandId: 'raqm',
    masterPages: [],
    pages: [
      blank('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000a01'),
      blank('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000a02'),
      blank('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000a03'),
    ],
    metadata: {},
  };
}

const HEADLINE_1 = '00000000-0000-0000-0000-000000000a01';
const HEADLINE_2 = '00000000-0000-0000-0000-000000000a02';
const HEADLINE_3 = '00000000-0000-0000-0000-000000000a03';

async function waitForCrossPageToast(timeoutMs = 1500): Promise<HTMLElement> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const node = document.body.querySelector<HTMLElement>(
      '[data-cross-page-toast]',
    );
    if (node) return node;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('cross-page toast never appeared');
}

/**
 * Trigger a brand-bound color override via the toolbar's slot-bound
 * Color chip. Clicking the chip opens the color-picker bar (no
 * intermediate "Bound to brand" dropdown — that was removed); the
 * bar's hex input commits a literal — the same code path the
 * cross-page trigger hooks into.
 */
async function overrideSlotBoundColor(): Promise<void> {
  const chip = document.body.querySelector<HTMLElement>(
    '[data-floating-toolbar] [data-control="color"][data-slot-bound]',
  );
  if (!chip) throw new Error('No slot-bound color chip on the toolbar');
  fireEvent.click(chip);

  let bar: HTMLElement | null = null;
  for (let i = 0; i < 60; i++) {
    bar = document.body.querySelector<HTMLElement>('[data-color-picker-bar]');
    if (bar) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  if (!bar) throw new Error('Color picker bar never appeared');

  const hex = bar.querySelector<HTMLInputElement>('[data-color-hex]');
  if (!hex) throw new Error('Hex input missing in picker bar');
  fireEvent.change(hex, { target: { value: 'ff8800' } });
}

// ────────────────────────────────────────────────────────────────────────
// Flow 4 — All-pages with two-step undo.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 4 — Cross-page "All N pages" propagation with two-step undo', () => {
  it('propagates the override to peers, page 1 is not double-mutated, undo unwinds in two steps', async () => {
    const { adapter } = await mountEditor(multiPagePresentation());
    adapter.setSelection([HEADLINE_1]);
    await new Promise((r) => setTimeout(r, 60));

    await overrideSlotBoundColor();
    await new Promise((r) => setTimeout(r, 30));
    const overrideValue = (
      adapter.getDocument().pages[0].layers.find((l) => l.id === HEADLINE_1) as {
        color: unknown;
      }
    ).color;
    expect(typeof overrideValue).toBe('string');

    const toastNode = await waitForCrossPageToast();
    expect(toastNode.textContent).toContain('color');

    const allBtn = toastNode.querySelector<HTMLButtonElement>(
      '[data-cross-page-action="all"]',
    );
    fireEvent.click(allBtn!);
    await new Promise((r) => setTimeout(r, 60));

    // Pages 2 + 3 reflect the override AND page 1 was not double-mutated.
    const docNow = adapter.getDocument();
    expect(
      (docNow.pages[0].layers.find((l) => l.id === HEADLINE_1) as { color: unknown }).color,
    ).toBe(overrideValue);
    expect(
      (docNow.pages[1].layers.find((l) => l.id === HEADLINE_2) as { color: unknown }).color,
    ).toBe(overrideValue);
    expect(
      (docNow.pages[2].layers.find((l) => l.id === HEADLINE_3) as { color: unknown }).color,
    ).toBe(overrideValue);

    // Step 1 of two-step undo: page 1 keeps the user's color; pages 2+3
    // revert to SlotRef.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    const afterUndo1 = adapter.getDocument();
    expect(
      (afterUndo1.pages[0].layers.find((l) => l.id === HEADLINE_1) as { color: unknown }).color,
    ).toBe(overrideValue);
    expect(
      typeof (afterUndo1.pages[1].layers.find((l) => l.id === HEADLINE_2) as { color: unknown }).color,
    ).toBe('object');
    expect(
      typeof (afterUndo1.pages[2].layers.find((l) => l.id === HEADLINE_3) as { color: unknown }).color,
    ).toBe('object');

    // Step 2: original page-1 edit reverts.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(
      typeof (adapter.getDocument().pages[0].layers.find((l) => l.id === HEADLINE_1) as { color: unknown }).color,
    ).toBe('object');
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 5 — Just-this-layer leaves peers untouched.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 5 — "Just this layer" leaves peers untouched', () => {
  it('clicking Just-this-layer keeps page 1 literal and pages 2+3 as SlotRefs', async () => {
    const { adapter } = await mountEditor(multiPagePresentation());
    adapter.setSelection([HEADLINE_1]);
    await new Promise((r) => setTimeout(r, 60));
    await overrideSlotBoundColor();

    const toastNode = await waitForCrossPageToast();
    fireEvent.click(
      toastNode.querySelector<HTMLButtonElement>(
        '[data-cross-page-action="just-this"]',
      )!,
    );
    await new Promise((r) => setTimeout(r, 30));

    const docNow = adapter.getDocument();
    expect(
      typeof (docNow.pages[0].layers.find((l) => l.id === HEADLINE_1) as { color: unknown }).color,
    ).toBe('string');
    expect(
      typeof (docNow.pages[1].layers.find((l) => l.id === HEADLINE_2) as { color: unknown }).color,
    ).toBe('object');
    expect(
      typeof (docNow.pages[2].layers.find((l) => l.id === HEADLINE_3) as { color: unknown }).color,
    ).toBe('object');
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 6 — Single-page docs never trigger the prompt.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 6 — Single-page never triggers the cross-page toast', () => {
  it('single-page social-post override does NOT show the cross-page Sonner toast within the wait window', async () => {
    const { adapter } = await mountEditor(SOCIAL_FIXTURE);
    adapter.setSelection([SOCIAL_FIXTURE.pages[0].layers[0].id]);
    await new Promise((r) => setTimeout(r, 60));
    await overrideSlotBoundColor();

    // Wait at least 2x the trigger window (the prompt fires synchronously
    // when applicable; a 200ms idle is plenty of headroom).
    await new Promise((r) => setTimeout(r, 200));
    expect(document.body.querySelector('[data-cross-page-toast]')).toBeNull();
  });
});
