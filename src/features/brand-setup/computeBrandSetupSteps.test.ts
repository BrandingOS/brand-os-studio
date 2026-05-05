// Phase 11.2 — computeBrandSetupSteps tests.
import { describe, expect, it } from 'vitest';
import { computeBrandSetupSteps, isBrandSetupComplete } from './computeBrandSetupSteps';
import type { Brand } from '@/shared/types/brand';

const blank: Brand = {
  id: 'b',
  slug: 'b',
  name: 'B',
  primaryColor: '',
  fonts: { primary: '' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Brand;

describe('computeBrandSetupSteps', () => {
  it('returns 4 steps in stable order: colors, logo, typography, voice', () => {
    const steps = computeBrandSetupSteps(blank);
    expect(steps.map((s) => s.id)).toEqual(['colors', 'logo', 'typography', 'voice']);
  });

  it('flags every step incomplete on a blank brand', () => {
    const steps = computeBrandSetupSteps(blank);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it('marks colors done when primaryColor is non-empty', () => {
    const steps = computeBrandSetupSteps({ ...blank, primaryColor: '#ff0000' });
    expect(steps.find((s) => s.id === 'colors')?.done).toBe(true);
  });

  it('marks logo done via brandAssets', () => {
    const steps = computeBrandSetupSteps({
      ...blank,
      brandAssets: [{ id: 'a1', type: 'logo', category: 'logo' } as never],
    });
    expect(steps.find((s) => s.id === 'logo')?.done).toBe(true);
  });

  it('marks logo done via legacy logo string', () => {
    const steps = computeBrandSetupSteps({ ...blank, logo: '/url.svg' });
    expect(steps.find((s) => s.id === 'logo')?.done).toBe(true);
  });

  it('marks typography done via legacy fonts.primary', () => {
    const steps = computeBrandSetupSteps({
      ...blank,
      fonts: { primary: 'Inter' },
    });
    expect(steps.find((s) => s.id === 'typography')?.done).toBe(true);
  });

  it('marks typography done via v3 typography.primary.family', () => {
    const steps = computeBrandSetupSteps({
      ...blank,
      typography: { primary: { family: 'Inter' } },
    } as unknown as Brand);
    expect(steps.find((s) => s.id === 'typography')?.done).toBe(true);
  });

  it('marks voice done when tone OR audience is set', () => {
    const t = computeBrandSetupSteps({ ...blank, tone: 'playful' });
    expect(t.find((s) => s.id === 'voice')?.done).toBe(true);
    const a = computeBrandSetupSteps({ ...blank, audience: 'designers' });
    expect(a.find((s) => s.id === 'voice')?.done).toBe(true);
  });

  it('builds slug-aware hrefs', () => {
    const steps = computeBrandSetupSteps({ ...blank, slug: 'raqm' });
    expect(steps.find((s) => s.id === 'colors')?.href).toBe('/b/raqm/brand-kit?tab=colors');
    expect(steps.find((s) => s.id === 'voice')?.href).toBe('/b/raqm/identity?tab=voice');
  });

  it('treats whitespace-only strings as empty', () => {
    const steps = computeBrandSetupSteps({ ...blank, primaryColor: '   ' });
    expect(steps.find((s) => s.id === 'colors')?.done).toBe(false);
  });
});

describe('isBrandSetupComplete', () => {
  it('false on a blank brand', () => {
    expect(isBrandSetupComplete(blank)).toBe(false);
  });

  it('true when every step is satisfied', () => {
    const fullyConfigured: Brand = {
      ...blank,
      primaryColor: '#ff0000',
      logo: '/logo.svg',
      fonts: { primary: 'Inter' },
      tone: 'playful',
      audience: 'designers',
    };
    expect(isBrandSetupComplete(fullyConfigured)).toBe(true);
  });
});
