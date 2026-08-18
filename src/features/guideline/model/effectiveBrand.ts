/**
 * The brand a guideline page renders from.
 *
 * `brand` is the real, shared brand record. `overrides` are this guideline's
 * own choices. The pages only ever see the merge, so nothing downstream has to
 * know which values came from where — and, critically, nothing downstream can
 * write a guideline-scoped choice back into the brand by accident.
 *
 * The override keys are exactly the brand fields the guideline renderers read
 * (`primaryColor`, `secondaryColor`, `fonts.primary`, `fonts.secondary`).
 * Adding a fifth means adding it here AND to the Brand panel — an override the
 * pages ignore would read as a broken control.
 */
import type { Brand } from '@/shared/types/brand';
import type { GuidelineOverrides } from './document';

export function hasOverrides(overrides: GuidelineOverrides | undefined): boolean {
  if (!overrides) return false;
  return Object.values(overrides).some((v) => typeof v === 'string' && v.length > 0);
}

export function applyGuidelineOverrides(brand: Brand, overrides: GuidelineOverrides): Brand {
  if (!hasOverrides(overrides)) return brand;
  return {
    ...brand,
    primaryColor: overrides.primaryColor ?? brand.primaryColor,
    secondaryColor: overrides.secondaryColor ?? brand.secondaryColor,
    fonts: {
      ...brand.fonts,
      primary: overrides.headingFont ?? brand.fonts?.primary,
      secondary: overrides.bodyFont ?? brand.fonts?.secondary,
    },
  };
}

/** What the brand itself holds for an override key — the "revert to" value. */
export function brandValueFor(brand: Brand, key: keyof GuidelineOverrides): string | undefined {
  switch (key) {
    case 'primaryColor': return brand.primaryColor;
    case 'secondaryColor': return brand.secondaryColor;
    case 'headingFont': return brand.fonts?.primary;
    case 'bodyFont': return brand.fonts?.secondary;
    default: return undefined;
  }
}

/**
 * The patch that pushes one guideline value onto the brand for real.
 *
 * Returned rather than applied so the caller can show the user exactly what a
 * global update would write before it happens.
 */
export function brandPatchFor(
  brand: Brand,
  key: keyof GuidelineOverrides,
  value: string,
): Partial<Brand> {
  switch (key) {
    case 'primaryColor': return { primaryColor: value };
    case 'secondaryColor': return { secondaryColor: value };
    case 'headingFont': return { fonts: { ...brand.fonts, primary: value } };
    case 'bodyFont': return { fonts: { ...brand.fonts, secondary: value } };
    default: return {};
  }
}

export const OVERRIDE_LABEL: Record<keyof GuidelineOverrides, string> = {
  primaryColor: 'Primary colour',
  secondaryColor: 'Secondary colour',
  headingFont: 'Heading typeface',
  bodyFont: 'Body typeface',
};
