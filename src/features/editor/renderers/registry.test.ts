import { describe, it, expect } from 'vitest';
import { getDesignRenderer } from './index';

describe('design renderer registry', () => {
  it('resolves a layer content type to the fabric renderer', () => {
    const r = getDesignRenderer('presentation');
    expect(r.id).toBe('fabric');
    expect(r.supportsLayerEditing).toBe(true);
  });

  it('falls back to fabric for an unknown content type rather than throwing', () => {
    expect(getDesignRenderer('a-type-nobody-registered').id).toBe('fabric');
  });

  // The OTHER fallback, and the one that is live in production right now.
  // `invoice.config.ts` already declares `renderer: 'template-instance'`,
  // which nothing registers until Task 7 lands that renderer. Until then
  // every invoice opens on Fabric purely because `getDesignRenderer`
  // tolerates a renderer id with no module behind it. Turning that
  // tolerance into a throw would ship unopenable invoices, and the
  // unknown-content-type case above would NOT catch it — that one exercises
  // the try/catch around `getContentTypeConfig`, a different branch.
  it('falls back to fabric when a REGISTERED type names an unregistered renderer', () => {
    expect(getDesignRenderer('invoice').id).toBe('fabric');
  });

  it('builds a working adapter', () => {
    const adapter = getDesignRenderer('presentation').createAdapter();
    expect(typeof adapter.loadDocument).toBe('function');
    expect(typeof adapter.exportAs).toBe('function');
  });
});
