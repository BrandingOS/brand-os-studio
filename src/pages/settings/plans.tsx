import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DsBadge, DsButton, DsSkeleton } from '@/shared/ds';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { billingService, type PlanKey, type SubscriptionInfo } from '@/shared/services/billing';
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection';
import { SettingsSections } from '@/features/settings/components/SettingsSections';
import '@/features/settings/settings.css';

/**
 * Plan — what you pay.
 *
 * The Stripe checkout and billing-portal flows are unchanged; they were the one
 * part of settings that was actually wired. What is new is that the page reads
 * the REAL subscription. `user.plan` is hard-coded to 'free' in
 * authController.mapSupabaseUser, so the old plan badge was decorative and
 * wrong for every paying customer — the truth lives in `subscriptions`, per
 * workspace, and the renewal, cancellation and trial dates were never shown at
 * all.
 */

const PLANS = [
  {
    key: 'free' as PlanKey,
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For testing and small personal projects.',
    features: [
      '1 brand project',
      'Live brand guidelines',
      'Core asset storage',
      'Shareable guideline link',
    ],
  },
  {
    key: 'pro' as PlanKey,
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For startups and agencies who want everything in one place.',
    features: [
      '5 brand projects',
      'Full asset manager',
      'Brand applications',
      'Brand export (ZIP)',
      'Collaboration and roles',
      'Public showcase',
    ],
  },
  {
    key: 'agency' as PlanKey,
    name: 'Agency',
    price: '$49',
    period: '/month',
    description: 'For agencies and enterprise workflows.',
    features: [
      'Unlimited brands',
      'Everything in Pro',
      'Custom domain for guidelines',
      'Dedicated account manager',
      'Custom integrations (API, SSO)',
      'Priority support and SLA',
    ],
  },
] as const;

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, agency: 2 };

function formatDate(date?: Date): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** One sentence describing where this subscription actually stands. */
function statusLine(sub: SubscriptionInfo | null): string {
  if (!sub) return 'You are on the Free plan.';
  if (sub.cancelAt) return `Cancels on ${formatDate(sub.cancelAt)}. You keep access until then.`;
  if (sub.trialEnd && sub.trialEnd.getTime() > Date.now()) {
    return `Trial ends on ${formatDate(sub.trialEnd)}.`;
  }
  if (sub.status === 'past_due') return 'Payment failed — update your card to keep your plan.';
  if (sub.currentPeriodEnd) return `Renews on ${formatDate(sub.currentPeriodEnd)}.`;
  return 'You are on the Free plan.';
}

export default function PlansPage() {
  const workspace = useWorkspaceStore((s) => s.current);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    billingService
      .getSubscription(workspace.id)
      .then((info) => {
        if (alive) setSub(info);
      })
      .catch((err) => {
        console.warn('[plans] could not read the subscription:', err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [workspace?.id]);

  const currentPlan: PlanKey = sub?.plan ?? 'free';

  const onUpgrade = useCallback(
    async (planKey: PlanKey) => {
      if (!workspace?.id) {
        toast.error('No workspace found. Please sign in first.');
        return;
      }
      setBusy(planKey);
      try {
        window.location.href = await billingService.createCheckout(workspace.id, planKey);
      } catch (err) {
        toast.error('Could not start checkout', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
        setBusy(null);
      }
    },
    [workspace?.id],
  );

  const onManage = useCallback(async () => {
    if (!workspace?.id) return;
    setBusy('manage');
    try {
      window.location.href = await billingService.openPortal(workspace.id);
    } catch (err) {
      toast.error('Could not open the billing portal', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      setBusy(null);
    }
  }, [workspace?.id]);

  return (
    <SettingsSections wide>
      <SettingsSection
        title="Your plan"
        description={loading ? undefined : statusLine(sub)}
        action={
          loading ? (
            <DsSkeleton width={64} height={18} />
          ) : (
            <DsBadge tone={currentPlan === 'free' ? 'neutral' : 'success'}>
              {PLANS.find((p) => p.key === currentPlan)?.name ?? 'Free'}
            </DsBadge>
          )
        }
      >
        {PLAN_ORDER[currentPlan] > 0 && (
          <SettingsRow
            label="Billing and invoices"
            hint="Update your card, download invoices, or cancel."
          >
            <DsButton tone="secondary" onClick={onManage} disabled={busy === 'manage'}>
              {busy === 'manage' ? 'Opening…' : 'Manage billing'}
            </DsButton>
          </SettingsRow>
        )}
      </SettingsSection>

      <SettingsSection title="Change plan" description="Upgrade or downgrade at any time.">
        <div className="plan-grid">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const isUpgrade = PLAN_ORDER[plan.key] > PLAN_ORDER[currentPlan];
            return (
              <article
                key={plan.key}
                className={`plan-card${isCurrent ? ' is-current' : ''}`}
              >
                <div className="plan-card-name">
                  {plan.name}
                  {isCurrent && <DsBadge tone="success">Current</DsBadge>}
                </div>
                <div className="plan-card-price">
                  {plan.price}
                  <span className="plan-card-period">{plan.period}</span>
                </div>
                <p className="plan-card-desc">{plan.description}</p>
                <ul className="plan-card-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="plan-card-cta">
                  {isCurrent ? (
                    <DsButton tone="tertiary" disabled>
                      Current plan
                    </DsButton>
                  ) : isUpgrade ? (
                    <DsButton
                      onClick={() => onUpgrade(plan.key)}
                      disabled={busy !== null}
                    >
                      {busy === plan.key ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                    </DsButton>
                  ) : (
                    <DsButton
                      tone="secondary"
                      onClick={onManage}
                      disabled={busy !== null}
                    >
                      Manage billing
                    </DsButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </SettingsSection>
    </SettingsSections>
  );
}
