import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Check, Crown, Briefcase, Zap } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'free' as const,
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
    key: 'pro' as const,
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
    key: 'enterprise' as const,
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

const PLAN_ORDER = { free: 0, pro: 1, enterprise: 2 } as const;

export default function PlansPage() {
  const { user, signIn } = useSessionStore();
  const currentPlan = user?.plan || 'free';

  const handlePlanChange = (newPlan: 'free' | 'pro' | 'enterprise') => {
    if (!user || newPlan === currentPlan) return;
    const planLabel = PLANS.find((p) => p.key === newPlan)?.name || newPlan;
    signIn({ ...user, plan: newPlan, updatedAt: new Date() });
    toast.success(`Plan updated to ${planLabel}!`);
  };

  const getButtonConfig = (planKey: 'free' | 'pro' | 'enterprise') => {
    if (planKey === currentPlan) {
      return { label: 'Current Plan', disabled: true, variant: 'outline' as const };
    }
    if (PLAN_ORDER[planKey] > PLAN_ORDER[currentPlan]) {
      return { label: 'Upgrade', disabled: false, variant: 'default' as const };
    }
    return { label: 'Downgrade', disabled: false, variant: 'secondary' as const };
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
                disabled={btn.disabled}
                className="mt-6 w-full"
                onClick={() => handlePlanChange(plan.key)}
              >
                {btn.label}
              </Button>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Billing will be available when Stripe is integrated. Plan changes are stored locally for now.
      </p>
    </div>
  );
}
