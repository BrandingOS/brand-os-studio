import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Supabase stand-in ───────────────────────────────────────────────────────
// One chainable builder whose terminal calls are programmable per test.
const state = {
  selectResult: { data: null as any, error: null as any },
  upsertResult: { error: null as any },
  upserts: [] as any[],
  selects: 0,
  userId: 'user-1' as string | null,
};

function builder() {
  const chain: any = {
    select: () => {
      state.selects += 1;
      return chain;
    },
    eq: () => chain,
    maybeSingle: async () => state.selectResult,
    upsert: async (row: any) => {
      state.upserts.push(row);
      return state.upsertResult;
    },
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => builder(),
    auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }) },
  },
}));

import { MIRROR_KEY, readMirror } from '../preferencesShape';
import { LocalUserPreferencesService } from '../LocalUserPreferencesService';
import { SupabaseUserPreferencesService } from '../SupabaseUserPreferencesService';

beforeEach(() => {
  window.localStorage.clear();
  state.selectResult = { data: null, error: null };
  state.upsertResult = { error: null };
  state.upserts = [];
  state.selects = 0;
  state.userId = 'user-1';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LocalUserPreferencesService', () => {
  it('reads synchronously from a cold start', () => {
    const svc = new LocalUserPreferencesService();
    expect(svc.getCached()).toEqual({});
    expect(svc.isServerBacked()).toBe(false);
  });

  it('writes the mirror before the promise settles', () => {
    const svc = new LocalUserPreferencesService();
    // Deliberately NOT awaited: store initialisers cannot await, so the mirror
    // has to be correct the moment set() is called.
    void svc.set({ theme: 'dark' });
    expect(readMirror()).toEqual({ theme: 'dark' });
    expect(svc.getCached().theme).toBe('dark');
  });

  it('notifies subscribers and can unsubscribe', async () => {
    const svc = new LocalUserPreferencesService();
    const seen: unknown[] = [];
    const off = svc.subscribe((p) => seen.push(p.theme));
    await svc.set({ theme: 'dark' });
    off();
    await svc.set({ theme: 'light' });
    expect(seen).toEqual(['dark']);
  });

  it('picks up a change made in another tab', async () => {
    const svc = new LocalUserPreferencesService();
    const seen: unknown[] = [];
    svc.subscribe((p) => seen.push(p.uiPreference));

    window.localStorage.setItem(MIRROR_KEY, JSON.stringify({ uiPreference: 'classic' }));
    window.dispatchEvent(new StorageEvent('storage', { key: MIRROR_KEY }));

    expect(svc.getCached().uiPreference).toBe('classic');
    expect(seen).toEqual(['classic']);
  });
});

describe('SupabaseUserPreferencesService — degradation', () => {
  it('falls back to local when the table is missing (42P01)', async () => {
    state.selectResult = { data: null, error: { code: '42P01', message: 'undefined_table' } };
    const svc = new SupabaseUserPreferencesService();

    await expect(svc.hydrate()).resolves.toEqual({});
    expect(svc.isServerBacked()).toBe(false);
  });

  it('falls back when PostgREST cannot find the relation (PGRST205)', async () => {
    state.selectResult = {
      data: null,
      error: { code: 'PGRST205', message: "Could not find the table 'public.user_preferences'" },
    };
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    expect(svc.isServerBacked()).toBe(false);
  });

  it('probes ONCE per session — a degraded service stops calling the network', async () => {
    state.selectResult = { data: null, error: { code: '42P01', message: 'undefined_table' } };
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    const after = state.selects;

    await svc.set({ theme: 'dark' });
    await vi.advanceTimersByTimeAsync(1000);
    await svc.flush();

    expect(state.selects).toBe(after);
    expect(state.upserts).toHaveLength(0);
    // …and the value still round-trips locally.
    expect(svc.getCached().theme).toBe('dark');
  });

  it('keeps the local value when a write fails transiently', async () => {
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    state.upsertResult = { error: { code: '08006', message: 'connection failure' } };

    await svc.set({ theme: 'dark' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(svc.getCached().theme).toBe('dark');
    expect(readMirror().theme).toBe('dark');
  });
});

describe('SupabaseUserPreferencesService — hydrate reconciliation', () => {
  it('case 3: no server row seeds one from the legacy keys and keeps them', async () => {
    window.localStorage.setItem('brandos-theme', 'dark');
    window.localStorage.setItem(
      'brandos:ui-preference',
      JSON.stringify({ state: { preference: 'classic' } }),
    );
    state.selectResult = { data: null, error: null };

    const svc = new SupabaseUserPreferencesService();
    const out = await svc.hydrate();

    expect(out).toMatchObject({ theme: 'dark', uiPreference: 'classic' });
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].preferences).toMatchObject({ theme: 'dark' });
    // Never deleted — rolling migration 030 back must be a no-op for the user.
    expect(window.localStorage.getItem('brandos-theme')).toBe('dark');
  });

  it('case 2: a fresh device adopts the server row wholesale', async () => {
    state.selectResult = {
      data: { preferences: { theme: 'dark', uiPreference: 'classic' } },
      error: null,
    };
    const svc = new SupabaseUserPreferencesService();
    const out = await svc.hydrate();
    expect(out).toEqual({ theme: 'dark', uiPreference: 'classic' });
  });

  it('case 1: the SERVER wins on a conflicting key', async () => {
    // A fresh device holds defaults, not intentions. If local won, signing in
    // on a new laptop would push that laptop's defaults over real settings.
    window.localStorage.setItem(MIRROR_KEY, JSON.stringify({ theme: 'light' }));
    state.selectResult = { data: { preferences: { theme: 'dark' } }, error: null };

    const svc = new SupabaseUserPreferencesService();
    expect((await svc.hydrate()).theme).toBe('dark');
  });

  it('case 1: a local-only key is promoted, not dropped', async () => {
    window.localStorage.setItem(
      MIRROR_KEY,
      JSON.stringify({ theme: 'light', lastWorkspaceId: 'ws-9' }),
    );
    state.selectResult = { data: { preferences: { theme: 'dark' } }, error: null };

    const svc = new SupabaseUserPreferencesService();
    const out = await svc.hydrate();

    expect(out).toEqual({ theme: 'dark', lastWorkspaceId: 'ws-9' });
    // Promoted back to the server exactly once.
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].preferences).toMatchObject({ lastWorkspaceId: 'ws-9' });
  });

  it('writes nothing back when the server row already matches', async () => {
    window.localStorage.setItem(MIRROR_KEY, JSON.stringify({ theme: 'dark' }));
    state.selectResult = { data: { preferences: { theme: 'dark' } }, error: null };

    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    expect(state.upserts).toHaveLength(0);
  });

  it('stays local for a signed-out caller', async () => {
    state.userId = null;
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    expect(svc.isServerBacked()).toBe(false);
    expect(state.upserts).toHaveLength(0);
  });
});

describe('SupabaseUserPreferencesService — writing', () => {
  it('coalesces a burst into ONE server write carrying both patches', async () => {
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    state.upserts = [];

    await svc.set({ theme: 'dark' });
    await svc.set({ uiPreference: 'classic' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].preferences).toMatchObject({
      theme: 'dark',
      uiPreference: 'classic',
    });
  });

  it('read-modify-writes, so another device’s different key survives', async () => {
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    state.upserts = [];
    // Another device wrote uiPreference while this one was idle.
    state.selectResult = { data: { preferences: { uiPreference: 'classic' } }, error: null };

    await svc.set({ theme: 'dark' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(state.upserts[0].preferences).toEqual({
      uiPreference: 'classic',
      theme: 'dark',
    });
  });

  it('flush() writes immediately without waiting out the debounce', async () => {
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    state.upserts = [];

    await svc.set({ theme: 'dark' });
    await svc.flush();

    expect(state.upserts).toHaveLength(1);
  });

  it('flush() with nothing pending is a no-op', async () => {
    const svc = new SupabaseUserPreferencesService();
    await svc.hydrate();
    state.upserts = [];
    await svc.flush();
    expect(state.upserts).toHaveLength(0);
  });
});
