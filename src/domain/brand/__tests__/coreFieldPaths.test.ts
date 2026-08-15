/**
 * The registry↔identity drift guard.
 *
 * Authority and provenance live in a sidecar keyed by these paths rather than
 * wrapped around each value. That buys a non-breaking change and costs one
 * risk: the two can drift. This test is the thing that makes the trade safe —
 * every registered path must address a real value on a fully-populated
 * identity, and metadata for anything else must be dropped on read.
 */
import { describe, it, expect } from 'vitest';
import {
  CORE_FIELD_PATHS,
  isCoreFieldPath,
  readCoreValue,
  coreSubsystemOf,
} from '@/domain/brand/coreFieldPaths';
import { sanitizeIdentityMeta } from '@/domain/brand/coreMeta';
import type { BrandIdentity } from '@/domain/brand';

/** An identity with EVERY addressable Core value populated. */
function fullyPopulatedIdentity(): BrandIdentity {
  return {
    colors: {
      primary: { hex: '#111111' },
      secondary: { hex: '#222222' },
      accent: { hex: '#333333' },
      neutrals: [{ hex: '#444444' }],
    },
    logos: {
      primary: { assetId: 'a1' },
      secondary: { assetId: 'a2' },
      wordmark: { assetId: 'a3' },
      iconmark: { assetId: 'a4' },
      mono: { black: { assetId: 'a5' }, white: { assetId: 'a6' } },
      orientations: { horizontal: { assetId: 'a7' }, stacked: { assetId: 'a8' } },
    } as BrandIdentity['logos'],
    typography: {
      primary: { family: 'Inter', weights: [400] },
      secondary: { family: 'Georgia' },
      accent: { family: 'Mono' },
      scale: { h1: '3rem' },
    } as BrandIdentity['typography'],
    strategy: {
      summary: 's',
      mission: 'm',
      vision: 'v',
      values: ['x'],
      positioning: 'p',
      personality: ['bold'],
      targetAudience: 'builders',
      aboutSections: [],
    },
    voice: {
      tone: 'friendly',
      personality: ['warm'],
      doList: ['do'],
      dontList: ['dont'],
      examples: [{ context: 'c', text: 't' }],
    },
    visualStyle: {
      descriptors: ['minimal'],
      cornerStyle: 'soft',
      density: 'balanced',
      contrast: 'medium',
      imageryStyle: 'photographic',
      motion: 'subtle',
    },
    rules: {
      logo: { minSizePx: 24 },
      color: { requireContrastRatio: 4.5 },
      type: { minBodySizePx: 14 },
      voice: { avoidTerms: ['synergy'] },
    },
    positioning: {
      category: 'tools',
      differentiator: 'faster',
      audiences: [{ label: 'devs', priority: 'primary' }],
      competitors: [{ name: 'Other' }],
    },
  };
}

describe('CoreFieldPath registry', () => {
  it('every registered path resolves against a fully-populated identity', () => {
    const identity = fullyPopulatedIdentity();
    const unresolved = CORE_FIELD_PATHS.filter(
      (p) => readCoreValue(identity, p) === undefined,
    );
    expect(unresolved).toEqual([]);
  });

  it('has no duplicate entries', () => {
    expect(new Set(CORE_FIELD_PATHS).size).toBe(CORE_FIELD_PATHS.length);
  });

  it('covers every Core subsystem on the identity', () => {
    const subsystems = new Set(CORE_FIELD_PATHS.map(coreSubsystemOf));
    expect([...subsystems].sort()).toEqual([
      'colors',
      'logos',
      'positioning',
      'rules',
      'strategy',
      'typography',
      'visualStyle',
      'voice',
    ]);
  });

  it('rejects paths outside the registry', () => {
    expect(isCoreFieldPath('colors.primary')).toBe(true);
    expect(isCoreFieldPath('colors.tertiary')).toBe(false);
    expect(isCoreFieldPath('')).toBe(false);
    expect(isCoreFieldPath(null)).toBe(false);
  });

  it('returns undefined for values the brand has not set (skipping is normal)', () => {
    const sparse = { colors: { primary: { hex: '#000' } } } as BrandIdentity;
    expect(readCoreValue(sparse, 'colors.primary')).toEqual({ hex: '#000' });
    expect(readCoreValue(sparse, 'voice.tone')).toBeUndefined();
    expect(readCoreValue(sparse, 'logos.mono.black')).toBeUndefined();
    expect(readCoreValue(undefined, 'colors.primary')).toBeUndefined();
  });
});

describe('sanitizeIdentityMeta — self-healing (INV-1)', () => {
  const valid = {
    authority: 'confirmed',
    provenance: 'ai-suggested',
    setBy: 'u1',
    setAt: '2026-08-13T00:00:00.000Z',
  };

  it('drops metadata for paths outside the registry rather than throwing', () => {
    const out = sanitizeIdentityMeta({
      'colors.primary': valid,
      'colors.tertiary': valid,
      'made.up.path': valid,
    });
    expect(Object.keys(out)).toEqual(['colors.primary']);
  });

  it('drops malformed entries', () => {
    const out = sanitizeIdentityMeta({
      'colors.primary': { authority: 'wat', provenance: 'ai-suggested' },
      'voice.tone': { authority: 'confirmed', provenance: 'nope' },
      'strategy.mission': valid,
    });
    expect(Object.keys(out)).toEqual(['strategy.mission']);
  });

  it('tolerates junk input', () => {
    expect(sanitizeIdentityMeta(undefined)).toEqual({});
    expect(sanitizeIdentityMeta(null)).toEqual({});
    expect(sanitizeIdentityMeta('nope')).toEqual({});
    expect(sanitizeIdentityMeta(42)).toEqual({});
  });
});
