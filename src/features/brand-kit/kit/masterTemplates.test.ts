import { describe, it, expect, vi } from 'vitest';
import { ensureMasterDesign } from './masterTemplates';
import { defaultContentFor } from '@/features/brandkit/content';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

function fakeStorage(existing: DesignSummary[] = []) {
  const saved: Array<{ id: string; meta?: Partial<DesignSummary> }> = [];
  const storage: IDesignStorage = {
    listDesigns: vi.fn(async () => existing),
    saveDesign: vi.fn(async (_b, id, _d, meta) => { saved.push({ id, meta }); }),
    loadDesign: vi.fn(async () => null),
    deleteDesign: vi.fn(async () => {}),
  };
  return { storage, saved };
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
    const { storage, saved } = fakeStorage();
    const id = await ensureMasterDesign(args(storage));
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(id);
    expect(saved[0].meta?.isTemplate).toBe(true);
    expect(saved[0].meta?.sourceTemplateId).toBe('invoices-ext-4');
  });

  it('reuses the existing master instead of seeding a second one', async () => {
    const { storage, saved } = fakeStorage([
      { id: 'master-1', isTemplate: true, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).toBe('master-1');
    expect(saved).toHaveLength(0);
  });

  it('does not mistake a working design for a master', async () => {
    const { storage, saved } = fakeStorage([
      { id: 'instance-1', isTemplate: false, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).not.toBe('instance-1');
    expect(saved).toHaveLength(1);
  });
});
