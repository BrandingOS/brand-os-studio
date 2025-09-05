import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
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
  const navigate = useNavigate();
  
  const { user, isAuthenticated, isLoading, signIn, signOut, setLoading, switchToAuthenticated } = sessionStore;
  const { syncToSupabase, loadFromSupabase } = onboardingStore;

  useEffect(() => {

    // Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          signIn(mappedUser);
          // Load existing data from Supabase in a separate effect
          setTimeout(() => {
            loadFromSupabase().catch(console.error);
          }, 0);
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
          
          // Sync guest data to Supabase in a separate timeout
          setTimeout(() => {
            syncToSupabase().catch(console.error);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          signOut();
        }
      }
    );

    return () => subscription.unsubscribe();
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

  const loginWithFacebook = async () => {
    
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
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    resetPassword
  };
};