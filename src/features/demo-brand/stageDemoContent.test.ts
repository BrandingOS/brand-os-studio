import { beforeEach, describe, expect, it } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { useGuidelineDocStore } from '@/features/guideline/model/guidelineDocStore';
import { getKitStateRepository } from '@/features/brand-kit/kit/repository';
import { deliverableKey } from '@/features/brand-kit/kit/types';
import { stageDemoBrandContent, __resetDemoStagingForTests } from './stageDemoContent';

function brand(over: Partial<Brand> = {}): Brand {
  return {
    id: 'demo-1',
    slug: 'brandingos',
    name: 'BrandingOS',
    primaryColor: '#111113',
    secondaryColor: '#F5F4EF',
    fonts: { primary: 'Plus Jakarta Sans' },
    tone: 'Warm, precise, quiet',
    audience: 'Founders and brand teams',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDemo: true,
    ...over,
  } as Brand;
}

describe('demo brand staging', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDemoStagingForTests();
    useGuidelineDocStore.setState({ docs: {}, hasHydrated: true });
  });

  it('builds a guideline document for the demo brand', async () => {
    await stageDemoBrandContent(brand());
    const doc = useGuidelineDocStore.getState().get('demo-1');
    expect(doc).toBeDefined();
    expect(doc!.pages.length).toBeGreaterThan(10);
  });

  it('approves the four everyday deliverables', async () => {
    await stageDemoBrandContent(brand());
    const state = await getKitStateRepository().load('demo-1');
    expect(state).not.toBeNull();

    const card = state!.deliverables[deliverableKey('stationery', 'Business Card')];
    expect(card?.items).toHaveLength(1);
    expect(card?.items[0].status).toBe('approved');
    expect(card?.primaryItemId).toBe(card?.items[0].id);
    // Every candidate is marked seen so "Show me more" walks further down the
    // library rather than re-offering what is already approved.
    expect(card!.seenVariantIds.length).toBeGreaterThanOrEqual(1);
  });

  it('does nothing at all for a brand the user made', async () => {
    await stageDemoBrandContent(brand({ id: 'mine-1', isDemo: undefined }));
    expect(useGuidelineDocStore.getState().get('mine-1')).toBeUndefined();
    expect(await getKitStateRepository().load('mine-1')).toBeNull();
  });

  it('NEVER overwrites a guideline the user has already worked on', async () => {
    const b = brand();
    useGuidelineDocStore.getState().build(b);
    useGuidelineDocStore.getState().removePage('demo-1', useGuidelineDocStore.getState().get('demo-1')!.pages[0].id);
    const afterEdit = useGuidelineDocStore.getState().get('demo-1')!.pages.length;

    __resetDemoStagingForTests();
    await stageDemoBrandContent(b);

    expect(useGuidelineDocStore.getState().get('demo-1')!.pages).toHaveLength(afterEdit);
  });

  it('NEVER overwrites existing kit state — including a deliberately emptied kit', async () => {
    await getKitStateRepository().save('demo-1', { version: 1, deliverables: {} });

    await stageDemoBrandContent(brand());

    const state = await getKitStateRepository().load('demo-1');
    expect(Object.keys(state!.deliverables)).toEqual([]);
  });

  it('is idempotent — running twice changes nothing', async () => {
    const b = brand();
    await stageDemoBrandContent(b);
    const first = JSON.stringify(await getKitStateRepository().load('demo-1'));
    const pages = useGuidelineDocStore.getState().get('demo-1')!.pages.length;

    __resetDemoStagingForTests();
    await stageDemoBrandContent(b);

    expect(JSON.stringify(await getKitStateRepository().load('demo-1'))).toBe(first);
    expect(useGuidelineDocStore.getState().get('demo-1')!.pages).toHaveLength(pages);
  });
});
