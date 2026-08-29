import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceProperties } from './TemplateInstanceProperties';
import { Editor } from '@/features/editor/shell/Editor';
import { defaultContentFor, invoiceTotals } from '@/features/brandkit/content';
import type { BrandOSDocument, DesignBody } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

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
      content: defaultContentFor('invoice', { name: 'SKAM' }),
      design: {},
    },
  } as BrandOSDocument;
}

/** A document body for an arbitrary template + content kind — the panel
 *  reads only `content.kind`, so the templateId barely matters here. */
function bodyFor(templateId: string, kind: Parameters<typeof defaultContentFor>[0]): DesignBody {
  return {
    kind: 'template-instance',
    templateId,
    content: defaultContentFor(kind, { name: 'SKAM' }),
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
    const input = screen.getByDisplayValue('Acme Co.') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Northwind Ltd' } });

    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(body.content.clientName).toBe('Northwind Ltd');
  });

  it('shows totals computed from the line items, with no input to type one', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    // 2400 + 3800 + 1200 + 900 = 8300, +5% default tax = 8715.
    // `formatMoney` drops decimals on whole amounts — "$8,715", not
    // "$8,715.00". See compute.ts.
    expect(screen.getByText('$8,715')).toBeTruthy();
  });

  it('opens the control for whatever the artwork selected', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.queryByText('Selected')).toBeNull();

    // What clicking `Acme Co.` on the artifact does. React 18 batches a
    // state update triggered outside a DOM event to a microtask, so the
    // assertion needs to wait for that flush the same way a real click
    // (routed through React's event system) would.
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
    expect((screen.getByDisplayValue('Jane Smith') as HTMLInputElement).value).toBe(
      'Jane Smith',
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

    // 3400 + 3800 + 1200 + 900 = 9300, +5% = 9765
    expect(totalRow('Total')).toBe('$9,765');
    expect(totalRow('Total')).not.toBe('$8,715');
  });

  it('adds a line item', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(4);

    fireEvent.click(within(panel()).getByText('Add item'));
    expect(document.querySelectorAll('.bk-qe-item').length).toBe(5);
    // A new empty item is worth nothing, so the total must not move.
    expect(totalRow('Total')).toBe('$8,715');
  });

  it('removes a line item and re-totals', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    fireEvent.click(within(panel()).getAllByLabelText('Remove item')[0]);

    expect(document.querySelectorAll('.bk-qe-item').length).toBe(3);
    // 8300 − 2400 = 5900, +5% = 6195
    expect(totalRow('Total')).toBe('$6,195');
    expect(invoiceContent().lineItems[0].label).toBe('Identity System');
  });

  it('reorders line items — the model moves, not just the DOM', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(invoiceContent().lineItems[0].label).toBe('Brand Strategy');

    fireEvent.click(within(panel()).getAllByLabelText('Move down')[0]);

    expect(invoiceContent().lineItems[0].label).toBe('Identity System');
    expect(invoiceContent().lineItems[1].label).toBe('Brand Strategy');
    // Reordering moves nothing in or out, so the total is unchanged.
    expect(totalRow('Total')).toBe('$8,715');
  });

  it('applies a discount before tax', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const discount = within(panel()).getAllByText('Discount')[0].closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.change(discount, { target: { value: '10' } });
    // 8300 − 830 = 7470, +5% = 7843.50
    expect(totalRow('Total')).toBe('$7,843.50');
  });
});

describe('the letterhead body', () => {
  it('keeps the blank letterhead until there is something to say', async () => {
    const adapter = await adapterWith(bodyFor('letterhead-ext-6', 'letter'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    const bodyField = within(panel()).getByText('Body').closest('label')!
      .querySelector('textarea') as HTMLTextAreaElement;
    expect(bodyField.value).toBe('');

    fireEvent.change(bodyField, { target: { value: 'Dear team,' } });

    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'letter') {
      throw new Error('narrowing failed');
    }
    expect(body.content.body).toBe('Dear team,');
  });
});

describe('the model is the source of truth', () => {
  it('agrees with the pure total for whatever it is showing', async () => {
    const adapter = await adapterWith(bodyFor('invoices-ext-3', 'invoice'));
    render(<TemplateInstanceProperties adapter={adapter} />);
    const tax = within(panel()).getAllByText('Tax')[0].closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.change(tax, { target: { value: '20' } });

    const expected = invoiceTotals({
      issuerName: '', issuerAddress: '', clientName: '', clientAddress: '',
      number: '', issueDate: '', dueDate: '', currency: 'USD',
      lineItems: [
        { id: 'li-1', label: '', qty: 1, unitPrice: 2400 },
        { id: 'li-2', label: '', qty: 1, unitPrice: 3800 },
        { id: 'li-3', label: '', qty: 1, unitPrice: 1200 },
        { id: 'li-4', label: '', qty: 1, unitPrice: 900 },
      ],
      discountRate: 0, taxRate: 20, notes: '',
    });
    expect(expected.total).toBe(9960);
    expect(totalRow('Total')).toBe('$9,960');
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
