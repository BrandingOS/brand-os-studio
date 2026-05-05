// Phase 11.2 — Pure brand setup completeness check.
//
// Inspects a Brand and returns one entry per "starter" step the user
// might be missing. Pure / synchronous so tests don't have to stand
// up storage. Caller renders the steps via BrandSetupChecklist.
//
// v1 looks at brand-local fields only (colors, logo, typography,
// voice). A later commit can add async checks (has-saved-a-design,
// has-shared-a-link) by extending this with an optional flags arg.

import type { Brand } from '@/shared/types/brand';

export type BrandSetupStepId =
  | 'colors'
  | 'logo'
  | 'typography'
  | 'voice';

export interface BrandSetupStep {
  id: BrandSetupStepId;
  label: string;
  /** Where the user can complete this step — relative path or hash. */
  href: string;
  /** True when the brand already has this step satisfied. */
  done: boolean;
}

export function computeBrandSetupSteps(brand: Brand): BrandSetupStep[] {
  const slug = brand.slug;

  const hasColors = isNonEmpty(brand.primaryColor);
  const hasLogo =
    isNonEmpty(brand.logo) ||
    isNonEmpty(brand.logoSystem?.primary) ||
    Boolean(
      brand.brandAssets?.some((a) => a.type === 'logo' || a.category === 'logo'),
    );
  const hasTypography =
    isNonEmpty(brand.fonts?.primary) ||
    isNonEmpty(brand.typography?.primary?.family);
  const hasVoice = isNonEmpty(brand.tone) || isNonEmpty(brand.audience);

  return [
    {
      id: 'colors',
      label: 'Pick your brand colors',
      href: `/b/${slug}/brand-kit?tab=colors`,
      done: hasColors,
    },
    {
      id: 'logo',
      label: 'Add a logo',
      href: `/b/${slug}/brand-kit?tab=logo`,
      done: hasLogo,
    },
    {
      id: 'typography',
      label: 'Set typography',
      href: `/b/${slug}/brand-kit?tab=typography`,
      done: hasTypography,
    },
    {
      id: 'voice',
      label: 'Describe your tone & audience',
      href: `/b/${slug}/identity?tab=voice`,
      done: hasVoice,
    },
  ];
}

export function isBrandSetupComplete(brand: Brand): boolean {
  return computeBrandSetupSteps(brand).every((s) => s.done);
}

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'object') return true;
  return Boolean(v);
}
