// useIsAdmin — Phase 4.4 admin role gate.
//
// Reads `profiles.is_admin` for the current authenticated user.
// Returns { isAdmin: boolean, isLoading: boolean }. Admins gain
// access to /admin/templates/queue (the community template approval
// queue). All non-admin users see a 403 page.
//
// IMPORTANT — RBAC follow-up owed:
// is_admin is a single boolean for Phase 4.4. A real RBAC review
// (roles, permissions, audit log) is owed before opening this to
// many admins. Track in CLAUDE.md "Phase 4 debt".

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/** Override hook — used by tests + dev to bypass the Supabase
 *  fetch. When set, useIsAdmin returns this value synchronously. */
let __testOverride: { isAdmin: boolean } | null = null;
export function __setIsAdminTestOverride(v: { isAdmin: boolean } | null): void {
  __testOverride = v;
}

export function useIsAdmin(): UseIsAdminResult {
  const [state, setState] = useState<UseIsAdminResult>(() => {
    if (__testOverride) {
      return { isAdmin: __testOverride.isAdmin, isLoading: false, error: null };
    }
    return { isAdmin: false, isLoading: true, error: null };
  });

  useEffect(() => {
    if (__testOverride) {
      setState({ isAdmin: __testOverride.isAdmin, isLoading: false, error: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) {
          if (!cancelled) setState({ isAdmin: false, isLoading: false, error: null });
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setState({ isAdmin: false, isLoading: false, error: error.message });
          return;
        }
        setState({
          isAdmin: Boolean((data as { is_admin?: boolean } | null)?.is_admin),
          isLoading: false, error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          isAdmin: false, isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
