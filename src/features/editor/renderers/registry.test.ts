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

  it('builds a working adapter', () => {
    const adapter = getDesignRenderer('presentation').createAdapter();
    expect(typeof adapter.loadDocument).toBe('function');
    expect(typeof adapter.exportAs).toBe('function');
  });
});
