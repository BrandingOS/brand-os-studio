// ============================================================================
// Which workspace you are in survives a page load; what you may do in it does not.
//
// The store is deliberately never persisted — a removed member must not keep a cached yes
// — and that rule was applied to the whole store, including the pointer saying which
// workspace was open. So switching to the team workspace and then following any link that
// reloads the document put the user back in their empty personal workspace, looking at
// "1 of 1 seats" with Invite disabled. Remembering the pointer grants nothing: every
// capability is still resolved by `my_access()` on the server, and a workspace the user
// has since left simply is not in the answer.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
}));

const KEY = 'brandos:current-workspace';

const ws = (id: string, isPersonal: boolean) => ({
  id, name: id, slug: id, isPersonal, role: 'owner', mode: 'all',
  defaultBrandRole: 'manager', overrides: {}, creditsMonthlyCap: null,
  capabilities: ['workspace.view'],
});

const ACCESS = { data: { workspaces: [ws('personal', true), ws('team', false)] }, error: null };

let useAccessStore: typeof import('../accessStore')['useAccessStore'];

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  rpc.mockReset();
  rpc.mockImplementation((name: string) =>
    Promise.resolve(name === 'my_access' ? ACCESS : { data: { brands: [] }, error: null }));
  ({ useAccessStore } = await import('../accessStore'));
});

afterEach(() => localStorage.clear());

describe('the current workspace is remembered, the capabilities are not', () => {
  it('opens in the personal workspace when nothing has been chosen', async () => {
    await useAccessStore.getState().hydrate();
    expect(useAccessStore.getState().currentWorkspaceId).toBe('personal');
  });

  it('reopens in the workspace last switched to', async () => {
    await useAccessStore.getState().hydrate();
    await useAccessStore.getState().setCurrentWorkspace('team');
    expect(localStorage.getItem(KEY)).toBe('team');

    // A page load: a brand-new store, filled from the server again
    vi.resetModules();
    const fresh = (await import('../accessStore')).useAccessStore;
    expect(fresh.getState().phase).toBe('unknown');   // nothing cached
    await fresh.getState().hydrate();
    expect(fresh.getState().currentWorkspaceId).toBe('team');
  });

  it('falls back when the remembered workspace is no longer ours', async () => {
    localStorage.setItem(KEY, 'a-workspace-we-were-removed-from');
    await useAccessStore.getState().hydrate();
    expect(useAccessStore.getState().currentWorkspaceId).toBe('personal');
  });

  it('forgets the pointer on sign-out', async () => {
    await useAccessStore.getState().hydrate();
    await useAccessStore.getState().setCurrentWorkspace('team');
    useAccessStore.getState().reset();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('never persists capabilities', async () => {
    await useAccessStore.getState().hydrate();
    await useAccessStore.getState().setCurrentWorkspace('team');
    const stored = Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '').join(' ');
    expect(stored).not.toMatch(/workspace\.view|capabilities/);
  });
});
