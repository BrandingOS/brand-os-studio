// Step 5a — browser E2E for the Variant 4 editor layout.
//
// Renders the real <Editor> in headless Chromium via Vitest browser
// mode. Real DOM, real canvas, real Fabric.js. The five tests below
// each cover one of the 5a acceptance bullets:
//
//   1. Editor renders without errors at the dev route.
//   2. App Rail has 4 entries and clicking each switches the
//      Secondary Panel content.
//   3. Page Navigator hidden on single-page (social-post), visible on
//      multi-page (presentation).
//   4. Selecting a layer surfaces the floating toolbar above the
//      canvas with the right per-kind controls.
//   5. Switching between layer kinds adapts the toolbar's controls.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Editor } from './Editor';
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

function makeBrand(slug: string, name: string): Brand {
  return {
    id: `brand-${slug}`,
    slug,
    name,
    primaryColor: slug === 'skam' ? '#dc2626' : '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function blankPage(name: string): Page {
  return {
    id: crypto.randomUUID(),
    name,
    width: 1920,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [],
  };
}

/** A presentation-style fixture (multi-page) for Page Navigator tests. */
function presentationFixture(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    contentType: 'presentation',
    brandId: 'raqm',
    masterPages: [],
    pages: [
      { ...blankPage('Slide 1'), id: crypto.randomUUID() },
      { ...blankPage('Slide 2'), id: crypto.randomUUID() },
    ],
    metadata: {},
  };
}

function mockBrand(): Brand {
  return makeBrand('mock', 'Mock Brand');
}

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
}

async function mountEditor(
  doc: BrandOSDocument = SOCIAL_FIXTURE,
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
        brand={options.brand ?? mockBrand()}
        onBrandSwitch={options.onBrandSwitch}
        onAdapterReady={(a) => resolveAdapter(a)}
      />
      <Toaster />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  // One animation frame for adapter mount + fixture load, plus a 50ms
  // microtask flush so async layerToFabric promises (FabricImage.fromURL
  // etc.) settle.
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 60));
  return { adapter, container };
}

// ────────────────────────────────────────────────────────────────────────
// Test 1 — Editor renders without errors. Top bar + App Rail + canvas
// + Insert panel (default rail) all present.
// ────────────────────────────────────────────────────────────────────────
describe('Step 5a — editor renders the new layout', () => {
  it('mounts cleanly with brand picker, App Rail, canvas, and default Insert panel', async () => {
    const { container } = await mountEditor();
    // Top bar — brand picker shows the mock brand name.
    expect(container.textContent ?? '').toContain('Mock Brand');
    // Segmented mode pill — Edit is active.
    const editTab = Array.from(
      container.querySelectorAll('.segmented-nav-item'),
    ).find((el) => el.textContent === 'Edit');
    expect(editTab?.classList.contains('is-active')).toBe(true);
    // App Rail — all four entries present.
    for (const id of ['generate', 'templates', 'insert', 'brand']) {
      expect(
        container.querySelector(`button[data-rail-item="${id}"]`),
        `missing rail entry: ${id}`,
      ).toBeTruthy();
    }
    // Default rail entry is Insert; the Secondary Panel reflects that.
    const panel = container.querySelector('[data-secondary-panel]');
    expect(panel?.getAttribute('data-secondary-panel')).toBe('insert');
    // Canvas region is present.
    expect(container.querySelector('[data-editor-canvas-region]')).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 2 — Click each App Rail entry → Secondary Panel content swaps.
// ────────────────────────────────────────────────────────────────────────
describe('Step 5a — App Rail switches the Secondary Panel', () => {
  it('clicking each rail entry updates the secondary panel data attribute', async () => {
    const { container } = await mountEditor();
    const rails: Array<['generate' | 'templates' | 'insert' | 'brand', string]> = [
      ['generate', 'Generate'],
      ['templates', 'Templates'],
      ['insert', 'Insert'],
      ['brand', 'Brand kit'],
    ];
    for (const [id, expectedHeading] of rails) {
      const railBtn = container.querySelector<HTMLButtonElement>(
        `button[data-rail-item="${id}"]`,
      );
      expect(railBtn, `rail btn missing: ${id}`).toBeTruthy();
      fireEvent.click(railBtn!);

      const panel = container.querySelector('[data-secondary-panel]');
      expect(
        panel?.getAttribute('data-secondary-panel'),
        `panel did not switch to ${id}`,
      ).toBe(id);
      // The eyebrow text or title varies per panel — assert the
      // expected heading text shows up somewhere in the panel.
      expect(panel?.textContent ?? '').toContain(expectedHeading);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 3 — Page Navigator visibility tracks contentType.pageModel.
// ────────────────────────────────────────────────────────────────────────
describe('Step 5a — Page Navigator visibility', () => {
  it('hides the navigator on single-page (social-post)', async () => {
    const { container } = await mountEditor(SOCIAL_FIXTURE);
    expect(container.querySelector('[data-page-navigator]')).toBeNull();
  });

  it('shows the navigator on multi-page (presentation)', async () => {
    const { container } = await mountEditor(presentationFixture());
    const nav = container.querySelector('[data-page-navigator]');
    expect(nav).toBeTruthy();
    const text = nav!.textContent ?? '';
    expect(text).toContain('Slide 1');
    expect(text).toContain('Slide 2');
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 4 — Floating contextual toolbar appears with kind-specific
// controls when a single layer is selected via the adapter API.
// ────────────────────────────────────────────────────────────────────────
describe('Step 5a — Floating toolbar appears on selection', () => {
  it('mounts above the canvas with text-specific controls when a text layer is selected', async () => {
    const { adapter, container } = await mountEditor();

    // No selection → no toolbar.
    expect(container.querySelector('[data-floating-toolbar]')).toBeNull();

    // Select the headline (first layer in the social-post fixture).
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    const toolbar = container.querySelector('[data-floating-toolbar]');
    expect(toolbar, 'toolbar should be present after selection').toBeTruthy();
    expect(toolbar?.getAttribute('data-layer-kind')).toBe('text');
    expect(toolbar?.getAttribute('data-layer-id')).toBe(headlineId);

    // Text-kind controls present.
    expect(toolbar?.querySelector('button[data-control="font"]')).toBeTruthy();
    expect(toolbar?.querySelector('button[data-control="more"]')).toBeTruthy();

    // Scope toggle is always present.
    expect(toolbar?.querySelector('button[data-scope-toggle]')).toBeTruthy();
  });

  it('hides the toolbar when selection is cleared', async () => {
    const { adapter, container } = await mountEditor();
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;

    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));
    expect(container.querySelector('[data-floating-toolbar]')).toBeTruthy();

    adapter.setSelection([]);
    await new Promise((r) => setTimeout(r, 60));
    expect(container.querySelector('[data-floating-toolbar]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 5 — Switching between layer kinds (text → shape → image) makes
// the toolbar adapt its controls per kind.
// ────────────────────────────────────────────────────────────────────────
describe('Step 5a — Floating toolbar adapts per layer kind', () => {
  it('shape selection shows fill/stroke chips, not the font picker', async () => {
    const { adapter, container } = await mountEditor();
    const pageId = SOCIAL_FIXTURE.pages[0].id;

    // Add a fresh shape layer (matching what the InsertPanel does).
    const shapeId = crypto.randomUUID();
    const shape: Layer = {
      id: shapeId,
      kind: 'shape',
      name: 'Test rect',
      shape: 'rectangle',
      fill: '#ff0000',
      stroke: null,
      strokeWidth: 0,
      cornerRadius: 0,
      transform: { x: 50, y: 50, width: 200, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
    };
    adapter.addLayer(pageId, shape);
    await new Promise((r) => setTimeout(r, 60));
    adapter.setSelection([shapeId]);
    await new Promise((r) => setTimeout(r, 60));

    const toolbar = container.querySelector('[data-floating-toolbar]');
    expect(toolbar?.getAttribute('data-layer-kind')).toBe('shape');
    // Font picker is NOT present for shapes.
    expect(toolbar?.querySelector('button[data-control="font"]')).toBeNull();
    // Fill control IS present.
    expect(toolbar?.querySelector('[data-control="fill"]')).toBeTruthy();
    expect(toolbar?.querySelector('[data-control="stroke"]')).toBeTruthy();
  });

  it('image selection shows fit + src controls', async () => {
    const { adapter, container } = await mountEditor();
    const pageId = SOCIAL_FIXTURE.pages[0].id;

    const imageId = crypto.randomUUID();
    const image: Layer = {
      id: imageId,
      kind: 'image',
      name: 'Test image',
      src: 'https://placehold.co/400x300/png',
      fit: 'cover',
      transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
    };
    adapter.addLayer(pageId, image);
    // Image layers go through FabricImage.fromURL which is a network
    // round-trip — wait for the layer to land in the adapter's Fabric
    // map before selecting it. Without this the selection no-ops.
    const fabricMap = (adapter as unknown as {
      fabricByLayerId: Map<string, unknown>;
    }).fabricByLayerId;
    const start = Date.now();
    while (!fabricMap.get(imageId) && Date.now() - start < 8000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    adapter.setSelection([imageId]);
    // Poll for the toolbar to render — React state updates aren't
    // synchronous and the image kind shows up after a tick.
    let toolbar: Element | null = null;
    for (let i = 0; i < 40; i++) {
      toolbar = container.querySelector('[data-floating-toolbar]');
      if (toolbar?.getAttribute('data-layer-kind') === 'image') break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(toolbar?.getAttribute('data-layer-kind')).toBe('image');
    expect(toolbar?.querySelector('button[data-control="fit"]')).toBeTruthy();
    expect(toolbar?.querySelector('input[data-control="src"]')).toBeTruthy();
    expect(toolbar?.querySelector('button[data-control="font"]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────
// Step 5b — Brand picker dropdown lists IBrandsService brands and fires
// onBrandSwitch on select.
// ────────────────────────────────────────────────────────────────────────

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

describe('Step 5b — Brand picker dropdown lists brands and switches', () => {
  it('clicking the picker opens a dropdown listing brands fetched from IBrandsService', async () => {
    const RAQM = makeBrand('raqm', 'Raqm');
    const SKAM = makeBrand('skam', 'SKAM');
    const VECTOR = makeBrand('vector', 'Vector');
    registerBrandsService([RAQM, SKAM, VECTOR]);

    await mountEditor(SOCIAL_FIXTURE, { brand: RAQM });
    const content = await openBrandPicker();
    const slugs = Array.from(
      content.querySelectorAll<HTMLElement>('[data-brand-slug]'),
    ).map((el) => el.getAttribute('data-brand-slug'));
    expect(slugs).toEqual(['raqm', 'skam', 'vector']);
  });

  it('selecting a different brand fires onBrandSwitch with the slug', async () => {
    const RAQM = makeBrand('raqm', 'Raqm');
    const SKAM = makeBrand('skam', 'SKAM');
    registerBrandsService([RAQM, SKAM]);

    const onBrandSwitch = vi.fn();
    await mountEditor(SOCIAL_FIXTURE, { brand: RAQM, onBrandSwitch });
    const content = await openBrandPicker();
    const skamRow = content.querySelector<HTMLElement>('[data-brand-slug="skam"]');
    fireEvent.click(skamRow!);
    expect(onBrandSwitch).toHaveBeenCalledWith('skam');
    expect(onBrandSwitch).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Step 5b — Re-apply brand kit: toast appears, doc resolves, undo reverses
// the entire op in one step.
// ────────────────────────────────────────────────────────────────────────

describe('Step 5b — Re-apply brand kit', () => {
  it('clicking Re-apply resolves SlotRefs in the document and shows a success toast', async () => {
    const RAQM = makeBrand('raqm', 'Raqm');
    registerBrandsService([RAQM]);

    const { adapter } = await mountEditor(SOCIAL_FIXTURE, { brand: RAQM });

    // The headline starts with a SlotRef color in the fixture.
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    const beforeColor = (
      adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
        color: unknown;
      }
    ).color;
    expect(typeof beforeColor).toBe('object'); // SlotRef shape

    const content = await openBrandPicker();
    const reapply = content.querySelector<HTMLElement>(
      '[data-action="reapply-brand"]',
    );
    expect(reapply, 'no Re-apply menu item').toBeTruthy();
    fireEvent.click(reapply!);

    // Doc state — headline color is now a literal string (resolved).
    await new Promise((r) => setTimeout(r, 80));
    const afterColor = (
      adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
        color: unknown;
      }
    ).color;
    expect(typeof afterColor).toBe('string');

    // Toast surfaces in the DOM. Sonner appends to document.body.
    let toastEl: Element | null = null;
    for (let i = 0; i < 60; i++) {
      const text = document.body.textContent ?? '';
      if (text.includes('Brand kit re-applied')) {
        toastEl = document.body;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(
      toastEl,
      'success toast "Brand kit re-applied" never appeared',
    ).toBeTruthy();
  });

  it('after Re-apply, undo() reverses the entire op in one step', async () => {
    const RAQM = makeBrand('raqm', 'Raqm');
    registerBrandsService([RAQM]);

    const { adapter } = await mountEditor(SOCIAL_FIXTURE, { brand: RAQM });
    const beforeJson = JSON.stringify(adapter.getDocument());

    const content = await openBrandPicker();
    const reapply = content.querySelector<HTMLElement>(
      '[data-action="reapply-brand"]',
    );
    fireEvent.click(reapply!);
    await new Promise((r) => setTimeout(r, 80));

    const afterJson = JSON.stringify(adapter.getDocument());
    expect(afterJson).not.toBe(beforeJson);
    expect(adapter.canUndo()).toBe(true);

    // History is exactly two entries: original + "Re-apply brand kit".
    // Without this guard, a phantom second commit could slip in and
    // single-step undo would silently leave the doc partly resolved
    // (the bug that surfaced when replaceDocument auto-committed
    // after its async render).
    const historyAfter = (
      adapter as unknown as {
        history: {
          getStateForTesting(): {
            past: unknown[];
            labels: (string | undefined)[];
          };
        };
      }
    ).history.getStateForTesting();
    expect(historyAfter.past.length).toBe(2);
    expect(historyAfter.labels[1]).toBe('Re-apply brand kit');

    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(JSON.stringify(adapter.getDocument())).toBe(beforeJson);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Step 5c — Brand-managed toggle in the floating toolbar's More menu.
// ────────────────────────────────────────────────────────────────────────

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

describe('Step 5c — Brand-managed toggle (browser E2E)', () => {
  it('opening More on a selected layer reveals the Brand-managed switch', async () => {
    const { adapter } = await mountEditor();
    adapter.setSelection([SOCIAL_FIXTURE.pages[0].layers[0].id]);
    await new Promise((r) => setTimeout(r, 60));
    const switchEl = await openMoreMenu();
    expect(switchEl).toBeTruthy();
  });

  it('toggling on adds the lock badge AND mutes the brand-bound controls', async () => {
    const { adapter, container } = await mountEditor();
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    // Pre-toggle: no badge, no locked gates.
    expect(container.querySelector('[data-lock-badge]')).toBeNull();
    expect(container.querySelectorAll('[data-locked-gate]').length).toBe(0);

    const switchEl = await openMoreMenu();
    fireEvent.click(switchEl);

    // Wait for state to propagate through the adapter's change event
    // back to React's selection state.
    let badge: Element | null = null;
    for (let i = 0; i < 60; i++) {
      badge = container.querySelector('[data-lock-badge]');
      if (badge) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(badge, 'lock badge never appeared after toggle on').toBeTruthy();
    expect(badge?.getAttribute('data-layer-id')).toBe(headlineId);

    // The brand-bound controls (color, fontFamily) are now wrapped in
    // LockedGates. Headline starts with SlotRef color + SlotRef font,
    // so we expect 2 gates.
    expect(container.querySelectorAll('[data-locked-gate]').length).toBe(2);

    // Layer mirror reflects the toggle.
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          brandLocked: boolean;
        }
      ).brandLocked,
    ).toBe(true);
  });

  it('toggling off removes the badge and editable controls return', async () => {
    const { adapter, container } = await mountEditor();
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;
    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    // Lock first.
    const switchOn = await openMoreMenu();
    fireEvent.click(switchOn);
    for (let i = 0; i < 60; i++) {
      if (container.querySelector('[data-lock-badge]')) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(container.querySelector('[data-lock-badge]')).toBeTruthy();

    // The same switch element is reused across renders (Radix keeps
    // its portal mounted). Polling for it finds the now-checked state.
    let switchOff: HTMLButtonElement | null = null;
    for (let i = 0; i < 60; i++) {
      switchOff = document.body.querySelector<HTMLButtonElement>(
        'button[data-control="brand-managed-switch"][aria-checked="true"]',
      );
      if (switchOff) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(switchOff).toBeTruthy();
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

  it('end-to-end: lock → override via direct adapter (bypassing UI) → re-apply restores SlotRef', async () => {
    // Proves 4c.2 recovery + 5c locking integrate end-to-end. The
    // floating toolbar's LockedGate blocks UI overrides, but a
    // programmatic override still earns _lockedBindings — and
    // re-apply restores the SlotRef.
    const RAQM = makeBrand('raqm', 'Raqm');
    registerBrandsService([RAQM]);
    const { adapter, container } = await mountEditor(SOCIAL_FIXTURE, {
      brand: RAQM,
    });
    const pageId = SOCIAL_FIXTURE.pages[0].id;
    const headlineId = SOCIAL_FIXTURE.pages[0].layers[0].id;

    adapter.setSelection([headlineId]);
    await new Promise((r) => setTimeout(r, 60));

    // 1. Lock the headline.
    const switchEl = await openMoreMenu();
    fireEvent.click(switchEl);
    await new Promise((r) => setTimeout(r, 60));

    // 2. Force an override via the adapter (simulates legacy code path
    //    or AI agent emit — the UI itself is now gated).
    const originalColorRef = (
      adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
        color: unknown;
      }
    ).color;
    expect(typeof originalColorRef).toBe('object'); // SlotRef
    adapter.updateLayer(pageId, headlineId, { color: '#ff00ff' });
    expect(
      (
        adapter.getDocument().pages[0].layers.find((l) => l.id === headlineId) as {
          color: unknown;
        }
      ).color,
    ).toBe('#ff00ff');

    // 3. Re-apply the brand kit. The SlotRef on the brandLocked layer
    //    is restored from `_lockedBindings`.
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-brand-picker-trigger]',
    );
    fireEvent.pointerDown(trigger!, { button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(trigger!, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger!);
    let reapplyAction: HTMLElement | null = null;
    for (let i = 0; i < 60; i++) {
      reapplyAction = document.body.querySelector<HTMLElement>(
        '[data-action="reapply-brand"]',
      );
      if (reapplyAction) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    fireEvent.click(reapplyAction!);
    await new Promise((r) => setTimeout(r, 100));

    // After re-apply, the headline color IS resolved from the SlotRef
    // (a literal hex), AND the layer's `_lockedBindings.color` is
    // cleared because the recovery served its purpose.
    const after = adapter
      .getDocument()
      .pages[0].layers.find((l) => l.id === headlineId) as {
      color: unknown;
      brandLocked: boolean;
      _lockedBindings?: Record<string, unknown>;
    };
    expect(typeof after.color).toBe('string');
    expect(after.color).not.toBe('#ff00ff'); // override discarded
    expect(after.brandLocked).toBe(true); // still locked
    expect(after._lockedBindings?.color).toBeUndefined(); // recovery cleared
  });
});
