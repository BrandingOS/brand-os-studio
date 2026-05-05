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

    // Scope toggle is hidden on single-page docs (commit 37044c4); the
    // multi-page branch is exercised in v2.test.tsx.
    expect(toolbar?.querySelector('button[data-scope-toggle]')).toBeNull();
  });

  it('mounts a Comments trigger when brand is supplied (Phase 7.1)', async () => {
    const { container } = await mountEditor();
    const trigger = container.querySelector('button[aria-label="Open comments"]');
    expect(trigger, 'Comments trigger should mount when brand is present').toBeTruthy();
    // Click opens the drawer.
    fireEvent.click(trigger!);
    // The drawer is portaled inside the same DOM tree (not a Radix
    // portal) so the heading shows up under the same container.
    await new Promise((r) => setTimeout(r, 30));
    expect(container.textContent ?? '').toContain('Comments');
    expect(container.textContent ?? '').toContain('No comments yet');
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

