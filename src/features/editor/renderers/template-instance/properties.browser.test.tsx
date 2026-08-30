import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceProperties } from './TemplateInstanceProperties';
import { Editor } from '@/features/editor/shell/Editor';
import {
  defaultContentFor,
  formatMoney,
  invoiceTotals,
  type InvoiceContent,
  type LetterContent,
} from '@/features/brandkit/content';
import type { BrandOSDocument, DesignBody } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

const BRAND = { name: 'SKAM' };

function doc(): BrandOSDocument {
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
      templateId: 'invoices-ext-4',
      content: defaultContentFor('invoice', BRAND),
      design: {},
    },
  } as BrandOSDocument;
}

/**
 * The invoice and letter the model hands out for this brand.
 *
 * Every expectation below is asserted THROUGH these rather than against
 * copies of them. The defaults are facts about the brand (`brandFacts.
 * ts`) and the price ladder is a starting point, both of which are meant
 * to move; what must not move is that the total tracks the line items and
 * that the panel opens on whatever the model says.
 */
function defaultInvoice(): InvoiceContent {
  const content = defaultContentFor('invoice', BRAND);
  if (content.kind !== 'invoice') throw new Error('narrowing failed');
  return content;
}

function defaultLetter(): LetterContent {
  const content = defaultContentFor('letter', BRAND);
  if (content.kind !== 'letter') throw new Error('narrowing failed');
  return content;
}

/** The Total row the artifact should be showing for this content. */
function totalOf(content: InvoiceContent): string {
  return formatMoney(invoiceTotals(content).total, content.currency);
}

/** The default invoice with one field overridden — an expected shape. */
function invoiceWith(patch: Partial<InvoiceContent>): InvoiceContent {
  return { ...defaultInvoice(), ...patch };
}

/** A document body for an arbitrary template + content kind — the panel
 *  reads only `content.kind`, so the templateId barely matters here. */
function bodyFor(templateId: string, kind: Parameters<typeof defaultContentFor>[0]): DesignBody {
  return {
    kind: 'template-instance',
    templateId,
    content: defaultContentFor(kind, BRAND),
    design: {},
  };
}

async function adapterWith(body: DesignBody): Promise<TemplateInstanceAdapter> {
  const a = new TemplateInstanceAdapter();
  await a.loadDocument({ ...doc(), body });
  return a;
}

function panel(): HTMLElement {
  return document.querySelector('.bk-qe-panel') as HTMLElement;
}

/** A row in the read-only totals block. */
function totalRow(label: string): string {
  const row = Array.from(document.querySelectorAll('.bk-qe-total-row')).find(
    (el) => el.firstElementChild?.textContent === label,
  );
  if (!row) throw new Error(`no total row ${label}`);
  return row.lastElementChild?.textContent ?? '';
}

function mockBrand(): Brand {
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

describe('TemplateInstanceProperties', () => {
  let adapter: TemplateInstanceAdapter;

  beforeEach(async () => {
    adapter = new TemplateInstanceAdapter();
    await adapter.loadDocument(doc());
  });

  it('renders the content groups for the document kind', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.getByText('Bill from · Bill to')).toBeTruthy();
    expect(screen.getByText('Line items')).toBeTruthy();
  });

  it('writes an edit back through the adapter', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const input = screen.getByDisplayValue(defaultInvoice().clientName) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Northwind Ltd' } });

    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(body.content.clientName).toBe('Northwind Ltd');
  });

  it('shows totals computed from the line items, with no input to type one', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    // The default ladder, plus the default tax rate — worked out by the
    // same pure function the panel uses, never typed in here.
    // `formatMoney` drops decimals on whole amounts (see compute.ts).
    expect(screen.getByText(totalOf(defaultInvoice()))).toBeTruthy();
    // And it is a REAL total, not an empty one — the point of the block.
    expect(invoiceTotals(defaultInvoice()).total).toBeGreaterThan(0);
  });

  it('opens the control for whatever the artwork selected', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.queryByText('Selected')).toBeNull();

    // What clicking the client-name region on the artifact does. React
    // 18 batches a state update triggered outside a DOM event to a
    // microtask, so the assertion needs to wait for that flush the same
    // way a real click (routed through React's event system) would.
    act(() => {
      adapter.setSelectedPath('clientName');
    });
    expect(screen.getByText('Selected')).toBeTruthy();
  });
});

/**
 * The panel-behaviour claims moved here from Brand Kit's
 * `quickEdit.browser.test.tsx` (Task 12) — everything that is about
 * `ContentPanel` itself (which fields a content kind gets, structured
 * data staying real, the model being the source of truth) rather than
 * about the artifact. `canvas.browser.test.tsx` in this same folder
 * carries the artifact-side half of the same move.
 */
describe('the panel is contextual, not generic', () => {
  it('gives an Invoice every invoice group', async () => {
    const adapter = await adapterWith(bodyFor('invoices-ext-3', 'invoice'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    for (const title of ['Bill from · Bill to', 'Reference', 'Line items', 'Adjustments']) {
      expect(within(panel()).getByText(title)).toBeTruthy();
    }
  });

  it('gives a Business Card person controls — and no invoice ones', async () => {
    const adapter = await adapterWith(bodyFor('business-cards-ext-3', 'person'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(within(panel()).getByText('Identity')).toBeTruthy();
    expect(within(panel()).getByText('Contact')).toBeTruthy();
    expect(within(panel()).queryByText('Line items')).toBeNull();
  });

  it('gives an Email Signature the SAME person controls as the card', async () => {
    const adapter = await adapterWith(bodyFor('email-sig-ext-1', 'person'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(within(panel()).getByText('Identity')).toBeTruthy();
    const person = defaultContentFor('person', BRAND);
    if (person.kind !== 'person') throw new Error('narrowing failed');
    expect((screen.getByDisplayValue(person.fullName) as HTMLInputElement).value).toBe(
      person.fullName,
    );
  });
});

describe('structured data is real', () => {
  let adapter: TemplateInstanceAdapter;

  beforeEach(async () => {
    adapter = await adapterWith(bodyFor('invoices-ext-3', 'invoice'));
  });

  function invoiceContent() {
    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    return body.content;
  }

  it('moves the total when a price moves — the bug the model exists to fix', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const price = within(panel()).getAllByText('Unit price')[0].closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.change(price, { target: { value: '3400' } });

    const base = defaultInvoice();
    const moved = invoiceWith({
      lineItems: [{ ...base.lineItems[0], unitPrice: 3400 }, ...base.lineItems.slice(1)],
    });
    expect(totalRow('Total')).toBe(totalOf(moved));
    // ...and it MOVED — the whole point of the model.
    expect(totalRow('Total')).not.toBe(totalOf(base));
  });

  it('adds a line item', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(
      defaultInvoice().lineItems.length,
    );

    fireEvent.click(within(panel()).getByText('Add item'));
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(5);
    // A new empty item is worth nothing, so the total must not move.
    expect(totalRow('Total')).toBe(totalOf(defaultInvoice()));
  });

  it('removes a line item and re-totals', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    fireEvent.click(within(panel()).getAllByLabelText('Remove item')[0]);

    const base = defaultInvoice();
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(base.lineItems.length - 1);
    expect(totalRow('Total')).toBe(totalOf(invoiceWith({ lineItems: base.lineItems.slice(1) })));
    expect(invoiceContent().lineItems[0].label).toBe(base.lineItems[1].label);
  });

  it('reorders line items — the model moves, not just the DOM', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const base = defaultInvoice();
    expect(invoiceContent().lineItems[0].label).toBe(base.lineItems[0].label);

    fireEvent.click(within(panel()).getAllByLabelText('Move down')[0]);

    expect(invoiceContent().lineItems[0].label).toBe(base.lineItems[1].label);
    expect(invoiceContent().lineItems[1].label).toBe(base.lineItems[0].label);
    // Reordering moves nothing in or out, so the total is unchanged.
    expect(totalRow('Total')).toBe(totalOf(base));
  });

  it('applies a discount before tax', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const discount = within(panel()).getAllByText('Discount')[0].closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.change(discount, { target: { value: '10' } });
    // Discount comes off BEFORE tax — the ordering is the claim, so the
    // expectation is the pure function's answer for the same content.
    expect(totalRow('Total')).toBe(totalOf(invoiceWith({ discountRate: 10 })));
    expect(totalRow('Total')).not.toBe(totalOf(defaultInvoice()));
  });
});

describe('the letterhead body', () => {
  /**
   * This test used to be "keeps the blank letterhead until there is
   * something to say", and asserted `bodyField.value === ''`.
   *
   * Its intent is SUPERSEDED: a blank letter body is now deliberately
   * impossible to arrive at. `defaultLetterContent` seeds a short branded
   * paragraph because the letterhead designs paint grey rules where copy
   * goes, so an empty default shipped a page of grey bars as the finished
   * artifact (see `LetterContent.body`'s doc comment). The claim now is
   * the one that replaced it — the panel opens on a real, brand-specific
   * paragraph — plus the half of the old claim that is still true and
   * still worth defending: an EMPTIED body is kept as the user's answer
   * rather than refilled with the default.
   */
  it('opens on the brand\'s own letter body, and keeps whatever replaces it', async () => {
    const adapter = await adapterWith(bodyFor('letterhead-ext-6', 'letter'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    const bodyField = within(panel()).getByText('Body').closest('label')!
      .querySelector('textarea') as HTMLTextAreaElement;
    expect(bodyField.value).toBe(defaultLetter().body);
    expect(bodyField.value).toContain(BRAND.name);

    fireEvent.change(bodyField, { target: { value: 'Dear team,' } });

    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'letter') {
      throw new Error('narrowing failed');
    }
    expect(body.content.body).toBe('Dear team,');

    // Clearing it is an answer too — the default must not creep back.
    fireEvent.change(bodyField, { target: { value: '' } });
    const cleared = adapter.getBody();
    if (cleared?.kind !== 'template-instance' || cleared.content.kind !== 'letter') {
      throw new Error('narrowing failed');
    }
    expect(cleared.content.body).toBe('');
  });
});

describe('the model is the source of truth', () => {
  it('agrees with the pure total for whatever it is showing', async () => {
    const adapter = await adapterWith(bodyFor('invoices-ext-3', 'invoice'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    const tax = within(panel()).getAllByText('Tax')[0].closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.change(tax, { target: { value: '20' } });

    const base = defaultInvoice();
    const expected = invoiceTotals(invoiceWith({ taxRate: 20 }));
    // The arithmetic done HERE, by hand, so this is still an independent
    // check of `invoiceTotals` and not the pure function agreeing with
    // itself. (The old version wrote the ladder out as literals to the
    // same end; the ladder moved, the check did not have to.)
    const subtotal = base.lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    expect(expected.total).toBe(Math.round(subtotal * 1.2 * 100) / 100);
    expect(totalRow('Total')).toBe(formatMoney(expected.total, base.currency));
  });
});

describe('Design shell — the properties wrapper', () => {
  // Editor.tsx's slot wraps `renderer.Properties` in a plain div for
  // scroll containment (see the wrapper's own comment — it deliberately
  // does NOT duplicate EditorSecondaryPanel's card chrome). `.bk-qe-panel`
  // sets no padding of its own, so if the wrapper ever loses its padding
  // again, labels and inputs render flush against the slot's edges with
  // nothing to catch it. One assertion, not a styling suite.
  it('gives the properties panel breathing room — non-zero horizontal padding', async () => {
    const { container } = render(
      <MemoryRouter>
        <Editor initialDocument={doc()} save={async () => {}} brand={mockBrand()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-editor-panel-properties]')).toBeTruthy();
    });

    const wrapper = container.querySelector(
      '[data-editor-panel-properties]',
    ) as HTMLElement;
    expect(parseFloat(getComputedStyle(wrapper).paddingLeft)).toBeGreaterThan(0);
  });

  // The bug this guards: `TemplateInstanceProperties` used to seed its
  // state with `useState(() => instance.getBody())` and update it only
  // on the adapter's `change` event — but `TemplateInstanceCanvas`'s
  // effect calls `instance.loadDocument(initialDocument)` to hand the
  // document to the SAME adapter, and `loadDocument` deliberately does
  // not emit `change` (see `DesignPropertiesProps.initialDocument`'s doc
  // comment for why not — emitting one would fire the shell's autosave
  // on load). So the panel read `undefined` at mount and was never told
  // the document had arrived: it rendered nothing, forever, in the real
  // app. Every other test in this file hides the bug by calling
  // `adapter.loadDocument(...)` in `beforeEach`, BEFORE the panel ever
  // mounts — the opposite of what happens here, where `<Editor>` mounts
  // the canvas and the panel as siblings and only the canvas's effect
  // loads the document.
  it('shows its groups with no pre-seeded adapter — the real app mounts canvas and panel as siblings', async () => {
    render(
      <MemoryRouter>
        <Editor initialDocument={doc()} save={async () => {}} brand={mockBrand()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(within(panel()).getByText('Bill from · Bill to')).toBeTruthy();
    });
    expect(within(panel()).getByText('Reference')).toBeTruthy();
    expect(within(panel()).getByText('Line items')).toBeTruthy();
  });
});
