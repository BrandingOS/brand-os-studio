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
  plan: 'free', // Default plan, can be updated based on user's subscription
  createdAt: new Date(supabaseUser.created_at),
  updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at)
});

export const useAuth = () => {
  const sessionStore = useSessionStore();
  const onboardingStore = useOnboardingStore();
  const workspaceStore = useWorkspaceStore();
  const navigate = useNavigate();

  const { user, isAuthenticated, isAdmin, isLoading, signIn, signOut, setLoading, setPlatformRole, switchToAuthenticated } = sessionStore;
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
        toast.error(data.suspension_reason
          ? `Your account has been suspended: ${data.suspension_reason}`
          : 'Your account has been suspended. Contact support for assistance.');
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
    let isMounted = true;

    // supabase.auth.getSession() can hang indefinitely when an internal
    // navigator.locks lock is held by a crashed tab / aborted refresh, or
    // when autoRefreshToken loops on a poisoned refresh token. We've seen
    // it sit > 15s in the wild, leaving the user stuck on the ProtectedRoute
    // spinner. Race it against a short timeout so the spinner never lasts
    // more than a few seconds — Supabase being healthy returns sub-second.
    const GET_SESSION_TIMEOUT_MS = 5000;
    const getSessionWithTimeout = (): Promise<
      | { kind: 'ok'; session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] }
      | { kind: 'timeout' }
      | { kind: 'error'; error: unknown }
    > =>
      Promise.race([
        supabase.auth.getSession()
          .then((r) => ({ kind: 'ok' as const, session: r.data.session }))
          .catch((error) => ({ kind: 'error' as const, error })),
        new Promise<{ kind: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ kind: 'timeout' as const }), GET_SESSION_TIMEOUT_MS),
        ),
      ]);

    // Get initial session
    const getInitialSession = async () => {
      if (!isMounted) return;

      try {
        const result = await getSessionWithTimeout();

        if (!isMounted) return;

        if (result.kind === 'timeout') {
          // getSession() did not resolve in time. Treat as no-session so
          // the user is bounced to /login instead of stuck on the spinner.
          //
          // We also drop every `sb-*` key in localStorage. In the wild,
          // this hang is caused by a poisoned refresh_token feeding an
          // autoRefreshToken loop, or a navigator.locks lock left by a
          // crashed previous tab. Clearing the auth keys breaks the loop
          // permanently — without this, the very next page load hits the
          // same hang on the same stored token. We do it via raw
          // localStorage (not supabase.auth.signOut()) because signOut
          // goes through the same lock; if the lock is the problem,
          // signOut() would hang too.
          console.warn(
            `[useAuth] supabase.auth.getSession() did not resolve within ${GET_SESSION_TIMEOUT_MS}ms — clearing sb-* tokens and falling back to no-session`,
          );
          try {
            const stale: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('sb-')) stale.push(k);
            }
            stale.forEach((k) => localStorage.removeItem(k));
          } catch {
            // ignore — if storage is broken, the signOut below still
            // resets in-memory auth state so the UI unblocks.
          }
          reconfigureForAuth(false);
          signOut();
          return;
        }

        if (result.kind === 'error') {
          console.error('[useAuth] getSession() rejected:', result.error);
          reconfigureForAuth(false);
          signOut();
          return;
        }

        const session = result.session;

        if (session?.user) {
          // Flip auth state FIRST so guards see isAuthenticated: true before
          // any `!isLoading && !isAuthenticated` redirect can fire. If we
          // awaited checkAccountStatus first, the 5s safety timeout could
          // set isLoading: false while isAuthenticated is still false,
          // which kicks the user back to /login. The account-status check
          // still runs — if the user is suspended it calls supabase.auth.
          // signOut() which fires the SIGNED_OUT handler and resets state.
          const mappedUser = mapSupabaseUser(session.user);
          reconfigureForAuth(true);
          signIn(mappedUser);
          await checkPlatformRole(session.user.id).catch(() => {});
          if (isMounted) setLoading(false);

          checkAccountStatus(session.user.id).catch(() => true);
          updateLastSignIn(session.user.id);
          workspaceStore.loadAll().catch(console.error);
          // Re-fetch brands now that the service has been swapped to
          // Supabase. Without this, anything that called `useBrandStore.
          // loadAll()` before reconfigure ran (e.g. /dashboard mounting)
          // is left holding the empty Local result.
          useBrandStore.getState().loadAll().catch(console.error);
          loadFromSupabase().catch(console.error);
          migrateLocalStorageToSupabase().catch(console.error);
        } else {
          reconfigureForAuth(false);
          signOut(); // signOut sets isLoading: false
        }
      } catch (error) {
        console.error('Error getting session:', error);
        signOut();
      }
    };

    getInitialSession();

    // Defense-in-depth: getSessionWithTimeout above already caps the initial
    // session probe at 5s, so under normal failure modes the spinner never
    // sits more than ~5s. This safety net is the last-resort guard for the
    // case where the effect itself never reaches getInitialSession (e.g. an
    // unhandled exception in a sibling provider before this useEffect runs).
    // We only release loading when the user is NOT authenticated — if
    // signIn() has already fired, leave the state alone.
    const safetyTimeout = setTimeout(() => {
      if (!isMounted) return;
      const state = useSessionStore.getState();
      if (state.isLoading && !state.isAuthenticated) {
        console.warn('[useAuth] Safety timeout fired — no session after 8s');
        setLoading(false);
      }
    }, 8000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('[useAuth] Auth event:', event);
        
        // Skip INITIAL_SESSION event as we handle it above
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Flip auth state FIRST — see getInitialSession above for why.
          const mappedUser = mapSupabaseUser(session.user);
          reconfigureForAuth(true);
          signIn(mappedUser);

          localStorage.removeItem('brandos:brands');
          console.log('[useAuth] User signed in:', session.user.email);

          checkPlatformRole(session.user.id).then(() => {
            if (isMounted) setLoading(false);
          });
          // Fire-and-forget: if the user is suspended/banned, this will call
          // supabase.auth.signOut() which re-enters this handler as SIGNED_OUT.
          checkAccountStatus(session.user.id).catch(() => true);
          updateLastSignIn(session.user.id);
          workspaceStore.loadAll().catch(console.error);
          // Re-fetch brands with the freshly-swapped Supabase service
          // (see getInitialSession for why this is needed).
          useBrandStore.getState().loadAll().catch(console.error);
          syncToSupabase().catch(console.error);
          migrateLocalStorageToSupabase().catch(console.error);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('[useAuth] Password recovery — redirecting to reset page');
          navigate('/auth/reset-password');
        } else if (event === 'SIGNED_OUT') {
          console.log('[useAuth] User signed out');
          reconfigureForAuth(false);
          workspaceStore.reset();
          // Drop the previous user's brands from the store and re-read
          // the (local) list so the UI doesn't leak across sessions.
          useBrandStore.getState().loadAll().catch(console.error);
          signOut();
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [signIn, signOut, setLoading]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
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
        options: {
          data: {
            name: name || email.split('@')[0]
          }
        }
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
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Facebook OAuth was removed — only Google + email/password supported.

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Redirect to homepage after successful logout
      navigate('/');
      toast.success('Successfully signed out');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
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
    resetPassword
  };
};