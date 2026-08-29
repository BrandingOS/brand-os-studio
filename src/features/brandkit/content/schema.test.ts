import { describe, it, expect } from 'vitest';
import { DeliverableContentSchema } from './schema';
import { defaultContentFor, hydrateContent } from './kinds';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import { createTemplateInstanceDocument } from '@/features/editor/renderers/template-instance/createDocument';

const brand = { name: 'SKAM' };

describe('DeliverableContentSchema', () => {
  it.each(['person', 'letter', 'invoice'] as const)('round-trips a default %s', (kind) => {
    const value = defaultContentFor(kind, brand);
    expect(DeliverableContentSchema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });

  it('keeps line items as structured rows, not a string', () => {
    const parsed = DeliverableContentSchema.parse(defaultContentFor('invoice', brand));
    if (parsed.kind !== 'invoice') throw new Error('expected an invoice');
    expect(parsed.lineItems).toHaveLength(4);
    expect(parsed.lineItems[0]).toMatchObject({ id: 'li-1', qty: 1 });
    expect(typeof parsed.lineItems[0].unitPrice).toBe('number');
  });

  it('rejects a kind it does not know', () => {
    expect(() => DeliverableContentSchema.parse({ kind: 'spaceship' })).toThrow();
  });

  it('rejects a payload with no kind at all — the discriminant stays strict', () => {
    expect(() => DeliverableContentSchema.parse({ clientName: 'Acme Co.' })).toThrow();
  });
});

/**
 * The reason the stored form is tolerant: a document saved before a field
 * existed must still OPEN. Every field required would mean each addition
 * to `kinds.ts` retroactively broke every saved design.
 */
describe('a stored body that predates a field', () => {
  it('parses, then hydrates the missing field to its default', () => {
    // What a save from before `notes`, `taxRate` and `dueDate` existed
    // looks like on the way back in.
    const stored = { kind: 'invoice', clientName: 'Northwind Ltd', number: '0099' };
    const parsed = DeliverableContentSchema.parse(stored);
    expect(parsed.kind).toBe('invoice');

    const hydrated = hydrateContent('invoice', brand, parsed);
    if (hydrated.kind !== 'invoice') throw new Error('expected an invoice');
    expect(hydrated.clientName).toBe('Northwind Ltd');
    expect(hydrated.number).toBe('0099');
    expect(hydrated.notes).toBe('Payment due within 30 days.');
    expect(hydrated.taxRate).toBe(5);
    expect(hydrated.lineItems).toHaveLength(4);
  });

  it('parses a line item that predates a field, keeping its identity', () => {
    const parsed = DeliverableContentSchema.parse({
      kind: 'invoice',
      lineItems: [{ id: 'li-1', label: 'Retainer' }],
    });
    if (parsed.kind !== 'invoice') throw new Error('expected an invoice');
    expect(parsed.lineItems?.[0]).toMatchObject({ id: 'li-1' });
    const hydrated = hydrateContent('invoice', brand, parsed);
    if (hydrated.kind !== 'invoice') throw new Error('expected an invoice');
    expect(hydrated.lineItems[0]).toEqual({ id: 'li-1', label: 'Retainer', qty: 1, unitPrice: 0 });
  });

  it('opens as a whole DOCUMENT — this is the parse the editor route runs', () => {
    const doc = createTemplateInstanceDocument({
      designId: '22222222-2222-4222-8222-222222222222',
      brandId: 'skam',
      contentType: 'invoice',
      templateId: 'invoices-ext-4',
      content: defaultContentFor('invoice', brand),
      design: {},
    });
    const aged = JSON.parse(JSON.stringify(doc));
    aged.body.content = { kind: 'invoice', clientName: 'Northwind Ltd' };
    expect(() => BrandOSDocumentSchema.parse(aged)).not.toThrow();
  });
});
