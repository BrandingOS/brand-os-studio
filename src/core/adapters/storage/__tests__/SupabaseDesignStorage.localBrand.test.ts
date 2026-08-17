/**
 * SupabaseDesignStorage — non-uuid (seed / local) brand ids never reach the
 * server: `brand_id` is a uuid column, so `raqm-brand-001` would 22P02 on every
 * call. Such brands' designs live in LocalDesignStorage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const from = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }));

import { SupabaseDesignStorage } from '../SupabaseDesignStorage';

describe('SupabaseDesignStorage — local (non-uuid) brands', () => {
  beforeEach(() => { localStorage.clear(); from.mockReset(); });

  it('save / load / list / delete for a seed brand id never touch Supabase', async () => {
    const store = new SupabaseDesignStorage();
    await store.saveDesign('raqm-brand-001', 'd1', { a: 1 }, { name: 'N' });
    expect(await store.loadDesign('raqm-brand-001', 'd1')).toEqual({ a: 1 });
    expect((await store.listDesigns('raqm-brand-001')).map((s) => s.id)).toContain('d1');
    await store.deleteDesign('raqm-brand-001', 'd1');
    expect(await store.loadDesign('raqm-brand-001', 'd1')).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
