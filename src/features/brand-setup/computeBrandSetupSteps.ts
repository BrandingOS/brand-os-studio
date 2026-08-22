// What /setup still has nothing in — read from the SAME projection Setup
// renders, so the two can never disagree.
//
// An earlier version read the raw `Brand` and asked its own questions: it
// called Brand Strategy missing unless `tone` or `audience` was set, while
// Setup counts the section done as soon as ANY of its eleven answers exists.
// A brand that Setup showed as complete was still being nagged. Taking the
// MockBrand removes the second opinion by construction.
//
// Only the four sections that change how the product LOOKS are checked.
// Setup also lists Brand, Iconography and Website; a nudge that recites every
// section is a second copy of the sidebar standing next to the sidebar.

import type { MockBrand } from '@/features/setup/data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';

export type BrandSetupStepId = 'logos' | 'colors' | 'typography' | 'strategy';

/** Setup's own key for the section, so a step can act on the board it names. */
export type BrandSetupSectionKey = 'logo' | 'colors' | 'fonts' | 'voice';

export interface BrandSetupStep {
  id: BrandSetupStepId;
  /** Setup's own name for the section, so the nudge names what you will find. */
  label: string;
  section: BrandSetupSectionKey;
  done: boolean;
}

export function computeBrandSetupSteps(brand: MockBrand): BrandSetupStep[] {
  return [
    { id: 'logos', label: 'Brand logos', section: 'logo', done: brand.logos.length > 0 },
    { id: 'colors', label: 'Colors', section: 'colors', done: brand.colors.core.length > 0 },
    { id: 'typography', label: 'Typography', section: 'fonts', done: brand.fonts.length > 0 },
    {
      id: 'strategy',
      label: 'Brand strategy',
      section: 'voice',
      // Setup's rule verbatim: answered when the brand has said ANYTHING
      // about itself — one of the eleven cards, or a section of its own.
      done:
        STRATEGY_CARDS.some((c) => contentOf(c, brand.strategy).trim().length > 0) ||
        brand.about.some((a) => a.content.trim().length > 0),
    },
  ];
}

/** The sections with nothing in them. Empty means there is nothing to nudge about. */
export function missingBrandSetupSteps(brand: MockBrand): BrandSetupStep[] {
  return computeBrandSetupSteps(brand).filter((s) => !s.done);
}

export function isBrandSetupComplete(brand: MockBrand): boolean {
  return missingBrandSetupSteps(brand).length === 0;
}
