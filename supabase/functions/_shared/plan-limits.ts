/**
 * Plan limits — single source of truth for all tiers.
 * -1 means unlimited.
 */
export const PLAN_LIMITS = {
  free: {
    brands: 1,
    storage_mb: 100,
    team_members: 1,
    exports_month: 5,
  },
  pro: {
    brands: 5,
    storage_mb: 5000,
    team_members: 10,
    exports_month: -1,
  },
  agency: {
    brands: -1,
    storage_mb: 50000,
    team_members: -1,
    exports_month: -1,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;
export type MetricKey = keyof (typeof PLAN_LIMITS)['free'];

export function getPlanLimit(plan: string, metric: MetricKey): number {
  const key = (plan in PLAN_LIMITS ? plan : 'free') as PlanKey;
  return PLAN_LIMITS[key][metric];
}
