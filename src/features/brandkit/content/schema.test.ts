import { describe, it, expect } from 'vitest';
import { DeliverableContentSchema, TemplateDesignPicksSchema } from './schema';
import { CONTENT_KINDS, defaultContentFor, hydrateContent } from './kinds';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import { createTemplateInstanceDocument } from '@/features/editor/renderers/template-instance/createDocument';

const brand = { name: 'SKAM' };

describe('DeliverableContentSchema', () => {
  it.each(CONTENT_KINDS)('round-trips a default %s', (kind) => {
    const value = defaultContentFor(kind, brand);
    expect(DeliverableContentSchema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });

  it.each(CONTENT_KINDS)('accepts the HYDRATED output for %s', (kind) => {
    // Hydration is what actually reaches a renderer, so it is hydration's
    // output — not only the pristine default — that has to be a legal
    // stored shape, or a save immediately after an open would fail.
    const hydrated = hydrateContent(kind, brand, { kind, picks: { primaryColor: '#101010' } });
    expect(DeliverableContentSchema.parse(JSON.parse(JSON.stringify(hydrated)))).toEqual(hydrated);
  });

  it('keeps line items as structured rows, not a string', () => {
    const parsed = DeliverableContentSchema.parse(defaultContentFor('invoice', brand));
    if (parsed.kind !== 'invoice') throw new Error('expected an invoice');
    expect(parsed.lineItems?.length).toBeGreaterThan(0);
    expect(parsed.lineItems?.[0]).toMatchObject({ id: 'li-1', qty: 1 });
    expect(typeof parsed.lineItems?.[0].unitPrice).toBe('number');
  });

  it('keeps deck slides as structured rows, nested objects included', () => {
    const parsed = DeliverableContentSchema.parse(defaultContentFor('deck', brand));
    if (parsed.kind !== 'deck') throw new Error('expected a deck');
    expect(parsed.slides).toHaveLength(10);
    expect(parsed.slides?.[0]).toMatchObject({ id: 'sl-1', kind: 'title' });
    expect(parsed.slides?.[9].quote).toBeDefined();
  });

  it('carries the design picks — content and picks are ONE saved object', () => {
    // `z.object` strips what it was not told about, so a schema that knew
    // only the content half would silently drop the other half on the way
    // in: a data loss with no error attached.
    const parsed = DeliverableContentSchema.parse({
      kind: 'person',
      fullName: 'Ada',
      picks: { primaryColor: '#123456', showLogo: false },
    });
    expect(parsed.picks).toEqual({ primaryColor: '#123456', showLogo: false });
    expect(TemplateDesignPicksSchema.parse({})).toEqual({});
  });

  it('rejects a kind it does not know', () => {
    expect(() => DeliverableContentSchema.parse({ kind: 'spaceship' })).toThrow();
  });

  it('rejects a payload with no kind at all — the discriminant stays strict', () => {
    expect(() => DeliverableContentSchema.parse({ clientName: 'Northwind Ltd' })).toThrow();
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
    expect(hydrated.lineItems.length).toBeGreaterThan(0);
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

  it('parses a slide and an envelope half, which `.partial()` alone would not', () => {
    // `.partial()` is shallow. A slide's `stat`/`quote` and an address
    // block's own fields are one level down, so each needed saying.
    const deck = DeliverableContentSchema.parse({
      kind: 'deck',
      slides: [{ id: 'sl-1', heading: 'Only this' }],
    });
    expect(deck.kind).toBe('deck');
    const envelope = DeliverableContentSchema.parse({
      kind: 'address',
      sender: { name: 'SKAM' },
    });
    expect(envelope.kind).toBe('address');
    const hydrated = hydrateContent('address', brand, envelope);
    if (hydrated.kind !== 'address') throw new Error('expected an address');
    expect(hydrated.sender.lines.length).toBeGreaterThan(0);
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

  it.each(CONTENT_KINDS)('opens a %s body inside a whole document', (kind) => {
    // The editor's own content-type registry is a different list (page
    // sizes), and it has not caught up with the kinds yet — which is a
    // W1 job. What this asserts is the part that is ours: whatever kind a
    // body carries, the DOCUMENT still parses.
    const doc = createTemplateInstanceDocument({
      designId: '33333333-3333-4333-8333-333333333333',
      brandId: 'skam',
      contentType: 'business-card',
      templateId: `${kind}-ext-1`,
      content: defaultContentFor(kind, brand),
      design: { primaryColor: '#101010' },
    });
    expect(() => BrandOSDocumentSchema.parse(JSON.parse(JSON.stringify(doc)))).not.toThrow();
  });
});
