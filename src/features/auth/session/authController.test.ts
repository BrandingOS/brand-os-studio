import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// ─── Fakes (hoisted so vi.mock factories can see them) ──────────────────────
const H = vi.hoisted(() => {
  const listeners = new Set<(event: string, session: unknown) => void>();
  const emit = (event: string, session: unknown) => listeners.forEach((l) => l(event, session));
  const authApi = {
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    verifyOtp: vi.fn(),
    resend: vi.fn(async (_opts: unknown) => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
  };
  // A chainable stand-in for `supabase.from(...)` that resolves to no rows.
  const fromChain = () => {
    const chain: any = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'update', 'maybeSingle', 'abortSignal']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.then = (res: (v: unknown) => void) => res({ data: [], error: null });
    return chain;
  };
  return {
    listeners,
    emit,
    authApi,
    fromChain,
    reconfigureForAuth: vi.fn(),
    migrate: vi.fn(async () => {}),
    workspaceLoadAll: vi.fn(async () => {}),
    workspaceReset: vi.fn(),
    brandLoadAll: vi.fn(async () => {}),
    brandResetScope: vi.fn(),
    syncToSupabase: vi.fn(async () => {}),
    loadFromSupabase: vi.fn(async () => {}),
  };
});
const { listeners, authApi, reconfigureForAuth, migrate, workspaceLoadAll, workspaceReset, brandLoadAll, brandResetScope, syncToSupabase, loadFromSupabase } = H;
const emit = (event: AuthChangeEvent, session: Session | null) => H.emit(event, session);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: H.authApi, from: vi.fn(() => H.fromChain()) },
  SUPABASE_URL: 'http://test',
}));
vi.mock('@/core/boot', () => ({ reconfigureForAuth: (...a: unknown[]) => H.reconfigureForAuth(...a) }));
vi.mock('@/shared/utils/localStorage-migration', () => ({
  migrateLocalStorageToSupabase: () => H.migrate(),
}));
vi.mock('@/shared/store/workspaceStore', () => ({
  useWorkspaceStore: { getState: () => ({ loadAll: H.workspaceLoadAll, reset: H.workspaceReset }) },
}));
vi.mock('@/shared/store/brandStore', () => ({
  useBrandStore: { getState: () => ({ loadAll: H.brandLoadAll, resetScope: H.brandResetScope }) },
}));
vi.mock('@/shared/store/onboardingStore', () => ({
  useOnboardingStore: { getState: () => ({ syncToSupabase: H.syncToSupabase, loadFromSupabase: H.loadFromSupabase }) },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useSessionStore } from '@/shared/store/sessionStore';
import {
  startAuthController,
  __resetAuthControllerForTests,
  signInWithPassword,
  signUp,
  signOut,
  signInWithGoogle,
  verifySignupCode,
  resendSignupCode,
  handleAuthEvent,
  INITIAL_SESSION_FALLBACK_MS,
} from './authController';

const user = (id = 'u1', email = 'a@b.co') =>
  ({ id, email, created_at: '2026-01-01T00:00:00Z', user_metadata: { name: 'Ada' }, identities: [{}] }) as any;
const session = (u = user()) => ({ user: u, access_token: 't' }) as unknown as Session;

const resetStore = () =>
  useSessionStore.setState({
    user: undefined,
    isAuthenticated: false,
    isLoading: true,
    platformRole: 'user',
    isAdmin: false,
    isSuperAdmin: false,
    isModerator: false,
    recovery: false,
    roleResolved: false,
    mode: 'guest',
  });

beforeEach(() => {
  vi.useFakeTimers();
  listeners.clear();
  vi.clearAllMocks();
  __resetAuthControllerForTests();
  resetStore();
  localStorage.clear();
});
afterEach(() => {
  __resetAuthControllerForTests();
  vi.useRealTimers();
});

describe('lifecycle', () => {
  it('starts once — a second start does not subscribe again', () => {
    startAuthController();
    startAuthController();
    expect(authApi.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('INITIAL_SESSION with no session → guest, loading cleared', () => {
    startAuthController();
    emit('INITIAL_SESSION', null);
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(reconfigureForAuth).toHaveBeenLastCalledWith(false);
  });

  it('INITIAL_SESSION with a user → authenticated, services swapped once, side effects run', async () => {
    startAuthController();
    emit('INITIAL_SESSION', session());
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.isLoading).toBe(false);
    expect(s.user?.email).toBe('a@b.co');
    expect(reconfigureForAuth).toHaveBeenCalledWith(true);
    expect(reconfigureForAuth).toHaveBeenCalledTimes(1);
    expect(brandLoadAll).toHaveBeenCalledTimes(1);
    expect(workspaceLoadAll).toHaveBeenCalledTimes(1);
    expect(migrate).toHaveBeenCalledTimes(1);
  });

  it('never wipes guest brands before the migration reads them', () => {
    localStorage.setItem('brandos:brands', '[{"id":"local"}]');
    startAuthController();
    emit('INITIAL_SESSION', session());
    emit('SIGNED_IN', session());
    expect(localStorage.getItem('brandos:brands')).toBe('[{"id":"local"}]');
  });

  it('is idempotent by user id — SIGNED_IN twice runs side effects once', () => {
    startAuthController();
    emit('SIGNED_IN', session());
    emit('SIGNED_IN', session());
    emit('TOKEN_REFRESHED', session());
    expect(reconfigureForAuth).toHaveBeenCalledTimes(1);
    expect(brandLoadAll).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });

  it('drops the brand store BEFORE reloading it whenever the identity changes', () => {
    const order: string[] = [];
    brandResetScope.mockImplementation(() => order.push('reset'));
    brandLoadAll.mockImplementation(async () => { order.push('load'); });
    startAuthController();
    emit('SIGNED_IN', session());
    expect(order).toEqual(['reset', 'load']);
    // Same user again (token refresh) — nothing is dropped.
    emit('TOKEN_REFRESHED', session());
    expect(order).toEqual(['reset', 'load']);
    // Sign-out drops the user's brands and re-reads guest data.
    emit('SIGNED_OUT', null);
    expect(order).toEqual(['reset', 'load', 'reset', 'load']);
    // A second user gets a clean store too.
    emit('SIGNED_IN', session(user('u2', 'c@d.co')));
    expect(order).toEqual(['reset', 'load', 'reset', 'load', 'reset', 'load']);
  });

  it('a different user signing in re-runs the swap', () => {
    startAuthController();
    emit('SIGNED_IN', session(user('u1')));
    emit('SIGNED_IN', session(user('u2', 'c@d.co')));
    expect(reconfigureForAuth).toHaveBeenCalledTimes(2);
    expect(useSessionStore.getState().user?.id).toBe('u2');
  });

  it('SIGNED_OUT → guest, workspace reset, brands reloaded', () => {
    startAuthController();
    emit('SIGNED_IN', session());
    emit('SIGNED_OUT', null);
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(workspaceReset).toHaveBeenCalledTimes(1);
    expect(reconfigureForAuth).toHaveBeenLastCalledWith(false);
  });

  it('no INITIAL_SESSION within the fallback window → guest; a late SIGNED_IN still lands', () => {
    startAuthController();
    vi.advanceTimersByTime(INITIAL_SESSION_FALLBACK_MS + 1);
    expect(useSessionStore.getState().isLoading).toBe(false);
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
    emit('SIGNED_IN', session());
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });

  it('the fallback never signs out a session that already arrived', () => {
    startAuthController();
    emit('INITIAL_SESSION', session());
    vi.advanceTimersByTime(INITIAL_SESSION_FALLBACK_MS + 1);
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });

  it('PASSWORD_RECOVERY sets the recovery flag', () => {
    startAuthController();
    handleAuthEvent('PASSWORD_RECOVERY', session());
    expect(useSessionStore.getState().recovery).toBe(true);
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });

  it('role gate: roleResolved flips false on a new sign-in and true once the role is known', () => {
    startAuthController();
    emit('SIGNED_IN', session());
    expect(useSessionStore.getState().roleResolved).toBe(false);
    useSessionStore.getState().setPlatformRole('admin');
    expect(useSessionStore.getState().roleResolved).toBe(true);
    // A refresh for the same user keeps the resolved role.
    emit('TOKEN_REFRESHED', session());
    expect(useSessionStore.getState().roleResolved).toBe(true);
    expect(useSessionStore.getState().isAdmin).toBe(true);
  });
});

describe('actions', () => {
  it('signInWithPassword resolves with the store ALREADY authenticated', async () => {
    authApi.signInWithPassword.mockResolvedValueOnce({ data: { session: session(), user: user() }, error: null });
    const result = await signInWithPassword('a@b.co', 'pw');
    expect(result.error).toBeNull();
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
    expect(reconfigureForAuth).toHaveBeenCalledWith(true);
  });

  it('signInWithPassword maps invalid credentials to a friendly message', async () => {
    authApi.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 },
    });
    const result = await signInWithPassword('a@b.co', 'nope');
    expect(result.error).toMatch(/Invalid email or password/);
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
  });

  it('signInWithPassword maps unconfirmed email', async () => {
    authApi.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 },
    });
    const result = await signInWithPassword('a@b.co', 'pw');
    expect(result.error).toMatch(/verify your email/);
  });

  it('signUp with an immediate session signs the user in', async () => {
    authApi.signUp.mockResolvedValueOnce({ data: { session: session(), user: user() }, error: null });
    const result = await signUp('a@b.co', 'password1', 'Ada');
    expect(result.needsEmailConfirmation).toBe(false);
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
    const opts = authApi.signUp.mock.calls[0][0].options;
    expect(opts.emailRedirectTo).toMatch(/\/auth\/callback\?next=/);
  });

  it('signUp without a session reports that confirmation is needed and does not sign in', async () => {
    authApi.signUp.mockResolvedValueOnce({ data: { session: null, user: user() }, error: null });
    const result = await signUp('a@b.co', 'password1');
    expect(result.error).toBeNull();
    expect(result.needsEmailConfirmation).toBe(true);
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
  });

  it('signUp for an existing address (empty identities) says so', async () => {
    const u = { ...user(), identities: [] };
    authApi.signUp.mockResolvedValueOnce({ data: { session: null, user: u }, error: null });
    const result = await signUp('a@b.co', 'password1');
    expect(result.error).toMatch(/already exists/);
  });

  it('verifySignupCode confirms with type=signup and signs the user in', async () => {
    authApi.verifyOtp.mockResolvedValueOnce({ data: { session: session(), user: user() }, error: null });
    const r = await verifySignupCode('a@b.co', ' 123456 ');
    expect(r.error).toBeNull();
    expect(authApi.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.co', token: '123456', type: 'signup' });
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });

  it('verifySignupCode maps an expired/invalid code', async () => {
    authApi.verifyOtp.mockResolvedValueOnce({ data: { session: null, user: null }, error: { code: 'otp_expired', message: 'Token has expired or is invalid' } });
    const r = await verifySignupCode('a@b.co', '000000');
    expect(r.error).toMatch(/wrong or has expired/);
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
  });

  it('resendSignupCode asks for a signup resend', async () => {
    const r = await resendSignupCode('a@b.co');
    expect(r.error).toBeNull();
    expect(authApi.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'a@b.co' }));
  });

  it('signInWithGoogle sends the browser to /auth/callback with a same-origin next', async () => {
    authApi.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });
    await signInWithGoogle('/b/acme/setup');
    const opts = authApi.signInWithOAuth.mock.calls[0][0];
    expect(opts.provider).toBe('google');
    expect(opts.options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent('/b/acme/setup')}`,
    );
  });

  it('signOut leaves locally even if the network call fails', async () => {
    startAuthController();
    emit('SIGNED_IN', session());
    authApi.signOut.mockResolvedValueOnce({ error: { message: 'offline' } } as any);
    await signOut();
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
  });
});
