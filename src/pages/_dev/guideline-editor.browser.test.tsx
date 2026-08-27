/**
 * Smoke tests for the Guideline Editor Lab (/_dev/guideline-editor).
 *
 * The lab exists so the guideline's editing components can be restyled from
 * one page; a lab that silently stops mounting defeats that. These pin that
 * the page renders one component per section, all live — the playground
 * selects/scales/edits, both toolbars sit inline, and every panel is open.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { page } from '@vitest/browser/context';
import { MemoryRouter } from 'react-router-dom';
import DevGuidelineEditorPage from './guideline-editor';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/_dev/guideline-editor']}>
      <DevGuidelineEditorPage />
    </MemoryRouter>,
  );
}

/**
 * A point ON the element's words. Selection is words-only — a box's empty
 * region does not select — so clicks must land on a rendered text line
 * (the box center can miss when text wraps into short lines).
 */
function wordPoint(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const r = range.getClientRects()[0] ?? el.getBoundingClientRect();
  return { clientX: r.left + Math.min(r.width / 2, 40), clientY: r.top + r.height / 2 };
}

beforeEach(async () => {
  cleanup();
  document.querySelectorAll('.scale-zone, .scale-zone-box').forEach((z) => z.remove());
  // The lab remembers the picked component per browser; the suite asserts
  // the All view, so always start from it.
  localStorage.removeItem('brandos:guideline-lab:view');
  // The lab is a desktop workbench (sidebar + content grid). Vitest's
  // 414px default squeezes the content column to nothing and every layout
  // assertion degenerates — widen first, like the builder suite does.
  await page.viewport(1440, 900);
});

afterEach(async () => {
  await page.viewport(414, 896);
});

describe('guideline editor lab', () => {
  it('mounts every section', () => {
    mount();
    expect(screen.getByText('Guideline system')).toBeTruthy();
    expect(screen.getByText(/Selection playground/)).toBeTruthy();
    expect(screen.getByText(/Canvas toolbar/)).toBeTruthy();
    expect(screen.getByText(/Floating toolbar — text/)).toBeTruthy();
    expect(screen.getByText(/Floating toolbar — image/)).toBeTruthy();
    expect(screen.getByText(/Rail — DsRail/)).toBeTruthy();
    expect(screen.getByText(/Panel — Content outline/)).toBeTruthy();
    expect(screen.getByText(/Panel — Page editor/)).toBeTruthy();
    expect(screen.getByText(/Panel — Brand/)).toBeTruthy();
    expect(screen.getByText(/Panel — Add page/)).toBeTruthy();
    expect(screen.getByText(/Insert bar/)).toBeTruthy();
    expect(screen.getByText(/Live stage/)).toBeTruthy();
  });

  it('the playground selects, scales and edits its text', async () => {
    mount();
    const heading = screen.getByText('Selected text element') as HTMLElement;

    // Click ON THE WORDS — selection is words-only now, and a click needs
    // real coordinates (fireEvent defaults to 0,0, which correctly misses).
    fireEvent.click(heading, wordPoint(heading));
    // Selection chrome is the .scale-zone-box overlay hugging the words —
    // the element itself carries no outline any more.
    await waitFor(() => {
      expect(document.querySelector('.scale-zone-box')).toBeTruthy();
    });

    // Six scale zones appear: 4 corners + 2 edge midpoints. Dragging a
    // corner outward grows the font.
    const zones = await waitFor(() => {
      const found = document.querySelectorAll<HTMLElement>('.scale-zone');
      expect(found.length).toBe(6);
      return found;
    });
    const before = parseFloat(getComputedStyle(heading).fontSize);
    fireEvent.mouseDown(zones[2], { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 160, clientY: 140 });
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(parseFloat(getComputedStyle(heading).fontSize)).toBeGreaterThan(before);
    });

    // Dragging the RIGHT edge zone sets the width (text wraps inside).
    // Zones re-place after each drag, so re-query; the edge zones are the
    // last two (order: nw, ne, se, sw, w, e).
    const zones2 = await waitFor(() => {
      const found = document.querySelectorAll<HTMLElement>('.scale-zone');
      expect(found.length).toBe(6);
      return found;
    });
    expect(zones2[5].dataset.zone).toBe('edge');
    // Drag INWARD (narrower): growing can be capped by maxWidth in the
    // tester's small viewport, shrinking always shows.
    const widthBefore = heading.offsetWidth;
    fireEvent.mouseDown(zones2[5], { clientX: 300, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 220, clientY: 100 });
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(heading.offsetWidth).toBeLessThan(widthBefore);
      expect(heading.style.width).toMatch(/px$/);
    });

    // The words-only rule itself: a click far outside the text lines
    // (top-left of the viewport) selects nothing. (Checked BEFORE editing —
    // while editing, clicks on the element are caret placement by design.)
    fireEvent.click(heading, { clientX: 0, clientY: 0 });
    await waitFor(() => {
      expect(document.querySelector('.scale-zone-box')).toBeNull();
    });

    // Re-select on the words, then double-click → inline text editing.
    fireEvent.click(heading, wordPoint(heading));
    fireEvent.doubleClick(heading, wordPoint(heading));
    await waitFor(() => {
      expect(heading.isContentEditable).toBe(true);
    });
  });

  it('the canvas toolbar opens flyouts on hover and previews leaves', async () => {
    mount();
    // The lab mounts the menu open: both section headers are in the panel.
    expect(screen.getByText('Insert widget')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Page library' })).toBeTruthy();

    // Hovering a family row opens its flyout (after the 90ms intent delay).
    fireEvent.mouseOver(screen.getByRole('menuitem', { name: 'Text' }));
    const display = await waitFor(() => screen.getByRole('menuitem', { name: /Display/ }));

    // Resting on a leaf raises the preview card.
    fireEvent.mouseOver(display);
    await waitFor(() => {
      expect(document.querySelector('[data-insert-preview]')).toBeTruthy();
    });

    // Escape walks back one level: the flyout closes, the root stays.
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /Display/ })).toBeNull();
      expect(screen.getByText('Insert widget')).toBeTruthy();
    });
  });

  it('the canvas toolbar reaches a real-brand page preview three levels deep', async () => {
    mount();
    // Add page → Page library → Colours → Colour ratio, hover all the way.
    fireEvent.mouseOver(screen.getByRole('menuitem', { name: 'Page library' }));
    const colours = await waitFor(() => screen.getByRole('menuitem', { name: 'Colours' }));
    fireEvent.mouseOver(colours);
    const ratio = await waitFor(() => screen.getByRole('menuitem', { name: 'Colour ratio' }));
    fireEvent.mouseOver(ratio);
    // The preview renders the REAL page type with the lab's brand.
    await waitFor(() => {
      expect(document.querySelector('[data-insert-preview]')).toBeTruthy();
    });

    // Clicking a leaf picks it and closes the whole menu.
    fireEvent.click(screen.getByRole('menuitem', { name: 'Colour ratio' }));
    await waitFor(() => {
      expect(screen.queryByText('Insert widget')).toBeNull();
    });

    // The bar's Insert button (aria-expanded, unlike the lab nav row that
    // shares the name) reopens it.
    fireEvent.click(screen.getByRole('button', { name: 'Insert', expanded: false }));
    await waitFor(() => {
      expect(screen.getByText('Insert widget')).toBeTruthy();
    });
  });

  it('shows both floating toolbars inline', () => {
    mount();
    // Text toolbar: block-type label + weight label. Image toolbar: Replace.
    expect(screen.getAllByText('Heading').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Replace$/).length).toBeGreaterThan(0);
  });

  it('the chart toolbar switches kind and drives the settings controls', async () => {
    mount();
    // The bar itself: block name · type/style/settings menus · Edit data.
    expect(screen.getByText(/Chart toolbar/)).toBeTruthy();
    expect(screen.getByText('Edit data')).toBeTruthy();

    // Type menu: pick Line chart; the choice persists (✓ on reopen).
    fireEvent.click(screen.getByRole('button', { name: 'Chart type' }));
    fireEvent.click(await waitFor(() => screen.getByRole('menuitemradio', { name: /Line chart/ })));
    await waitFor(() => {
      expect(screen.queryByRole('menuitemradio', { name: /Column chart/ })).toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chart type' }));
    await waitFor(() => {
      expect(
        screen.getByRole('menuitemradio', { name: /Line chart/ }).getAttribute('aria-checked'),
      ).toBe('true');
    });
    fireEvent.keyDown(document, { key: 'Escape' });

    // Settings menu: Data shows the axes; General expands to real switches.
    fireEvent.click(screen.getByRole('button', { name: 'Chart settings' }));
    await waitFor(() => {
      expect(screen.getByText('Value 1')).toBeTruthy();
      expect(screen.getByText('Value 2')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'General' }));
    const legend = await waitFor(() => screen.getByRole('switch', { name: 'Legend' }));
    expect(legend.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(legend);
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Legend' }).getAttribute('aria-checked')).toBe('false');
    });
  });

  it('the chart data editor edits cells in place, drops a column and saves', async () => {
    mount();
    fireEvent.click(screen.getByText('Edit data'));
    // The modal grid: chrome-less inputs holding the sample data.
    const cell = await waitFor(
      () => screen.getByLabelText('Row 1 Month') as HTMLInputElement,
    );
    expect(cell.value).toBe('Jul');
    fireEvent.change(cell, { target: { value: 'July' } });
    expect((screen.getByLabelText('Row 1 Month') as HTMLInputElement).value).toBe('July');

    // The header ✕ removes the whole column.
    fireEvent.click(screen.getByLabelText('Remove column Value 1'));
    await waitFor(() => {
      expect(screen.queryByLabelText('Row 1 Value 1')).toBeNull();
    });

    // Save closes the modal; the draft became the data.
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByText('Clear data')).toBeNull();
    });
    // Reopen: the edit survived.
    fireEvent.click(screen.getByText('Edit data'));
    await waitFor(() => {
      expect((screen.getByLabelText('Row 1 Month') as HTMLInputElement).value).toBe('July');
    });
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('shows the rail and every panel at once', async () => {
    mount();
    expect(screen.getByLabelText('Guideline tools (lab)')).toBeTruthy();
    expect(screen.getByLabelText('Guideline pages')).toBeTruthy(); // ContentPanel
    expect(screen.getByLabelText('Move up')).toBeTruthy(); // PagePanel tools
    expect(screen.getByText('Iconography')).toBeTruthy(); // BrandPanel section row
    expect(screen.getByLabelText('Page library')).toBeTruthy(); // AddPagePanel

    // Typing in the page editor's name field updates its panel header.
    const input = document.getElementById('gl-page-title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My renamed page' } });
    await waitFor(() => {
      expect(screen.getByText('My renamed page')).toBeTruthy();
    });
  });

  it('clicking text on the selected stage page shows selection + toolbar', async () => {
    mount();
    // The stage sits at the end of the lab and its pages render deferred —
    // scroll the selected card into view so the in-view observer fires.
    // Scope to `.gl-doc` — the Page-labels section shows a static
    // `.gl-page[data-selected]` caption demo that must not match here.
    const card = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.gl-doc .gl-page[data-selected]');
      expect(el).toBeTruthy();
      return el!;
    });
    card.scrollIntoView();
    // The first page is selected on mount, so its EditableSlide is live.
    const slide = await waitFor(() => {
      const el = card.querySelector<HTMLElement>('[data-slide-content]');
      expect(el).toBeTruthy();
      return el!;
    });
    const text = await waitFor(() => {
      const candidates = Array.from(slide.querySelectorAll<HTMLElement>('h1, h2, div, span'));
      const hit = candidates.find((el) => (el.textContent ?? '').trim().length > 0);
      expect(hit).toBeTruthy();
      return hit!;
    });
    fireEvent.click(text, wordPoint(text));
    // Selection paints the words-hugging box overlay in this slide's
    // container (the element itself carries no outline).
    await waitFor(() => {
      expect(slide.parentElement!.querySelector('.scale-zone-box')).toBeTruthy();
    });
    // Six zones (4 corners + 2 edges) scoped to this slide's container (the
    // playground has its own). Every zone is invisible — the cursor is the
    // affordance (edge pills removed, owner request 2026-08-22).
    const zones = slide.parentElement!.querySelectorAll<HTMLElement>('.scale-zone');
    expect(zones.length).toBe(6);
    const corners = Array.from(zones).filter((z) => z.dataset.zone === 'corner');
    expect(corners.length).toBe(4);
    corners.forEach((z) => expect(z.style.cursor).toMatch(/(nwse|nesw)-resize/));
    const edges = Array.from(zones).filter((z) => z.dataset.zone === 'edge');
    expect(edges.length).toBe(2);
    edges.forEach((z) => expect(z.style.cursor).toBe('ew-resize'));
    expect(Array.from(zones).every((z) => z.childElementCount === 0)).toBe(true);
  });
});

describe('cards', () => {
  const card = (kind: string) =>
    document.querySelector<HTMLElement>(`[data-card="${kind}"]`)!;

  it('mounts the four reference cards and the inline card toolbar', () => {
    mount();
    for (const kind of ['vertical', 'image', 'metric', 'horizontal']) {
      expect(card(kind)).toBeTruthy();
    }
    // The inline demo bar (its siblings' pattern).
    expect(screen.getByText(/Card toolbar/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Card size' }).length).toBe(1);
  });

  it('selecting a card raises its own anchored toolbar', async () => {
    mount();
    fireEvent.mouseDown(card('vertical'));
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(card('vertical').dataset.cardSelected).toBe('true');
      // Inline demo bar + the anchored one that follows the selection.
      expect(screen.getAllByRole('button', { name: 'Card size' }).length).toBe(2);
    });
  });

  it('moving the card carries its items; a detached item stays behind', async () => {
    mount();
    const vertical = card('vertical');
    const item = vertical.querySelector<HTMLElement>('[data-card-item]')!;

    // Drag the headline far right, out of the card — it detaches.
    fireEvent.mouseDown(item, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document, { clientX: 500, clientY: 10 });
    fireEvent.mouseUp(document, { clientX: 500, clientY: 10 });
    const freeItem = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-free-item]');
      expect(el).toBeTruthy();
      return el!;
    });
    const freeLeft = freeItem.style.left;

    // Now move the CARD — items still inside follow (they are children);
    // the detached one must NOT move.
    const before = parseFloat(card('vertical').style.left);
    fireEvent.mouseDown(card('vertical'), { clientX: 100, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 140, clientY: 320 });
    fireEvent.mouseUp(document, { clientX: 140, clientY: 320 });
    await waitFor(() => {
      expect(parseFloat(card('vertical').style.left)).toBe(before + 40);
    });
    expect(document.querySelector<HTMLElement>('[data-free-item]')!.style.left).toBe(freeLeft);
  });

  it('the metric bar and number are one value — drag it, type it', async () => {
    mount();
    const track = card('metric').querySelector<HTMLElement>('[data-metric-track]')!;
    const fill = card('metric').querySelector<HTMLElement>('[data-metric-fill]')!;
    // The default the card arrives with (owner reference #65).
    expect(fill.style.width).toBe('50%');

    // Press a quarter of the way along the track — the value follows.
    const r = track.getBoundingClientRect();
    fireEvent.mouseDown(track, { clientX: r.left + r.width * 0.25, clientY: r.top + 3 });
    fireEvent.mouseUp(document);
    await waitFor(() => {
      const pct = parseFloat(fill.style.width);
      expect(pct).toBeGreaterThan(20);
      expect(pct).toBeLessThan(30);
    });

    // Type the number: the bar repaints to match.
    const value = card('metric').querySelector<HTMLElement>('[data-metric-value]')!;
    fireEvent.doubleClick(value);
    await waitFor(() => {
      expect(value.isContentEditable).toBe(true);
    });
    value.textContent = '42';
    fireEvent.blur(value);
    await waitFor(() => {
      expect(card('metric').querySelector<HTMLElement>('[data-metric-fill]')!.style.width).toBe('42%');
      expect(card('metric').querySelector('[data-metric-value]')!.textContent).toBe('42%');
    });
  });

  it('the size menu offers the preset ladder and a free number', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Card size' }));
    for (const label of ['Extra small', 'Small', 'Large', 'Extra large', 'Display', 'Huge']) {
      expect(await waitFor(() => screen.getByRole('menuitemradio', { name: label }))).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Huge' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Card size' }).textContent).toContain('Huge');
    });

    // The free number between the presets.
    fireEvent.click(screen.getByRole('button', { name: 'Card size' }));
    const custom = await waitFor(() => screen.getByLabelText('Custom size') as HTMLInputElement);
    fireEvent.focus(custom);
    fireEvent.change(custom, { target: { value: '27' } });
    fireEvent.keyDown(custom, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Card size' }).textContent).toContain('27px');
    });
  });

  it('style → adornment: the number label is freely editable', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Card style' }));
    const number = await waitFor(() => screen.getByRole('radio', { name: 'Number adornment' }));
    fireEvent.click(number);
    const label = await waitFor(() => screen.getByLabelText('Card number label') as HTMLInputElement);
    expect(label.value).toBe('01');
    fireEvent.change(label, { target: { value: '07' } });
    await waitFor(() => {
      expect((screen.getByLabelText('Card number label') as HTMLInputElement).value).toBe('07');
    });
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('icon adornment opens the searchable icon library from the card', async () => {
    mount();
    // Select the vertical card, open ITS style menu (the anchored bar's).
    fireEvent.mouseDown(card('vertical'));
    fireEvent.mouseUp(document);
    const styleButtons = await waitFor(() => {
      const found = screen.getAllByRole('button', { name: 'Card style' });
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.click(styleButtons[1]);
    fireEvent.click(await waitFor(() => screen.getByRole('radio', { name: 'Icon adornment' })));
    // The icon appears on the card; clicking it opens the library.
    const icon = await waitFor(() => {
      const el = card('vertical').querySelector<HTMLElement>('[data-card-icon]');
      expect(el).toBeTruthy();
      return el!;
    });
    fireEvent.click(icon);
    await waitFor(() => {
      expect(document.querySelector('[data-icon-library]')).toBeTruthy();
    });
    // Search narrows the grid; picking an icon marks it active.
    fireEvent.change(screen.getByLabelText('Search icon'), { target: { value: 'rocket' } });
    const rocket = await waitFor(() => screen.getByRole('button', { name: 'Icon Rocket' }));
    fireEvent.click(rocket);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Icon Rocket' }).className).toContain('bg-white/15');
    });
    // The emoji tab is there too.
    fireEvent.click(screen.getByRole('button', { name: 'emoji' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Emoji 🚀' })).toBeTruthy();
    });
  });

  it('card resize: edges give room on one side, corners scale it all', async () => {
    mount();
    fireEvent.mouseDown(card('vertical'));
    fireEvent.mouseUp(document);
    // Eight invisible zones: 4 edges + 4 corners, cursor as affordance.
    const zones = await waitFor(() => {
      const found = card('vertical').querySelectorAll<HTMLElement>('[data-card-resize]');
      expect(found.length).toBe(8);
      return found;
    });
    expect(Array.from(zones).every((z) => z.style.cursor.endsWith('resize'))).toBe(true);

    // East edge: +50px of ROOM — width only.
    const w0 = parseFloat(card('vertical').style.width);
    const h0 = parseFloat(card('vertical').style.height);
    fireEvent.mouseDown(card('vertical').querySelector('[data-card-resize="e"]')!, {
      clientX: 200,
      clientY: 200,
    });
    fireEvent.mouseMove(document, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(document, { clientX: 250, clientY: 200 });
    await waitFor(() => {
      expect(parseFloat(card('vertical').style.width)).toBeCloseTo(w0 + 50, 0);
      expect(parseFloat(card('vertical').style.height)).toBeCloseTo(h0, 0);
    });

    // South-east corner: BOTH dimensions grow by one factor — the aspect
    // ratio survives (the owner's "keep the proportions" rule).
    const w1 = parseFloat(card('vertical').style.width);
    const h1 = parseFloat(card('vertical').style.height);
    fireEvent.mouseDown(card('vertical').querySelector('[data-card-resize="se"]')!, {
      clientX: 300,
      clientY: 300,
    });
    fireEvent.mouseMove(document, { clientX: 340, clientY: 320 });
    fireEvent.mouseUp(document, { clientX: 340, clientY: 320 });
    await waitFor(() => {
      const w2 = parseFloat(card('vertical').style.width);
      const h2 = parseFloat(card('vertical').style.height);
      expect(w2).toBeGreaterThan(w1);
      expect(h2).toBeGreaterThan(h1);
      expect(w2 / h2).toBeCloseTo(w1 / h1, 2);
    });
  });

  it('items get the same selection: side + corner zones of their own', async () => {
    mount();
    // Every card now arrives with placeholders, so WRITE first (a click
    // on empty text opens editing), then re-click to select with zones.
    const item = card('image').querySelector<HTMLElement>('[data-card-item]')!;
    fireEvent.mouseDown(item, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });
    const editable = await waitFor(() => {
      const el = item.querySelector<HTMLElement>('[contenteditable="true"]');
      expect(el).toBeTruthy();
      return el!;
    });
    editable.textContent = 'Some words';
    fireEvent.blur(editable);
    await waitFor(() => {
      expect(item.querySelector('[contenteditable="true"]')).toBeNull();
    });
    fireEvent.mouseDown(item, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });
    await waitFor(() => {
      // Text items: e + w sides and 4 corners — like the slide selection.
      expect(item.querySelectorAll('[data-item-resize]').length).toBe(6);
    });
  });

  it('the vertical card arrives empty — Write something, click to write', async () => {
    mount();
    const item = card('vertical').querySelector<HTMLElement>('[data-card-item]')!;
    // The placeholder, top-start, and nothing else in the card.
    expect(card('vertical').querySelectorAll('[data-card-item]').length).toBe(1);
    expect(item.textContent).toContain('Write something');
    // One CLICK starts writing in its place.
    fireEvent.mouseDown(item, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });
    await waitFor(() => {
      expect(item.querySelector('[contenteditable="true"]')).toBeTruthy();
      expect(item.querySelector('[data-card-placeholder]')).toBeNull();
    });
  });

  it('the metric follows typing INSTANTLY — every digit and every arrow', async () => {
    mount();
    const value = card('metric').querySelector<HTMLElement>('[data-metric-value]')!;
    fireEvent.doubleClick(value);
    await waitFor(() => {
      expect(value.isContentEditable).toBe(true);
    });
    // Typing repaints the bar on the spot — no blur needed.
    value.textContent = '55';
    fireEvent.input(value);
    await waitFor(() => {
      expect(card('metric').querySelector<HTMLElement>('[data-metric-fill]')!.style.width).toBe('55%');
    });
    expect(value.isContentEditable).toBe(true);
    // Held arrows climb and fall continuously (key repeat) — one step here.
    fireEvent.keyDown(value, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(card('metric').querySelector<HTMLElement>('[data-metric-fill]')!.style.width).toBe('56%');
      // The % sign never leaves, even mid-edit (owner request).
      expect(value.textContent).toBe('56%');
    });
    fireEvent.keyDown(value, { key: 'ArrowDown' });
    fireEvent.keyDown(value, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(card('metric').querySelector<HTMLElement>('[data-metric-fill]')!.style.width).toBe('54%');
    });
  });

  it('picking an item swaps the card toolbar for that item\'s own bar', async () => {
    mount();
    // Select the CARD first — its toolbar joins the inline demo bar.
    fireEvent.mouseDown(card('image'));
    fireEvent.mouseUp(document);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Card size' }).length).toBe(2);
    });

    // Pick the IMAGE inside: the card bar leaves, the image bar arrives
    // (its Replace control), and the ring sits on the image only.
    const image = card('image').querySelectorAll<HTMLElement>('[data-card-item]')[1];
    fireEvent.mouseDown(image, { clientX: 5, clientY: 5 });
    fireEvent.mouseUp(document, { clientX: 5, clientY: 5 });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Card size' }).length).toBe(1);
      expect(screen.getAllByText(/^Replace$/).length).toBe(2);
      expect(card('image').dataset.cardSelected).toBeUndefined();
      expect(image.dataset.itemSelected).toBe('true');
    });

    // Pick the TEXT instead: the text bar takes over (a second block-type
    // label appears beside the inline demo's).
    const text = card('image').querySelectorAll<HTMLElement>('[data-card-item]')[0];
    fireEvent.mouseDown(text, { clientX: 5, clientY: 5 });
    fireEvent.mouseUp(document, { clientX: 5, clientY: 5 });
    await waitFor(() => {
      expect(screen.getAllByText(/^Replace$/).length).toBe(1);
      expect(screen.getAllByText(/^Paragraph$/).length).toBeGreaterThan(0);
    });
  });

  it('style → corners row changes the card radius', async () => {
    mount();
    fireEvent.mouseDown(card('vertical'));
    fireEvent.mouseUp(document);
    const styleButtons = await waitFor(() => {
      const found = screen.getAllByRole('button', { name: 'Card style' });
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.click(styleButtons[1]);
    fireEvent.click(await waitFor(() => screen.getByRole('radio', { name: 'Very rounded corners' })));
    await waitFor(() => {
      expect(card('vertical').style.borderRadius).toBe('26px');
    });
  });

  it('fonts: search, then hover a family for its weights flyout', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Card fonts' }));
    const search = await waitFor(() => screen.getByLabelText('Search fonts'));
    fireEvent.change(search, { target: { value: 'Gelasio' } });
    const row = await waitFor(() => screen.getByRole('menuitem', { name: /Gelasio/ }));
    fireEvent.mouseOver(row);
    // The weights flyout (hover intent, then beside the menu).
    const semi = await waitFor(() => screen.getByRole('menuitemradio', { name: 'Semi Bold' }));
    fireEvent.click(semi);
    await waitFor(() => {
      expect(screen.queryByLabelText('Search fonts')).toBeNull();
    });
  });
});
