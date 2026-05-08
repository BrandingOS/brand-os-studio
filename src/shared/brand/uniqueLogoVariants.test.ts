import { describe, expect, it } from 'vitest';
import { uniqueLogoVariants } from './uniqueLogoVariants';
import type { Brand } from '@/shared/types/brand';

function brandWith(logoSystem: Brand['guidelines'] extends infer G ? unknown : never): Brand;
function brandWith(legacy: Partial<Brand['guidelines']>['logoSystem']): Brand {
  return {
    id: 'b',
    slug: 'b',
    name: 'B',
    primaryColor: '#000',
    secondaryColor: '#000',
    fonts: { primary: 'Inter', secondary: 'Inter' },
    tone: 'x',
    audience: 'x',
    strategy: 'x',
    guidelines: legacy ? { logoSystem: legacy as never } : undefined,
  } as unknown as Brand;
}

describe('uniqueLogoVariants', () => {
  it('always includes Auto, even when the brand has no logos at all', () => {
    const brand = brandWith(undefined);
    const result = uniqueLogoVariants(brand);
    expect(result.map((v) => v.value)).toEqual(['auto']);
  });

  it('drops variants that resolve to the same URL as Auto', () => {
    // Mimics seed brands where primary, secondary, wordmark, and
    // iconmark all point at the same wordmark image.
    const sameUrl = '/brands/x/logo.svg';
    const brand = brandWith({
      primary: { url: sameUrl },
      secondary: { url: sameUrl },
      wordmark: { url: sameUrl },
      iconmark: { url: sameUrl },
      blackVersion: { url: '/brands/x/logo-black.svg' },
      whiteVersion: { url: '/brands/x/logo-white.svg' },
    });
    const result = uniqueLogoVariants(brand);
    // Auto wins the shared URL; mono variants stay because they're
    // distinct images.
    expect(result.map((v) => v.value)).toEqual([
      'auto',
      'mono.black',
      'mono.white',
    ]);
  });

  it('keeps every variant that has a unique URL — Primary collapses into Auto when both resolve to the same primary asset', () => {
    const brand = brandWith({
      primary:       { url: '/p.svg' },
      secondary:     { url: '/s.svg' },
      wordmark:      { url: '/w.svg' },
      iconmark:      { url: '/i.svg' },
      blackVersion:  { url: '/b.svg' },
      whiteVersion:  { url: '/wh.svg' },
    });
    const result = uniqueLogoVariants(brand);
    // Primary is intentionally absent — Auto previews the primary
    // asset, so showing both reads as a duplicate to the user. Auto
    // is the smart-pick option that wins the shared URL.
    expect(result.map((v) => v.value)).toEqual([
      'auto',
      'secondary',
      'wordmark',
      'iconmark',
      'mono.black',
      'mono.white',
    ]);
  });

  it('drops unset variants entirely (no placeholder mid-grid)', () => {
    // Brand has primary + iconmark only.
    const brand = brandWith({
      primary: { url: '/p.svg' },
      iconmark: { url: '/i.svg' },
    });
    const result = uniqueLogoVariants(brand);
    expect(result.map((v) => v.value)).toEqual(['auto', 'iconmark']);
  });
});
