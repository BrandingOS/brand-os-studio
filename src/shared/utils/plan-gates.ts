const PLAN_FEATURES = {
  free: {
    maxBrands: 1,
    canExportZip: false,
    canShowcase: false,
    canCustomDomain: false,
    canCollaborate: false,
  },
  pro: {
    maxBrands: 5,
    canExportZip: true,
    canShowcase: true,
    canCustomDomain: false,
    canCollaborate: true,
  },
  agency: {
    maxBrands: Infinity,
    canExportZip: true,
    canShowcase: true,
    canCustomDomain: true,
    canCollaborate: true,
  },
} as const;

type PlanKey = keyof typeof PLAN_FEATURES;
type FeatureKey = keyof (typeof PLAN_FEATURES)['free'];

export function canAccess(plan: string, feature: FeatureKey): boolean {
  // Support legacy 'enterprise' key
  const normalized = plan === 'enterprise' ? 'agency' : plan;
  const key = (normalized in PLAN_FEATURES ? normalized : 'free') as PlanKey;
  const value = PLAN_FEATURES[key][feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

export function getPlanLimits(plan: string): (typeof PLAN_FEATURES)['free'] {
  const normalized = plan === 'enterprise' ? 'agency' : plan;
  const key = (normalized in PLAN_FEATURES ? normalized : 'free') as PlanKey;
  return PLAN_FEATURES[key];
}

export { PLAN_FEATURES };
export type { PlanKey, FeatureKey };
