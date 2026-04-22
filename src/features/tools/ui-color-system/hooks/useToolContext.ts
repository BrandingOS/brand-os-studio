/**
 * useToolContext — the single branching point for UI Color System.
 *
 * All code that needs to know "are we standalone or integrated?", "is
 * this a free or pro user?", "which brand is active?" must go through
 * this hook. That keeps plan/mode logic funneled to one place instead
 * of scattered across the UI tree.
 *
 * The shape is intentionally small and serializable so the rest of the
 * tool can treat it as a value, not a set of React providers.
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useSessionStore } from '@/shared/store/sessionStore';
import { useBrandStore } from '@/shared/store/brandStore';

export type ToolMode = 'standalone' | 'integrated';
export type Plan = 'free' | 'pro' | 'team';

export interface ToolPermissions {
  canSave: boolean;
  canShare: boolean;
  canExportAdvanced: boolean;
  canUseApca: boolean;
  canExtractFromImage: boolean;
  canUseHarmonyMulti: boolean;
  canAddSecondary: boolean;
  canAddTertiary: boolean;
  canAddSemantics: boolean;
  canSyncWithBrand: boolean;
}

export interface ToolContext {
  mode: ToolMode;
  plan: Plan;
  userId: string | null;
  isAuthenticated: boolean;
  brandSlug: string | null;
  brandId: string | null;
  perms: ToolPermissions;
}

function derivePermissions(plan: Plan, isAuthenticated: boolean, mode: ToolMode): ToolPermissions {
  const isPro = plan === 'pro' || plan === 'team';
  return {
    canSave: isAuthenticated,
    canShare: true,
    canExportAdvanced: isPro,
    canUseApca: isPro,
    canExtractFromImage: isPro,
    canUseHarmonyMulti: isPro,
    canAddSecondary: isPro,
    canAddTertiary: isPro,
    canAddSemantics: isPro,
    canSyncWithBrand: mode === 'integrated' && isAuthenticated,
  };
}

export function useToolContext(forcedMode?: ToolMode): ToolContext {
  const params = useParams();
  const user = useSessionStore((s) => s.user);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const platformRole = useSessionStore((s) => s.platformRole);
  const brands = useBrandStore((s) => s.list);

  const routeSlug = (params.slug as string | undefined) ?? null;
  const brandId = useMemo(() => {
    if (!routeSlug) return null;
    const match = brands.find((b) => b.slug === routeSlug);
    return match?.id ?? null;
  }, [brands, routeSlug]);

  const mode: ToolMode = forcedMode ?? (routeSlug ? 'integrated' : 'standalone');

  // Plan is not yet persisted in the session store. For now: authenticated
  // users are treated as pro during development; anonymous users are free.
  // Replace with the plans table once billing lands.
  const plan: Plan = isAuthenticated ? 'pro' : 'free';
  const userId = user?.id ?? null;

  // `platformRole` is observed so that future super-admin badges can ride
  // this hook without another store subscription. Keep reading it even if
  // we don't expose it yet so the subscription stays warm.
  void platformRole;

  return useMemo(
    () => ({
      mode,
      plan,
      userId,
      isAuthenticated,
      brandSlug: routeSlug,
      brandId,
      perms: derivePermissions(plan, isAuthenticated, mode),
    }),
    [mode, plan, userId, isAuthenticated, routeSlug, brandId],
  );
}
