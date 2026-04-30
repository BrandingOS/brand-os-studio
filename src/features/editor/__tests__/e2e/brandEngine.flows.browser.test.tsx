// Step 8 Commit 1 — Brand engine flows (E2E).
//
// Three flow-grouped tests, one per Phase 3 user-facing brand-engine
// flow. Real DOM, real canvas, real Fabric.js. Each describe block is
// the test for ONE flow per the Step 8 spec; ancillary smoke tests
// (picker UI, More menu reveal) are folded into the round-trip
// assertions to keep per-flow scope tight.
//
// Flow 1 — Brand switch via picker. Mock IBrandsService with two
//         visually distinct brands. Open editor with brand A, click
//         picker, select brand B, then re-apply against brand B and
//         confirm the doc's `brand.color.primary` SlotRef resolves
//         to brand B's primary hex (i.e. the brand prop drives
//         resolved values, not just the topbar label).
//
// Flow 2 — Re-apply recovers from drift. Brand-locked text with a
//         `brand.color.primary` slot, programmatic literal-hex
//         override (bypasses UI), Re-apply restores the slot AND
//         clears `_lockedBindings`.
//
// Flow 3 — brandLocked toggle round-trip. Toggle ON → lock badge +
//         brand-bound controls become read-only gates. Toggle OFF →
//         badge gone, controls editable again.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
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
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IBrandsService } from '@/core';

const SOCIAL_FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => {
  cleanup();
  serviceContainer.clear();
});

// ─── Test infra ─────────────────────────────────────────────────────────

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
  options: { brand?: Brand; onBrandSwitch?: (slug: string) => void } = {},
): Promise<MountResult> {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });

  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={doc}
        save={async () => {
          /* no-op for tests */
        }}
        brand={options.brand}
        onBrandSwitch={options.onBrandSwitch}
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
 * Mount the Editor inside a stateful wrapper that re-renders with a
 * different `brand` prop when the picker fires `onBrandSwitch`. This
 * is what the real route layer does — `/b/:slug/...` route handlers
 * navigate to a new URL which threads a different brand into the
 * Editor. The wrapper simulates that without touching the router.
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

// ─── Fixture: page with a `brand.color.primary` slot the headline binds to.
function primaryBoundFixture(): BrandOSDocument {
  const slot = { type: 'brand.color.primary' } as const;
  const headlineId = '00000000-0000-0000-0000-0000000a0001';
  const pageId = '00000000-0000-0000-0000-0000000a0p01';
  const docId = '00000000-0000-0000-0000-0000000a0d01';
  const page: Page = {
    id: pageId,
    name: 'Page 1',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [
      {
        id: headlineId,
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
  };
  return {
    schemaVersion: 1,
    id: docId,
    contentType: 'social-post',
    brandId: 'brand-a',
    masterPages: [],
    pages: [page],
    metadata: {},
  };
}

const PRIMARY_HEADLINE_ID = '00000000-0000-0000-0000-0000000a0001';

// ────────────────────────────────────────────────────────────────────────
// Flow 1 — Brand switch via picker → doc re-renders with brand B's
//          resolved values.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 1 — Brand switch via picker', () => {
  it('opens picker, switches brand, and re-applying resolves SlotRefs to brand B\'s primary hex', async () => {
    const BRAND_A = makeBrand('a', 'Brand A', '#dc2626'); // red
    const BRAND_B = makeBrand('b', 'Brand B', '#3b82f6'); // blue
    registerBrandsService([BRAND_A, BRAND_B]);

    const { adapter, container } = await mountEditorWithSwitch(
      primaryBoundFixture(),
      BRAND_A,
      { a: BRAND_A, b: BRAND_B },
    );

    // Sanity: top bar shows brand A.
    expect(container.textContent ?? '').toContain('Brand A');

    // Sanity: headline starts as a SlotRef (not yet resolved).
    const before = adapter.getDocument().pages[0].layers[0] as { color: unknown };
    expect(typeof before.color).toBe('object');

    // Picker UI lists both brands fetched from IBrandsService.
    let content = await openBrandPicker();
    const slugs = Array.from(
      content.querySelectorAll<HTMLElement>('[data-brand-slug]'),
    ).map((el) => el.getAttribute('data-brand-slug'));
    expect(slugs).toEqual(['a', 'b']);

    // Click brand B → wrapper re-renders Editor with brand B prop.
    const brandBRow = content.querySelector<HTMLElement>('[data-brand-slug="b"]');
    fireEvent.click(brandBRow!);
    await new Promise((r) => setTimeout(r, 80));

    // Top bar reflects the swap.
    expect(container.textContent ?? '').toContain('Brand B');

    // Re-apply against brand B → headline color resolves to brand B's primary.
    await clickReapply();

    const after = adapter.getDocument().pages[0].layers[0] as { color: unknown };
    expect(typeof after.color).toBe('string');
    expect((after.color as string).toLowerCase()).toBe(BRAND_B.primaryColor.toLowerCase());
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 2 — Re-apply recovers from drift.
// Brand-locked text with brand.color.primary slot. Bypass the UI and
// write a literal hex via the adapter (simulates legacy code path or AI
// agent emit). Re-apply against the same brand: SlotRef restored from
// `_lockedBindings`, recovery field cleared.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 2 — Re-apply recovers from drift', () => {
  it('lock → programmatic override → Re-apply restores slot binding and clears _lockedBindings', async () => {
    const BRAND_A = makeBrand('a', 'Brand A', '#dc2626');
    registerBrandsService([BRAND_A]);

    const { adapter } = await mountEditor(primaryBoundFixture(), { brand: BRAND_A });
    const pageId = adapter.getDocument().pages[0].id;
    const headlineId = PRIMARY_HEADLINE_ID;

    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    // 1. Lock the headline via the More menu.
    const switchEl = await openMoreMenu();
    fireEvent.click(switchEl);
    await new Promise((r) => setTimeout(r, 60));

    // Sanity: locked AND _lockedBindings would be created on override.
    const beforeOverride = adapter.getDocument().pages[0].layers.find(
      (l) => l.id === headlineId,
    ) as { color: unknown; brandLocked: boolean };
    expect(beforeOverride.brandLocked).toBe(true);
    expect(typeof beforeOverride.color).toBe('object'); // still SlotRef

    // 2. Programmatic override — bypasses UI gating.
    adapter.updateLayer(pageId, headlineId, { color: '#ff00ff' });
    const afterOverride = adapter.getDocument().pages[0].layers.find(
      (l) => l.id === headlineId,
    ) as { color: unknown; _lockedBindings?: Record<string, unknown> };
    expect(afterOverride.color).toBe('#ff00ff');
    // The override-recovery hook recorded the original SlotRef.
    expect(afterOverride._lockedBindings?.color).toBeDefined();

    // 3. Re-apply.
    await clickReapply();

    // SlotRef restored → resolves to brand A's primary, NOT the magenta override.
    const afterReapply = adapter.getDocument().pages[0].layers.find(
      (l) => l.id === headlineId,
    ) as {
      color: unknown;
      brandLocked: boolean;
      _lockedBindings?: Record<string, unknown>;
    };
    expect(typeof afterReapply.color).toBe('string');
    expect(afterReapply.color).not.toBe('#ff00ff'); // override discarded
    expect((afterReapply.color as string).toLowerCase()).toBe(
      BRAND_A.primaryColor.toLowerCase(),
    );
    expect(afterReapply.brandLocked).toBe(true); // still locked
    expect(afterReapply._lockedBindings?.color).toBeUndefined(); // recovery cleared
  });
});

// ────────────────────────────────────────────────────────────────────────
// Flow 3 — brandLocked toggle round-trip.
// One round-trip test: open More menu, toggle ON, assert badge + gates,
// toggle OFF, assert badge gone + gates gone.
// ────────────────────────────────────────────────────────────────────────

describe('Flow 3 — brandLocked toggle round-trip', () => {
  it('toggle ON adds badge + locks brand-bound controls; toggle OFF restores editable controls', async () => {
    const { adapter, container } = await mountEditor(SOCIAL_FIXTURE, {
      brand: makeBrand('a', 'Brand A', '#dc2626'),
    });
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;

    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    // Pre-toggle: no badge, no locked gates.
    expect(container.querySelector('[data-lock-badge]')).toBeNull();
    expect(container.querySelectorAll('[data-locked-gate]').length).toBe(0);

    // Toggle ON.
    const switchOn = await openMoreMenu();
    fireEvent.click(switchOn);

    // Wait for state to propagate.
    let badge: Element | null = null;
    for (let i = 0; i < 60; i++) {
      badge = container.querySelector('[data-lock-badge]');
      if (badge) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(badge, 'lock badge never appeared after toggle on').toBeTruthy();
    expect(badge?.getAttribute('data-layer-id')).toBe(headlineId);

    // Headline starts with SlotRef color + SlotRef font → 2 gates.
    expect(container.querySelectorAll('[data-locked-gate]').length).toBe(2);
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          brandLocked: boolean;
        }
      ).brandLocked,
    ).toBe(true);

    // Toggle OFF — Radix portal stays mounted; the now-checked switch is
    // reachable via the same selector with aria-checked="true".
    let switchOff: HTMLButtonElement | null = null;
    for (let i = 0; i < 60; i++) {
      switchOff = document.body.querySelector<HTMLButtonElement>(
        'button[data-control="brand-managed-switch"][aria-checked="true"]',
      );
      if (switchOff) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(switchOff, 'checked switch never reachable for toggle off').toBeTruthy();
    fireEvent.click(switchOff!);

    for (let i = 0; i < 60; i++) {
      if (!container.querySelector('[data-lock-badge]')) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(container.querySelector('[data-lock-badge]')).toBeNull();
    expect(container.querySelectorAll('[data-locked-gate]').length).toBe(0);
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          brandLocked: boolean;
        }
      ).brandLocked,
    ).toBe(false);
  });
});
