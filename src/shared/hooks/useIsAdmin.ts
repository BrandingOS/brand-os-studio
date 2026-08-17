// useIsAdmin — admin role gate for the community template approval queue
// (/admin/templates/queue).
//
// Reads the platform role the auth controller already resolved into the
// session store (`user_roles.role`, admin or above). It used to query a
// `profiles.is_admin` column that does not exist in production — every call
// answered 400 and the gate could never open. One source of truth for roles:
// `sessionStore.platformRole`, resolved by `features/auth/session/authController`.

import { useSessionStore } from '@/shared/store/sessionStore';

export interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/** Override hook — used by tests + dev to bypass the store. When set,
 *  useIsAdmin returns this value synchronously. */
let __testOverride: { isAdmin: boolean } | null = null;
export function __setIsAdminTestOverride(v: { isAdmin: boolean } | null): void {
  __testOverride = v;
}

export function useIsAdmin(): UseIsAdminResult {
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const sessionLoading = useSessionStore((s) => s.isLoading);
  const roleResolved = useSessionStore((s) => s.roleResolved);

  if (__testOverride) {
    return { isAdmin: __testOverride.isAdmin, isLoading: false, error: null };
  }
  return {
    isAdmin,
    // The role lookup runs right after sign-in; don't answer "not admin"
    // before it has come back.
    isLoading: sessionLoading || (isAuthenticated && !roleResolved),
    error: null,
  };
}
