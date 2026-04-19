import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, AuthState, PlatformRole } from '../types/user';
import { isPlatformRoleAtLeast } from '../types/user';

interface SessionStore extends AuthState {
  platformRole: PlatformRole;
  /** @deprecated Use platformRole instead. Kept for backward compat. */
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
  setPlatformRole: (role: PlatformRole) => void;
  /** @deprecated Use setPlatformRole instead. */
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
      platformRole: 'user',
      isAdmin: false,
      isSuperAdmin: false,
      isModerator: false,
      isLoading: true,

      signIn: (user: User) =>
        set((state) => ({
          user,
          mode: 'user',
          isAuthenticated: true,
          // Flip loading → false atomically with isAuth. If we don't, there's
          // a window where isAuth goes true but isLoading is still true, and
          // any component that redirects on `!isLoading && !isAuthenticated`
          // (DashboardRoute, ProtectedRoute) will briefly redirect on the
          // false→false transition if the safety timeout fires before signIn.
          isLoading: false,
          previousMode: state.mode
        }), false, 'signIn'),

      signOut: () =>
        set((state) => ({
          user: undefined,
          mode: 'guest',
          isAuthenticated: false,
          platformRole: 'user',
          isAdmin: false,
          isSuperAdmin: false,
          isModerator: false,
          isLoading: false,
          previousMode: state.mode
        }), false, 'signOut'),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'setLoading'),

      setPlatformRole: (role: PlatformRole) =>
        set({
          platformRole: role,
          isAdmin: isPlatformRoleAtLeast(role, 'admin'),
          isSuperAdmin: role === 'super_admin',
          isModerator: isPlatformRoleAtLeast(role, 'moderator'),
        }, false, 'setPlatformRole'),

      /** @deprecated */
      setAdmin: (isAdmin: boolean) =>
        set({
          isAdmin,
          platformRole: isAdmin ? 'admin' : 'user',
          isSuperAdmin: false,
          isModerator: isAdmin,
        }, false, 'setAdmin'),

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