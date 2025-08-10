import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, AuthState } from '@/shared/types';

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,

        // Actions
        setUser: (user) => 
          set({ 
            user, 
            isAuthenticated: !!user 
          }, false, 'auth/setUser'),

        setLoading: (isLoading) => 
          set({ isLoading }, false, 'auth/setLoading'),

        login: (user, token) => {
          localStorage.setItem('auth_token', token);
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          }, false, 'auth/login');
        },

        logout: () => {
          localStorage.removeItem('auth_token');
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          }, false, 'auth/logout');
        },

        updateUser: (updates) => {
          const currentUser = get().user;
          if (currentUser) {
            set({ 
              user: { ...currentUser, ...updates } 
            }, false, 'auth/updateUser');
          }
        },
      }),
      {
        name: 'brand-os-auth',
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      }
    ),
    { name: 'AuthStore' }
  )
);