import { describe, expect, it } from 'vitest';
import { dedupeLogoSystem, dedupeLogoSystemRefs } from './dedupeLogoSystem';
import type { LogoSystem } from '@/shared/types/brand';
import type { LogoSystemRefs } from '@/shared/types/brandAssets';

const v = (url: string) => ({ url, description: 'd', usage: 'u' });

const baseSystem = (extra: Partial<LogoSystem>): LogoSystem => ({
  primary: v('/p.svg'),
  clearSpace: 'cs',
  minSize: 'ms',
  usage: [],
  ...extra,
});

describe('dedupeLogoSystem (legacy LogoSystem shape)', () => {
  it('keeps a system that is already unique untouched', () => {
    const sys = baseSystem({
      secondary: v('/s.svg'),
      blackVersion: v('/b.svg'),
      whiteVersion: v('/w.svg'),
    });
    const out = dedupeLogoSystem(sys);
    expect(out?.secondary?.url).toBe('/s.svg');
    expect(out?.blackVersion?.url).toBe('/b.svg');
    expect(out?.whiteVersion?.url).toBe('/w.svg');
  });

  it('drops non-primary roles whose URL matches primary', () => {
    // Mimics the seed-data shape: every role aliased to the same mark.
    const sameUrl = '/brands/x/logo.svg';
    const sys = baseSystem({
      primary: v(sameUrl),
      secondary: v(sameUrl),
      wordmark: v(sameUrl),
      iconmark: v(sameUrl),
      blackVersion: v('/black.svg'),
      whiteVersion: v('/white.svg'),
    });
    const out = dedupeLogoSystem(sys);
    expect(out?.primary?.url).toBe(sameUrl);
    expect(out?.secondary).toBeUndefined();
    expect(out?.wordmark).toBeUndefined();
    expect(out?.iconmark).toBeUndefined();
    expect(out?.blackVersion?.url).toBe('/black.svg');
    expect(out?.whiteVersion?.url).toBe('/white.svg');
  });

  it('keeps clearSpace, minSize, and usage rules', () => {
    const sys: LogoSystem = baseSystem({
      clearSpace: 'one cap height',
      minSize: '60px',
      usage: [{ do: 'use', dont: 'abuse' }],
    });
    const out = dedupeLogoSystem(sys);
    expect(out?.clearSpace).toBe('one cap height');
    expect(out?.minSize).toBe('60px');
    expect(out?.usage).toEqual([{ do: 'use', dont: 'abuse' }]);
  });

  it('returns undefined when given undefined', () => {
    expect(dedupeLogoSystem(undefined)).toBeUndefined();
  });
});

describe('dedupeLogoSystemRefs (v3 LogoSystemRefs shape)', () => {
  it('drops a non-primary ref whose assetId matches primary', () => {
    const refs: LogoSystemRefs = {
      primary: { assetId: 'asset-1' },
      secondary: { assetId: 'asset-1' },
      wordmark: { assetId: 'asset-1' },
      iconmark: { assetId: 'asset-2' },
      mono: {
        black: { assetId: 'asset-1' },
        white: { assetId: 'asset-3' },
      },
    };
    const out = dedupeLogoSystemRefs(refs);
    expect(out?.primary?.assetId).toBe('asset-1');
    expect(out?.secondary).toBeUndefined();
    expect(out?.wordmark).toBeUndefined();
    expect(out?.iconmark?.assetId).toBe('asset-2');
    expect(out?.mono?.black).toBeUndefined();
    expect(out?.mono?.white?.assetId).toBe('asset-3');
  });

  it('keeps unique refs untouched', () => {
    const refs: LogoSystemRefs = {
      primary: { assetId: 'a' },
      secondary: { assetId: 'b' },
      wordmark: { assetId: 'c' },
      iconmark: { assetId: 'd' },
      mono: { black: { assetId: 'e' }, white: { assetId: 'f' } },
    };
    const out = dedupeLogoSystemRefs(refs);
    expect(out?.primary?.assetId).toBe('a');
    expect(out?.secondary?.assetId).toBe('b');
    expect(out?.wordmark?.assetId).toBe('c');
    expect(out?.iconmark?.assetId).toBe('d');
    expect(out?.mono?.black?.assetId).toBe('e');
    expect(out?.mono?.white?.assetId).toBe('f');
  });

  it('returns undefined when given undefined', () => {
    expect(dedupeLogoSystemRefs(undefined)).toBeUndefined();
  });
});
