import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { billingService, type PlanKey } from '@/shared/services/billing';
import { Check, Crown, Briefcase, Zap, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'free' as PlanKey,
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for testing and small personal projects.',
    icon: Zap,
    features: [
      '1 Brand Project',
      'Live Brand Guidelines',
      'Core Asset Storage',
      'Shareable Guideline Link',
    ],
  },
  {
    key: 'pro' as PlanKey,
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For startups & agencies who want everything in one OS.',
    icon: Crown,
    popular: true,
    features: [
      '5 Brand Projects',
      'Full Asset Manager',
      'Brand Applications',
      'Brand Export (ZIP)',
      'Collaboration & Roles',
      'Public Showcase',
    ],
  },
  {
    key: 'agency' as PlanKey,
    name: 'Agency',
    price: '$49',
    period: '/month',
    description: 'Designed for agencies and enterprise workflows.',
    icon: Briefcase,
    features: [
      'Unlimited Brands',
      'All Pro Features',
      'Custom Domain for Guidelines',
      'Dedicated Account Manager',
      'Custom Integrations (API, SSO)',
      'Priority Support & SLA',
    ],
  },
] as const;

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, agency: 2 };

export default function PlansPage() {
  const { user } = useSessionStore();
  const workspace = useWorkspaceStore((s) => s.current);
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = user?.plan || 'free';

  const handleUpgrade = async (planKey: PlanKey) => {
    if (!workspace?.id) {
      toast.error('No workspace found. Please log in first.');
      return;
    }
    if (planKey === 'free') return;

    setLoading(planKey);
    try {
      const url = await billingService.createCheckout(workspace.id, planKey);
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!workspace?.id) return;
    setLoading('manage');
    try {
      const url = await billingService.openPortal(workspace.id);
      window.location.href = url;
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error(error.message || 'Failed to open billing portal.');
    } finally {
      setLoading(null);
    }
  };

  const getButtonConfig = (planKey: PlanKey) => {
    const planOrder = PLAN_ORDER[planKey] ?? 0;
    const currentOrder = PLAN_ORDER[currentPlan] ?? 0;

    if (planKey === currentPlan) {
      return { label: 'Current Plan', disabled: true, variant: 'outline' as const, action: () => {} };
    }
    if (planKey === 'free' && currentOrder > 0) {
      return { label: 'Manage Billing', disabled: false, variant: 'secondary' as const, action: handleManageBilling };
    }
    if (planOrder > currentOrder) {
      return { label: 'Upgrade', disabled: false, variant: 'default' as const, action: () => handleUpgrade(planKey) };
    }
    return { label: 'Manage Billing', disabled: false, variant: 'secondary' as const, action: handleManageBilling };
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          Choose the plan that fits your needs. Upgrade or downgrade at any time.
        </p>
        <div className="mt-3 inline-flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current plan:</span>
          <Badge variant="default" className="capitalize">{currentPlan}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const btn = getButtonConfig(plan.key);
          const isLoading = loading === plan.key;
          return (
            <Card
              key={plan.key}
              className={`p-6 relative flex flex-col ${plan.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                  Best Value
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">{plan.name}</h3>
              </div>
              <div className="mt-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={btn.variant}
                disabled={btn.disabled || isLoading}
                className="mt-6 w-full gap-2"
                onClick={btn.action}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    {btn.label}
                    {!btn.disabled && btn.label !== 'Current Plan' && (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {PLAN_ORDER[currentPlan] > 0 && (
        <div className="text-center">
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground"
            onClick={handleManageBilling}
            disabled={loading === 'manage'}
          >
            {loading === 'manage' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Manage Billing & Invoices
          </Button>
        </div>
      )}
    </div>
  );
}
