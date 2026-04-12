import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, AuthState } from '../types/user';

interface SessionStore extends AuthState {
  isAdmin: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
  setAdmin: (isAdmin: boolean) => void;
  switchToGuest: () => void;
  switchToAuthenticated: () => void;
  previousMode?: 'user' | 'guest';
}

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set) => ({
      user: undefined,
      mode: 'guest',
      isAuthenticated: false,
      isAdmin: false,
      isLoading: true, // Start as loading during auth check
      
      signIn: (user: User) => 
        set((state) => ({ 
          user, 
          mode: 'user', 
          isAuthenticated: true,
          isLoading: false,
          previousMode: state.mode 
        }), false, 'signIn'),
      
      signOut: () =>
        set((state) => ({
          user: undefined,
          mode: 'guest',
          isAuthenticated: false,
          isAdmin: false,
          isLoading: false,
          previousMode: state.mode
        }), false, 'signOut'),
      
      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'setLoading'),

      setAdmin: (isAdmin: boolean) =>
        set({ isAdmin }, false, 'setAdmin'),
      
      switchToGuest: () => 
        set((state) => ({ 
          mode: 'guest', 
          isAuthenticated: false,
          isLoading: false,
          previousMode: state.mode 
        }), false, 'switchToGuest'),
        
      switchToAuthenticated: () => 
        set((state) => ({ 
          mode: 'user', 
          isAuthenticated: true, 
          previousMode: state.mode 
        }), false, 'switchToAuthenticated'),
    }),
    { name: 'session-store' }
  )
);