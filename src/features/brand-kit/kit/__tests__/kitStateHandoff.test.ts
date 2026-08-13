/**
 * Kit state moving from the browser to the server, and the two ordering bugs
 * that come with an async repository.
 *
 * Everything here is about a user NOT losing their Kit: not on the day the
 * server table appears, not when two mutations race, not when they navigate
 * between brands while a load is still in flight.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalKitStateRepository, setKitStateRepository } from '../repository';
import { SupabaseKitStateRepository } from '../repository.supabase';
import type { BrandKitState } from '../types';

/**
 * A deployed-but-empty `brand_kit_state`: the query succeeds and returns no
 * row. That is the case the finding is about — a missing TABLE already fell
 * back to local, but a missing ROW reported an empty Kit.
 */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

const BRAND = '11111111-1111-1111-1111-111111111111';

function state(marker: string): BrandKitState {
  return {
    version: 1,
    deliverables: {
      logo: {
        items: [{ id: marker, variantId: `v_${marker}`, status: 'approved', customization: null,
                  createdAt: '2026-01-01T00:00:00.000Z', approvedAt: '2026-01-01T00:00:00.000Z' }],
        primaryItemId: marker,
        error: null,
        seenVariantIds: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  } as unknown as BrandKitState;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('CodeRabbit Round 2 #11 — deploying 018 must not empty an existing Kit', () => {
  it('adopts the local Kit when the server has no row, and persists it up', async () => {
    // The user's Kit was built while state was browser-local. Reporting "no
    // row" as "no Kit" would show them an empty Kit the day 018 deploys.
    await new LocalKitStateRepository().save(BRAND, state('built-locally'));

    const repo = new SupabaseKitStateRepository();
    const saved: BrandKitState[] = [];
    vi.spyOn(repo, 'save').mockImplementation(async (_id, s) => { saved.push(s); return true; });

    const loaded = await repo.load(BRAND);

    expect(loaded?.deliverables.logo.primaryItemId).toBe('built-locally');
    // And it was carried up, so the next load finds it server-side.
    expect(saved).toHaveLength(1);
    expect(saved[0].deliverables.logo.primaryItemId).toBe('built-locally');
  });

  it('still reports an empty Kit when there is genuinely nothing anywhere', async () => {
    const repo = new SupabaseKitStateRepository();
    vi.spyOn(repo, 'save').mockResolvedValue(true);
    expect(await repo.load(BRAND)).toBeNull();
  });
});

describe('CodeRabbit Round 2 #9/#10 — ordering', () => {
  it('#9 saves for one brand arrive in the order they were issued', async () => {
    // The race: two mutations, both fire-and-forget. If the first request is
    // slower than the second, the server keeps the OLDER state — the user's
    // last action silently undone on the next reload.
    const arrived: (string | null)[] = [];
    let releaseFirst: (() => void) | null = null;
    let saveCount = 0;

    setKitStateRepository({
      load: async () => state('seed'),
      save: async (_id: string, s: BrandKitState) => {
        saveCount += 1;
        if (saveCount === 1) {
          await new Promise<void>((r) => { releaseFirst = r; });
        }
        arrived.push((s.deliverables.logo.items[0]?.customization ?? null) as unknown as string | null);
        return true;
      },
    });

    const { useKitStore } = await import('../kitStore');
    useKitStore.setState({ brandId: BRAND, deliverables: state('seed').deliverables });

    // Two mutations back to back. The first save is held open.
    useKitStore.getState().updateItemCustomization('logo', 'seed', 'first' as never);
    await Promise.resolve();
    useKitStore.getState().updateItemCustomization('logo', 'seed', 'second' as never);

    // Let the first save actually start and block.
    while (!releaseFirst) await new Promise((r) => setTimeout(r, 1));

    // Even with the first write held open, the second must not overtake it —
    // and must not even have been ISSUED yet.
    expect(saveCount).toBe(1);
    expect(arrived).toEqual([]);

    releaseFirst();
    for (let i = 0; i < 10; i += 1) await new Promise((r) => setTimeout(r, 1));

    expect(arrived).toEqual(['first', 'second']);
    // And the state that ends up on the server is the one issued last.
    expect(arrived[arrived.length - 1]).toBe('second');
  });

  it('#10 a hydration that finishes late does not replace the active brand', async () => {
    const BRAND_B = '22222222-2222-2222-2222-222222222222';
    const gates = new Map<string, () => void>();

    setKitStateRepository({
      load: async (id: string) => {
        await new Promise<void>((r) => gates.set(id, r));
        return state(id === BRAND ? 'A' : 'B');
      },
      save: async () => true,
    });

    const { useKitStore } = await import('../kitStore');
    useKitStore.setState({ brandId: null, deliverables: {} });

    const mock = { id: BRAND } as never;
    const a = useKitStore.getState().hydrate(BRAND, mock);
    const b = useKitStore.getState().hydrate(BRAND_B, mock);

    // B (the brand the user navigated to) completes FIRST, A completes last.
    gates.get(BRAND_B)?.();
    await b;
    gates.get(BRAND)?.();
    await a;

    // The UI is on B. A finishing last must not drag the store back.
    expect(useKitStore.getState().brandId).toBe(BRAND_B);
  });
});
