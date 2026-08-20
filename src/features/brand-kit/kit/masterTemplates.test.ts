import { describe, it, expect, vi } from 'vitest';
import { ensureMasterDesign } from './masterTemplates';
import { defaultContentFor } from '@/features/brandkit/content';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

/**
 * Stateful fake: `saveDesign` appends into the SAME array `listDesigns`
 * reads, so a second call against the same storage instance can see what
 * a prior call wrote — required to actually exercise idempotency across
 * two calls, not just against a pre-seeded snapshot.
 */
function fakeStorage(existing: DesignSummary[] = []) {
  const rows: DesignSummary[] = [...existing];
  const storage: IDesignStorage = {
    listDesigns: vi.fn(async () => rows),
    saveDesign: vi.fn(async (_b, id, _d, meta) => {
      rows.push({
        id,
        isTemplate: meta?.isTemplate,
        contentType: meta?.contentType,
        sourceTemplateId: meta?.sourceTemplateId,
        name: meta?.name,
      });
    }),
    loadDesign: vi.fn(async () => null),
    deleteDesign: vi.fn(async () => {}),
  };
  return { storage, rows };
}

const args = (storage: IDesignStorage) => ({
  storage,
  brandId: 'skam',
  contentType: 'invoice',
  templateId: 'invoices-ext-4',
  label: 'Invoice — Editorial Header',
  seedContent: defaultContentFor('invoice', { name: 'SKAM' }),
});

describe('ensureMasterDesign', () => {
  it('creates a master flagged isTemplate on first use', async () => {
    const { storage } = fakeStorage();
    const id = await ensureMasterDesign(args(storage));
    expect(storage.saveDesign).toHaveBeenCalledTimes(1);
    const [, savedId, , meta] = (storage.saveDesign as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(savedId).toBe(id);
    expect(meta?.isTemplate).toBe(true);
    expect(meta?.sourceTemplateId).toBe('invoices-ext-4');
  });

  it('also stamps isTemplate on the document body, not just the storage summary', async () => {
    // The editor route loads a design via `loadDesign` (body only, no
    // summary), so `metadata.isTemplate` on the doc itself is what lets
    // EditorDuplicateDesignButton recognize a loaded master.
    const { storage } = fakeStorage();
    const saveDesignMock = storage.saveDesign as ReturnType<typeof vi.fn>;
    await ensureMasterDesign(args(storage));
    const [, , savedDoc] = saveDesignMock.mock.calls[0];
    expect((savedDoc as { metadata?: { isTemplate?: boolean } }).metadata?.isTemplate).toBe(true);
  });

  it('is idempotent across two calls against the same storage: same id, exactly one saveDesign', async () => {
    const { storage } = fakeStorage();
    const first = await ensureMasterDesign(args(storage));
    const second = await ensureMasterDesign(args(storage));
    expect(second).toBe(first);
    expect(storage.saveDesign).toHaveBeenCalledTimes(1);
  });

  it('reuses a master seeded in a previous session (pre-existing row)', async () => {
    const { storage } = fakeStorage([
      { id: 'master-1', isTemplate: true, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).toBe('master-1');
    expect(storage.saveDesign).not.toHaveBeenCalled();
  });

  it('does not mistake a working design for a master', async () => {
    const { storage } = fakeStorage([
      { id: 'instance-1', isTemplate: false, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).not.toBe('instance-1');
    expect(storage.saveDesign).toHaveBeenCalledTimes(1);
  });

  it('does not mistake a pre-flag legacy row (isTemplate undefined) for a master', async () => {
    const { storage } = fakeStorage([
      { id: 'legacy-1', contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).not.toBe('legacy-1');
    expect(storage.saveDesign).toHaveBeenCalledTimes(1);
  });
});
