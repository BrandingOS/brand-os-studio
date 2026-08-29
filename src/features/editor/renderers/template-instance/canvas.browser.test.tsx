/**
 * `TemplateInstanceCanvas` — the artifact IS the editing surface, in a
 * real browser.
 *
 * These assertions moved here from Brand Kit's
 * `src/features/brand-kit/__tests__/quickEdit.browser.test.tsx` (Task 12):
 * that modal now only PREVIEWS a master template — with no `BindProvider`
 * above it, every `<Bind>` renders inert — so the artifact-is-editable
 * claims belong to the one place they're still true: Design's canvas.
 *
 * Hovering a bound region is real (`.bk-bind[data-bind-editable]:hover`
 * in `content.css`), but `:hover` is browser-internal pointer state that
 * a dispatched `mouseenter`/`mouseover` event does not set — confirmed
 * empirically against this same Playwright/Chromium project, so a test
 * that fires a synthetic hover and reads `getComputedStyle` would pass
 * or fail independent of the real behaviour. What IS asserted here is
 * the thing that CSS rule keys off: `data-bind-editable` is present on
 * every bound region this canvas renders (`mounts an editable region`),
 * and absent on the same artifact when Brand Kit previews it
 * (`quickEdit.browser.test.tsx`, "marks no region as editable").
 */
import { describe, it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceCanvas } from './TemplateInstanceCanvas';
import { defaultContentFor, setAtPath } from '@/features/brandkit/content';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

function doc(templateId = 'invoices-ext-3'): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '22222222-2222-4222-8222-222222222222',
    contentType: 'invoice',
    brandId: 'skam',
    masterPages: [],
    pages: [{
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Page 1', width: 1240, height: 1754,
      background: '#ffffff', masterPageId: null, layers: [],
    }],
    metadata: {},
    body: {
      kind: 'template-instance',
      templateId,
      content: defaultContentFor('invoice', { name: 'SKAM' }),
      design: {},
    },
  } as BrandOSDocument;
}

function brand(): Brand {
  return {
    id: 'brand-skam',
    slug: 'skam',
    name: 'SKAM',
    primaryColor: '#dc2626',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** The artifact's bound region for a content path. */
function region(path: string): HTMLElement {
  const el = document.querySelector(`.ti-canvas [data-bind="${path}"]`) as HTMLElement | null;
  if (!el) throw new Error(`no bound region for ${path}`);
  return el;
}

/** Type into a bound region the way a caret does, then leave it. */
function editRegion(path: string, text: string) {
  const el = region(path);
  fireEvent.click(el);
  el.textContent = text;
  fireEvent.blur(el);
}

async function mountCanvas(templateId = 'invoices-ext-3') {
  const adapter = new TemplateInstanceAdapter();
  await adapter.loadDocument(doc(templateId));
  adapter.setBrand(brand());
  render(<TemplateInstanceCanvas adapter={adapter} initialDocument={doc(templateId)} />);
  return adapter;
}

/** Same as `mountCanvas`, but also hands back `rerender` — for tests that
 *  need to simulate a parent re-render handing this component a fresh
 *  `initialDocument` prop object. */
async function mountCanvasRerenderable(templateId = 'invoices-ext-3') {
  const adapter = new TemplateInstanceAdapter();
  await adapter.loadDocument(doc(templateId));
  adapter.setBrand(brand());
  const { rerender } = render(
    <TemplateInstanceCanvas adapter={adapter} initialDocument={doc(templateId)} />,
  );
  return {
    adapter,
    /** Rerenders with a STRUCTURALLY EQUAL but referentially NEW
     *  `initialDocument` — the shape a parent re-rendering for an
     *  unrelated reason produces. */
    rerenderWithFreshDocument: () =>
      rerender(
        <TemplateInstanceCanvas adapter={adapter} initialDocument={doc(templateId)} />,
      ),
  };
}

function invoiceContent(adapter: TemplateInstanceAdapter) {
  const body = adapter.getBody();
  if (body?.kind !== 'template-instance' || body.content.kind !== 'invoice') {
    throw new Error('narrowing failed');
  }
  return body.content;
}

describe('the artifact is the editing surface', () => {
  it('exposes the invoice content as regions on the artifact itself', async () => {
    await mountCanvas();
    for (const path of ['clientName', 'issuerName', 'number', 'lineItems.0.label']) {
      expect(region(path)).toBeTruthy();
    }
  });

  it('mounts every bound region as editable — the hook the hover/cursor affordances key off', async () => {
    await mountCanvas();
    expect(region('clientName').hasAttribute('data-bind-editable')).toBe(true);
  });

  it('places a caret on click', async () => {
    await mountCanvas();
    const el = region('clientName');
    fireEvent.click(el);
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    expect(el.hasAttribute('data-bind-editing')).toBe(true);
  });

  it('selects the clicked region', async () => {
    const adapter = await mountCanvas();
    fireEvent.click(region('lineItems.1.label'));
    expect(region('lineItems.1.label').hasAttribute('data-bind-selected')).toBe(true);
    expect(adapter.getSelectedPath()).toBe('lineItems.1.label');
  });

  it('clears the selection when the artifact background is clicked', async () => {
    await mountCanvas();
    fireEvent.click(region('clientName'));
    expect(region('clientName').hasAttribute('data-bind-selected')).toBe(true);

    fireEvent.click(document.querySelector('.ti-canvas') as HTMLElement);
    expect(region('clientName').hasAttribute('data-bind-selected')).toBe(false);
  });

  it('edits content by clicking the artifact, and the renderer repaints from state', async () => {
    await mountCanvas();
    expect(region('clientName').textContent).toBe('Acme Co.');

    editRegion('clientName', 'Globex Corporation');

    expect(region('clientName').textContent).toBe('Globex Corporation');
  });

  it('commits through the adapter — the only way an artifact edit reaches data', async () => {
    const adapter = await mountCanvas();
    editRegion('clientName', 'Globex Corporation');
    expect(invoiceContent(adapter).clientName).toBe('Globex Corporation');
  });

  it('coerces text typed onto the artifact into the type the field already holds', async () => {
    // invoices-ext-1 is the design that prints a Qty column on the artifact.
    const adapter = await mountCanvas('invoices-ext-1');
    editRegion('lineItems.0.qty', '4');
    const content = invoiceContent(adapter);
    expect(content.lineItems[0].qty).toBe(4);
    expect(typeof content.lineItems[0].qty).toBe('number');
  });

  it('reverts on Escape rather than committing a half-typed value', async () => {
    const adapter = await mountCanvas();
    const el = region('clientName');
    fireEvent.click(el);
    el.textContent = 'Half-typed';
    fireEvent.keyDown(el, { key: 'Escape' });

    expect(region('clientName').textContent).toBe('Acme Co.');
    expect(invoiceContent(adapter).clientName).toBe('Acme Co.');
  });

  it('records one undo-able change per commit, not per keystroke', async () => {
    const adapter = await mountCanvas();
    editRegion('clientName', 'Globex Corporation');
    expect(adapter.canUndo()).toBe(true);
    act(() => adapter.undo());
    expect(invoiceContent(adapter).clientName).toBe('Acme Co.');
  });

  it('survives a re-render that hands it an equal-but-new initialDocument object', async () => {
    // The exact dependency-array shape CLAUDE.md records as having bitten
    // this codebase before: a seeding effect keyed on an object identity
    // that a parent can hand it fresh on every render for reasons that
    // have nothing to do with the document (a toolbar click, a sibling
    // state change) — re-running the seed and discarding whatever the
    // user had just typed. `BrandKitCardEditor` guards this with
    // `loadedCardRef`; `TemplateInstanceCanvas` guards it the same way
    // with `loadedDocIdRef`, keyed on the document's own id rather than
    // the prop object's identity.
    const { adapter, rerenderWithFreshDocument } = await mountCanvasRerenderable();
    editRegion('clientName', 'Globex Corporation');
    expect(region('clientName').textContent).toBe('Globex Corporation');

    rerenderWithFreshDocument();

    expect(region('clientName').textContent).toBe('Globex Corporation');
    expect(invoiceContent(adapter).clientName).toBe('Globex Corporation');
    // The reload guard didn't just leave the DOM alone — it never called
    // loadDocument again, so undo history from before the rerender is
    // still there too.
    expect(adapter.canUndo()).toBe(true);
  });
});

describe('long values do not collide', () => {
  it('constrains a value far longer than the literal the design was drawn around', async () => {
    await mountCanvas();
    editRegion('clientName', 'A Very Long Client Name That Would Once Have Overlapped');

    const el = region('clientName');
    expect(el.className).toContain('bk-bind--clamp');
    expect(getComputedStyle(el).overflow).toBe('hidden');
    expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(
      (el.parentElement as HTMLElement).getBoundingClientRect().width + 1,
    );
  });
});

describe('the letterhead body', () => {
  it('keeps the blank letterhead until there is something to say', async () => {
    const adapter = new TemplateInstanceAdapter();
    const letterDoc: BrandOSDocument = {
      ...doc(),
      contentType: 'letter',
      body: {
        kind: 'template-instance',
        templateId: 'letterhead-ext-6',
        content: defaultContentFor('letter', { name: 'SKAM' }),
        design: {},
      },
    };
    await adapter.loadDocument(letterDoc);
    adapter.setBrand(brand());
    render(<TemplateInstanceCanvas adapter={adapter} initialDocument={letterDoc} />);
    expect(document.querySelector('.ti-canvas [data-bind="body"]')).toBeNull();

    act(() => {
      const current = adapter.getBody();
      if (current?.kind !== 'template-instance') throw new Error('narrowing failed');
      adapter.updateBody(
        { ...current, content: setAtPath(current.content, 'body', 'Dear team,') },
        'Edit body',
      );
    });

    expect(region('body').textContent).toBe('Dear team,');
  });
});

/**
 * The frame IS the page, so the artwork has to fill it.
 *
 * `aspectForType('invoices')` answers 1.6 — its `default` — while the
 * invoice content type declares 1080×1920. Taking the tile's answer
 * inside a frame sized by the page's left the artwork in a band across a
 * third of the document, and `instance.snapshot` rasterises the whole
 * `.ti-canvas`, so every export inherited the letterbox.
 */
describe('the artwork fills its page', () => {
  it('sizes the stage from the document, not from the Brand Kit tile', async () => {
    await mountCanvas();
    const frame = document.querySelector('.ti-canvas') as HTMLElement;
    const host = frame.querySelector('.bk-preview-host') as HTMLElement;
    expect(host).not.toBeNull();
    const frameBox = frame.getBoundingClientRect();
    const hostBox = host.getBoundingClientRect();
    expect(frameBox.height).toBeGreaterThan(0);
    // Was ~0.35 of the frame at the tile's 1.6 ratio.
    expect(hostBox.height / frameBox.height).toBeGreaterThan(0.98);
    expect(hostBox.width / frameBox.width).toBeGreaterThan(0.98);
  });
});
