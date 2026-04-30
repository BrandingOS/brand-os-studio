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

import { afterEach, describe, expect, it } from 'vitest';
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

const SOCIAL_FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => {
  cleanup();
});

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
    // Round 2 fix 2 — workspace section nav (Setup/Brand Kit/
    // Guideline/Design/Tools), with Design active because the
    // editor IS the design surface.
    const designTab = container.querySelector(
      '[data-segmented-nav-item="design"]',
    );
    expect(designTab?.classList.contains('is-active')).toBe(true);
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

  it('zoom controls render and the canvas wrapper has a fit-to-screen scale on mount (Step 5/7 fix 6)', async () => {
    const { container } = await mountEditor();

    // Zoom controls cluster present at bottom-right of the canvas
    // region, with all four actions visible.
    const controls = container.querySelector('[data-zoom-controls]');
    expect(controls, 'zoom controls cluster missing').toBeTruthy();
    for (const action of ['fit', 'zoom-out', 'reset', 'zoom-in']) {
      expect(
        controls?.querySelector(`[data-zoom-action="${action}"]`),
        `zoom action "${action}" missing`,
      ).toBeTruthy();
    }

    // The canvas wrapper applies a CSS scale transform. On initial
    // mount the fit calculation runs; the resulting transform should
    // keep the canvas within the viewport. We assert the wrapper has
    // a transform: scale(...) applied. Canvas region is far smaller
    // than 1080×1080 in the harness so the scale is < 1.
    const wrap = container.querySelector<HTMLElement>(
      '[data-editor-canvas-zoom-wrap]',
    );
    expect(wrap).toBeTruthy();
    // Wait a tick for the fit-to-container effect to run.
    await new Promise((r) => setTimeout(r, 60));
    expect(wrap!.style.transform).toMatch(/^scale\(\d+(\.\d+)?\)/);
  });

  it('canvas surface has a subtle bottom-only shadow (Step 5/7 fix 4)', async () => {
    const { container } = await mountEditor();
    const surface = container.querySelector<HTMLElement>(
      '[data-editor-canvas-surface]',
    );
    expect(surface, 'canvas surface div missing').toBeTruthy();
    const shadow = surface!.style.boxShadow;
    // Subtle Y-offset shadow with NO spread. The original bug was
    // --shadow-lg (24px Y-offset, 56px blur) — that wide blur read
    // as a halo on all four sides. Replacement: 0px X-offset, 4px
    // Y-offset, 12px blur, NO spread term, low-alpha rgba color.
    // Browsers reorder the canonical form so the color comes first.
    const offsetsMatch = shadow.match(
      /(rgba?\([^)]+\))\s+(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px(?:\s+(\d+(?:\.\d+)?)px)?/,
    );
    expect(offsetsMatch, `boxShadow didn't parse: ${shadow}`).toBeTruthy();
    if (offsetsMatch) {
      const [, _color, x, y, blur, spread] = offsetsMatch;
      expect(parseFloat(x)).toBe(0); // no horizontal offset
      expect(parseFloat(y)).toBeGreaterThan(0); // bottom shadow only
      expect(parseFloat(blur)).toBeLessThan(20); // narrow blur, not a halo
      // Spread is either absent or 0 — guards against a future
      // `--shadow-lg`-style 4-value rule slipping back in.
      if (spread !== undefined) {
        expect(parseFloat(spread)).toBe(0);
      }
    }
    expect(shadow.toLowerCase()).not.toContain('var(--shadow-lg');
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
      ['brand', 'Brand'],
    ];
    for (const [id, expectedTitle] of rails) {
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
      // R4: each panel exposes its title via the SecondaryPanel
      // header bar. Assert against the header title element so
      // brand-name strings (e.g. "Mock Brand") don't trip the match.
      const title = panel?.querySelector('[data-secondary-panel-title]');
      expect(title?.textContent ?? '', `title for ${id}`).toBe(expectedTitle);
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
// Step 6 — Cross-page consistency Sonner prompt.
// ────────────────────────────────────────────────────────────────────────

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
        color: slot as unknown as Layer['color' & keyof Layer] as never,
        transform: {
          x: 80,
          y: 80,
          width: 600,
          height: 80,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
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
      blank(
        '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-000000000a01',
      ),
      blank(
        '00000000-0000-0000-0000-0000000000a2',
        '00000000-0000-0000-0000-000000000a02',
      ),
      blank(
        '00000000-0000-0000-0000-0000000000a3',
        '00000000-0000-0000-0000-000000000a03',
      ),
    ],
    metadata: {},
  };
}

const PAGE_1 = '00000000-0000-0000-0000-0000000000a1';
const PAGE_2 = '00000000-0000-0000-0000-0000000000a2';
const PAGE_3 = '00000000-0000-0000-0000-0000000000a3';
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
 * Color chip. The intermediate "Bound to brand … Override with
 * literal color" dropdown was removed; clicking the chip now opens
 * the color-picker bar directly, and committing any hex (here via
 * the bar's hex input) overrides the slot binding to a literal — the
 * same code path the cross-page trigger hooks into.
 */
async function overrideSlotBoundColor(): Promise<void> {
  const chip = document.body.querySelector<HTMLElement>(
    '[data-floating-toolbar] [data-control="color"][data-slot-bound]',
  );
  if (!chip) throw new Error('No slot-bound color chip on the toolbar');
  fireEvent.click(chip);

  // Wait for the picker bar to mount.
  let bar: HTMLElement | null = null;
  for (let i = 0; i < 60; i++) {
    bar = document.body.querySelector<HTMLElement>('[data-color-picker-bar]');
    if (bar) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  if (!bar) throw new Error('Color picker bar never appeared');

  // Commit a literal hex via the bar's input.
  const hex = bar.querySelector<HTMLInputElement>('[data-color-hex]');
  if (!hex) throw new Error('Hex input missing in picker bar');
  fireEvent.change(hex, { target: { value: 'ff8800' } });
}

describe('Step 6 — Cross-page consistency prompt (browser E2E)', () => {
  it('multi-page doc + brand-bound edit → toast appears, "All N pages" propagates', async () => {
    const { adapter } = await mountEditor(multiPagePresentation());
    adapter.setSelection([HEADLINE_1]);
    await new Promise((r) => setTimeout(r, 60));

    // The headline color is a SlotRef → ColorChip renders a slot-
    // bound dropdown whose menu has an "Override with literal color"
    // button. Clicking it fires the toolbar's update wrapper, which
    // is the same code path the cross-page trigger hooks into. The
    // override picks a deterministic placeholder hex from the
    // SlotRef; we capture the actual literal so the propagation
    // assertion matches whatever the toolbar produced.
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

    // Pages 2 + 3 reflect the new color (whatever literal the
    // override produced).
    await new Promise((r) => setTimeout(r, 60));
    const docNow = adapter.getDocument();
    expect(
      (
        docNow.pages[0].layers.find((l) => l.id === HEADLINE_1) as {
          color: unknown;
        }
      ).color,
    ).toBe(overrideValue);
    expect(
      (
        docNow.pages[1].layers.find((l) => l.id === HEADLINE_2) as {
          color: unknown;
        }
      ).color,
    ).toBe(overrideValue);
    expect(
      (
        docNow.pages[2].layers.find((l) => l.id === HEADLINE_3) as {
          color: unknown;
        }
      ).color,
    ).toBe(overrideValue);

    // First undo reverses propagation only — page 1 keeps the
    // user's color, pages 2 + 3 revert to the SlotRef.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    const afterUndo1 = adapter.getDocument();
    expect(
      (
        afterUndo1.pages[0].layers.find((l) => l.id === HEADLINE_1) as {
          color: unknown;
        }
      ).color,
    ).toBe(overrideValue);
    expect(
      typeof (
        afterUndo1.pages[1].layers.find((l) => l.id === HEADLINE_2) as {
          color: unknown;
        }
      ).color,
    ).toBe('object'); // SlotRef restored
    expect(
      typeof (
        afterUndo1.pages[2].layers.find((l) => l.id === HEADLINE_3) as {
          color: unknown;
        }
      ).color,
    ).toBe('object');

    // Second undo reverses the original edit on page 1.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(
      typeof (
        adapter.getDocument().pages[0].layers.find((l) => l.id === HEADLINE_1) as {
          color: unknown;
        }
      ).color,
    ).toBe('object');
  });

  it('"Just this layer" leaves pages 2 + 3 untouched', async () => {
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
    // Page 1 holds the literal override (the deterministic
    // placeholder hex from the SlotRef); pages 2+3 still hold the
    // SlotRef.
    expect(
      typeof (docNow.pages[0].layers.find((l) => l.id === HEADLINE_1) as { color: unknown })
        .color,
    ).toBe('string');
    expect(
      typeof (docNow.pages[1].layers.find((l) => l.id === HEADLINE_2) as { color: unknown })
        .color,
    ).toBe('object');
    expect(
      typeof (docNow.pages[2].layers.find((l) => l.id === HEADLINE_3) as { color: unknown })
        .color,
    ).toBe('object');
  });

  it('single-page doc does NOT trigger the prompt for the same edit', async () => {
    // SOCIAL_FIXTURE has pageModel: 'single' → no other pages,
    // even if the headline color is a SlotRef.
    const { adapter } = await mountEditor();
    adapter.setSelection([SOCIAL_FIXTURE.pages[0].layers[0].id]);
    await new Promise((r) => setTimeout(r, 60));
    await overrideSlotBoundColor();

    // Wait the same window we'd wait for a toast — assert it never
    // shows up.
    await new Promise((r) => setTimeout(r, 200));
    expect(document.body.querySelector('[data-cross-page-toast]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────
// Step 7 — Smart duplicate submenu in the PageNavigator's right-click
// context menu.
// ────────────────────────────────────────────────────────────────────────

/**
 * Open the per-page right-click menu's "Page options" trigger — the
 * tiny chevron that appears on hover. Returns the page-options
 * trigger element (which when clicked opens the menu).
 */
async function openPageMenu(pageIndex: number): Promise<void> {
  const triggers = document.body.querySelectorAll<HTMLButtonElement>(
    '[data-page-navigator] [aria-label="Page options"]',
  );
  const trigger = triggers[pageIndex];
  if (!trigger) throw new Error(`No page-options trigger at index ${pageIndex}`);
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  // Wait for the Duplicate sub-trigger to land in the portal.
  for (let i = 0; i < 60; i++) {
    if (
      document.body.querySelector('[data-page-action="duplicate"]') !== null
    ) {
      return;
    }
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

describe('Step 7 — Smart duplicate submenu (browser E2E)', () => {
  it('right-clicking a page reveals the submenu with three duplicate options', async () => {
    await mountEditor(multiPagePresentation());
    const submenu = await openDuplicateSubmenu(0);
    expect(submenu.querySelector('[data-duplicate-mode="as-is"]')).toBeTruthy();
    expect(submenu.querySelector('[data-duplicate-mode="as-variant"]')).toBeTruthy();
    expect(submenu.querySelector('[data-duplicate-mode="empty"]')).toBeTruthy();
  });

  it('"As-is" produces a clone inserted directly after the source', async () => {
    const { adapter } = await mountEditor(multiPagePresentation());
    const beforeIds = adapter.getDocument().pages.map((p) => p.id);
    const submenu = await openDuplicateSubmenu(0);
    fireEvent.click(
      submenu.querySelector<HTMLElement>('[data-duplicate-mode="as-is"]')!,
    );
    await new Promise((r) => setTimeout(r, 60));

    const afterIds = adapter.getDocument().pages.map((p) => p.id);
    expect(afterIds).toHaveLength(beforeIds.length + 1);
    // New page is at index 1 (after page 0).
    expect(afterIds[0]).toBe(beforeIds[0]);
    expect(afterIds[1]).not.toBe(beforeIds[1]);
    expect(afterIds[2]).toBe(beforeIds[1]);
    // Cmd+Z undoes the duplicate.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().pages.map((p) => p.id)).toEqual(beforeIds);
  });

  it('"As variant" preserves text styling but clears text content', async () => {
    const { adapter } = await mountEditor(multiPagePresentation());
    const sourcePage = adapter.getDocument().pages[0];
    const sourceText = sourcePage.layers[0] as { fontFamily: unknown; fontSize: number };
    const submenu = await openDuplicateSubmenu(0);
    fireEvent.click(
      submenu.querySelector<HTMLElement>(
        '[data-duplicate-mode="as-variant"]',
      )!,
    );
    await new Promise((r) => setTimeout(r, 60));

    const variantPage = adapter.getDocument().pages[1];
    expect(variantPage.id).not.toBe(sourcePage.id);
    expect(variantPage.layers).toHaveLength(1);
    const variantText = variantPage.layers[0] as {
      kind: string;
      text: string;
      fontFamily: unknown;
      fontSize: number;
    };
    expect(variantText.kind).toBe('text');
    expect(variantText.text).toBe('');
    // Styling matches source.
    expect(variantText.fontFamily).toEqual(sourceText.fontFamily);
    expect(variantText.fontSize).toBe(sourceText.fontSize);
    // Cmd+Z removes the variant page.
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().pages).toHaveLength(3);
  });

  it('"Empty" produces a layerless page with the same dimensions', async () => {
    const { adapter } = await mountEditor(multiPagePresentation());
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
    adapter.undo();
    await new Promise((r) => setTimeout(r, 30));
    expect(adapter.getDocument().pages).toHaveLength(3);
  });
});
