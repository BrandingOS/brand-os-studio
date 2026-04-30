// Step 8 Commit 4 — Phase 3 integration flows (E2E).
//
// Two genuinely-new flows that exercise feature interactions across
// the brand engine and the editor primitives. Real DOM, real canvas,
// real Fabric.js.
//
// Flow 10 — Brand switch + multi-page Re-apply: multi-page doc with
//          brand.color.primary SlotRefs on every page, switch from
//          brand A to brand B via the picker, click Re-apply, assert
//          every page's brand-bound layer resolves to brand B's
//          primary hex (NOT brand A's). Validates that
//          applyBrandToDocument walks every page and uses the
//          current brand prop, not a stale one.
//
// Flow 11 — Smart duplicate + brand-locked layer with recovery
//          state: a brand-locked text layer that has accumulated
//          _lockedBindings from a prior literal override. Duplicate
//          as variant. New page's text layer must carry brandLocked
//          AND the same _lockedBindings shape so a future Re-apply
//          on the variant page still recovers the SlotRef.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
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
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IBrandsService } from '@/core';

afterEach(() => {
  cleanup();
  serviceContainer.clear();
});

function makeBrand(slug: string, name: string, primary: string): Brand {
  return {
    id: `brand-${slug}`,
    slug,
    name,
    primaryColor: primary,
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function registerBrandsService(brands: Brand[]): IBrandsService {
  const stub: IBrandsService = {
    list: vi.fn(async () => brands),
    getById: vi.fn(async (id: string) => brands.find((b) => b.id === id) ?? null),
    getBySlug: vi.fn(async (slug: string) => brands.find((b) => b.slug === slug) ?? null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as IBrandsService;
  serviceContainer.register(SERVICE_KEYS.BRANDS, () => stub);
  return stub;
}

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
}

async function mountEditor(
  doc: BrandOSDocument,
  brand: Brand,
): Promise<MountResult> {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });
  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={doc}
        save={async () => {}}
        brand={brand}
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

/**
 * Wrapper that re-renders the Editor with a different brand prop on
 * `onBrandSwitch`. Mirrors what the real /b/:slug route layer does
 * without touching the router.
 */
async function mountEditorWithSwitch(
  doc: BrandOSDocument,
  initialBrand: Brand,
  brandsBySlug: Record<string, Brand>,
): Promise<MountResult> {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });

  function Wrapper() {
    const [brand, setBrand] = useState<Brand>(initialBrand);
    return (
      <Editor
        initialDocument={doc}
        save={async () => {}}
        brand={brand}
        onBrandSwitch={(slug) => {
          const next = brandsBySlug[slug];
          if (next) setBrand(next);
        }}
        onAdapterReady={(a) => resolveAdapter(a)}
      />
    );
  }

  const { container } = render(
    <MemoryRouter>
      <Wrapper />
      <Toaster />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 60));
  return { adapter, container };
}

async function openBrandPicker(): Promise<HTMLElement> {
  const trigger = document.querySelector<HTMLButtonElement>(
    '[data-brand-picker-trigger]',
  );
  if (!trigger) throw new Error('No BrandPicker trigger in DOM');
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  for (let i = 0; i < 80; i++) {
    const content = document.body.querySelector<HTMLElement>(
      '[data-brand-picker-content]',
    );
    if (content && content.querySelector('[data-brand-list="ready"]')) return content;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('BrandPicker content never reached the ready state');
}

async function clickReapply(): Promise<void> {
  const content = await openBrandPicker();
  const reapply = content.querySelector<HTMLElement>('[data-action="reapply-brand"]');
  if (!reapply) throw new Error('No Re-apply menu item');
  fireEvent.click(reapply);
  await new Promise((r) => setTimeout(r, 100));
}

async function openMoreMenu(): Promise<HTMLElement> {
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[data-control="more"]',
  );
  if (!trigger) throw new Error('No "more" trigger in DOM');
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  for (let i = 0; i < 80; i++) {
    const switchEl = document.body.querySelector<HTMLElement>(
      'button[data-control="brand-managed-switch"]',
    );
    if (switchEl) return switchEl;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('More menu never reached open state');
}

async function openDuplicateSubmenu(pageIndex: number): Promise<HTMLElement> {
  const triggers = document.body.querySelectorAll<HTMLButtonElement>(
    '[data-page-navigator] [aria-label="Page options"]',
  );
  const trigger = triggers[pageIndex];
  if (!trigger) throw new Error(`No page-options trigger at index ${pageIndex}`);
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  for (let i = 0; i < 60; i++) {
    if (document.body.querySelector('[data-page-action="duplicate"]') !== null) break;
    await new Promise((r) => setTimeout(r, 25));
  }
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

function makeTextLayer(id: string, brandLocked: boolean): Layer {
  const slot = { type: 'brand.color.primary' } as const;
  return {
    id,
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
    transform: { x: 80, y: 80, width: 600, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked,
  } as Layer;
}

function multiPagePrimaryDoc(): BrandOSDocument {
  const blank = (id: string, layerId: string): Page => ({
    id,
    name: id,
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [makeTextLayer(layerId, false)],
  });
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-0000000000ee',
    contentType: 'presentation',
    brandId: 'brand-a',
    masterPages: [],
    pages: [
      blank('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000e01'),
      blank('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000e02'),
      blank('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000e03'),
    ],
    metadata: {},
  };
}

const HEADLINE_E1 = '00000000-0000-0000-0000-000000000e01';
const HEADLINE_E2 = '00000000-0000-0000-0000-000000000e02';
const HEADLINE_E3 = '00000000-0000-0000-0000-000000000e03';

function multiPageWithLockedFixture(): BrandOSDocument {
  const sourcePage: Page = {
    id: '00000000-0000-0000-0000-0000000000f1',
    name: 'Source',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [makeTextLayer('00000000-0000-0000-0000-000000000f01', /* locked */ true)],
  };
  const trailingPage: Page = {
    id: '00000000-0000-0000-0000-0000000000f2',
    name: 'Trailing',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [],
  };
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-0000000000ff',
    contentType: 'presentation',
    brandId: 'brand-a',
    masterPages: [],
    pages: [sourcePage, trailingPage],
    metadata: {},
  };
}

const LOCKED_HEADLINE_ID = '00000000-0000-0000-0000-000000000f01';

// ────────────────────────────────────────────────────────────────────────
// Flow 10 — Brand switch + multi-page Re-apply.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 10 — Brand switch + multi-page Re-apply resolve', () => {
  it('after switching brand A → B and re-applying, every page resolves SlotRefs to brand B\'s primary', async () => {
    const BRAND_A = makeBrand('a', 'Brand A', '#dc2626'); // red
    const BRAND_B = makeBrand('b', 'Brand B', '#3b82f6'); // blue
    registerBrandsService([BRAND_A, BRAND_B]);

    const { adapter } = await mountEditorWithSwitch(
      multiPagePrimaryDoc(),
      BRAND_A,
      { a: BRAND_A, b: BRAND_B },
    );

    // Sanity: every page's headline starts as a SlotRef.
    const docStart = adapter.getDocument();
    for (const page of docStart.pages) {
      const layer = page.layers[0] as { color: unknown };
      expect(typeof layer.color).toBe('object');
    }

    // Switch picker → brand B. Wrapper re-renders Editor with brand B.
    const content = await openBrandPicker();
    fireEvent.click(content.querySelector<HTMLElement>('[data-brand-slug="b"]')!);
    await new Promise((r) => setTimeout(r, 80));

    // Re-apply. applyBrandToDocument walks every page and resolves
    // SlotRefs against the CURRENT brand (B), not the stale one (A).
    await clickReapply();

    const docNow = adapter.getDocument();
    for (const headlineId of [HEADLINE_E1, HEADLINE_E2, HEADLINE_E3]) {
      const page = docNow.pages.find((p) => p.layers.some((l) => l.id === headlineId));
      expect(page, `page with ${headlineId} not found`).toBeTruthy();
      const layer = page!.layers.find((l) => l.id === headlineId) as { color: unknown };
      expect(typeof layer.color, `layer ${headlineId} should be resolved literal`).toBe('string');
      // Brand B's primary, NOT Brand A's primary.
      expect((layer.color as string).toLowerCase()).toBe(BRAND_B.primaryColor.toLowerCase());
      expect((layer.color as string).toLowerCase()).not.toBe(BRAND_A.primaryColor.toLowerCase());
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 11 — Smart duplicate + brand-locked layer (with recovery state).
// ────────────────────────────────────────────────────────────────────────

describe('Flow 11 — Duplicate as variant carries brand-lock + recovery state', () => {
  it('variant page\'s text layer preserves brandLocked AND _lockedBindings from the source', async () => {
    const BRAND_A = makeBrand('a', 'Brand A', '#dc2626');
    registerBrandsService([BRAND_A]);

    const { adapter } = await mountEditor(multiPageWithLockedFixture(), BRAND_A);
    const sourcePageId = adapter.getDocument().pages[0].id;

    // Select the locked headline.
    adapter.setSelection([LOCKED_HEADLINE_ID]);
    await new Promise((r) => setTimeout(r, 60));

    // Lock toggle is already true in the fixture; sanity-check the More
    // menu reflects that and the layer carries brandLocked.
    expect(
      (adapter.getDocument().pages[0].layers[0] as { brandLocked: boolean }).brandLocked,
    ).toBe(true);

    // Force a literal override via the adapter to populate
    // `_lockedBindings` with the original SlotRef. The PropertiesPanel
    // gates this in the UI; the recovery hook in FabricAdapter records
    // _lockedBindings when SlotRef → literal happens regardless of the
    // path (programmatic, AI emit, migration import).
    adapter.updateLayer(sourcePageId, LOCKED_HEADLINE_ID, { color: '#ff00ff' });
    const sourceAfterOverride = adapter.getDocument().pages[0].layers[0] as {
      color: unknown;
      brandLocked: boolean;
      _lockedBindings?: Record<string, unknown>;
    };
    expect(sourceAfterOverride.color).toBe('#ff00ff');
    expect(sourceAfterOverride.brandLocked).toBe(true);
    expect(sourceAfterOverride._lockedBindings?.color).toBeDefined();

    // Duplicate as variant.
    const submenu = await openDuplicateSubmenu(0);
    fireEvent.click(
      submenu.querySelector<HTMLElement>('[data-duplicate-mode="as-variant"]')!,
    );
    await new Promise((r) => setTimeout(r, 80));

    const docAfter = adapter.getDocument();
    expect(docAfter.pages).toHaveLength(3);
    const variantPage = docAfter.pages[1];
    expect(variantPage.id).not.toBe(sourcePageId);
    expect(variantPage.layers).toHaveLength(1);

    const variantText = variantPage.layers[0] as {
      kind: string;
      id: string;
      text: string;
      brandLocked: boolean;
      _lockedBindings?: Record<string, unknown>;
    };
    expect(variantText.kind).toBe('text');
    expect(variantText.id).not.toBe(LOCKED_HEADLINE_ID);
    // Variant rule clears text content.
    expect(variantText.text).toBe('');
    // The integration assertion: brandLocked AND _lockedBindings carry over.
    expect(variantText.brandLocked).toBe(true);
    expect(variantText._lockedBindings).toEqual(sourceAfterOverride._lockedBindings);

    // End-to-end follow-on: a future Re-apply on the variant page would
    // restore the SlotRef from `_lockedBindings`. We sanity-check by
    // running clickReapply() and asserting the variant layer's color is
    // a brand-A literal (NOT the magenta override that the source layer
    // had before).
    await clickReapply();
    const variantAfterReapply = adapter
      .getDocument()
      .pages[1].layers[0] as { color: unknown; _lockedBindings?: Record<string, unknown> };
    expect(typeof variantAfterReapply.color).toBe('string');
    expect((variantAfterReapply.color as string).toLowerCase()).toBe(
      BRAND_A.primaryColor.toLowerCase(),
    );
    expect(variantAfterReapply._lockedBindings?.color).toBeUndefined();
  });
});
