const PLAN_FEATURES = {
  free: {
    maxBrands: 1,
    maxMembers: 1,
    maxStorage: 100,         // MB
    canExportZip: false,
    canExportPdf: false,
    canShowcase: false,
    canCustomDomain: false,
    canCollaborate: false,
    canBrandGuidelines: false,
    canAnalytics: false,
    canApprovals: false,
    canAiDesign: false,
    canTemplates: false,
    canBentoGrid: false,
    canPriority: false,
  },
  pro: {
    maxBrands: 5,
    maxMembers: 10,
    maxStorage: 5000,        // MB
    canExportZip: true,
    canExportPdf: true,
    canShowcase: true,
    canCustomDomain: false,
    canCollaborate: true,
    canBrandGuidelines: true,
    canAnalytics: true,
    canApprovals: true,
    canAiDesign: true,
    canTemplates: true,
    canBentoGrid: true,
    canPriority: false,
  },
  agency: {
    maxBrands: Infinity,
    maxMembers: Infinity,
    maxStorage: Infinity,
    canExportZip: true,
    canExportPdf: true,
    canShowcase: true,
    canCustomDomain: true,
    canCollaborate: true,
    canBrandGuidelines: true,
    canAnalytics: true,
    canApprovals: true,
    canAiDesign: true,
    canTemplates: true,
    canBentoGrid: true,
    canPriority: true,
  },
} as const;

type PlanKey = keyof typeof PLAN_FEATURES;
type FeatureKey = keyof (typeof PLAN_FEATURES)['free'];

export const PLAN_PRICING: Record<PlanKey, number> = {
  free: 0,
  pro: 29,
  agency: 99,
};

export function planLabel(plan: string): string {
  const labels: Record<string, string> = { free: 'Free', pro: 'Pro', agency: 'Agency' };
  return labels[plan] || 'Free';
}

export function planBadgeVariant(plan: string): string {
  const variants: Record<string, string> = {
    free: 'secondary',
    pro: 'default',
    agency: 'destructive',
  };
  return variants[plan] || 'secondary';
}

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
