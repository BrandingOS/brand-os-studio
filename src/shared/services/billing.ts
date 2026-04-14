/**
 * Client-side billing service.
 *
 * Calls Supabase Edge Functions for Stripe operations.
 * Also provides plan data from the subscriptions table.
 */
import { supabase } from '@/integrations/supabase/client';

export type PlanKey = 'free' | 'pro' | 'agency';

export interface SubscriptionInfo {
  plan: PlanKey;
  status: string;
  currentPeriodEnd?: Date;
  cancelAt?: Date;
  trialEnd?: Date;
}

export const billingService = {
  /**
   * Get the current subscription for a workspace.
   */
  async getSubscription(workspaceId: string): Promise<SubscriptionInfo> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, cancel_at, trial_end')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw error;

    return {
      plan: (data?.plan || 'free') as PlanKey,
      status: data?.status || 'active',
      currentPeriodEnd: data?.current_period_end ? new Date(data.current_period_end) : undefined,
      cancelAt: data?.cancel_at ? new Date(data.cancel_at) : undefined,
      trialEnd: data?.trial_end ? new Date(data.trial_end) : undefined,
    };
  },

  /**
   * Create a Stripe Checkout Session for upgrading.
   */
  async createCheckout(workspaceId: string, planKey: PlanKey): Promise<string> {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        workspaceId,
        planKey,
        successUrl: `${window.location.origin}/settings/plans?success=true`,
        cancelUrl: `${window.location.origin}/settings/plans`,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.url;
  },

  /**
   * Open the Stripe Billing Portal for subscription management.
   */
  async openPortal(workspaceId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: { workspaceId },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.url;
  },

  /**
   * Check if an action is allowed under the current plan.
   */
  async checkLimit(workspaceId: string, action: string): Promise<{
    allowed: boolean;
    plan: string;
    currentUsage?: number;
    limit?: number;
  }> {
    const { data, error } = await supabase.functions.invoke('check-plan-limit', {
      body: { workspaceId, action },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },
};
