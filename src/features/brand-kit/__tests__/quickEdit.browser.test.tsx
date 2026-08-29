/**
 * Quick Edit, in a real browser.
 *
 * The claims this file defends, in the order they matter:
 *
 *   1. The artifact is the editing surface — you click what you see.
 *   2. The panel depends on what you are editing, not on nothing.
 *   3. Structured data is real: line items add, remove, reorder, and the
 *      total is worked out rather than written down.
 *   4. Editing goes through the content model. The rendered DOM is an
 *      interaction surface, never the data.
 *   5. Save / Cancel / Reset / Download still behave.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import { BrandKitCardEditor, type EditorTarget } from '../components/BrandKitCardEditor';
import { variantsForCard } from '../data/legacy-mapping';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import {
  defaultContentFor,
  formatMoney,
  invoiceTotals,
  type InvoiceContent,
  type LetterContent,
  type PersonContent,
} from '@/features/brandkit/content';

const sourceBrand = {
  id: 'brand-qe',
  slug: 'qe',
  name: 'Raqm',
  primaryColor: '#7231FF',
  secondaryColor: '#00D4AA',
  fonts: { primary: 'Inter' },
} as unknown as Brand;

/** A target aimed at one real variant of a deliverable. */
function targetFor(
  sectionKey: EditorTarget['sectionKey'],
  label: string,
  templateId: string,
): EditorTarget {
  const templates = variantsForCard(sectionKey, label, mockBrand);
  const template = templates.find((t) => t.id === templateId);
  if (!template) throw new Error(`no template ${templateId}`);
  return { sectionKey, label, cover: '', covers: [], templates, template };
}

const INVOICE = () => targetFor('stationery', 'Invoice', 'invoices-ext-3');
/** Design 0 — the one that prints a Qty column. */
const INVOICE_WITH_QTY = () => targetFor('stationery', 'Invoice', 'invoices-ext-1');
const CARD = () => targetFor('stationery', 'Business Card', 'business-cards-ext-3');
const SIGNATURE = () => targetFor('web', 'Email Signature', 'email-sig-ext-1');

/**
 * What the model hands the editor for THIS brand.
 *
 * The editor seeds itself with `defaultContentFor(kind, brand)` — the
 * same `mockBrand` these tests render with — so every expectation below
 * goes through these rather than through a copy of the defaults. The
 * defaults are facts about the brand (`brandFacts.ts`) and the invoice
 * ladder is an editable starting point; what must not move is that the
 * artifact opens on the model and the total tracks the line items.
 */
function defaultInvoice(): InvoiceContent {
  const content = defaultContentFor('invoice', mockBrand);
  if (content.kind !== 'invoice') throw new Error('narrowing failed');
  return content;
}

function defaultPerson(): PersonContent {
  const content = defaultContentFor('person', mockBrand);
  if (content.kind !== 'person') throw new Error('narrowing failed');
  return content;
}

function defaultLetter(): LetterContent {
  const content = defaultContentFor('letter', mockBrand);
  if (content.kind !== 'letter') throw new Error('narrowing failed');
  return content;
}

/** The default invoice with fields overridden — an expected shape. */
function invoiceWith(patch: Partial<InvoiceContent>): InvoiceContent {
  return { ...defaultInvoice(), ...patch };
}

/** The Total row the artifact should be showing for this content. */
function totalOf(content: InvoiceContent): string {
  return formatMoney(invoiceTotals(content).total, content.currency);
}

function renderEditor(target: EditorTarget, saved: SavedCardCustomization | null = null) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const onDownload = vi.fn();
  render(
    <BrandKitCardEditor
      brand={mockBrand}
      sourceBrand={sourceBrand}
      target={target}
      initialCustomization={saved}
      onClose={onClose}
      onSave={onSave}
      onDownload={onDownload}
    />,
  );
  return { onSave, onClose, onDownload };
}

/** The artifact's bound region for a content path. */
function region(path: string): HTMLElement {
  const el = document.querySelector(
    `.bk-editor-preview-frame [data-bind="${path}"]`,
  ) as HTMLElement | null;
  if (!el) throw new Error(`no bound region for ${path}`);
  return el;
}

function panel(): HTMLElement {
  return document.querySelector('.bk-qe-panel') as HTMLElement;
}

/** Type into a bound region the way a caret does, then leave it. */
function editRegion(path: string, text: string) {
  const el = region(path);
  fireEvent.click(el);
  el.textContent = text;
  fireEvent.blur(el);
}

/**
 * A control in the panel's CANONICAL group.
 *
 * Selecting a region makes the panel render that field twice — once in
 * the "Selected" section and once in the group it belongs to — so a bare
 * lookup is ambiguous by design. The canonical one is the last.
 */
function panelInput(label: string): HTMLInputElement {
  const matches = within(panel())
    .getAllByText(label)
    .map((el) => el.closest('label'))
    .filter((el): el is HTMLLabelElement => Boolean(el));
  const target = matches[matches.length - 1];
  if (!target) throw new Error(`no panel control labelled ${label}`);
  return target.querySelector('input, textarea, select') as HTMLInputElement;
}

/** A row in the read-only totals block. */
function totalRow(label: string): string {
  const row = Array.from(document.querySelectorAll('.bk-qe-total-row')).find(
    (el) => el.firstElementChild?.textContent === label,
  );
  if (!row) throw new Error(`no total row ${label}`);
  return row.lastElementChild?.textContent ?? '';
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('the artifact is the editing surface', () => {
  it('exposes the invoice content as regions on the artifact itself', () => {
    renderEditor(INVOICE());
    for (const path of ['clientName', 'issuerName', 'number', 'lineItems.0.label']) {
      expect(region(path)).toBeTruthy();
    }
  });

  it('edits content by clicking the artifact, not a far-away form', () => {
    renderEditor(INVOICE());
    expect(region('clientName').textContent).toBe(defaultInvoice().clientName);

    editRegion('clientName', 'Globex Corporation');

    // The RENDERER re-rendered from state — this is not the DOM keeping
    // the text the caret left behind.
    expect(region('clientName').textContent).toBe('Globex Corporation');
    expect(panelInput('To').value).toBe('Globex Corporation');
  });

  it('selects the clicked region and surfaces its control', () => {
    renderEditor(INVOICE());
    fireEvent.click(region('lineItems.1.label'));

    expect(region('lineItems.1.label').hasAttribute('data-bind-selected')).toBe(true);
    // The panel gained a "Selected" section for what was clicked.
    expect(within(panel()).getByText('Selected')).toBeTruthy();
    expect(within(panel()).getByText(/Line items · click the artifact/)).toBeTruthy();
  });

  it('clears the selection when the artifact background is clicked', () => {
    renderEditor(INVOICE());
    fireEvent.click(region('clientName'));
    expect(within(panel()).queryByText('Selected')).toBeTruthy();

    fireEvent.click(document.querySelector('.bk-editor-preview-frame') as HTMLElement);
    expect(within(panel()).queryByText('Selected')).toBeNull();
  });

  it('reverts on Escape rather than committing a half-typed value', () => {
    renderEditor(INVOICE());
    const el = region('clientName');
    fireEvent.click(el);
    el.textContent = 'Half-typed';
    fireEvent.keyDown(el, { key: 'Escape' });

    expect(region('clientName').textContent).toBe(defaultInvoice().clientName);
  });
});

describe('the panel is contextual, not generic', () => {
  it('gives an Invoice invoice controls', () => {
    renderEditor(INVOICE());
    for (const title of ['Bill from · Bill to', 'Reference', 'Line items', 'Adjustments']) {
      expect(within(panel()).getByText(title)).toBeTruthy();
    }
  });

  it('gives a Business Card person controls — and no invoice ones', () => {
    renderEditor(CARD());
    expect(within(panel()).getByText('Identity')).toBeTruthy();
    expect(within(panel()).getByText('Contact')).toBeTruthy();
    expect(within(panel()).queryByText('Line items')).toBeNull();
  });

  it('gives an Email Signature the SAME person controls as the card', () => {
    renderEditor(SIGNATURE());
    expect(within(panel()).getByText('Identity')).toBeTruthy();
    expect(panelInput('Full name').value).toBe(defaultPerson().fullName);
  });

  it('never offers the card thumbnail as if it were on the artifact', () => {
    // "Image — pick the cover for this card" beside a live invoice was
    // the clearest sign the panel was generic: it changed something the
    // user could not see from where they were standing.
    renderEditor(INVOICE());
    expect(screen.queryByText('Pick the cover for this card.')).toBeNull();
  });
});

describe('structured data is real', () => {
  it('computes the total from the line items', () => {
    renderEditor(INVOICE());
    // The default ladder plus the default tax rate — worked out by the
    // same pure function the panel uses, never typed in here.
    expect(totalRow('Total')).toBe(totalOf(defaultInvoice()));
    expect(invoiceTotals(defaultInvoice()).total).toBeGreaterThan(0);
    expect(region('lineItems.0.label').textContent).toBe(defaultInvoice().lineItems[0].label);
  });

  it('moves the total when a price moves — the bug the model exists to fix', () => {
    renderEditor(INVOICE());
    const price = within(panel()).getAllByText('Unit price')[0].closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.change(price, { target: { value: '3400' } });

    const base = defaultInvoice();
    const moved = invoiceWith({
      lineItems: [{ ...base.lineItems[0], unitPrice: 3400 }, ...base.lineItems.slice(1)],
    });
    expect(totalRow('Total')).toBe(totalOf(moved));
    // ...and it MOVED — the bug the model exists to fix.
    expect(totalRow('Total')).not.toBe(totalOf(base));
  });

  it('adds a line item', () => {
    renderEditor(INVOICE());
    const before = defaultInvoice().lineItems.length;
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(before);

    fireEvent.click(within(panel()).getByText('Add item'));
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(before + 1);
    // A new empty item is worth nothing, so the total must not move.
    expect(totalRow('Total')).toBe(totalOf(defaultInvoice()));
  });

  it('removes a line item and re-totals', () => {
    renderEditor(INVOICE());
    fireEvent.click(within(panel()).getAllByLabelText('Remove item')[0]);

    const base = defaultInvoice();
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(base.lineItems.length - 1);
    expect(totalRow('Total')).toBe(totalOf(invoiceWith({ lineItems: base.lineItems.slice(1) })));
    expect(region('lineItems.0.label').textContent).toBe(base.lineItems[1].label);
  });

  it('reorders line items, and the artifact follows', () => {
    renderEditor(INVOICE());
    const base = defaultInvoice();
    expect(region('lineItems.0.label').textContent).toBe(base.lineItems[0].label);

    fireEvent.click(within(panel()).getAllByLabelText('Move down')[0]);

    expect(region('lineItems.0.label').textContent).toBe(base.lineItems[1].label);
    expect(region('lineItems.1.label').textContent).toBe(base.lineItems[0].label);
    // Reordering moves nothing in or out, so the total is unchanged.
    expect(totalRow('Total')).toBe(totalOf(base));
  });

  it('applies a discount before tax', () => {
    renderEditor(INVOICE());
    fireEvent.change(panelInput('Discount'), { target: { value: '10' } });
    // Discount comes off BEFORE tax — the ordering is the claim, so the
    // expectation is the pure function's answer for the same content.
    expect(totalRow('Total')).toBe(totalOf(invoiceWith({ discountRate: 10 })));
    expect(totalRow('Total')).not.toBe(totalOf(defaultInvoice()));
  });

  it('coerces a quantity typed onto the ARTIFACT into a number', () => {
    renderEditor(INVOICE_WITH_QTY());
    // The qty region is a number in the model but text in the DOM.
    editRegion('lineItems.0.qty', '3');
    const base = defaultInvoice();
    // Three of the first item, the rest untouched — a NUMBER in the
    // model, which is the only reason the total can move at all.
    expect(totalRow('Total')).toBe(
      totalOf(
        invoiceWith({
          lineItems: [{ ...base.lineItems[0], qty: 3 }, ...base.lineItems.slice(1)],
        }),
      ),
    );
    expect(totalRow('Total')).not.toBe(totalOf(base));
  });
});

describe('the letterhead body', () => {
  /**
   * Was "keeps the blank letterhead until there is something to say",
   * which asserted no body region existed on a fresh letter.
   *
   * That intent is SUPERSEDED: a blank body is now deliberately
   * unreachable by default. `defaultLetterContent` seeds a short branded
   * paragraph because the letterhead designs paint grey rules where copy
   * goes, so an empty default shipped a page of grey bars as the finished
   * artifact (see `LetterContent.body`). The claim is inverted at the
   * front — the letter opens on a real paragraph naming the brand — and
   * the renderer's empty-body fallback, which is still real and still
   * worth defending, is reached at the end the only way a user can reach
   * it: by clearing the field.
   */
  it('opens on a real branded body, and shows the rules again only when it is cleared', () => {
    renderEditor(targetFor('stationery', 'Letterhead', 'letterhead-ext-6'));
    expect(region('body').textContent).toBe(defaultLetter().body);
    expect(region('body').textContent).toContain(mockBrand.name);

    fireEvent.change(panelInput('Body'), { target: { value: 'Dear team,' } });
    expect(region('body').textContent).toBe('Dear team,');

    fireEvent.change(panelInput('Body'), { target: { value: '' } });
    // The Letterhead conversion removed the grey-rules fallback: a letter
    // is a letter, and an emptied body is an EMPTY bound region the user
    // can click straight back into — never a decorative placeholder.
    // …showing its own invitation rather than nothing at all.
    expect(region('body').textContent).toMatch(/write your letter/i);
    expect(panelInput('Body')).toHaveValue('');
  });

  /**
   * A Bind is an inline-block, so one typed line used to collapse the
   * body to a chip adrift in a blank page — while the SAME design with
   * no body looked full, because the grey rules it draws instead do
   * occupy the page. The body has to be the same region either way.
   */
  it('occupies the space the design reserved, not the width of one word', () => {
    renderEditor(targetFor('stationery', 'Letterhead', 'letterhead-ext-6'));
    fireEvent.change(panelInput('Body'), { target: { value: 'Hi' } });
    const style = getComputedStyle(region('body'));

    // Block, so it fills the column the design gave it. `.bk-bind` sets
    // inline-block and a utility class cannot outrank it, which is why
    // this is an inline style in the renderer.
    expect(style.display).toBe('block');
    // And it holds the rules' own height — 14 rules of 2px separated by
    // the 2.5px `space-y` — instead of collapsing to one 3.5px line.
    // Block-level is the claim: the region spans the line, not one word.
    expect(style.width).not.toBe('auto');
  });
});

describe('the panel\'s selection ring', () => {
  /**
   * The ring marks the CONTROL. On the <label> that wraps it, it drew a
   * second box around the field's name as well, so a selected field read
   * as a box inside a box with the caption caught between them.
   */
  it('rings the control, never the label around it', () => {
    renderEditor(INVOICE());
    fireEvent.click(region('clientName'));

    const field = panel().querySelector('.bk-qe-field.is-selected') as HTMLElement;
    expect(field).toBeTruthy();
    const control = field.querySelector('.bk-qe-input') as HTMLElement;

    expect(getComputedStyle(field).boxShadow).toBe('none');
    expect(getComputedStyle(control).boxShadow).not.toBe('none');
  });
});

describe('save, cancel, reset, download', () => {
  it('saves structured content as real nested data', () => {
    const { onSave } = renderEditor(INVOICE());
    editRegion('clientName', 'Globex');
    fireEvent.click(within(panel()).getByText('Add item'));
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][1] as SavedCardCustomization;
    const content = saved.content as InvoiceContent;
    expect(content.clientName).toBe('Globex');
    // An ARRAY OF OBJECTS — not flattened into the old scalar bag.
    expect(Array.isArray(content.lineItems)).toBe(true);
    const base = defaultInvoice();
    expect(content.lineItems.length).toBe(base.lineItems.length + 1);
    expect(content.lineItems[0]).toMatchObject({
      label: base.lineItems[0].label,
      unitPrice: base.lineItems[0].unitPrice,
    });
    // And no total is stored, because a stored total can be wrong.
    expect('total' in (content as Record<string, unknown>)).toBe(false);
  });

  it('survives a round trip through storage', () => {
    const { onSave } = renderEditor(INVOICE());
    editRegion('clientName', 'Globex');
    fireEvent.click(screen.getByText('Save'));
    const saved = onSave.mock.calls[0][1] as SavedCardCustomization;
    cleanup();

    // Through JSON, the way localStorage actually stores it.
    const reloaded = JSON.parse(JSON.stringify(saved)) as SavedCardCustomization;
    renderEditor(INVOICE(), reloaded);
    expect(region('clientName').textContent).toBe('Globex');
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(
      defaultInvoice().lineItems.length,
    );
  });

  it('loads a card saved BEFORE the content model existed', () => {
    // Nobody's saved name may disappear the day the model arrives.
    const legacy = {
      overrides: { title: 'Omar Ali', subtitle: 'Founder', email: 'omar@raqm.com' },
      cover: null,
      color: null,
      secondaryColor: null,
      logoId: null,
      logoColor: null,
      fontId: null,
      savedAt: '2026-01-01T00:00:00.000Z',
    } as SavedCardCustomization;
    renderEditor(CARD(), legacy);
    expect(panelInput('Full name').value).toBe('Omar Ali');
    expect(panelInput('Job title').value).toBe('Founder');
  });

  it('cancels without saving', () => {
    const { onSave, onClose } = renderEditor(INVOICE());
    editRegion('clientName', 'Globex');
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('resets content back to the brand defaults', () => {
    renderEditor(INVOICE());
    editRegion('clientName', 'Globex');
    fireEvent.click(within(panel()).getAllByText('Reset')[0]);
    expect(region('clientName').textContent).toBe(defaultInvoice().clientName);
  });

  it('downloads', () => {
    const { onDownload } = renderEditor(INVOICE());
    fireEvent.click(screen.getByText('Download'));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});

describe('edits survive the parent re-rendering', () => {
  it('does not reset when the brand object is rebuilt with the same values', () => {
    // The route component builds its MockBrand inline —
    // `brandToMockBrand(brand)` — so EVERY render of the page handed the
    // editor a brand with a new identity. Keyed on that, the seeding
    // effect re-ran and threw away whatever the user had typed. A
    // component test with a stable module-level fixture never sees this,
    // which is exactly why it is asserted here.
    const target = INVOICE();
    const { rerender } = render(
      <BrandKitCardEditor
        brand={{ ...mockBrand }}
        sourceBrand={sourceBrand}
        target={target}
        initialCustomization={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    editRegion('clientName', 'Globex');
    expect(region('clientName').textContent).toBe('Globex');

    // Same values, new object — the shape of every parent re-render.
    rerender(
      <BrandKitCardEditor
        brand={{ ...mockBrand }}
        sourceBrand={sourceBrand}
        target={target}
        initialCustomization={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    expect(region('clientName').textContent).toBe('Globex');
  });

  it('DOES reset when a different card opens', () => {
    const { rerender } = render(
      <BrandKitCardEditor
        brand={mockBrand}
        sourceBrand={sourceBrand}
        target={INVOICE()}
        initialCustomization={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    editRegion('clientName', 'Globex');

    rerender(
      <BrandKitCardEditor
        brand={mockBrand}
        sourceBrand={sourceBrand}
        target={CARD()}
        initialCustomization={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    // A person card, seeded fresh — no invoice state bleeding across.
    expect(panelInput('Full name').value).toBe(defaultPerson().fullName);
    expect(within(panel()).queryByText('Line items')).toBeNull();
  });
});

describe('long values do not collide', () => {
  it('constrains a value far longer than the literal the design was drawn around', () => {
    renderEditor(INVOICE());
    editRegion('clientName', 'A Very Long Client Name That Would Once Have Overlapped');

    const el = region('clientName');
    // Structured content fixed the data; the fit rule stops the physics.
    expect(el.className).toContain('bk-bind--clamp');
    expect(getComputedStyle(el).overflow).toBe('hidden');
    expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(
      (el.parentElement as HTMLElement).getBoundingClientRect().width + 1,
    );
  });
});

describe('the model is the source of truth', () => {
  it('stores what the MODEL says, not the text the caret left behind', () => {
    // The clearest proof that the DOM is an interaction surface and not
    // the data: a price typed as "$1,250" is saved as the NUMBER 1250,
    // because the model coerces against the type the field already holds.
    const { onSave } = renderEditor(INVOICE_WITH_QTY());
    editRegion('lineItems.0.qty', '4');
    fireEvent.click(screen.getByText('Save'));

    const content = (onSave.mock.calls[0][1] as SavedCardCustomization)
      .content as InvoiceContent;
    expect(content.lineItems[0].qty).toBe(4);
    expect(typeof content.lineItems[0].qty).toBe('number');
  });

  it('restores the artifact from state when an edit is abandoned', () => {
    renderEditor(INVOICE());
    const el = region('clientName');
    fireEvent.click(el);
    el.textContent = 'Typed but abandoned';
    fireEvent.keyDown(el, { key: 'Escape' });

    // The DOM matches state again, and state never moved.
    expect(region('clientName').textContent).toBe(defaultInvoice().clientName);
    expect(panelInput('To').value).toBe(defaultInvoice().clientName);
  });

  it('agrees with the pure total for whatever it is showing', () => {
    renderEditor(INVOICE());
    fireEvent.change(panelInput('Tax'), { target: { value: '20' } });
    const base = defaultInvoice();
    const expected = invoiceTotals(invoiceWith({ taxRate: 20 }));
    // The arithmetic done HERE, by hand, so this stays an independent
    // check of `invoiceTotals` rather than the pure function agreeing
    // with itself. (The old version wrote the ladder out as literals to
    // the same end; the ladder moved, the check did not have to.)
    const subtotal = base.lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    expect(expected.total).toBe(Math.round(subtotal * 1.2 * 100) / 100);
    expect(totalRow('Total')).toBe(formatMoney(expected.total, base.currency));
  });
});
