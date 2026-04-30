// Step 8 Commit 3 — Smart duplicate flows (E2E).
//
// Phase 3 step 7's right-click "Duplicate" submenu in the
// PageNavigator. Three flow-grouped tests, one per spec flow. The
// open-submenu smoke (right-click reveals the three modes) is folded
// into Flow 7's setup.
//
// Flow 7 — Duplicate as variant: page with text + shape + logo +
//         image. After As-variant, the new page sits at sourceIndex+1,
//         text content cleared with styling preserved (font, size,
//         color slot), shape and logo carried over with fresh ids,
//         image dropped entirely (image content is page-specific).
//
// Flow 8 — Duplicate empty: a layered page → Empty mode produces a
//         layerless page with the same width / height / masterPageId.
//
// Flow 9 — Duplicate as-is: byte-equal-in-content (every property
//         that isn't an id matches the source), but every layer.id
//         differs from the source. Strengthens the prior "ID
//         positioning" assertion to guard against any kind of
//         silent property drift in the as-is path.

import { afterEach, describe, expect, it } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Editor } from '@/features/editor/shell/Editor';
import {
  type BrandOSDocument,
  type Layer,
  type Page,
} from '@/features/editor/schema';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Brand } from '@/shared/types/brand';

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

// ─── PageNavigator menu helpers ────────────────────────────────────────

async function openPageMenu(pageIndex: number): Promise<void> {
  const triggers = document.body.querySelectorAll<HTMLButtonElement>(
    '[data-page-navigator] [aria-label="Page options"]',
  );
  const trigger = triggers[pageIndex];
  if (!trigger) throw new Error(`No page-options trigger at index ${pageIndex}`);
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  for (let i = 0; i < 60; i++) {
    if (document.body.querySelector('[data-page-action="duplicate"]') !== null) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('page menu never reached open state');
}

async function openDuplicateSubmenu(pageIndex: number): Promise<HTMLElement> {
  await openPageMenu(pageIndex);
  const subTrigger = document.body.querySelector<HTMLElement>(
    '[data-page-action="duplicate"]',
  );
  if (!subTrigger) throw new Error('Duplicate sub-trigger not in DOM');
  fireEvent.pointerDown(subTrigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(subTrigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(subTrigger);
  fireEvent.pointerEnter(subTrigger, { button: 0, pointerType: 'mouse' });
  for (let i = 0; i < 80; i++) {
    const asIs = document.body.querySelector<HTMLElement>(
      '[data-duplicate-mode="as-is"]',
    );
    if (asIs) return asIs.parentElement!;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Duplicate submenu never opened');
}

// ─── Fixtures ──────────────────────────────────────────────────────────

/**
 * Multi-page presentation with a single layered page used for the
 * duplicate-as-is test. Two pages so the navigator has hover targets
 * but the duplicate-source is page 0 with the rich layer set.
 */
function richPagePresentation(): BrandOSDocument {
  const slot = { type: 'brand.color.primary' } as const;
  const richPage: Page = {
    id: '00000000-0000-0000-0000-0000000000d1',
    name: 'Rich page',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [
      {
        id: '00000000-0000-0000-0000-000000000d01',
        kind: 'text',
        name: 'Headline',
        text: 'Title',
        fontFamily: 'Inter',
        fontSize: 64,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: -0.02,
        textAlign: 'left',
        direction: 'auto',
        color: slot as unknown as never,
        transform: { x: 80, y: 80, width: 600, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: false,
      } as Layer,
      {
        id: '00000000-0000-0000-0000-000000000d02',
        kind: 'shape',
        name: 'Accent rect',
        shape: 'rectangle',
        fill: '#ff0000',
        stroke: null,
        strokeWidth: 0,
        cornerRadius: 0,
        transform: { x: 80, y: 200, width: 200, height: 8, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: false,
      } as Layer,
      {
        id: '00000000-0000-0000-0000-000000000d03',
        kind: 'logo',
        name: 'Brand logo',
        variant: 'primary',
        transform: { x: 80, y: 880, width: 160, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: false,
      } as Layer,
      {
        id: '00000000-0000-0000-0000-000000000d04',
        kind: 'image',
        name: 'Hero photo',
        src: 'https://placehold.co/600x400/png',
        fit: 'cover',
        transform: { x: 360, y: 280, width: 600, height: 400, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        visible: true,
        locked: false,
        brandLocked: false,
      } as Layer,
    ],
  };
  const trailingPage: Page = {
    id: '00000000-0000-0000-0000-0000000000d2',
    name: 'Page 2',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [],
  };
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-0000000000dd',
    contentType: 'presentation',
    brandId: 'mock',
    masterPages: [],
    pages: [richPage, trailingPage],
    metadata: {},
  };
}

const SOURCE_PAGE_ID = '00000000-0000-0000-0000-0000000000d1';

// ────────────────────────────────────────────────────────────────────────
// Flow 7 — Duplicate as variant.
// Submenu reveal is folded into the setup: opening it surfaces all
// three modes. As-variant on a rich page drops the image, preserves
// shape + logo with fresh ids, and clears text content while keeping
// styling.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 7 — Duplicate as variant (rich layer set)', () => {
  it('drops the image, preserves shape + logo with fresh ids, clears text but keeps styling', async () => {
    const { adapter } = await mountEditor(richPagePresentation());
    // Image layers go through FabricImage.fromURL — wait for the
    // initial render to settle before we open the menu.
    await new Promise((r) => setTimeout(r, 200));

    const sourcePage = adapter.getDocument().pages[0];
    expect(sourcePage.id).toBe(SOURCE_PAGE_ID);
    const sourceText = sourcePage.layers[0] as {
      kind: string; text: string; fontFamily: unknown; fontSize: number; color: unknown;
    };
    const sourceShape = sourcePage.layers[1] as { kind: string; fill: string };
    const sourceLogo = sourcePage.layers[2] as { kind: string; variant: string };

    // Submenu reveal: opening surfaces all three modes.
    const submenu = await openDuplicateSubmenu(0);
    expect(submenu.querySelector('[data-duplicate-mode="as-is"]')).toBeTruthy();
    expect(submenu.querySelector('[data-duplicate-mode="as-variant"]')).toBeTruthy();
    expect(submenu.querySelector('[data-duplicate-mode="empty"]')).toBeTruthy();

    fireEvent.click(
      submenu.querySelector<HTMLElement>('[data-duplicate-mode="as-variant"]')!,
    );
    await new Promise((r) => setTimeout(r, 80));

    const docNow = adapter.getDocument();
    expect(docNow.pages).toHaveLength(3);

    // Variant page is at sourceIndex+1.
    const variantPage = docNow.pages[1];
    expect(variantPage.id).not.toBe(sourcePage.id);

    // Image is dropped → 4 source layers become 3.
    expect(variantPage.layers).toHaveLength(3);
    expect(variantPage.layers.find((l) => l.kind === 'image')).toBeUndefined();

    // Text — kept, content cleared, styling preserved.
    const variantText = variantPage.layers[0] as {
      kind: string; text: string; fontFamily: unknown; fontSize: number; color: unknown;
    };
    expect(variantText.kind).toBe('text');
    expect(variantText.text).toBe('');
    expect(variantText.fontFamily).toEqual(sourceText.fontFamily);
    expect(variantText.fontSize).toBe(sourceText.fontSize);
    // Brand-bound color SlotRef preserved.
    expect(variantText.color).toEqual(sourceText.color);

    // Shape — kept entirely.
    const variantShape = variantPage.layers[1] as { kind: string; fill: string; id: string };
    expect(variantShape.kind).toBe('shape');
    expect(variantShape.fill).toBe(sourceShape.fill);

    // Logo — kept.
    const variantLogo = variantPage.layers[2] as { kind: string; variant: string; id: string };
    expect(variantLogo.kind).toBe('logo');
    expect(variantLogo.variant).toBe(sourceLogo.variant);

    // Every variant layer id differs from its source counterpart.
    const sourceIds = new Set(sourcePage.layers.map((l) => l.id));
    for (const l of variantPage.layers) {
      expect(sourceIds.has(l.id)).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 8 — Duplicate empty.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 8 — Duplicate empty', () => {
  it('produces a layerless page at sourceIndex+1 with same width/height/masterPageId', async () => {
    const { adapter } = await mountEditor(richPagePresentation());
    await new Promise((r) => setTimeout(r, 200));
    const sourcePage = adapter.getDocument().pages[0];

    const submenu = await openDuplicateSubmenu(0);
    fireEvent.click(
      submenu.querySelector<HTMLElement>('[data-duplicate-mode="empty"]')!,
    );
    await new Promise((r) => setTimeout(r, 60));

    const emptyPage = adapter.getDocument().pages[1];
    expect(emptyPage.id).not.toBe(sourcePage.id);
    expect(emptyPage.layers).toEqual([]);
    expect(emptyPage.width).toBe(sourcePage.width);
    expect(emptyPage.height).toBe(sourcePage.height);
    expect(emptyPage.masterPageId).toBe(sourcePage.masterPageId);

    // Cmd+Z removes the empty page.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().pages).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 9 — Duplicate as-is.
// Spec assertion: byte-equal-in-content, but every layer.id differs.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 9 — Duplicate as-is (byte-equal content, fresh layer ids)', () => {
  it('clones every property of every source layer except id; new layer ids never collide with source', async () => {
    const { adapter } = await mountEditor(richPagePresentation());
    await new Promise((r) => setTimeout(r, 200));

    const docBefore = adapter.getDocument();
    const sourcePage = docBefore.pages[0];

    const submenu = await openDuplicateSubmenu(0);
    fireEvent.click(
      submenu.querySelector<HTMLElement>('[data-duplicate-mode="as-is"]')!,
    );
    await new Promise((r) => setTimeout(r, 80));

    const docAfter = adapter.getDocument();
    expect(docAfter.pages).toHaveLength(3);
    // New page is inserted at sourceIndex+1.
    expect(docAfter.pages[0].id).toBe(sourcePage.id);
    expect(docAfter.pages[2].id).toBe(docBefore.pages[1].id);

    const dupPage = docAfter.pages[1];
    expect(dupPage.id).not.toBe(sourcePage.id);

    // Layer count matches.
    expect(dupPage.layers).toHaveLength(sourcePage.layers.length);

    // Every layer.id in the dup differs from EVERY source id (no collisions).
    const sourceIds = new Set(sourcePage.layers.map((l) => l.id));
    for (const dup of dupPage.layers) {
      expect(sourceIds.has(dup.id)).toBe(false);
    }

    // Byte-equal layer content: stripping ids, every layer property
    // matches exactly. Comparing JSON-serialized forms catches any
    // silent property drift on any layer kind (deep structural check
    // that survives the schema's discriminated union).
    const stripIds = (layers: Layer[]): unknown =>
      JSON.parse(
        JSON.stringify(layers, (key, value) => (key === 'id' ? undefined : value)),
      );
    expect(stripIds(dupPage.layers)).toEqual(stripIds(sourcePage.layers));

    // Page-level props (geometry, master, background) match the source.
    // Page id and name are expected to differ — the duplicate gets a
    // fresh id and the canonical " copy" suffix.
    expect(dupPage.width).toBe(sourcePage.width);
    expect(dupPage.height).toBe(sourcePage.height);
    expect(dupPage.masterPageId).toBe(sourcePage.masterPageId);
    expect(dupPage.background).toEqual(sourcePage.background);

    // Cmd+Z removes the duplicate.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().pages.map((p) => p.id)).toEqual(
      docBefore.pages.map((p) => p.id),
    );
  });
});
