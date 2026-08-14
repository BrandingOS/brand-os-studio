/**
 * The four sentinel invariants.
 *
 * A persistence sentinel exists because `brands.primary_color` is NOT NULL and
 * the canonical schema demands a valid hex and a non-empty family. It is not a
 * brand value, and these four tests are what keep that true as the feature
 * grows:
 *
 *   1. It never renders as a chosen value — a name-only brand reads as unset.
 *   2. It never reaches AI / generation / Context as brand truth.
 *   3. The marker survives resume.
 *   4. The first real write retires the marker, permanently.
 */
import { describe, it, expect } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import type { BrandRepository } from '@/domain/brand/repository';
import { buildCreationContext } from '@/application/brand/buildCreationContext';
import {
  CORE_PLACEHOLDERS,
  clearPlaceholders,
  isPlaceholderPath,
  placeholderPaths,
  readOnboardingState,
  atStep,
} from '@/shared/onboarding/onboardingState';
import { applyProposals, sentinelsRetiredBy } from '../applyProposals';
import { buildCreateInput, isUndecided } from '../createBrand';
import type { Proposal } from '../proposals';

/** The brand as it exists after only a name has been typed. */
function nameOnlyBrand() {
  const input = buildCreateInput({ name: 'Meridian' });
  return {
    id: 'b1',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: input.primaryColor,
    fonts: input.fonts,
    tone: input.tone,
    audience: input.audience,
    onboarding: input.onboarding,
  };
}

function canonicalWithSentinels(): CanonicalBrand {
  return {
    id: 'b1', slug: 'meridian', name: 'Meridian',
    identity: {
      // Exactly what persistence forced us to store.
      colors: { primary: { hex: CORE_PLACEHOLDERS['colors.primary'] } },
      logos: {},
      typography: { primary: { family: CORE_PLACEHOLDERS['typography.primary'] } },
      strategy: { values: [], personality: [], aboutSections: [] },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
    },
    isPublic: false, identitySchemaVersion: 1,
    createdAt: new Date('2026-08-14T00:00:00Z'),
    updatedAt: new Date('2026-08-14T00:00:00Z'),
  };
}

class Repo implements BrandRepository {
  private rows = new Map<string, string>();
  async getById(id: string) {
    const raw = this.rows.get(id);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return { ...o, createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt) } as CanonicalBrand;
  }
  async getBySlug() { return null; }
  async save(b: CanonicalBrand) { this.rows.set(b.id, JSON.stringify(b)); return (await this.getById(b.id))!; }
}

// ── 1 ────────────────────────────────────────────────────────────────
describe('INVARIANT 1 — a sentinel never renders as a chosen value', () => {
  const brand = nameOnlyBrand();

  it('a name-only brand reports both slots as unset', () => {
    expect(isPlaceholderPath(brand, 'colors.primary')).toBe(true);
    expect(isPlaceholderPath(brand, 'typography.primary')).toBe(true);
  });

  it('the brand as a whole reads as undecided', () => {
    expect(isUndecided(brand)).toBe(true);
  });

  it('a brand that chose its colour does NOT read as unset', () => {
    const decided = { onboarding: clearPlaceholders(readOnboardingState(brand)!, ['colors.primary'])! };
    expect(isPlaceholderPath(decided, 'colors.primary')).toBe(false);
    expect(isPlaceholderPath(decided, 'typography.primary')).toBe(true);
  });

  it('the stored hex is the documented neutral, not something brand-like', () => {
    // If this ever changed to a plausible brand colour, a name-only brand would
    // start looking like it had made a decision.
    expect(brand.primaryColor).toBe('#8A877E');
    expect(brand.fonts.primary).toBe('system-ui');
  });

  it('a brand with no marker at all is never treated as holding sentinels', () => {
    expect(isPlaceholderPath({ onboarding: undefined }, 'colors.primary')).toBe(false);
  });
});

// ── 2 ────────────────────────────────────────────────────────────────
describe('INVARIANT 2 — a sentinel never enters AI, generation or Context', () => {
  const sentinels = ['colors.primary', 'typography.primary'];

  it('is excluded from the creation context entirely', () => {
    const ctx = buildCreationContext({ brand: canonicalWithSentinels(), sentinelPaths: sentinels });
    expect(ctx.core.map((c) => c.path)).not.toContain('colors.primary');
    expect(ctx.core.map((c) => c.path)).not.toContain('typography.primary');
  });

  it('the sentinel VALUE never appears anywhere in the context payload', () => {
    // The decisive check: an AI told the brand colour is a mid-grey would
    // faithfully produce grey work for a brand that never chose one.
    const ctx = buildCreationContext({ brand: canonicalWithSentinels(), sentinelPaths: sentinels });
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain(CORE_PLACEHOLDERS['colors.primary']);
    expect(serialized).not.toContain(CORE_PLACEHOLDERS['typography.primary']);
  });

  it('is not reported as provisional either — it is not a value at all', () => {
    const ctx = buildCreationContext({ brand: canonicalWithSentinels(), sentinelPaths: sentinels });
    expect(ctx.provisionalPaths).not.toContain('colors.primary');
    expect(ctx.provisionalPaths).not.toContain('typography.primary');
  });

  it('a REAL colour on the same path is included once the sentinel is retired', () => {
    const brand = canonicalWithSentinels();
    brand.identity.colors.primary = { hex: '#1C3F5E' };
    const ctx = buildCreationContext({ brand, sentinelPaths: ['typography.primary'] });
    expect(ctx.core.map((c) => c.path)).toContain('colors.primary');
    expect(JSON.stringify(ctx)).toContain('#1C3F5E');
  });

  it('brands with no sentinels are unaffected — the default excludes nothing', () => {
    const brand = canonicalWithSentinels();
    brand.identity.colors.primary = { hex: '#1C3F5E' };
    const ctx = buildCreationContext({ brand });
    expect(ctx.core.map((c) => c.path)).toContain('colors.primary');
  });
});

// ── 3 ────────────────────────────────────────────────────────────────
describe('INVARIANT 3 — the marker survives resume', () => {
  const brand = nameOnlyBrand();

  it('survives a JSON round trip, as persistence performs', () => {
    const revived = JSON.parse(JSON.stringify(brand));
    expect(placeholderPaths(revived)).toEqual(['colors.primary', 'typography.primary']);
  });

  it('survives moving between steps', () => {
    const state = readOnboardingState(brand)!;
    const moved = atStep(atStep(state, 'setup'), 'review');
    expect(moved.placeholders).toEqual(['colors.primary', 'typography.primary']);
  });

  it('survives moving BACKWARDS', () => {
    const state = readOnboardingState(brand)!;
    const back = atStep(atStep(state, 'review'), 'setup');
    expect(back.placeholders).toEqual(['colors.primary', 'typography.primary']);
  });

  it('a resumed brand still reads its slots as unset', () => {
    const revived = JSON.parse(JSON.stringify(brand));
    const resumed = { onboarding: readOnboardingState(revived)! };
    expect(isPlaceholderPath(resumed, 'colors.primary')).toBe(true);
  });
});

// ── 4 ────────────────────────────────────────────────────────────────
describe('INVARIANT 4 — the first real write retires the marker, permanently', () => {
  const proposals: Proposal[] = [
    { corePath: 'colors.primary', value: { hex: '#1C3F5E' }, provenance: 'inferred', evidence: 'your artwork' },
  ];

  async function seeded() {
    const repo = new Repo();
    await repo.save(canonicalWithSentinels());
    return repo;
  }

  it('a successful colour write reports the sentinel as retired', async () => {
    const repo = await seeded();
    const report = await applyProposals(repo, 'b1', proposals);
    expect(report.applied).toContain('colors.primary');
    expect(sentinelsRetiredBy(report)).toEqual(['colors.primary']);
  });

  it('retirement removes only that path — the other slot is still unset', () => {
    const state = readOnboardingState(nameOnlyBrand())!;
    const next = clearPlaceholders(state, ['colors.primary'])!;
    expect(next.placeholders).toEqual(['typography.primary']);
  });

  it('a FAILED write retires nothing — the slot is still undecided', async () => {
    const repo = new Repo(); // no brand: the op throws
    const report = await applyProposals(repo, 'missing', proposals);
    expect(report.applied).toEqual([]);
    expect(sentinelsRetiredBy(report)).toEqual([]);
  });

  it('retirement is permanent — the list only ever shrinks', () => {
    const state = readOnboardingState(nameOnlyBrand())!;
    const once = clearPlaceholders(state, ['colors.primary'])!;
    // Re-applying anything, including a later step change, cannot bring it back.
    const later = atStep(once, 'review');
    expect(later.placeholders).toEqual(['typography.primary']);
    expect(clearPlaceholders(later, ['colors.primary'])).toBeNull();
  });

  it('retiring both leaves a brand that is no longer undecided', () => {
    const state = readOnboardingState(nameOnlyBrand())!;
    const done = clearPlaceholders(state, ['colors.primary', 'typography.primary'])!;
    expect(placeholderPaths({ onboarding: done })).toEqual([]);
    expect(isUndecided({ onboarding: done })).toBe(false);
  });

  it('a non-sentinel write retires nothing', async () => {
    const repo = await seeded();
    const report = await applyProposals(repo, 'b1', [
      { corePath: 'strategy.mission', value: 'Ship it', provenance: 'ai-suggested', evidence: 'your description' },
    ]);
    expect(report.applied).toContain('strategy.mission');
    expect(sentinelsRetiredBy(report)).toEqual([]);
  });
});
