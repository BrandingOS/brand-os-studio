// Unit tests for the Step 5a editor surfaces.
//
// These run in jsdom (no real canvas). They cover the pure UI
// behaviors of the new layout — App Rail entry switching, Insert
// panel layer factories, Brand panel section toggling, top bar mode
// change. Adapter calls go through a stub.
//
// Cross-component flow (rail → panel switch, layer select → floating
// toolbar) lives in `Editor.browser.test.tsx` because it depends on
// the adapter mounting against a real DOM canvas.

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditorAppRail, type RailItem } from './EditorAppRail';
import { EditorTopBar } from './EditorTopBar';
import { EditorFloatingToolbar } from './EditorFloatingToolbar';
import { InsertPanel } from './panels/InsertPanel';
import { BrandPanel } from './panels/BrandPanel';
import type { EditorAdapter, SelectionState } from '../../adapter/EditorAdapter';
import type { BrandOSDocument, Layer, Page, TextLayer } from '../../schema';
import type { Brand } from '@/shared/types/brand';

afterEach(() => cleanup());

// ─── Stub adapter (records calls; no real canvas) ──────────────────────

interface StubAdapter {
  added: Array<{ pageId: string; layer: Layer }>;
  resizes: Array<{ pageId: string; width: number; height: number }>;
  updates: Array<{ pageId: string; layerId: string; patch: Partial<Layer> }>;
}

function stubAdapter(): EditorAdapter & StubAdapter {
  const added: StubAdapter['added'] = [];
  const resizes: StubAdapter['resizes'] = [];
  const updates: StubAdapter['updates'] = [];
  const adapter = {
    added,
    resizes,
    updates,
    addLayer: (pageId: string, layer: Layer) => {
      added.push({ pageId, layer });
    },
    updatePageDimensions: (pageId: string, width: number, height: number) => {
      resizes.push({ pageId, width, height });
    },
    updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => {
      updates.push({ pageId, layerId, patch });
    },
    // Unused by these tests — typed as no-ops so TS is happy.
    mount: vi.fn(async () => undefined),
    unmount: vi.fn(),
    loadDocument: vi.fn(async () => undefined),
    replaceDocument: vi.fn(async () => undefined),
    getDocument: vi.fn(),
    setActivePage: vi.fn(),
    getActivePageId: vi.fn(() => ''),
    addPage: vi.fn(),
    removePage: vi.fn(),
    duplicatePage: vi.fn(() => ''),
    reorderPage: vi.fn(),
    addMasterPage: vi.fn(),
    removeMasterPage: vi.fn(),
    applyMasterToPage: vi.fn(),
    enterMasterMode: vi.fn(),
    exitMasterMode: vi.fn(),
    getEditingMasterId: vi.fn(() => null),
    removeLayer: vi.fn(),
    reorderLayer: vi.fn(),
    applyLayerPatchAcrossPages: vi.fn(),
    getSelection: vi.fn(
      (): SelectionState => ({ layerIds: [], pageId: '' }),
    ),
    setSelection: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    batch: vi.fn((_label: string, fn: () => void) => fn()),
    exportAs: vi.fn(),
    on: vi.fn(() => () => undefined),
  } as unknown as EditorAdapter & StubAdapter;
  return adapter;
}

// ─── Fixtures ─────────────────────────────────────────────────────────

function blankPage(): Page {
  return {
    id: 'page-1',
    name: 'Page 1',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers: [],
  };
}

function blankDoc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'doc-1',
    contentType: 'social-post',
    brandId: null,
    masterPages: [],
    pages: [blankPage()],
    metadata: {},
  };
}

function mockBrand(): Brand {
  return {
    id: 'brand-1',
    slug: 'mock',
    name: 'Mock Brand',
    primaryColor: '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: 'Friendly',
    audience: 'Designers',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── EditorAppRail ────────────────────────────────────────────────────

describe('EditorAppRail', () => {
  it('renders all 4 entries with labels inside the box', () => {
    const onChange = vi.fn();
    const { container } = render(
      <EditorAppRail active="generate" onChange={onChange} />,
    );
    const labels = ['Generate', 'Templates', 'Insert', 'Brand'];
    for (const label of labels) {
      const btn = container.querySelector(`button[data-rail-item="${label.toLowerCase()}"]`);
      expect(btn, `missing rail entry: ${label}`).toBeTruthy();
      expect(btn?.textContent).toContain(label);
    }
  });

  it('marks the active entry with aria-pressed', () => {
    const { container } = render(
      <EditorAppRail active="brand" onChange={vi.fn()} />,
    );
    const brandBtn = container.querySelector('button[data-rail-item="brand"]');
    expect(brandBtn?.getAttribute('aria-pressed')).toBe('true');
    const insertBtn = container.querySelector('button[data-rail-item="insert"]');
    expect(insertBtn?.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking each entry fires onChange with the right id', () => {
    const onChange = vi.fn();
    const { container } = render(
      <EditorAppRail active="generate" onChange={onChange} />,
    );
    const ids: RailItem[] = ['generate', 'templates', 'insert', 'brand'];
    for (const id of ids) {
      onChange.mockClear();
      const btn = container.querySelector<HTMLButtonElement>(
        `button[data-rail-item="${id}"]`,
      );
      btn!.click();
      expect(onChange).toHaveBeenCalledWith(id);
    }
  });
});

// ─── EditorTopBar ─────────────────────────────────────────────────────

describe('EditorTopBar', () => {
  function renderTopBar(overrides: Partial<Parameters<typeof EditorTopBar>[0]> = {}) {
    const onModeChange = vi.fn();
    const onToggleTheme = vi.fn();
    const utils = render(
      <MemoryRouter>
        <EditorTopBar
          mode="edit"
          onModeChange={onModeChange}
          saveState="idle"
          theme="light"
          onToggleTheme={onToggleTheme}
          {...overrides}
        />
      </MemoryRouter>,
    );
    return { ...utils, onModeChange, onToggleTheme };
  }

  it('renders the brand mark + name when brand is provided', () => {
    const { container } = renderTopBar({ brand: mockBrand() });
    const text = container.textContent ?? '';
    expect(text).toContain('Mock Brand');
    // Brand mark contains the first letter of the brand name.
    const mark = container.querySelector('.top-nav-brand-mark');
    expect(mark?.textContent).toBe('M');
  });

  it('renders all 3 mode tabs and only "Edit" is functional in 5a', () => {
    const { container, onModeChange } = renderTopBar();
    const tabs = container.querySelectorAll('.segmented-nav-item');
    expect(tabs).toHaveLength(3);

    // Click Preview — onModeChange should still fire (functional state
    // is governed by the parent; the tab is enabled but the parent
    // can ignore it). The 5a contract is just that the tab is present
    // and the click handler runs — Edit is the one with the active pill.
    (tabs[1] as HTMLButtonElement).click();
    expect(onModeChange).toHaveBeenCalledWith('preview');
  });

  it('marks the current mode with .is-active', () => {
    const { container } = renderTopBar({ mode: 'edit' });
    const editTab = Array.from(
      container.querySelectorAll('.segmented-nav-item'),
    ).find((el) => el.textContent === 'Edit');
    expect(editTab?.classList.contains('is-active')).toBe(true);
  });

  it('theme toggle calls onToggleTheme', () => {
    const { container, onToggleTheme } = renderTopBar();
    const toggle = container.querySelector<HTMLButtonElement>('.theme-toggle');
    toggle!.click();
    expect(onToggleTheme).toHaveBeenCalled();
  });
});

// ─── InsertPanel — functional layer factories ─────────────────────────

describe('InsertPanel', () => {
  it('renders the three categories with all entries', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <InsertPanel adapter={adapter} pageId="page-1" />,
    );
    const expectedIds = [
      'rectangle',
      'ellipse',
      'line',
      'heading',
      'body',
      'list',
      'image',
      'logo',
      'svg',
    ];
    for (const id of expectedIds) {
      const btn = container.querySelector(`button[data-insert-id="${id}"]`);
      expect(btn, `missing insert entry: ${id}`).toBeTruthy();
    }
  });

  it.each([
    ['rectangle', 'shape', 'rectangle'],
    ['ellipse', 'shape', 'ellipse'],
    ['line', 'shape', 'line'],
    ['heading', 'text', undefined],
    ['body', 'text', undefined],
    ['list', 'text', undefined],
    ['image', 'image', undefined],
    ['logo', 'logo', undefined],
    ['svg', 'svg', undefined],
  ])(
    'clicking "%s" calls adapter.addLayer with kind=%s',
    (insertId, expectedKind, expectedShape) => {
      const adapter = stubAdapter();
      const { container } = render(
        <InsertPanel adapter={adapter} pageId="page-1" />,
      );
      const btn = container.querySelector<HTMLButtonElement>(
        `button[data-insert-id="${insertId}"]`,
      );
      btn!.click();

      expect(adapter.added).toHaveLength(1);
      const { pageId, layer } = adapter.added[0];
      expect(pageId).toBe('page-1');
      expect(layer.kind).toBe(expectedKind);
      if (expectedShape) {
        expect((layer as { shape?: string }).shape).toBe(expectedShape);
      }
      // Every new layer carries the safe defaults — unlocked, visible,
      // not brand-locked, opacity 1.
      expect(layer.locked).toBe(false);
      expect(layer.visible).toBe(true);
      expect(layer.brandLocked).toBe(false);
      expect(layer.opacity).toBe(1);
    },
  );

  it('does nothing when pageId is empty (no active page)', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <InsertPanel adapter={adapter} pageId="" />,
    );
    const btn = container.querySelector<HTMLButtonElement>(
      'button[data-insert-id="rectangle"]',
    );
    btn!.click();
    expect(adapter.added).toHaveLength(0);
  });
});

// ─── BrandPanel — section toggling ────────────────────────────────────

describe('BrandPanel', () => {
  it('shows document section + brand identity sections, all open by default', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <BrandPanel
        adapter={adapter}
        doc={blankDoc()}
        activePageId="page-1"
        brand={mockBrand()}
      />,
    );
    const text = container.textContent ?? '';
    // Document section + 7 brand identity sections all present.
    expect(text).toContain('Document');
    expect(text).toContain('Logo');
    expect(text).toContain('Color');
    expect(text).toContain('Typography');
    expect(text).toContain('Iconography');
    expect(text).toContain('Photography');
    expect(text).toContain('Website');
    expect(text).toContain('About');
    // All headers report aria-expanded=true (open by default).
    const headers = container.querySelectorAll('button[aria-expanded]');
    expect(headers.length).toBeGreaterThanOrEqual(8);
    for (const h of headers) {
      expect(h.getAttribute('aria-expanded')).toBe('true');
    }
  });

  it('clicking a section header collapses it', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <BrandPanel
        adapter={adapter}
        doc={blankDoc()}
        activePageId="page-1"
        brand={mockBrand()}
      />,
    );
    // Find the Logo section header (the one whose visible text starts with "Logo").
    const logoHeader = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'),
    ).find((b) => (b.textContent ?? '').trim().startsWith('Logo'));
    expect(logoHeader, 'no Logo header found').toBeTruthy();
    expect(logoHeader!.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(logoHeader!);
    expect(logoHeader!.getAttribute('aria-expanded')).toBe('false');
  });

  it('document dimensions field calls adapter.updatePageDimensions', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <BrandPanel
        adapter={adapter}
        doc={blankDoc()}
        activePageId="page-1"
        brand={mockBrand()}
      />,
    );
    // The Document section is open by default — Width input is present.
    const widthInput = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="number"]'),
    ).find((el) => el.value === '1080');
    expect(widthInput, 'no width input found').toBeTruthy();
    fireEvent.change(widthInput!, { target: { value: '1200' } });
    expect(adapter.resizes).toEqual([
      { pageId: 'page-1', width: 1200, height: 1080 },
    ]);
  });

  it('shows a placeholder when no brand is attached', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <BrandPanel adapter={adapter} doc={blankDoc()} activePageId="page-1" />,
    );
    expect(container.textContent ?? '').toContain('No brand attached');
    // The Document section still renders (Document-level controls don't
    // depend on a brand).
    expect(container.textContent ?? '').toContain('Document');
  });
});

// ─── EditorFloatingToolbar — Brand-managed switch + locked controls ───

function makeTextLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: 'layer-text-1',
    kind: 'text',
    name: 'headline',
    text: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color: '#111111',
    transform: {
      x: 100,
      y: 200,
      width: 400,
      height: 60,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    ...overrides,
  } as TextLayer;
}

/**
 * Open the floating toolbar's More menu by firing pointer events on
 * the trigger (Radix listens to pointerdown, not click). Returns the
 * portal content node once it lands in document.body.
 */
async function openMoreMenu(): Promise<HTMLElement> {
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[data-control="more"]',
  );
  if (!trigger) throw new Error('No "more" trigger in DOM');
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  for (let i = 0; i < 80; i++) {
    const node = document.body.querySelector<HTMLElement>(
      'div[data-control="brand-managed"]',
    );
    if (node) {
      // Walk up to the portal-content root to return the menu container.
      let el: HTMLElement | null = node;
      while (el && el.parentElement && el.parentElement !== document.body) {
        el = el.parentElement;
      }
      return el ?? node;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('More menu never reached the open state');
}

describe('EditorFloatingToolbar — Brand-managed switch (Step 5c)', () => {
  it('renders the Brand-managed switch inside the More menu', async () => {
    const adapter = stubAdapter();
    render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer()}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    await openMoreMenu();
    const switchEl = document.body.querySelector(
      'button[data-control="brand-managed-switch"]',
    );
    expect(switchEl, 'no Brand-managed switch in More menu').toBeTruthy();
    expect(switchEl?.getAttribute('aria-checked')).toBe('false');
  });

  it('switch reflects layer.brandLocked === true', async () => {
    const adapter = stubAdapter();
    render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer({ brandLocked: true })}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    await openMoreMenu();
    const switchEl = document.body.querySelector(
      'button[data-control="brand-managed-switch"]',
    );
    expect(switchEl?.getAttribute('aria-checked')).toBe('true');
  });

  it('toggling the switch fires adapter.updateLayer with the flipped value', async () => {
    const adapter = stubAdapter();
    render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer({ brandLocked: false })}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    await openMoreMenu();
    const switchEl = document.body.querySelector<HTMLButtonElement>(
      'button[data-control="brand-managed-switch"]',
    );
    fireEvent.click(switchEl!);
    expect(adapter.updates).toHaveLength(1);
    expect(adapter.updates[0]).toEqual({
      pageId: 'page-1',
      layerId: 'layer-text-1',
      patch: { brandLocked: true },
    });
  });

  it('toggling on a locked layer fires updateLayer with brandLocked: false', async () => {
    const adapter = stubAdapter();
    render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer({ brandLocked: true })}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    await openMoreMenu();
    const switchEl = document.body.querySelector<HTMLButtonElement>(
      'button[data-control="brand-managed-switch"]',
    );
    fireEvent.click(switchEl!);
    expect(adapter.updates).toHaveLength(1);
    expect(adapter.updates[0].patch).toEqual({ brandLocked: false });
  });
});

describe('EditorFloatingToolbar — locked controls (Step 5c)', () => {
  it('brand-bound controls render WITHOUT a LockedGate when brandLocked is off', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer({
          brandLocked: false,
          color: { type: 'brand.color.primary' } as unknown as TextLayer['color'],
          fontFamily: { type: 'brand.font.heading' } as unknown as TextLayer['fontFamily'],
        })}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-locked-gate]')).toBeNull();
    // Inner controls are still in the DOM.
    expect(container.querySelector('button[data-control="font"]')).toBeTruthy();
  });

  it('brand-bound controls render INSIDE a LockedGate when brandLocked is on', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer({
          brandLocked: true,
          color: { type: 'brand.color.primary' } as unknown as TextLayer['color'],
          fontFamily: { type: 'brand.font.heading' } as unknown as TextLayer['fontFamily'],
        })}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    const gates = container.querySelectorAll('[data-locked-gate]');
    // One gate per brand-bound control — color + fontFamily for a
    // text layer with both as SlotRefs.
    expect(gates.length).toBe(2);
    // Inner control is still rendered inside the gate (so the
    // resolved value remains visible to the user).
    expect(container.querySelector('button[data-control="font"]')).toBeTruthy();
  });

  it('non-brand-bound controls (font size, opacity) stay outside the gate even when locked', () => {
    const adapter = stubAdapter();
    const { container } = render(
      <EditorFloatingToolbar
        adapter={adapter}
        pageId="page-1"
        layer={makeTextLayer({
          brandLocked: true,
          // Color is a SlotRef → gated.
          color: { type: 'brand.color.primary' } as unknown as TextLayer['color'],
          // fontFamily literal → NOT gated (not currently brand-bound).
          fontFamily: 'Inter',
        })}
        scope="page"
        onScopeChange={vi.fn()}
      />,
    );
    const gates = container.querySelectorAll('[data-locked-gate]');
    // Only color is gated; fontFamily literal is editable.
    expect(gates.length).toBe(1);
    // Font size input is plain — not wrapped in any gate.
    const sizeInput = container.querySelector(
      'input[type="number"][title="Font size"]',
    );
    expect(sizeInput).toBeTruthy();
    expect(sizeInput?.closest('[data-locked-gate]')).toBeNull();
  });
});
