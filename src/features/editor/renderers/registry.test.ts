import { describe, it, expect, vi } from 'vitest';
import { getDesignRenderer } from './index';
import * as contentTypes from '@/features/editor/content-types';
import { invoiceConfig } from '@/features/editor/content-types/invoice.config';

describe('design renderer registry', () => {
  it('resolves a layer content type to the fabric renderer', () => {
    const r = getDesignRenderer('presentation');
    expect(r.id).toBe('fabric');
    expect(r.supportsLayerEditing).toBe(true);
  });

  it('falls back to fabric for an unknown content type rather than throwing', () => {
    expect(getDesignRenderer('a-type-nobody-registered').id).toBe('fabric');
  });

  // `invoice.config.ts` declares `renderer: 'template-instance'`, and
  // Task 7 is what registers that id. Before this renderer registered,
  // `getDesignRenderer('invoice')` fell back to Fabric purely because
  // `RENDERERS` had no entry for the id it named — the test used to pin
  // that fallback here. `DesignRendererIdSchema` is a closed two-value
  // enum (`fabric` | `template-instance`) and both are now registered,
  // so there is no longer a genuine content type that names a renderer
  // id nothing backs; that branch (`RENDERERS[rendererId] ?? fabricRenderer`
  // falling through) stays in the implementation as a safety net but has
  // no live scenario to assert against until a third renderer id exists.
  it('resolves invoice to the template-instance renderer', () => {
    const r = getDesignRenderer('invoice');
    expect(r.id).toBe('template-instance');
    expect(r.supportsLayerEditing).toBe(false);
    expect(r.Properties).not.toBeNull();
  });

  // `DesignRendererIdSchema` is a closed two-value enum and both values
  // are registered today, so no real config can name an unbacked
  // renderer id — this guards the branch by construction instead:
  // a config whose `renderer` names an id `RENDERERS` doesn't have.
  // This is the failure mode the fallback exists for: a third renderer
  // id gets added to the enum and used by a config before its module
  // registers — the shell must still open the document as Fabric, not
  // throw or return undefined.
  it('falls back to fabric when a config names a renderer id nothing has registered', () => {
    const ghostConfig = { ...invoiceConfig, renderer: 'ghost-renderer' } as unknown as ReturnType<
      typeof contentTypes.getContentTypeConfig
    >;
    const spy = vi
      .spyOn(contentTypes, 'getContentTypeConfig')
      .mockReturnValue(ghostConfig);
    try {
      const r = getDesignRenderer('invoice');
      expect(r.id).toBe('fabric');
    } finally {
      spy.mockRestore();
    }
  });

  it('builds a working adapter', () => {
    const adapter = getDesignRenderer('presentation').createAdapter();
    expect(typeof adapter.loadDocument).toBe('function');
    expect(typeof adapter.exportAs).toBe('function');
  });
});
