/**
 * Creation must work on a brand that has decided almost nothing.
 *
 * The tests below are really one claim in several forms: an incomplete Core is a
 * supported state, not a blocked one. The moment this module starts filtering to
 * confirmed-only by default, "skip and keep going" stops being true.
 */
import { describe, it, expect } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import {
  recordCoreAuthorityChange,
  recordCoreWrite,
  type HumanActor,
} from '@/domain/brand/coreMeta';
import { buildCreationContext } from '../buildCreationContext';

const human: HumanActor = { kind: 'human', userId: 'u1' };
const AI = { kind: 'system' as const, agent: 'ai' };
const NOW = '2026-08-13T00:00:00.000Z';

function brand(overrides: Partial<CanonicalBrand> = {}): CanonicalBrand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    identity: {
      colors: { primary: { hex: '#111111' } },
      logos: {},
      typography: { primary: { family: 'Inter' } },
      strategy: { values: [], personality: [], aboutSections: [] },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
    },
    isPublic: false,
    identitySchemaVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as CanonicalBrand;
}

describe('provisional values are included by default (FR-006)', () => {
  it('a name-only brand with AI-suggested colours still produces usable context', () => {
    const meta = recordCoreWrite(undefined, 'colors.primary', AI, 'ai-suggested', NOW);
    const ctx = buildCreationContext({ brand: brand({ identityMeta: meta }) });

    expect(ctx.core.some((e) => e.path === 'colors.primary')).toBe(true);
    expect(ctx.provisionalPaths).toContain('colors.primary');
  });

  it('values with NO metadata at all are included (default authority is provisional)', () => {
    const ctx = buildCreationContext({ brand: brand() });
    expect(ctx.core.map((e) => e.path)).toContain('typography.primary');
  });

  it('every entry carries its authority and provenance so the model knows what is assumed', () => {
    const meta = recordCoreWrite(undefined, 'colors.primary', AI, 'ai-suggested', NOW);
    const ctx = buildCreationContext({ brand: brand({ identityMeta: meta }) });
    const entry = ctx.core.find((e) => e.path === 'colors.primary')!;
    // Spec 002 — a fresh machine write opens at `suggested`. What the model
    // needs to know is that this is ASSUMED, not decided, and both bands say
    // that: the entry is still reported as provisional-or-weaker below.
    expect(entry.authority).toBe('suggested');
    expect(ctx.provisionalPaths).toContain('colors.primary');
    expect(entry.provenance).toBe('ai-suggested');
  });
});

describe('minAuthority is opt-in, never the default', () => {
  it('filtering to confirmed-only excludes provisional values when asked', () => {
    let meta = recordCoreWrite(undefined, 'colors.primary', AI, 'ai-suggested', NOW);
    meta = recordCoreAuthorityChange(meta, 'colors.primary', 'confirmed', human, NOW);

    const b = brand({ identityMeta: meta });
    const all = buildCreationContext({ brand: b });
    const strict = buildCreationContext({ brand: b, minAuthority: 'confirmed' });

    expect(all.core.length).toBeGreaterThan(strict.core.length);
    expect(strict.core.map((e) => e.path)).toEqual(['colors.primary']);
    expect(strict.provisionalPaths).toEqual([]);
  });
});

describe('context assembly', () => {
  it('omits Core values the brand has not set', () => {
    const ctx = buildCreationContext({ brand: brand() });
    expect(ctx.core.map((e) => e.path)).not.toContain('voice.tone');
    expect(ctx.core.map((e) => e.path)).not.toContain('rules.logo');
  });

  it('treats empty arrays as unset', () => {
    const ctx = buildCreationContext({ brand: brand() });
    expect(ctx.core.map((e) => e.path)).not.toContain('strategy.values');
  });

  it('passes through business info, references and preferences', () => {
    const ctx = buildCreationContext({
      brand: brand({ businessInfo: { legalName: 'Acme Ltd' } }),
      references: [{ assetId: 'a1', url: 'https://x/1.png', kind: 'image' }],
      context: {
        referenceIds: ['a1'],
        likedRefs: [],
        dislikedRefs: [],
        preferences: { density: 'airy' },
        signalCount: 1,
      },
    });

    expect(ctx.businessInfo?.legalName).toBe('Acme Ltd');
    expect(ctx.references).toHaveLength(1);
    expect(ctx.preferences).toEqual({ density: 'airy' });
  });

  it('is pure — the same input yields a deep-equal result', () => {
    const b = brand();
    expect(buildCreationContext({ brand: b })).toEqual(buildCreationContext({ brand: b }));
  });
});
