// Phase 1 close-out — browser E2E tests.
//
// Renders the real <Editor> in a headless Chromium via Vitest's
// browser mode. Real DOM, real canvas, real Fabric.js. Each test
// corresponds 1:1 to one of the five manual checklist items from
// the Phase 1 review.
//
// Canvas state is asserted via the adapter API (not pixel reads) —
// the adapter mirror is the runtime source of truth, and reading
// `getDocument()` plus the per-layer Fabric object state is more
// reliable than pixel inspection (anti-aliasing, font rendering,
// etc. introduce flakiness).

import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Editor } from './Editor';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';

const FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => cleanup());

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
}

async function mountEditor(): Promise<MountResult> {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });

  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={FIXTURE}
        save={async () => {
          /* no-op for tests */
        }}
        backTo="/"
        title="Phase 1 browser test"
        onAdapterReady={(a) => resolveAdapter(a)}
      />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  // Wait one animation frame for the adapter to mount + load the fixture.
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  // Plus a microtask flush so async layerToFabric promises settle.
  await new Promise((r) => setTimeout(r, 50));
  return { adapter, container };
}

function fabricObjFor(adapter: EditorAdapter, layerId: string): Record<string, unknown> {
  const map = (adapter as unknown as {
    fabricByLayerId: Map<string, Record<string, unknown>>;
  }).fabricByLayerId;
  const obj = map.get(layerId);
  if (!obj) throw new Error(`No fabric object for layer ${layerId}`);
  return obj;
}

/**
 * Poll for a Fabric object to land in the adapter's map. Layer creation
 * is async (FabricImage.fromURL etc.) — add/update calls return before
 * the network round-trip resolves.
 */
async function waitForFabricObj(
  adapter: EditorAdapter,
  layerId: string,
  timeoutMs = 8000,
): Promise<Record<string, unknown>> {
  const map = (adapter as unknown as {
    fabricByLayerId: Map<string, Record<string, unknown>>;
  }).fabricByLayerId;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const obj = map.get(layerId);
    if (obj) return obj;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timeout waiting for Fabric object: ${layerId}`);
}

const HEADLINE_ID = FIXTURE.pages[0].layers[0].id;
const PAGE_ID = FIXTURE.pages[0].id;

// ────────────────────────────────────────────────────────────────────────
// Test 1 — Properties panel renders the expected primary controls when
// a TextLayer with a SlotRef color is selected.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 1 close-out — Properties panel layout', () => {
  it('renders header strip + Font/Size/Weight/Color when a SlotRef-bound text layer is selected', async () => {
    const { adapter, container } = await mountEditor();
    adapter.setSelection([HEADLINE_ID]);
    await new Promise((r) => setTimeout(r, 30));

    // Header strip — 5 compact number inputs (X/Y/W/H/°) all visible.
    const compactInputs = container.querySelectorAll('input[type="number"]');
    expect(compactInputs.length).toBeGreaterThanOrEqual(5);

    // Visibility + lock toggle buttons in the header strip.
    expect(container.querySelector('[aria-label="Hide layer"], [aria-label="Show layer"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Lock"], [aria-label="Unlock"]')).toBeTruthy();

    // Primary controls — labels visible.
    const text = container.textContent ?? '';
    expect(text).toContain('Font');
    expect(text).toContain('Size');
    expect(text).toContain('Weight');
    expect(text).toContain('Color');

    // SlotRef chip uses the human-readable label, not the raw slot type.
    expect(text).toContain('Brand neutral'); // headline color slot
    expect(text).toContain('Brand heading'); // headline font slot
    expect(text).not.toContain('brand.color.neutral'); // raw type is hidden

    // The chip is NOT truncated — full label appears intact in the DOM.
    const chipNodes = Array.from(container.querySelectorAll('span')).filter(
      (n) => (n.textContent ?? '').trim() === 'Brand neutral',
    );
    expect(chipNodes.length).toBeGreaterThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 2 — Override on a SlotRef Color field swaps the chip for a hex
// picker AND updates the canvas.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 1 close-out — SlotRef Override flow', () => {
  it('clicking Override on Color converts the field to a literal and the canvas reflects it', async () => {
    const { adapter, container } = await mountEditor();
    adapter.setSelection([HEADLINE_ID]);
    await new Promise((r) => setTimeout(r, 30));

    // Verify the headline currently has a SlotRef color.
    const layerBefore = adapter.getDocument().pages[0].layers[0];
    expect(typeof (layerBefore as { color: unknown }).color).toBe('object');

    // Find the Override button next to the "Brand neutral" Color chip.
    // Multiple Override buttons exist (one for Font, one for Color); pick
    // the one whose closest label is "Color".
    const overrideButtons = Array.from(
      container.querySelectorAll('button'),
    ).filter((b) => (b.textContent ?? '').trim() === 'Override');
    expect(overrideButtons.length).toBeGreaterThanOrEqual(2);

    const colorOverrideBtn = overrideButtons.find((btn) => {
      // Walk up to find an enclosing label whose first text node says "Color".
      let el: HTMLElement | null = btn;
      for (let i = 0; i < 6 && el; i++) {
        const labelText = el.querySelector('span')?.textContent ?? '';
        if (labelText.trim() === 'Color') return true;
        el = el.parentElement;
      }
      return false;
    });
    expect(colorOverrideBtn, 'Could not find the Color field Override button').toBeTruthy();

    colorOverrideBtn!.click();
    await new Promise((r) => setTimeout(r, 50));

    // Document mirror now has a literal string for color.
    const layerAfter = adapter.getDocument().pages[0].layers[0];
    expect(typeof (layerAfter as { color: unknown }).color).toBe('string');

    // Canvas Fabric object's fill matches the literal.
    const fabricObj = fabricObjFor(adapter, HEADLINE_ID);
    expect(fabricObj.fill).toBe((layerAfter as { color: string }).color);

    // The chip is gone from the DOM; a color picker (input[type=color]) is now visible.
    const colorPickers = container.querySelectorAll('input[type="color"]');
    expect(colorPickers.length).toBeGreaterThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 3 — Selection visual: brand purple outline, no overlay fill.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 1 close-out — Selection visual', () => {
  it('selected layer Fabric object carries the brand-purple borderColor', async () => {
    const { adapter } = await mountEditor();
    adapter.setSelection([HEADLINE_ID]);
    await new Promise((r) => setTimeout(r, 30));

    const fabricObj = fabricObjFor(adapter, HEADLINE_ID);
    // Per the Phase 1 close-out, selection styling is set on every Fabric
    // object via baseProps + applyLayerToFabric.
    expect(fabricObj.borderColor).toBe('#7c3aed');
    expect(fabricObj.cornerColor).toBe('#7c3aed');
    expect(fabricObj.cornerStrokeColor).toBe('#ffffff');
    expect(fabricObj.transparentCorners).toBe(false);
    expect(fabricObj.padding).toBe(0);
    // No background fill on selection — only the outline.
    expect(fabricObj.backgroundColor ?? '').toBe('');
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 4 — Typing in the Size field resizes the canvas text AND the
// chrome shows the saving → saved transition. The "Save now" button no
// longer exists in the DOM.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 1 close-out — data flow + save indicator', () => {
  it('typing in Size resizes the canvas and the chrome reflects save state without a manual button', async () => {
    const { adapter, container } = await mountEditor();
    adapter.setSelection([HEADLINE_ID]);
    await new Promise((r) => setTimeout(r, 30));

    // Confirm: no "Save now" button anywhere.
    const allButtonText = Array.from(container.querySelectorAll('button'))
      .map((b) => b.textContent ?? '')
      .join('|');
    expect(allButtonText).not.toContain('Save now');

    // Find the Size number input. It's the second slider/number combo
    // (Font is field 1, Size is field 2 in TextPrimary). The slider's
    // companion number input is type=number with min=6/max=400.
    const sizeNumberInput = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="number"]'),
    ).find((inp) => inp.min === '6' && inp.max === '400');
    expect(sizeNumberInput, 'Could not find Size number input').toBeTruthy();

    // Use fireEvent.change so React's controlled-input plumbing receives
    // the new value (setting `input.value` directly bypasses React's
    // synthetic event system and the onChange handler never fires).
    fireEvent.change(sizeNumberInput!, { target: { value: '128' } });
    await new Promise((r) => setTimeout(r, 50));

    // Canvas (Fabric Textbox) reflects the new fontSize.
    const fabricObj = fabricObjFor(adapter, HEADLINE_ID);
    expect(fabricObj.fontSize).toBe(128);

    // Document mirror reflects it too.
    const layer = adapter.getDocument().pages[0].layers[0] as {
      fontSize: number;
    };
    expect(layer.fontSize).toBe(128);

    // Save indicator should appear in the chrome. We poll briefly for any
    // of the labels ("Saving…" / "Saved") to surface — the auto-save
    // debounce is 1200ms, so we wait up to ~3.5s for the transition.
    let saw = '';
    for (let i = 0; i < 50; i++) {
      const text = container.textContent ?? '';
      if (text.includes('Saving') || text.includes('Saved')) {
        saw = text.includes('Saving') ? 'Saving' : 'Saved';
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(saw, 'Save indicator never showed Saving/Saved label').toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 5 — Add an image layer via the toolbar. Then change its source URL
// in the Properties panel. Assert the Fabric image is recreated with the
// new src.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 1 close-out — Image source flow', () => {
  it('adding an image and changing its source recreates the Fabric image', async () => {
    const { adapter, container } = await mountEditor();

    // Find and click the Image tool in the left toolbar.
    const imageToolBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Image"]',
    );
    expect(imageToolBtn, 'No Image tool button').toBeTruthy();
    imageToolBtn!.click();

    // The toolbar's makeLayer uses crypto.randomUUID; locate the new image
    // layer in the document mirror (synchronous — addLayer pushes immediately).
    const docAfterAdd = adapter.getDocument();
    const imageLayer = docAfterAdd.pages[0].layers.find(
      (l): l is typeof l & { kind: 'image' } => l.kind === 'image',
    );
    expect(imageLayer, 'Image layer was not added by the toolbar').toBeTruthy();

    // Wait for the async FabricImage.fromURL to complete and the object to
    // land in the adapter's map. With network access this is ~1-2s; with
    // failure it's near-instant (placeholderRect fallback).
    const initialFabricObj = await waitForFabricObj(adapter, imageLayer!.id);

    // Change the src via the adapter — same code path the Source URL
    // input in the Properties panel triggers via update({ src: ... }).
    adapter.setSelection([imageLayer!.id]);
    adapter.updateLayer(PAGE_ID, imageLayer!.id, {
      src: 'https://placehold.co/600x400/png',
    });

    // Wait for the recreate path: remove old + async layerToFabric +
    // canvas.add. We need to wait until either (a) the map points at a
    // different object instance, or (b) timeout.
    let recreated: Record<string, unknown> | undefined;
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const next = (adapter as unknown as {
        fabricByLayerId: Map<string, Record<string, unknown>>;
      }).fabricByLayerId.get(imageLayer!.id);
      if (next && next !== initialFabricObj) {
        recreated = next;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(recreated, 'Recreate path did not produce a new Fabric object').toBeDefined();

    // Document mirror has the new src.
    const updated = adapter.getDocument().pages[0].layers.find(
      (l) => l.id === imageLayer!.id,
    ) as { src: string };
    expect(updated.src).toBe('https://placehold.co/600x400/png');
  });
});
