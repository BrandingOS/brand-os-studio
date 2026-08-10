import { beforeEach, describe, expect, it } from 'vitest';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../data/legacy-mapping';
import { DELIVERABLES, getDeliverable, isDeliverableCard } from './registry';
import { TemplateLibraryGenerator, rankVariants } from './generation';
import { LocalKitStateRepository } from './repository';
import { deriveStatus, emptyKitState, primaryItem } from './types';
import { kitCounts, statusOf, useKitStore } from './kitStore';

const CTX = { seed: 'brand-test-1', brand: mockBrand };

function resetStore() {
  localStorage.clear();
  useKitStore.setState({ brandId: null, deliverables: {}, generatingKeys: [] });
}

describe('deliverable registry', () => {
  it('defines 25 deliverables with unique keys and valid config', () => {
    expect(DELIVERABLES).toHaveLength(25);
    const keys = new Set(DELIVERABLES.map((d) => d.key));
    expect(keys.size).toBe(25);
    for (const def of DELIVERABLES) {
      expect(def.aspect).toBeGreaterThan(0);
      expect(def.templateType.length).toBeGreaterThan(0);
      expect(def.candidateCount).toBeGreaterThan(0);
      expect(def.controlGroups.length).toBeGreaterThan(0);
    }
  });

  it('every deliverable resolves at least candidateCount variants', () => {
    for (const def of DELIVERABLES) {
      const variants = variantsForCard(def.sectionKey, def.label, mockBrand);
      expect(variants.length, def.key).toBeGreaterThanOrEqual(def.candidateCount);
    }
  });

  it('brand-asset cards are not deliverables', () => {
    expect(isDeliverableCard('brand-assets', 'Logos')).toBe(false);
    expect(isDeliverableCard('stationery', 'Business Card')).toBe(true);
    expect(getDeliverable('stationery', 'Business Card')?.templateType).toBe('business-cards');
  });
});

describe('TemplateLibraryGenerator', () => {
  const def = getDeliverable('stationery', 'Business Card')!;
  const gen = new TemplateLibraryGenerator();

  it('is deterministic for a given seed and ranks featured ids first', async () => {
    const a = await gen.generate(def, CTX);
    const b = await gen.generate(def, CTX);
    expect(a.candidates.map((t) => t.id)).toEqual(b.candidates.map((t) => t.id));
    expect(a.candidates[0].id).toBe(def.featuredIds![0]);
    expect(a.candidates).toHaveLength(def.candidateCount);
  });

  it('different seeds produce different rankings past the featured set', () => {
    const templates = variantsForCard(def.sectionKey, def.label, mockBrand);
    const r1 = rankVariants(def, templates, { seed: 'brand-a', brand: mockBrand });
    const r2 = rankVariants(def, templates, { seed: 'brand-b', brand: mockBrand });
    const tail1 = r1.slice(3, 15).map((t) => t.id);
    const tail2 = r2.slice(3, 15).map((t) => t.id);
    expect(tail1).not.toEqual(tail2);
  });

  it('excludes seen variants and wraps around when exhausted', async () => {
    const first = await gen.generate(def, CTX);
    const second = await gen.generate(def, CTX, {
      exclude: first.candidates.map((t) => t.id),
    });
    const firstIds = new Set(first.candidates.map((t) => t.id));
    expect(second.candidates.some((t) => firstIds.has(t.id))).toBe(false);

    const all = variantsForCard(def.sectionKey, def.label, mockBrand).map((t) => t.id);
    const wrapped = await gen.generate(def, CTX, { exclude: all });
    expect(wrapped.candidates).toHaveLength(def.candidateCount);
  });
});

describe('LocalKitStateRepository', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips state per brand and rejects corrupt payloads', () => {
    const repo = new LocalKitStateRepository();
    const state = emptyKitState();
    state.deliverables['stationery::Business Card'] = {
      items: [],
      primaryItemId: null,
      error: null,
      seenVariantIds: ['x'],
      updatedAt: '2026-08-10T00:00:00.000Z',
    };
    expect(repo.save('b1', state)).toBe(true);
    expect(repo.load('b1')).toEqual(state);
    expect(repo.load('other')).toBeNull();

    localStorage.setItem('brandos:brand-kit:state', '{not json');
    expect(repo.load('b1')).toBeNull();
  });
});

describe('kitStore lifecycle', () => {
  const KEY = 'stationery::Business Card';

  beforeEach(resetStore);

  async function generateOne(key = KEY) {
    useKitStore.getState().hydrate('brand-test-1', mockBrand);
    await useKitStore.getState().generate([key], CTX, { minDelayMs: 0 });
  }

  it('not-created → generate → review → approve → approved', async () => {
    useKitStore.getState().hydrate('brand-test-1', mockBrand);
    expect(statusOf(useKitStore.getState(), KEY)).toBe('not-created');

    await generateOne();
    const afterGen = useKitStore.getState();
    expect(statusOf(afterGen, KEY)).toBe('review');
    const candidates = afterGen.deliverables[KEY].items;
    expect(candidates).toHaveLength(3);

    useKitStore.getState().approve(KEY, candidates[0].id);
    const after = useKitStore.getState();
    expect(statusOf(after, KEY)).toBe('approved');
    // Approving one candidate drops the others.
    expect(after.deliverables[KEY].items).toHaveLength(1);
    expect(after.deliverables[KEY].primaryItemId).toBe(candidates[0].id);
  });

  it('persists through the repository and re-hydrates', async () => {
    await generateOne();
    const id = useKitStore.getState().deliverables[KEY].items[0].id;
    useKitStore.getState().approve(KEY, id);

    // Simulate a fresh session.
    useKitStore.setState({ brandId: null, deliverables: {}, generatingKeys: [] });
    useKitStore.getState().hydrate('brand-test-1', mockBrand);
    expect(statusOf(useKitStore.getState(), KEY)).toBe('approved');
  });

  it('removing the primary promotes the next approved item; removing the last returns to not-created', async () => {
    await generateOne();
    const state = useKitStore.getState();
    const [c1] = state.deliverables[KEY].items;
    state.approve(KEY, c1.id);
    useKitStore.getState().addApprovedItem(KEY, 'business-cards-ext-4');

    const withTwo = useKitStore.getState().deliverables[KEY];
    expect(withTwo.items).toHaveLength(2);
    expect(withTwo.primaryItemId).toBe(c1.id);

    useKitStore.getState().removeItem(KEY, c1.id);
    const afterRemove = useKitStore.getState().deliverables[KEY];
    expect(afterRemove.primaryItemId).toBe(withTwo.items[1].id);

    useKitStore.getState().removeItem(KEY, afterRemove.primaryItemId!);
    expect(statusOf(useKitStore.getState(), KEY)).toBe('not-created');
  });

  it('archive keeps the item but takes it out of the approved set', async () => {
    await generateOne();
    const [c1] = useKitStore.getState().deliverables[KEY].items;
    useKitStore.getState().approve(KEY, c1.id);
    useKitStore.getState().archiveItem(KEY, c1.id);

    const record = useKitStore.getState().deliverables[KEY];
    expect(record.items[0].status).toBe('archived');
    expect(statusOf(useKitStore.getState(), KEY)).toBe('not-created');
    expect(primaryItem(record)).toBeNull();
  });

  it('duplicate copies customization into a new approved item', async () => {
    await generateOne();
    const [c1] = useKitStore.getState().deliverables[KEY].items;
    useKitStore.getState().approve(KEY, c1.id);
    useKitStore.getState().updateItemCustomization(KEY, c1.id, {
      overrides: { title: 'Hamza' },
      cover: null,
      color: '#112233',
      secondaryColor: null,
      logoId: null,
      logoColor: null,
      fontId: null,
      savedAt: '2026-08-10T00:00:00.000Z',
    });
    useKitStore.getState().duplicateItem(KEY, c1.id);

    const record = useKitStore.getState().deliverables[KEY];
    expect(record.items).toHaveLength(2);
    expect(record.items[1].customization?.overrides.title).toBe('Hamza');
    expect(record.items[1].id).not.toBe(c1.id);
  });

  it('regenerate replaces candidates with unseen variants', async () => {
    await generateOne();
    const firstIds = useKitStore.getState().deliverables[KEY].items.map((i) => i.variantId);
    await useKitStore.getState().regenerate(KEY, CTX, { minDelayMs: 0 });
    const secondIds = useKitStore.getState().deliverables[KEY].items.map((i) => i.variantId);
    expect(secondIds).toHaveLength(3);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it('generation failure lands in error and is retriable', async () => {
    useKitStore.getState().hydrate('brand-test-1', mockBrand);
    const failing = {
      generate: async () => {
        throw new Error('boom');
      },
    };
    await useKitStore.getState().generate([KEY], CTX, { minDelayMs: 0, generator: failing });
    expect(useKitStore.getState().deliverables[KEY].error).toBe('boom');
    expect(statusOf(useKitStore.getState(), KEY)).toBe('not-created');
    useKitStore.getState().clearError(KEY);
    expect(useKitStore.getState().deliverables[KEY].error).toBeNull();
  });

  it('approveTopCandidates bulk-approves the first candidate of each key', async () => {
    useKitStore.getState().hydrate('brand-test-1', mockBrand);
    const keys = [KEY, 'stationery::Letterhead'];
    await useKitStore.getState().generate(keys, CTX, { minDelayMs: 0 });
    useKitStore.getState().approveTopCandidates(keys);
    const state = useKitStore.getState();
    for (const key of keys) {
      expect(statusOf(state, key)).toBe('approved');
    }
    expect(kitCounts(state).approved).toBe(2);
    expect(kitCounts(state).total).toBe(25);
  });

  it('migrates pre-redesign card customizations into approved items', () => {
    localStorage.setItem(
      'brandos:brand-kit:customizations',
      JSON.stringify({
        'brand-m1': {
          'business-cards-ext-3': {
            overrides: { title: 'Saved Name' },
            cover: null,
            color: null,
            secondaryColor: null,
            logoId: null,
            logoColor: null,
            fontId: null,
            savedAt: '2026-08-01T00:00:00.000Z',
          },
          'label:Business Card': {
            overrides: {},
            cover: null,
            color: null,
            secondaryColor: null,
            logoId: null,
            logoColor: null,
            fontId: null,
            savedAt: '2026-08-01T00:00:00.000Z',
          },
        },
      }),
    );
    useKitStore.getState().hydrate('brand-m1', mockBrand);
    const state = useKitStore.getState();
    expect(statusOf(state, KEY)).toBe('approved');
    const record = state.deliverables[KEY];
    expect(record.items).toHaveLength(1);
    expect(record.items[0].variantId).toBe('business-cards-ext-3');
    expect(record.items[0].customization?.overrides.title).toBe('Saved Name');
  });
});

describe('deriveStatus', () => {
  it('prefers generating over derived states', () => {
    expect(deriveStatus(undefined, true)).toBe('generating');
    expect(deriveStatus(undefined, false)).toBe('not-created');
  });
});
