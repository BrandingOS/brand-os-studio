import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/shared/store/sessionStore';
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
  const { user, isAuthenticated, isLoading, signIn, signOut, setLoading } = useSessionStore();

  useEffect(() => {
    // Skip authentication setup if Supabase isn't configured
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured. Authentication features will be limited.');
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          signIn(mappedUser);
        }
      } catch (error) {
        console.error('Error getting session:', error);
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
    if (!isSupabaseConfigured) {
      toast.error('Authentication not available. Please check Supabase configuration.');
      throw new Error('Supabase not configured');
    }
    
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
    if (!isSupabaseConfigured) {
      toast.error('Authentication not available. Please check Supabase configuration.');
      throw new Error('Supabase not configured');
    }
    
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
    if (!isSupabaseConfigured) {
      toast.error('Social login not available. Please check Supabase configuration.');
      throw new Error('Supabase not configured');
    }
    
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

  const loginWithFacebook = async () => {
    if (!isSupabaseConfigured) {
      toast.error('Social login not available. Please check Supabase configuration.');
      throw new Error('Supabase not configured');
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
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

  const logout = async () => {
    if (!isSupabaseConfigured) {
      signOut(); // Use local signOut from store
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      toast.error('Password reset not available. Please check Supabase configuration.');
      throw new Error('Supabase not configured');
    }
    
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
    resetPassword,
    isSupabaseConfigured
  };
};