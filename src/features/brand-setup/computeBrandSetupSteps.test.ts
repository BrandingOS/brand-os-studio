import { describe, expect, it } from 'vitest';
import {
  computeBrandSetupSteps,
  isBrandSetupComplete,
  missingBrandSetupSteps,
} from './computeBrandSetupSteps';
import { EMPTY_STRATEGY, type MockBrand } from '@/features/setup/data/mockBrand';

const blank: MockBrand = {
  name: 'B',
  logos: [],
  colors: { core: [], accent: [], grey: [] },
  fonts: [],
  icons: [],
  photos: [],
  websites: [],
  voice: { essay: '', pillars: [] },
  about: [],
  strategy: { ...EMPTY_STRATEGY },
  links: [],
};

const withLogo = (b: MockBrand): MockBrand => ({
  ...b,
  logos: [{ id: 'l', label: 'Primary', variant: 'light', svg: '<svg/>' } as MockBrand['logos'][number]],
});

describe('computeBrandSetupSteps', () => {
  it('returns the four sections in Setup order', () => {
    expect(computeBrandSetupSteps(blank).map((s) => s.id)).toEqual([
      'logos',
      'colors',
      'typography',
      'strategy',
    ]);
  });

  it('names each section the way Setup names it', () => {
    expect(computeBrandSetupSteps(blank).map((s) => s.label)).toEqual([
      'Brand logos',
      'Colors',
      'Typography',
      'Brand strategy',
    ]);
  });

  it('flags every section incomplete on a blank brand', () => {
    expect(computeBrandSetupSteps(blank).every((s) => !s.done)).toBe(true);
    expect(missingBrandSetupSteps(blank)).toHaveLength(4);
    expect(isBrandSetupComplete(blank)).toBe(false);
  });

  it('marks logos done once the board holds a variant', () => {
    const steps = computeBrandSetupSteps(withLogo(blank));
    expect(steps.find((s) => s.id === 'logos')?.done).toBe(true);
  });

  it('marks colors done from CORE only — an accent is not a brand color', () => {
    const accentOnly: MockBrand = {
      ...blank,
      colors: { core: [], accent: [{ hex: '#ff0000', name: 'Red' } as never], grey: [] },
    };
    expect(computeBrandSetupSteps(accentOnly).find((s) => s.id === 'colors')?.done).toBe(false);
  });

  it('marks typography done once a font is set', () => {
    const typed: MockBrand = {
      ...blank,
      fonts: [{ family: 'Inter' } as MockBrand['fonts'][number]],
    };
    expect(computeBrandSetupSteps(typed).find((s) => s.id === 'typography')?.done).toBe(true);
  });

  // The bug this rewrite exists to kill: the old check asked for tone AND
  // audience specifically, so a brand Setup already counted as complete kept
  // being told its Brand Strategy was missing.
  it('marks strategy done from ANY one of the eleven answers, not tone specifically', () => {
    const mission: MockBrand = {
      ...blank,
      strategy: { ...EMPTY_STRATEGY, mission: 'Make brands legible.' },
    };
    expect(computeBrandSetupSteps(mission).find((s) => s.id === 'strategy')?.done).toBe(true);
  });

  it('marks strategy done from a free-form About section alone', () => {
    const about: MockBrand = {
      ...blank,
      about: [{ title: 'Brand promise', content: 'We ship.' } as MockBrand['about'][number]],
    };
    expect(computeBrandSetupSteps(about).find((s) => s.id === 'strategy')?.done).toBe(true);
  });

  it('ignores whitespace-only answers', () => {
    const blankish: MockBrand = {
      ...blank,
      about: [{ title: 'X', content: '   ' } as MockBrand['about'][number]],
      strategy: { ...EMPTY_STRATEGY, mission: '  ' },
    };
    expect(computeBrandSetupSteps(blankish).find((s) => s.id === 'strategy')?.done).toBe(false);
  });

  it('is complete when all four are answered', () => {
    const full: MockBrand = {
      ...withLogo(blank),
      colors: { core: [{ hex: '#ff0000', name: 'Red' } as never], accent: [], grey: [] },
      fonts: [{ family: 'Inter' } as MockBrand['fonts'][number]],
      strategy: { ...EMPTY_STRATEGY, mission: 'Ship.' },
    };
    expect(isBrandSetupComplete(full)).toBe(true);
    expect(missingBrandSetupSteps(full)).toHaveLength(0);
  });
});
