import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, AuthState } from '../types/user';

interface SessionStore extends AuthState {
  signIn: (user: User) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
  switchToGuest: () => void;
}

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set) => ({
      user: undefined,
      mode: 'guest',
      isAuthenticated: false,
      isLoading: false,
      
      signIn: (user: User) => 
        set({ user, mode: 'user', isAuthenticated: true }, false, 'signIn'),
      
      signOut: () => 
        set({ user: undefined, mode: 'guest', isAuthenticated: false }, false, 'signOut'),
      
      setLoading: (isLoading: boolean) => 
        set({ isLoading }, false, 'setLoading'),
      
      switchToGuest: () => 
        set({ mode: 'guest', isAuthenticated: false }, false, 'switchToGuest'),
    }),
    { name: 'session-store' }
  )
);