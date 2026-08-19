/**
 * Who is looking at the Brand Kit, for capability-visibility purposes.
 *
 * Two privileges, and neither can be granted from the address bar:
 *
 *   • `isDev`   — `import.meta.env.DEV`, which Vite replaces with a
 *                 literal at build time. In a production bundle the
 *                 experimental branches are statically `false`, so there
 *                 is no query param, no flag and no console call that
 *                 reveals them to a normal user.
 *   • `isAdmin` — the platform role the auth controller already resolved
 *                 into the session store (`useIsAdmin` → `user_roles`).
 *                 No new auth or admin system was built for this.
 *
 * While the role lookup is still in flight we answer "not admin". A
 * capability appearing a moment late is right; one appearing to someone
 * who turns out not to be an admin is not.
 */
import { useMemo } from 'react';
import { useIsAdmin } from '@/shared/hooks/useIsAdmin';

export type KitViewer = { isDev: boolean; isAdmin: boolean };

export function useKitViewer(): KitViewer {
  const { isAdmin, isLoading } = useIsAdmin();
  return useMemo(
    () => ({ isDev: import.meta.env.DEV, isAdmin: isAdmin && !isLoading }),
    [isAdmin, isLoading],
  );
}
