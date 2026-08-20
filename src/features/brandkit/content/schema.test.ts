import { describe, it, expect } from 'vitest';
import { DeliverableContentSchema } from './schema';
import { defaultContentFor } from './kinds';

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
});
