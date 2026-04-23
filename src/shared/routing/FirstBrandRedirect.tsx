import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';

/**
 * Redirects a flat workspace-level brand URL (like the legacy
 * `/setup` or `/brand-kit`) to the equivalent brand-scoped v2 route
 * for the user's first available brand.
 *
 * Flow:
 *   1. If brand list is loaded and has entries → /b/<firstSlug>/<tab>
 *   2. If the list is empty and loading is done → /onboard-brand
 *   3. While loading, renders nothing (blank, brief) — Suspense
 *      fallback wraps this at the route level
 *
 * Used for the flat `/setup`, `/brand-kit`, `/guideline`,
 * `/design-workspace`, `/tools-workspace` routes as a progressive
 * migration tool: anyone who lands on the legacy flat URL gets
 * nudged into the brand-scoped equivalent.
 */
export function FirstBrandRedirect({ tab }: { tab: 'setup' | 'brand-kit' | 'guideline' | 'design' | 'tools' }) {
  const list = useBrandStore((s) => s.list);
  const isLoading = useBrandStore((s) => s.isLoading);
  const loadAll = useBrandStore((s) => s.loadAll);
  const navigate = useNavigate();

  useEffect(() => {
    if (list.length === 0 && !isLoading) {
      void loadAll();
    }
  }, [list.length, isLoading, loadAll]);

  if (isLoading) return null;

  const first = list[0];
  if (!first) {
    return <Navigate to="/onboard-brand" replace />;
  }
  return <Navigate to={`/b/${first.slug}/${tab}`} replace />;
}

export default FirstBrandRedirect;
