/**
 * Thin selector over the session store + the auth controller's actions.
 * Owns NO lifecycle: `AuthProvider` starts the controller once; every other
 * caller (guards, navbars, admin pages) only reads state here.
 */
import { useSessionStore } from '@/shared/store/sessionStore';
import {
  signInWithPassword,
  signUp,
  signInWithGoogle,
  signOut,
  sendPasswordReset,
} from '../session/authController';

export {
  DEV_AUTH_BYPASS,
  DEV_BYPASS_USER,
  DEV_BYPASS_STORAGE_KEY,
} from '../session/authController';

export const useAuth = () => {
  const user = useSessionStore((s) => s.user);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLoading = useSessionStore((s) => s.isLoading);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const isSuperAdmin = useSessionStore((s) => s.isSuperAdmin);
  const isModerator = useSessionStore((s) => s.isModerator);
  const platformRole = useSessionStore((s) => s.platformRole);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isSuperAdmin,
    isModerator,
    platformRole,
    login: signInWithPassword,
    register: signUp,
    loginWithGoogle: signInWithGoogle,
    logout: signOut,
    resetPassword: sendPasswordReset,
  };
};
