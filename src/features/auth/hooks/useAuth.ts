import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { reconfigureForAuth } from '@/core/boot';
import { migrateLocalStorageToSupabase } from '@/shared/utils/localStorage-migration';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/shared/types/user';

const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
  avatar: supabaseUser.user_metadata?.avatar_url,
  plan: 'free',
  createdAt: new Date(supabaseUser.created_at),
  updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
});

// Dev-only escape hatch for when the Supabase project is paused/unreachable
// (this repo's project has been torn down by inactivity before — see the
// migration comment atop integrations/supabase/client.ts). `import.meta.env.DEV`
// is statically false in production builds, so Vite dead-code-eliminates this
// entire branch — it is structurally impossible for this to ship to prod.
// Enable locally with `VITE_DEV_BYPASS_AUTH=true` in .env (gitignored).
//
// Deliberately NOT auto-applied on mount — the user still has to land on the
// login screen and take an explicit action (see the dev-bypass button in
// AuthModal). This flag only controls whether that button/shortcut is shown;
// it never signs anyone in by itself.
export const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

export const DEV_BYPASS_USER: User = {
  id: 'dev-bypass-user',
  email: 'dev@local.test',
  name: 'Dev (bypass)',
  plan: 'agency',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Module-level singleton flag. The auth listener (getInitialSession +
// onAuthStateChange + safety timeout) must only mount ONCE per app, no
// matter how many components call useAuth(). Without this guard, every
// component using useAuth (~20 of them at the time of writing — sidebars,
// navbars, route guards, admin pages) was queueing its own getSession()
// call against the @supabase/auth-js navigator.locks lock; with enough
// callers stacked the LAST getSession() would wait > 15s and the safety
// timeout would either leave the user stuck on the spinner or — worse —
// the timeout-driven cleanup would clobber a freshly logged-in session.
//
// AuthProvider sits at the app root and is the natural single mount point.
// Other useAuth() callers fall through this guard and only consume state.
let listenerMounted = false;

export const useAuth = () => {
  const sessionStore = useSessionStore();
  const onboardingStore = useOnboardingStore();
  const workspaceStore = useWorkspaceStore();
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    signIn,
    signOut,
    setLoading,
    setPlatformRole,
  } = sessionStore;
  const { platformRole, isSuperAdmin, isModerator } = sessionStore;
  const { syncToSupabase, loadFromSupabase } = onboardingStore;

  // Check platform role (super_admin / admin / moderator / user).
  // Uses a timeout so a missing/slow user_roles table never blocks loading.
  const checkPlatformRole = async (userId: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()
        .abortSignal(controller.signal);

      clearTimeout(timeout);
      if (!error && data?.role) {
        setPlatformRole(data.role as any);
      } else {
        setPlatformRole('user');
      }
    } catch {
      setPlatformRole('user');
    }
  };

  // Check if user account is suspended or banned
  const checkAccountStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('status, suspension_reason')
        .eq('id', userId)
        .maybeSingle();

      if (data?.status === 'suspended') {
        await supabase.auth.signOut();
        toast.error(
          data.suspension_reason
            ? `Your account has been suspended: ${data.suspension_reason}`
            : 'Your account has been suspended. Contact support for assistance.',
        );
        return false;
      }
      if (data?.status === 'banned') {
        await supabase.auth.signOut();
        toast.error('Your account has been banned. Contact support for assistance.');
        return false;
      }
      return true;
    } catch {
      return true; // Allow access if check fails
    }
  };

  // Update last_sign_in timestamp
  const updateLastSignIn = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_sign_in: new Date().toISOString() })
        .eq('id', userId);
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    // Singleton guard — only the first caller (typically AuthProvider)
    // mounts the auth listener. Everyone else is just reading state.
    if (listenerMounted) return;
    listenerMounted = true;

    let isMounted = true;

    // supabase.auth.getSession() can hang when an internal navigator.locks
    // lock is held by a crashed tab, or when autoRefreshToken loops on a
    // poisoned refresh_token. Race it against a short timeout so the UI
    // never sits on the spinner indefinitely. A healthy Supabase responds
    // sub-second, so 5s is generous.
    const GET_SESSION_TIMEOUT_MS = 5000;
    const sessionPromise = supabase.auth.getSession();

    const onSignedInUser = async (signedInUser: SupabaseUser) => {
      if (!isMounted) return;
      const mappedUser = mapSupabaseUser(signedInUser);
      reconfigureForAuth(true);
      signIn(mappedUser);
      await checkPlatformRole(signedInUser.id).catch(() => {});
      if (!isMounted) return;
      setLoading(false);

      checkAccountStatus(signedInUser.id).catch(() => true);
      updateLastSignIn(signedInUser.id);
      workspaceStore.loadAll().catch(console.error);
      // Re-fetch brands now that the service has been swapped to Supabase.
      // Without this, anything that called useBrandStore.loadAll() before
      // reconfigure ran is left holding the empty Local result.
      useBrandStore.getState().loadAll().catch(console.error);
      loadFromSupabase().catch(console.error);
      migrateLocalStorageToSupabase().catch(console.error);
    };

    const getInitialSession = async () => {
      const result = await Promise.race([
        sessionPromise
          .then((r) => ({ kind: 'ok' as const, session: r.data.session }))
          .catch((error) => ({ kind: 'error' as const, error })),
        new Promise<{ kind: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ kind: 'timeout' as const }), GET_SESSION_TIMEOUT_MS),
        ),
      ]);

      if (!isMounted) return;

      if (result.kind === 'timeout') {
        // getSession() hasn't resolved in 5s. Just unstick loading so the
        // ProtectedRoute spinner clears. CRITICAL: do NOT touch session
        // state here — if the user logged in via AuthModal moments ago,
        // sessionStore.isAuthenticated is already true and we mustn't
        // contradict it. If they're not authenticated, ProtectedRoute will
        // redirect to /login on the next render. The sessionPromise below
        // keeps listening, so a slow-but-valid session still lands.
        console.warn(
          `[useAuth] supabase.auth.getSession() did not resolve within ${GET_SESSION_TIMEOUT_MS}ms — unsticking loading; session may resolve later`,
        );
        setLoading(false);
        return;
      }

      if (result.kind === 'error') {
        console.error('[useAuth] getSession() rejected:', result.error);
        const live = useSessionStore.getState();
        if (live.isAuthenticated) {
          // Transient failure on top of a live session — don't sign out.
          setLoading(false);
          return;
        }
        reconfigureForAuth(false);
        signOut();
        return;
      }

      if (result.session?.user) {
        await onSignedInUser(result.session.user);
      } else {
        reconfigureForAuth(false);
        signOut();
      }
    };

    // Always wait on the underlying sessionPromise — even if the race
    // returned 'timeout'. This way a slow but eventually successful
    // getSession still signs the user in.
    sessionPromise
      .then(({ data }) => {
        if (!isMounted) return;
        const live = useSessionStore.getState();
        if (data.session?.user) {
          if (!live.isAuthenticated || live.user?.id !== data.session.user.id) {
            onSignedInUser(data.session.user);
          }
        } else if (!live.isAuthenticated && live.isLoading) {
          // Confirmed no session and no race-y in-progress login. Mark guest.
          reconfigureForAuth(false);
          signOut();
        }
      })
      .catch(() => {
        // Errors are handled in getInitialSession's race result; nothing extra to do.
      });

    getInitialSession();

    // Last-resort safety net: if for any reason getInitialSession itself
    // never runs (e.g. a sibling provider throws synchronously between
    // listenerMounted=true and the call below), unstick loading. We only
    // touch loading; we never overwrite a live session.
    const safetyTimeout = setTimeout(() => {
      if (!isMounted) return;
      const state = useSessionStore.getState();
      if (state.isLoading && !state.isAuthenticated) {
        console.warn('[useAuth] Safety timeout fired — unsticking loading');
        setLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      console.log('[useAuth] Auth event:', event);

      // INITIAL_SESSION is handled above.
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' && session?.user) {
        const mappedUser = mapSupabaseUser(session.user);
        reconfigureForAuth(true);
        signIn(mappedUser);

        localStorage.removeItem('brandos:brands');
        console.log('[useAuth] User signed in:', session.user.email);

        checkPlatformRole(session.user.id).then(() => {
          if (isMounted) setLoading(false);
        });
        checkAccountStatus(session.user.id).catch(() => true);
        updateLastSignIn(session.user.id);
        workspaceStore.loadAll().catch(console.error);
        useBrandStore.getState().loadAll().catch(console.error);
        syncToSupabase().catch(console.error);
        migrateLocalStorageToSupabase().catch(console.error);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Refresh-only event — keep state in sync but don't run the heavy
        // first-sign-in side effects again.
        const mappedUser = mapSupabaseUser(session.user);
        signIn(mappedUser);
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('[useAuth] Password recovery — redirecting to reset page');
        navigate('/auth/reset-password');
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuth] User signed out');
        reconfigureForAuth(false);
        workspaceStore.reset();
        useBrandStore.getState().loadAll().catch(console.error);
        signOut();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      // Reset the singleton flag so a re-mount (HMR, app re-init) can
      // re-attach the listener. In a normal SPA lifecycle this only
      // happens during dev-server hot-reload.
      listenerMounted = false;
    };
  }, [signIn, signOut, setLoading]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || email.split('@')[0] } },
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
      toast.success('Successfully signed out');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isSuperAdmin,
    isModerator,
    platformRole,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
  };
};
