import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/shared/store/sessionStore';
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
  const { user, isAuthenticated, isLoading, signIn, signOut, setLoading } = useSessionStore();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const mappedUser = mapSupabaseUser(session.user);
        signIn(mappedUser);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          signIn(mappedUser);
        } else if (event === 'SIGNED_OUT') {
          signOut();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [signIn, signOut, setLoading]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    
    if (error) throw error;
    return data;
  };

  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0]
        }
      }
    });
    setLoading(false);
    
    if (error) throw error;
    return data;
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    setLoading(false);
    
    if (error) throw error;
    return data;
  };

  const loginWithFacebook = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    setLoading(false);
    
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    
    if (error) throw error;
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
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    resetPassword
  };
};