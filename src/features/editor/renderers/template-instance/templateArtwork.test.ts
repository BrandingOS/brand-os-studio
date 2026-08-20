import { describe, it, expect } from 'vitest';
import { resolveTemplate } from './templateArtwork';

describe('resolveTemplate', () => {
  it('finds an invoice design by id', () => {
    const t = resolveTemplate('invoices-ext-4');
    expect(t?.id).toBe('invoices-ext-4');
    expect(t?.type).toBe('invoices');
  });

  it('returns null for an id nothing defines', () => {
    expect(resolveTemplate('invoices-ext-99999')).toBeNull();
  });
});
