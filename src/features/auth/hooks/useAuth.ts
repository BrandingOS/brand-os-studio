import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
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
        .single()
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
        .single();

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
    
    // Get initial session
    const getInitialSession = async () => {
      if (!isMounted) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

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

    // Safety net: if the auth check takes >5s, release loading so the UI isn't stuck.
    const safetyTimeout = setTimeout(() => {
      if (isMounted && useSessionStore.getState().isLoading) {
        setLoading(false);
      }
    }, 5000);

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
          syncToSupabase().catch(console.error);
          migrateLocalStorageToSupabase().catch(console.error);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('[useAuth] Password recovery — redirecting to reset page');
          navigate('/auth/reset-password');
        } else if (event === 'SIGNED_OUT') {
          console.log('[useAuth] User signed out');
          reconfigureForAuth(false);
          workspaceStore.reset();
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