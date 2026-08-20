import { describe, it, expect } from 'vitest';
import {
  contentKindForTemplateType,
  defaultContentFor,
  defaultInvoiceContent,
  hydrateContent,
  nextLineItemId,
  type InvoiceContent,
} from './kinds';
import { getAtPath, getStringAtPath, setAtPath, coerceToPathType, indexInPath } from './paths';
import { invoiceTotals, lineItemTotal, formatMoney, formatPercent } from './compute';
import { fieldGroupsFor, findFieldForPath } from './fields';

const brand = { name: 'Raqm' };

describe('content kinds', () => {
  it('gives Business Card and Email Signature the SAME kind', () => {
    // The email-signature designs hardcode the identical five fields. One
    // kind serves both; neither owns a private copy of "what a person is".
    expect(contentKindForTemplateType('business-cards')).toBe('person');
    expect(contentKindForTemplateType('email-sig')).toBe('person');
    expect(contentKindForTemplateType('letterhead')).toBe('letter');
    expect(contentKindForTemplateType('invoices')).toBe('invoice');
  });

  it('leaves an un-retrofitted family with no kind, so it keeps working untouched', () => {
    expect(contentKindForTemplateType('favicon')).toBeNull();
    expect(contentKindForTemplateType('instagram-posts')).toBeNull();
  });

  it('derives defaults from the brand', () => {
    const person = defaultContentFor('person', brand);
    expect(person).toMatchObject({ kind: 'person', email: 'jane@raqm.com', website: 'raqm.com' });
  });

  it('defaults are deterministic — no random ids', () => {
    const a = defaultInvoiceContent(brand);
    const b = defaultInvoiceContent(brand);
    expect(a.lineItems.map((i) => i.id)).toEqual(b.lineItems.map((i) => i.id));
    expect(a.lineItems[0].id).toBe('li-1');
  });

  it('never reuses a line-item id after a delete', () => {
    const items = defaultInvoiceContent(brand).lineItems;
    expect(nextLineItemId(items)).toBe('li-5');
    // Delete the last one and add again — the new item must not collide
    // with anything the user might still have referenced.
    const afterDelete = items.slice(0, 3);
    expect(nextLineItemId(afterDelete)).toBe('li-4');
    const reAdded = [...afterDelete, { id: 'li-4', label: '', qty: 1, unitPrice: 0 }];
    expect(nextLineItemId(reAdded)).toBe('li-5');
  });
});

describe('hydrateContent — stored work survives the model changing', () => {
  it('fills absent fields from defaults, keeping what was stored', () => {
    const stored = { kind: 'invoice', clientName: 'Globex', number: '99' };
    const c = hydrateContent('invoice', brand, stored) as InvoiceContent;
    expect(c.clientName).toBe('Globex');
    expect(c.number).toBe('99');
    // Absent in storage — comes from defaults rather than rendering blank.
    expect(c.lineItems.length).toBe(4);
    expect(c.taxRate).toBe(5);
  });

  it('keeps a deliberately empty string rather than "helpfully" refilling it', () => {
    const c = hydrateContent('invoice', brand, { kind: 'invoice', notes: '' }) as InvoiceContent;
    expect(c.notes).toBe('');
  });

  it('repairs malformed line items instead of rendering NaN', () => {
    const c = hydrateContent('invoice', brand, {
      kind: 'invoice',
      lineItems: [{ label: 'Fine' }, { id: 'li-9', label: 'Odd', qty: 'x', unitPrice: '250' }],
    }) as InvoiceContent;
    expect(c.lineItems[0]).toEqual({ id: 'li-1', label: 'Fine', qty: 1, unitPrice: 0 });
    expect(c.lineItems[1]).toEqual({ id: 'li-9', label: 'Odd', qty: 1, unitPrice: 250 });
  });

  it('ignores a stored value belonging to a different kind', () => {
    const c = hydrateContent('invoice', brand, { kind: 'person', fullName: 'Jane' });
    expect(c).toEqual(defaultContentFor('invoice', brand));
  });

  it('survives junk', () => {
    for (const junk of [null, undefined, 'nope', 42, []]) {
      expect(hydrateContent('person', brand, junk)).toEqual(defaultContentFor('person', brand));
    }
  });
});

describe('paths', () => {
  const content = defaultContentFor('invoice', brand) as { kind: 'invoice' } & InvoiceContent;

  it('reads through objects and arrays', () => {
    expect(getAtPath(content, 'clientName')).toBe('Acme Co.');
    expect(getAtPath(content, 'lineItems.1.label')).toBe('Identity System');
    expect(getAtPath(content, 'lineItems.9.label')).toBeUndefined();
    expect(getStringAtPath(content, 'lineItems.0.unitPrice')).toBe('2400');
  });

  it('writes immutably, copying only the spine to the change', () => {
    const next = setAtPath(content, 'lineItems.1.label', 'Renamed');
    expect(getAtPath(next, 'lineItems.1.label')).toBe('Renamed');
    // Original untouched...
    expect(getAtPath(content, 'lineItems.1.label')).toBe('Identity System');
    // ...and siblings are the SAME objects, so React re-renders only what changed.
    expect(next.lineItems[0]).toBe(content.lineItems[0]);
    expect(next.lineItems[1]).not.toBe(content.lineItems[1]);
  });

  it('refuses to invent structure a bound region asks for', () => {
    // A stale `<Bind>` pointing at a field that no longer exists must not
    // be able to corrupt content by writing a new key into it.
    expect(setAtPath(content, 'nope', 'x')).toBe(content);
    expect(setAtPath(content, 'lineItems.99.label', 'x')).toBe(content);
  });

  it('coerces typed text to the type the field already holds', () => {
    // Inline editing always hands back a string; the existing value is the
    // only reliable evidence of what the field is.
    expect(coerceToPathType(content, 'lineItems.0.unitPrice', '$1,250')).toBe(1250);
    expect(coerceToPathType(content, 'lineItems.0.qty', '3')).toBe(3);
    expect(coerceToPathType(content, 'clientName', '2400')).toBe('2400');
    // Unparseable input keeps the old number rather than writing NaN.
    expect(coerceToPathType(content, 'lineItems.0.unitPrice', 'abc')).toBe(2400);
  });

  it('finds the item index in a list path', () => {
    expect(indexInPath('lineItems.2.unitPrice')).toBe(2);
    expect(indexInPath('clientName')).toBeNull();
  });
});

describe('invoice totals — derived, never stored', () => {
  const base = defaultInvoiceContent(brand);

  it('adds up the line items', () => {
    expect(lineItemTotal({ id: 'x', label: '', qty: 3, unitPrice: 250 })).toBe(750);
    const t = invoiceTotals(base);
    expect(t.subtotal).toBe(8300);
    expect(t.tax).toBe(415);
    expect(t.total).toBe(8715);
  });

  it('moves when a price moves — the bug this whole model exists to fix', () => {
    const edited: InvoiceContent = {
      ...base,
      lineItems: base.lineItems.map((i) =>
        i.id === 'li-1' ? { ...i, unitPrice: 3400 } : i,
      ),
    };
    expect(invoiceTotals(edited).subtotal).toBe(9300);
    expect(invoiceTotals(edited).total).toBe(9765);
  });

  it('applies discount before tax', () => {
    const t = invoiceTotals({ ...base, discountRate: 10, taxRate: 10 });
    expect(t.subtotal).toBe(8300);
    expect(t.discount).toBe(830);
    expect(t.taxable).toBe(7470);
    expect(t.tax).toBe(747);
    expect(t.total).toBe(8217);
  });

  it('respects quantity', () => {
    const t = invoiceTotals({
      ...base,
      taxRate: 0,
      lineItems: [{ id: 'li-1', label: 'Day rate', qty: 12, unitPrice: 450 }],
    });
    expect(t.subtotal).toBe(5400);
    expect(t.total).toBe(5400);
  });

  it('clamps nonsense rates instead of printing a negative total', () => {
    expect(invoiceTotals({ ...base, taxRate: -5 }).tax).toBe(0);
    expect(invoiceTotals({ ...base, discountRate: 999 }).taxable).toBe(0);
    expect(invoiceTotals({ ...base, taxRate: Number.NaN }).total).toBe(8300);
  });

  it('is free of float dust', () => {
    const t = invoiceTotals({
      ...base,
      taxRate: 7.5,
      lineItems: [{ id: 'li-1', label: 'x', qty: 3, unitPrice: 33.33 }],
    });
    expect(t.subtotal).toBe(99.99);
    expect(t.total).toBe(107.49);
  });

  it('has no total to store — an empty invoice is zero, not blank', () => {
    const t = invoiceTotals({ ...base, lineItems: [] });
    expect(t).toEqual({ subtotal: 0, discount: 0, taxable: 0, tax: 0, total: 0 });
  });
});

describe('money and percent formatting', () => {
  it('drops decimals on whole amounts — the designs were drawn around "$2,400"', () => {
    expect(formatMoney(2400, 'USD')).toBe('$2,400');
    expect(formatMoney(8715.5, 'USD')).toBe('$8,715.50');
    expect(formatMoney(1200, 'EUR')).toBe('€1,200');
    expect(formatMoney(0, 'USD')).toBe('$0');
  });

  it('handles a currency it has no symbol for', () => {
    expect(formatMoney(10, 'XYZ')).toBe('XYZ 10');
  });

  it('trims trailing zeros from percentages', () => {
    expect(formatPercent(5)).toBe('5%');
    expect(formatPercent(7.5)).toBe('7.5%');
  });
});

describe('field specs drive the panel', () => {
  it('gives the invoice the controls its content actually needs', () => {
    const ids = fieldGroupsFor('invoice').map((g) => g.id);
    expect(ids).toEqual(['parties', 'reference', 'items', 'totals', 'notes']);
    const items = fieldGroupsFor('invoice').find((g) => g.id === 'items')!.fields[0];
    expect(items.type).toBe('list');
  });

  it('resolves a clicked region to its control, including inside a list', () => {
    const found = findFieldForPath('invoice', 'lineItems.2.unitPrice');
    expect(found?.field.type).toBe('money');
    expect(found?.absolutePath).toBe('lineItems.2.unitPrice');
    expect(found?.group.id).toBe('items');
  });

  it('resolves a plain field', () => {
    expect(findFieldForPath('person', 'jobTitle')?.group.id).toBe('identity');
    expect(findFieldForPath('person', 'nope')).toBeNull();
    expect(findFieldForPath('invoice', 'lineItems.2.nope')).toBeNull();
  });

  it('every field path exists in that kind\'s default content', () => {
    for (const kind of ['person', 'letter', 'invoice'] as const) {
      const content = defaultContentFor(kind, brand);
      for (const group of fieldGroupsFor(kind)) {
        for (const field of group.fields) {
          if (field.type === 'list') {
            const list = getAtPath(content, field.path);
            expect(Array.isArray(list), `${kind}.${field.path} should be a list`).toBe(true);
            for (const itemField of field.itemFields) {
              expect(
                getAtPath(content, `${field.path}.0.${itemField.path}`),
                `${kind}.${field.path}.0.${itemField.path} missing`,
              ).toBeDefined();
            }
            continue;
          }
          expect(
            getAtPath(content, field.path),
            `${kind}.${field.path} is declared by a panel field but absent from the model`,
          ).toBeDefined();
        }
      }
    }
  });
});
