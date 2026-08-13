/**
 * The kit state repository after the sync → async change, and the approvals
 * migration that rides on it.
 *
 * The async switch is the enabling change for a server-backed kit, so what
 * matters is that the local implementation behaves exactly as it did — a
 * regression here means every user's Brand Kit fails to load.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalKitStateRepository,
  getKitStateRepository,
  setKitStateRepository,
} from '../repository';
import { emptyKitState, type BrandKitState } from '../types';
import { LocalKitAdoptionService } from '@/core/adapters/kit-adoptions/LocalKitAdoptionService';
import { migrateApprovalsToAdoptions, deliverableRef } from '../migrateApprovals';
import type { HumanActor } from '@/domain/brand/coreMeta';

const BRAND = '11111111-1111-1111-1111-111111111111';
const actor: HumanActor = { kind: 'human', userId: 'owner_1' };

function stateWithApproved(key: string, itemIds: string[]): BrandKitState {
  return {
    version: 1,
    deliverables: {
      [key]: {
        items: itemIds.map((id) => ({
          id,
          variantId: `v_${id}`,
          status: 'approved' as const,
          customization: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          approvedAt: '2026-02-02T00:00:00.000Z',
        })),
        primaryItemId: itemIds[0] ?? null,
        error: null,
        seenVariantIds: [],
        updatedAt: '2026-02-02T00:00:00.000Z',
      },
    },
  } as unknown as BrandKitState;
}

beforeEach(() => {
  localStorage.clear();
  setKitStateRepository(new LocalKitStateRepository());
});

describe('LocalKitStateRepository (async)', () => {
  it('round-trips per brand', async () => {
    const repo = new LocalKitStateRepository();
    expect(await repo.load(BRAND)).toBeNull();

    expect(await repo.save(BRAND, emptyKitState())).toBe(true);
    expect(await repo.load(BRAND)).toEqual(emptyKitState());
    // A different brand is unaffected.
    expect(await repo.load('other')).toBeNull();
  });

  it('rejects a payload with an unrecognised version rather than half-loading it', async () => {
    localStorage.setItem(
      'brandos:brand-kit:state',
      JSON.stringify({ [BRAND]: { version: 99, deliverables: {} } }),
    );
    expect(await new LocalKitStateRepository().load(BRAND)).toBeNull();
  });

  it('survives a corrupt store', async () => {
    localStorage.setItem('brandos:brand-kit:state', 'not json');
    expect(await new LocalKitStateRepository().load(BRAND)).toBeNull();
  });

  it('is the default registration, and is swappable', async () => {
    expect(getKitStateRepository()).toBeInstanceOf(LocalKitStateRepository);
    const fake = { load: async () => null, save: async () => true };
    setKitStateRepository(fake);
    expect(getKitStateRepository()).toBe(fake);
  });
});

describe('migrateApprovalsToAdoptions', () => {
  it('turns approved kit items into attributed adoptions', async () => {
    await new LocalKitStateRepository().save(
      BRAND,
      stateWithApproved('stationery::Business Card', ['item_1', 'item_2']),
    );
    const adoptions = new LocalKitAdoptionService();

    const report = await migrateApprovalsToAdoptions(BRAND, adoptions, actor);

    expect(report.adopted).toEqual([
      deliverableRef('stationery::Business Card' as never, 'item_1'),
      deliverableRef('stationery::Business Card' as never, 'item_2'),
    ]);
    const rows = await adoptions.list(BRAND);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ targetKind: 'kit_deliverable', adoptedBy: 'owner_1' });
    // The original approval time is recorded, not the migration time.
    expect(rows[0].note).toContain('2026-02-02');
  });

  it('dry run writes nothing', async () => {
    await new LocalKitStateRepository().save(BRAND, stateWithApproved('k', ['i1']));
    const adoptions = new LocalKitAdoptionService();

    const report = await migrateApprovalsToAdoptions(BRAND, adoptions, actor, { dryRun: true });

    expect(report.adopted).toHaveLength(1);
    expect(await adoptions.list(BRAND)).toHaveLength(0);
  });

  it('is idempotent', async () => {
    await new LocalKitStateRepository().save(BRAND, stateWithApproved('k', ['i1']));
    const adoptions = new LocalKitAdoptionService();

    await migrateApprovalsToAdoptions(BRAND, adoptions, actor);
    const second = await migrateApprovalsToAdoptions(BRAND, adoptions, actor);

    expect(second.adopted).toEqual([]);
    expect(second.alreadyAdopted).toHaveLength(1);
    expect(await adoptions.list(BRAND)).toHaveLength(1);
  });

  it('leaves the kit blob untouched — approved items stay approved', async () => {
    const before = stateWithApproved('k', ['i1']);
    await new LocalKitStateRepository().save(BRAND, before);

    await migrateApprovalsToAdoptions(BRAND, new LocalKitAdoptionService(), actor);

    expect(await new LocalKitStateRepository().load(BRAND)).toEqual(before);
  });

  it('reports a brand with no kit state instead of failing', async () => {
    const report = await migrateApprovalsToAdoptions(BRAND, new LocalKitAdoptionService(), actor);
    expect(report.noKitState).toBe(true);
    expect(report.adopted).toEqual([]);
  });

  it('ignores non-approved items — only approvals are adoptions', async () => {
    const state = stateWithApproved('k', ['i1']);
    (state.deliverables as any)['k'].items[0].status = 'candidate';
    await new LocalKitStateRepository().save(BRAND, state);

    const report = await migrateApprovalsToAdoptions(BRAND, new LocalKitAdoptionService(), actor);
    expect(report.adopted).toEqual([]);
  });
});
