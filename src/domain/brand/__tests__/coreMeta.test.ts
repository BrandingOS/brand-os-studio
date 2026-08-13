/**
 * Authority and provenance — the two-dimension guarantee.
 *
 * The claims under test are the ones the whole feature rests on: promotion
 * never rewrites where a value came from; a system actor can never reach
 * Confirmed or Official; and an absent entry has a defined, safe meaning
 * instead of being null.
 */
import { describe, it, expect } from 'vitest';
import {
  AUTHORITY_ORDER,
  DEFAULT_CORE_VALUE_META,
  assertActorMayReach,
  coreCompleteness,
  coreValueMeta,
  isAtLeast,
  isHumanOnlyAuthority,
  recordCoreAuthorityChange,
  recordCoreWrite,
  type Actor,
  type HumanActor,
  type IdentityMeta,
} from '@/domain/brand/coreMeta';
import type { BrandIdentity } from '@/domain/brand';

const human: HumanActor = { kind: 'human', userId: 'u1' };
const ai: Actor = { kind: 'system', agent: 'ai-suggester' };
const NOW = '2026-08-13T12:00:00.000Z';

describe('authority ordering (INV-5)', () => {
  it('ranks weakest → strongest', () => {
    expect(AUTHORITY_ORDER).toEqual(['suggested', 'provisional', 'confirmed', 'official']);
  });

  it('compares by rank, not equality', () => {
    expect(isAtLeast('official', 'confirmed')).toBe(true);
    expect(isAtLeast('confirmed', 'confirmed')).toBe(true);
    expect(isAtLeast('provisional', 'confirmed')).toBe(false);
    expect(isAtLeast('suggested', 'provisional')).toBe(false);
  });

  it('marks exactly confirmed + official as human-only', () => {
    expect(isHumanOnlyAuthority('confirmed')).toBe(true);
    expect(isHumanOnlyAuthority('official')).toBe(true);
    expect(isHumanOnlyAuthority('provisional')).toBe(false);
    expect(isHumanOnlyAuthority('suggested')).toBe(false);
  });
});

describe('default metadata (INV-4)', () => {
  it('resolves an absent entry to provisional/imported, never null', () => {
    expect(coreValueMeta(undefined, 'colors.primary')).toEqual(DEFAULT_CORE_VALUE_META);
    expect(coreValueMeta({}, 'voice.tone').authority).toBe('provisional');
    expect(coreValueMeta({}, 'voice.tone').provenance).toBe('imported');
  });

  it('does not claim confirmation for data that predates the sidecar', () => {
    // Claiming `confirmed` here would invent a human decision nobody recorded.
    expect(DEFAULT_CORE_VALUE_META.authority).not.toBe('confirmed');
    expect(DEFAULT_CORE_VALUE_META.authority).not.toBe('official');
  });
});

describe('system actors cannot reach human-only authorities (INV-3)', () => {
  it('throws for a system actor reaching confirmed or official', () => {
    expect(() => assertActorMayReach(ai, 'confirmed')).toThrow(/authorized human/i);
    expect(() => assertActorMayReach(ai, 'official')).toThrow(/authorized human/i);
  });

  it('allows a system actor at suggested and provisional', () => {
    expect(() => assertActorMayReach(ai, 'suggested')).not.toThrow();
    expect(() => assertActorMayReach(ai, 'provisional')).not.toThrow();
  });

  it('allows a human anywhere', () => {
    for (const a of AUTHORITY_ORDER) {
      expect(() => assertActorMayReach(human, a)).not.toThrow();
    }
  });

  it('throws rather than silently downgrading — a caller must not believe it succeeded', () => {
    let threw = false;
    try {
      assertActorMayReach(ai, 'official');
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe('recordCoreWrite', () => {
  it('records who wrote and where the value came from', () => {
    const meta = recordCoreWrite(undefined, 'colors.primary', human, 'user-entered', NOW);
    expect(meta['colors.primary']).toMatchObject({
      authority: 'provisional',
      provenance: 'user-entered',
      setBy: 'u1',
      setAt: NOW,
    });
  });

  it('an AI write lands at provisional — never confirmed', () => {
    const meta = recordCoreWrite(undefined, 'colors.primary', ai, 'ai-suggested', NOW);
    expect(isAtLeast(meta['colors.primary']!.authority, 'confirmed')).toBe(false);
    expect(meta['colors.primary']!.provenance).toBe('ai-suggested');
    expect(meta['colors.primary']!.setBy).toBe('ai-suggester');
  });

  it('a human editing a confirmed value KEEPS its authority', () => {
    let meta: IdentityMeta = recordCoreWrite(undefined, 'voice.tone', human, 'user-entered', NOW);
    meta = recordCoreAuthorityChange(meta, 'voice.tone', 'confirmed', human, NOW);
    meta = recordCoreWrite(meta, 'voice.tone', human, 'user-entered', NOW);
    expect(meta['voice.tone']!.authority).toBe('confirmed');
  });

  it('the SYSTEM editing a confirmed value demotes it to provisional', () => {
    // Settled truth must not be silently overwritten and left looking settled.
    let meta: IdentityMeta = recordCoreWrite(undefined, 'voice.tone', human, 'user-entered', NOW);
    meta = recordCoreAuthorityChange(meta, 'voice.tone', 'confirmed', human, NOW);
    meta = recordCoreWrite(meta, 'voice.tone', ai, 'ai-suggested', NOW);
    expect(meta['voice.tone']!.authority).toBe('provisional');
    expect(meta['voice.tone']!.provenance).toBe('ai-suggested');
  });

  it('leaves other paths untouched', () => {
    const first = recordCoreWrite(undefined, 'colors.primary', human, 'user-entered', NOW);
    const second = recordCoreWrite(first, 'voice.tone', ai, 'inferred', NOW);
    expect(second['colors.primary']).toEqual(first['colors.primary']);
  });
});

describe('recordCoreAuthorityChange — promotion (INV-2)', () => {
  it('promotion NEVER rewrites provenance', () => {
    // The sentence this protects: "AI-suggested AND user-confirmed".
    const written = recordCoreWrite(undefined, 'colors.primary', ai, 'ai-suggested', NOW);
    const promoted = recordCoreAuthorityChange(written, 'colors.primary', 'confirmed', human, NOW);
    expect(promoted['colors.primary']!.authority).toBe('confirmed');
    expect(promoted['colors.primary']!.provenance).toBe('ai-suggested');
  });

  it('stamps the promoting human and time', () => {
    const promoted = recordCoreAuthorityChange(undefined, 'voice.tone', 'official', human, NOW);
    expect(promoted['voice.tone']!.promotedBy).toBe('u1');
    expect(promoted['voice.tone']!.promotedAt).toBe(NOW);
  });

  it('does not stamp promotion metadata when demoting below confirmed', () => {
    const demoted = recordCoreAuthorityChange(undefined, 'voice.tone', 'provisional', human, NOW);
    expect(demoted['voice.tone']!.promotedBy).toBeUndefined();
  });

  it('preserves the original setAt — promotion is not a new write', () => {
    const written = recordCoreWrite(undefined, 'colors.primary', human, 'user-entered', NOW);
    const later = '2026-09-01T00:00:00.000Z';
    const promoted = recordCoreAuthorityChange(written, 'colors.primary', 'confirmed', human, later);
    expect(promoted['colors.primary']!.setAt).toBe(NOW);
    expect(promoted['colors.primary']!.promotedAt).toBe(later);
  });
});

describe('coreCompleteness — display only', () => {
  const identity = {
    colors: { primary: { hex: '#111' } },
    logos: {},
    typography: { primary: { family: 'Inter' } },
    strategy: { values: [], personality: [], aboutSections: [] },
    voice: { personality: [], doList: [], dontList: [], examples: [] },
  } as unknown as BrandIdentity;

  it('counts set values and confirmed values separately', () => {
    const meta = recordCoreAuthorityChange(undefined, 'colors.primary', 'confirmed', human, NOW);
    const c = coreCompleteness(identity, meta);
    expect(c.set).toBe(2); // colors.primary + typography.primary
    expect(c.confirmed).toBe(1);
    expect(c.total).toBeGreaterThan(c.set);
  });

  it('treats empty arrays as unset', () => {
    const c = coreCompleteness(identity, undefined);
    expect(c.confirmed).toBe(0);
    expect(c.set).toBe(2);
  });
});
