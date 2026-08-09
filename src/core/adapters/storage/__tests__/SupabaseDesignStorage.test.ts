/**
 * SupabaseDesignStorage — pre-015 tolerance.
 *
 * When the `designs` table is missing (42P01 / PGRST205), every method must
 * DELEGATE to LocalDesignStorage so nothing breaks or is lost before migration
 * 015 deploys. Post-015 the server path is used (covered by the mapping helpers).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Simulate a Supabase project WITHOUT the designs table: every query resolves to
// a 42P01 undefined_table error. A Proxy makes the builder infinitely chainable
// AND awaitable (so `.upsert()` and `.select().eq()...maybeSingle()` both work).
const missingTableResult = {
  data: null,
  error: { code: '42P01', message: 'relation "public.designs" does not exist' },
};
vi.mock('@/integrations/supabase/client', () => {
  const chain: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) => Promise.resolve(missingTableResult).then(resolve);
        }
        return () => chain;
      },
    },
  );
  return { supabase: { from: () => chain } };
});

import { SupabaseDesignStorage } from '../SupabaseDesignStorage';

describe('SupabaseDesignStorage — pre-015 fallback to local', () => {
  beforeEach(() => localStorage.clear());

  it('save → load round-trips via the local fallback when the table is missing', async () => {
    const store = new SupabaseDesignStorage();
    await store.saveDesign('b1', 'd1', { blocks: [1, 2, 3] }, { name: 'My Design', width: 800 });

    // The body landed in localStorage (LocalDesignStorage keys).
    expect(localStorage.getItem('brandos:design:b1:d1')).toBeTruthy();

    const loaded = await store.loadDesign('b1', 'd1');
    expect(loaded).toEqual({ blocks: [1, 2, 3] });

    const list = await store.listDesigns('b1');
    expect(list.find((s) => s.id === 'd1')?.name).toBe('My Design');
  });

  it('delete clears the local copy too', async () => {
    const store = new SupabaseDesignStorage();
    await store.saveDesign('b1', 'd2', { x: 1 });
    await store.deleteDesign('b1', 'd2');
    expect(localStorage.getItem('brandos:design:b1:d2')).toBeNull();
    expect(await store.loadDesign('b1', 'd2')).toBeNull();
  });
});
