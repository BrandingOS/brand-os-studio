import { describe, it, expect, vi } from 'vitest';
import { ensureMasterDesign, findMasterDesign, instanceFromMaster } from './masterTemplates';
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
  const docs = new Map<string, unknown>();
  const storage: IDesignStorage = {
    listDesigns: vi.fn(async () => rows),
    saveDesign: vi.fn(async (_b, id, doc, meta) => {
      docs.set(id, doc);
      rows.push({
        id,
        isTemplate: meta?.isTemplate,
        contentType: meta?.contentType,
        sourceTemplateId: meta?.sourceTemplateId,
        name: meta?.name,
      });
    }),
    loadDesign: vi.fn(async (_b, id) => docs.get(id) ?? null),
    deleteDesign: vi.fn(async () => {}),
  };
  return { storage, rows, docs };
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

describe('findMasterDesign', () => {
  it('answers null and writes nothing when no master has been seeded', async () => {
    const { storage } = fakeStorage();
    expect(await findMasterDesign(args(storage))).toBeNull();
    expect(storage.saveDesign).not.toHaveBeenCalled();
  });

  it('is the SAME predicate ensureMasterDesign resolves through', async () => {
    const { storage } = fakeStorage();
    const id = await ensureMasterDesign(args(storage));
    const found = await findMasterDesign(args(storage));
    expect(found?.id).toBe(id);
  });

  it('ignores a working design carrying the same catalog template id', async () => {
    const { storage } = fakeStorage([
      {
        id: 'instance-1',
        isTemplate: false,
        contentType: 'invoice',
        sourceTemplateId: 'invoices-ext-4',
      },
    ]);
    expect(await findMasterDesign(args(storage))).toBeNull();
  });
});

describe('instanceFromMaster', () => {
  const NEW_ID = '44444444-4444-4444-8444-444444444444';

  it('answers null when there is no master — the caller falls back to defaults', async () => {
    const { storage } = fakeStorage();
    expect(await instanceFromMaster({ ...args(storage), designId: NEW_ID })).toBeNull();
    expect(storage.saveDesign).not.toHaveBeenCalled();
  });

  it("carries the MASTER's content, not the brand defaults", async () => {
    const { storage, docs } = fakeStorage();
    const masterId = await ensureMasterDesign(args(storage));

    // The brand tunes its master, as Edit Template + autosave would.
    const master = docs.get(masterId) as {
      body: { content: { issuerAddress: string; notes: string } };
    };
    master.body.content.issuerAddress = 'Tuned HQ · Cairo';
    master.body.content.notes = 'Net 14.';

    const instance = await instanceFromMaster({ ...args(storage), designId: NEW_ID });
    if (instance?.body?.kind !== 'template-instance' || instance.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(instance.id).toBe(NEW_ID);
    expect(instance.body.content.issuerAddress).toBe('Tuned HQ · Cairo');
    expect(instance.body.content.notes).toBe('Net 14.');
    expect(instance.metadata.isTemplate).toBe(false);
    expect(instance.metadata.sourceTemplateId).toBe('invoices-ext-4');
  });

  it('degrades to null when the master row points at an unreadable document', async () => {
    const { storage, docs } = fakeStorage();
    const masterId = await ensureMasterDesign(args(storage));
    docs.set(masterId, { schemaVersion: 1, nonsense: true });
    expect(await instanceFromMaster({ ...args(storage), designId: NEW_ID })).toBeNull();
  });

  it('never seeds a master as a side effect', async () => {
    const { storage } = fakeStorage();
    await instanceFromMaster({ ...args(storage), designId: NEW_ID });
    expect(storage.saveDesign).not.toHaveBeenCalled();
  });
});
