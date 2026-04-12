/**
 * Hook for checking plan limits before actions.
 *
 * Uses the workspace subscription to determine the current plan,
 * then checks limits via the Edge Function.
 */
import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { billingService, type PlanKey } from '@/shared/services/billing';
import { canAccess, type FeatureKey } from '@/shared/utils/plan-gates';
import { toast } from 'sonner';

interface PlanGateResult {
  plan: PlanKey;
  isLoading: boolean;
  canAccessFeature: (feature: FeatureKey) => boolean;
  checkBeforeAction: (action: string) => Promise<boolean>;
  openUpgrade: () => Promise<void>;
}

export function usePlanGate(): PlanGateResult {
  const [isLoading, setIsLoading] = useState(false);
  const workspace = useWorkspaceStore((s) => s.current);
  // Default to 'free' when no workspace (guest mode)
  const [plan] = useState<PlanKey>('free');

  const canAccessFeature = useCallback(
    (feature: FeatureKey) => canAccess(plan, feature),
    [plan],
  );

  const checkBeforeAction = useCallback(
    async (action: string): Promise<boolean> => {
      if (!workspace?.id) return true; // Guest mode — no limits
      setIsLoading(true);
      try {
        const result = await billingService.checkLimit(workspace.id, action);
        if (!result.allowed) {
          toast.error(
            `Plan limit reached. You're on the ${result.plan} plan. Upgrade to continue.`,
          );
        }
        return result.allowed;
      } catch {
        // If limit check fails, allow the action (fail open)
        return true;
      } finally {
        setIsLoading(false);
      }
    },
    [workspace?.id],
  );

  const openUpgrade = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const url = await billingService.createCheckout(workspace.id, 'pro');
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to open upgrade page');
    }
  }, [workspace?.id]);

  return { plan, isLoading, canAccessFeature, checkBeforeAction, openUpgrade };
}
