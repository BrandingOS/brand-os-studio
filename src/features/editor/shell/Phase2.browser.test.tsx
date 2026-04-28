// Phase 2 — multi-page, master pages, content-type configs.
//
// Browser E2E coverage. Real DOM, real canvas, real Fabric.js.
// Each test corresponds 1:1 to one of the four manual checklist
// items the master prompt mandates for Phase 2:
//
//   • switch content type → navigator appears/disappears correctly
//   • add/reorder pages
//   • edit master → all pages using it reflect the change
//   • switch active page → canvas updates

import { afterEach, describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Editor } from './Editor';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Page } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import { BrandOSDocumentSchema } from '@/features/editor/schema';

const SOCIAL_FIXTURE: BrandOSDocument = BrandOSDocumentSchema.parse(socialPostFixture);

afterEach(() => cleanup());

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

/** A presentation-style fixture: multi-page, no master. */
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

interface MountResult {
  adapter: EditorAdapter;
  container: HTMLElement;
}

async function mountWith(doc: BrandOSDocument): Promise<MountResult> {
  let resolveAdapter!: (a: EditorAdapter) => void;
  const adapterPromise = new Promise<EditorAdapter>((r) => {
    resolveAdapter = r;
  });

  const { container } = render(
    <MemoryRouter>
      <Editor
        initialDocument={doc}
        save={async () => {}}
        onAdapterReady={(a) => resolveAdapter(a)}
      />
    </MemoryRouter>,
  );

  const adapter = await adapterPromise;
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 60));
  return { adapter, container };
}

// ────────────────────────────────────────────────────────────────────────
// Test 1 — Content type drives navigator visibility.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 2 — content-type config drives panel visibility', () => {
  it('social-post (single-page) does NOT render the page navigator', async () => {
    const { container } = await mountWith(SOCIAL_FIXTURE);
    const nav = container.querySelector('[aria-label="Page navigator"]');
    expect(nav).toBeNull();
  });

  it('presentation (multi-page) DOES render the page navigator', async () => {
    const { container } = await mountWith(presentationFixture());
    const nav = container.querySelector('[aria-label="Page navigator"]');
    expect(nav).not.toBeNull();
    // Two pages → two cells with the page names.
    const text = nav!.textContent ?? '';
    expect(text).toContain('Slide 1');
    expect(text).toContain('Slide 2');
  });

  it('PageNavigator collapsed strip shows chevron + rotated label, click expands (Round 3 fix 3)', async () => {
    const { adapter, container } = await mountWith(presentationFixture());
    // Collapse the navigator. The page-nav slot is anchored in
    // Editor.tsx; toggling navigatorOpen swaps the open panel for
    // the collapsed strip.
    const collapseBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => (b.getAttribute('aria-label') ?? '') === 'Collapse pages');
    expect(collapseBtn, 'no Collapse pages button').toBeTruthy();
    collapseBtn!.click();
    await new Promise((r) => setTimeout(r, 30));

    // Open navigator should be gone, collapsed strip in its place.
    expect(
      container.querySelector('[aria-label="Page navigator"]'),
      'open navigator still mounted after collapse',
    ).toBeNull();
    const strip = container.querySelector<HTMLElement>(
      '[data-page-navigator-collapsed]',
    );
    expect(strip, 'collapsed strip not rendered').toBeTruthy();

    // Strip carries the rotated label with the page count.
    const label = container.querySelector(
      '[data-page-navigator-collapsed-label]',
    );
    expect(label?.textContent ?? '').toMatch(/Pages\s*·\s*\d+/);

    // Click anywhere on the strip → expands back to the full nav.
    strip!.click();
    await new Promise((r) => setTimeout(r, 30));
    expect(
      container.querySelector('[aria-label="Page navigator"]'),
    ).not.toBeNull();
    // Sanity: the underlying adapter document is unchanged.
    expect(adapter.getDocument().pages.length).toBeGreaterThan(0);
  });

  it('page thumbnails use CSS aspect-ratio matching the page dimensions (Round 2 fix 7)', async () => {
    const { container } = await mountWith(presentationFixture());
    // The fixture pages are 1920×1080 — thumbnails should declare
    // the same aspect ratio inline so the visual reads as wide,
    // not square.
    const thumbs = container.querySelectorAll<HTMLElement>('[data-page-thumb]');
    expect(thumbs.length).toBeGreaterThan(0);
    for (const thumb of thumbs) {
      // Round 2 reverses the previous square thumbnail decision.
      expect(thumb.style.aspectRatio).toMatch(/\d+\s*\/\s*\d+/);
      // Spec: cap max width at ~120px so wide thumbs don't push
      // the navigator off the screen.
      expect(thumb.style.maxWidth).toBe('120px');
    }
    // For the 1920×1080 fixture pages, the aspect-ratio reads "wide"
    // (numerator > denominator).
    const sample = thumbs[0];
    const [w, h] = (sample.style.aspectRatio || '0 / 0')
      .split('/')
      .map((s) => parseFloat(s.trim()));
    expect(w).toBeGreaterThan(h);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 2 — Add and reorder pages.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 2 — add and reorder pages via the navigator', () => {
  it('clicking "+ Add page" appends a third page and the navigator updates', async () => {
    const { adapter, container } = await mountWith(presentationFixture());
    expect(adapter.getDocument().pages).toHaveLength(2);

    // Find the "Add page" button by its visible text.
    const addBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').trim().toLowerCase().includes('add page'),
    );
    expect(addBtn, 'No Add page button found').toBeTruthy();
    addBtn!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(adapter.getDocument().pages).toHaveLength(3);
    const nav = container.querySelector('[aria-label="Page navigator"]')!;
    expect(nav.textContent).toContain('Slide 3');
  });

  it('reorderPage moves a page to a new index and navigator order updates', async () => {
    const { adapter, container } = await mountWith(presentationFixture());
    const [p1, p2] = adapter.getDocument().pages;
    adapter.reorderPage(p1.id, 1); // move first page to last
    await new Promise((r) => setTimeout(r, 30));
    const navItems = Array.from(
      container.querySelectorAll('[aria-label="Page navigator"] li'),
    );
    // First item now corresponds to page 2.
    const firstItemText = navItems[0]?.textContent ?? '';
    expect(firstItemText).toContain(p2.name);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 3 — Edit master → all pages using it reflect the change.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 2 — master page edits propagate', () => {
  it('editing a master propagates to every page that references it', async () => {
    const { adapter } = await mountWith(presentationFixture());

    // Add a master and apply to both pages.
    const master: Page = {
      id: crypto.randomUUID(),
      name: 'Default master',
      width: 1920,
      height: 1080,
      background: '#ffffff',
      masterPageId: null,
      layers: [
        {
          id: crypto.randomUUID(),
          kind: 'shape',
          name: 'master-bar',
          transform: { x: 0, y: 1000, width: 1920, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1,
          visible: true,
          locked: false,
          brandLocked: false,
          shape: 'rectangle',
          fill: '#ff0000',
          stroke: null,
          strokeWidth: 0,
          cornerRadius: 0,
        },
      ],
    };
    adapter.addMasterPage(master);
    const [p1, p2] = adapter.getDocument().pages;
    adapter.applyMasterToPage(p1.id, master.id);
    adapter.applyMasterToPage(p2.id, master.id);
    await new Promise((r) => setTimeout(r, 80));

    // Edit the master in master-edit mode.
    adapter.enterMasterMode(master.id);
    await new Promise((r) => setTimeout(r, 50));
    adapter.updateLayer(master.id, master.layers[0].id, { fill: '#00ff00' });
    adapter.exitMasterMode();
    await new Promise((r) => setTimeout(r, 80));

    // Switch to page 1 — the master overlay's bar should show #00ff00.
    adapter.setActivePage(p1.id);
    await new Promise((r) => setTimeout(r, 80));
    let canvasObjs = (adapter as unknown as {
      canvas: { getObjects(): Array<{ width?: number; height?: number; fill?: unknown }> };
    }).canvas.getObjects();
    let bar = canvasObjs.find((o) => o.width === 1920 && o.height === 80);
    expect(bar, 'master-bar not on canvas for page 1').toBeDefined();
    expect(bar!.fill).toBe('#00ff00');

    // And on page 2.
    adapter.setActivePage(p2.id);
    await new Promise((r) => setTimeout(r, 80));
    canvasObjs = (adapter as unknown as {
      canvas: { getObjects(): Array<{ width?: number; height?: number; fill?: unknown }> };
    }).canvas.getObjects();
    bar = canvasObjs.find((o) => o.width === 1920 && o.height === 80);
    expect(bar, 'master-bar not on canvas for page 2').toBeDefined();
    expect(bar!.fill).toBe('#00ff00');
  });
});

// ────────────────────────────────────────────────────────────────────────
// Test 4 — Click a navigator cell → active page switches AND canvas updates.
// ────────────────────────────────────────────────────────────────────────
describe('Phase 2 — switching active page updates the canvas', () => {
  it('clicking a navigator cell switches active page and the canvas dimensions match the new page', async () => {
    const { adapter, container } = await mountWith(presentationFixture());

    // Resize page 2 to make the dimension switch observable.
    const [, p2] = adapter.getDocument().pages;
    adapter.updatePageDimensions(p2.id, 800, 600);
    await new Promise((r) => setTimeout(r, 30));

    // Find page 2's navigator cell. Step 5a's EditorPageNavigator
    // renders each page as a <button> inside an <li>; click the button.
    const navItems = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Page navigator"] li > button',
      ),
    );
    expect(navItems.length).toBe(2);
    navItems[1].click();
    await new Promise((r) => setTimeout(r, 80));

    expect(adapter.getActivePageId()).toBe(p2.id);
    const canvas = (adapter as unknown as {
      canvas: { getWidth(): number; getHeight(): number };
    }).canvas;
    expect(canvas.getWidth()).toBe(800);
    expect(canvas.getHeight()).toBe(600);
  });
});
