/**
 * Per-value acceptance — the rule the whole flow rests on.
 *
 * Run against the real ops and a real in-memory repository, not mocks: the
 * claims are about what lands in `identityMeta`, and a mock would only prove
 * that we called something.
 */
import { describe, it, expect } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import type { BrandRepository } from '@/domain/brand/repository';
import { assertActorMayReach, coreValueMeta, type Actor, type HumanActor } from '@/domain/brand/coreMeta';
import { applyProposals } from '../applyProposals';
import { acceptAll, acceptProposal, editValue } from '../acceptance';
import { demoteCoreValue } from '@/application/brand/promoteCoreValue';
import type { Proposal } from '../proposals';

const user: HumanActor = { kind: 'human', userId: 'u1' };
const other: HumanActor = { kind: 'human', userId: 'u2' };

/**
 * A repository that preserves the WHOLE canonical brand.
 *
 * Not `InMemoryBrandRepository`: that double round-trips through `brandRow`,
 * which was written at Stage 2B and never learned about `identity_meta`
 * (migration 016) — so it silently drops the sidecar these tests are entirely
 * about. Production is unaffected (it runs `BrandServiceRepository` over the
 * real adapters, which do map the column), but a double that loses the thing
 * under test would give us green for nothing.
 */
class FaithfulRepo implements BrandRepository {
  private rows = new Map<string, string>();
  async getById(id: string) {
    const raw = this.rows.get(id);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return { ...o, createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt) } as CanonicalBrand;
  }
  async getBySlug(slug: string) {
    for (const id of this.rows.keys()) {
      const b = await this.getById(id);
      if (b?.slug === slug) return b;
    }
    return null;
  }
  async save(brand: CanonicalBrand) {
    this.rows.set(brand.id, JSON.stringify(brand));
    return (await this.getById(brand.id))!;
  }
}

function makeCanonical(): CanonicalBrand {
  return {
    id: 'b1', slug: 'meridian', name: 'Meridian',
    identity: {
      colors: { primary: { hex: '#111111' } },
      logos: {},
      typography: { primary: { family: 'Inter' } },
      strategy: { values: [], personality: [], aboutSections: [] },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
    },
    isPublic: false, identitySchemaVersion: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

const PROPOSALS: Proposal[] = [
  { corePath: 'colors.primary', value: { hex: '#1C3F5E' }, provenance: 'inferred', evidence: 'your artwork' },
  { corePath: 'strategy.mission', value: 'Ship the thing', provenance: 'ai-suggested', evidence: 'your description' },
  { corePath: 'voice.tone', value: 'Direct', provenance: 'ai-suggested', evidence: 'your description' },
];

async function seeded() {
  const repo = new FaithfulRepo();
  await repo.save(makeCanonical());
  await applyProposals(repo, 'b1', PROPOSALS);
  return repo;
}

const authorityOf = async (repo: BrandRepository, path: Parameters<typeof coreValueMeta>[1]) =>
  coreValueMeta((await repo.getById('b1'))!.identityMeta, path).authority;

describe('interpretation lands at suggested', () => {
  it('every applied proposal opens at suggested — never confirmed', async () => {
    const repo = await seeded();
    for (const p of PROPOSALS) {
      expect(await authorityOf(repo, p.corePath)).toBe('suggested');
    }
  });

  it('provenance records where the value came from', async () => {
    const repo = await seeded();
    const meta = (await repo.getById('b1'))!.identityMeta;
    expect(coreValueMeta(meta, 'strategy.mission').provenance).toBe('ai-suggested');
    expect(coreValueMeta(meta, 'colors.primary').provenance).toBe('inferred');
  });

  it('reports what it could not write instead of failing silently', async () => {
    const repo = new FaithfulRepo(); // no brand — every op throws
    const report = await applyProposals(repo, 'missing', PROPOSALS);
    expect(report.applied).toEqual([]);
    expect(report.failed.map((f) => f.path)).toEqual(
      expect.arrayContaining(['colors.primary', 'strategy.mission', 'voice.tone']),
    );
  });
});

describe('accepting one value touches exactly that value', () => {
  it('promotes the target and leaves its neighbours alone', async () => {
    const repo = await seeded();
    await acceptProposal(repo, 'b1', 'strategy.mission', user);

    expect(await authorityOf(repo, 'strategy.mission')).toBe('confirmed');
    expect(await authorityOf(repo, 'colors.primary')).toBe('suggested');
    expect(await authorityOf(repo, 'voice.tone')).toBe('suggested');
  });

  it('promotion never rewrites where the value came from', async () => {
    const repo = await seeded();
    await acceptProposal(repo, 'b1', 'strategy.mission', user);
    const meta = coreValueMeta((await repo.getById('b1'))!.identityMeta, 'strategy.mission');
    // "AI-suggested AND user-confirmed" — the sentence the two dimensions exist
    // to be able to say.
    expect(meta.authority).toBe('confirmed');
    expect(meta.provenance).toBe('ai-suggested');
    expect(meta.promotedBy).toBe('u1');
  });

  it('never reaches official', async () => {
    const repo = await seeded();
    await acceptProposal(repo, 'b1', 'voice.tone', user);
    expect(await authorityOf(repo, 'voice.tone')).toBe('confirmed');
    expect(await authorityOf(repo, 'voice.tone')).not.toBe('official');
  });
});

describe('"Looks right" is a loop, not a level', () => {
  it('produces byte-identical metadata to accepting each value individually', async () => {
    const bulk = await seeded();
    await acceptAll(bulk, 'b1', ['colors.primary', 'strategy.mission', 'voice.tone'], user);

    const oneByOne = await seeded();
    await acceptProposal(oneByOne, 'b1', 'colors.primary', user);
    await acceptProposal(oneByOne, 'b1', 'strategy.mission', user);
    await acceptProposal(oneByOne, 'b1', 'voice.tone', user);

    const norm = (m: Record<string, unknown> | undefined) =>
      JSON.parse(JSON.stringify(m ?? {}), (k, v) =>
        k === 'setAt' || k === 'promotedAt' ? 'T' : v);

    expect(norm((await bulk.getById('b1'))!.identityMeta as never))
      .toEqual(norm((await oneByOne.getById('b1'))!.identityMeta as never));
  });

  it('confirms only the paths it was given', async () => {
    const repo = await seeded();
    await acceptAll(repo, 'b1', ['colors.primary'], user);
    expect(await authorityOf(repo, 'colors.primary')).toBe('confirmed');
    expect(await authorityOf(repo, 'strategy.mission')).toBe('suggested');
  });

  it('an empty section is a no-op', async () => {
    const repo = await seeded();
    await acceptAll(repo, 'b1', [], user);
    expect(await authorityOf(repo, 'colors.primary')).toBe('suggested');
  });
});

describe('editing is accepting', () => {
  it('an edit confirms that one value', async () => {
    const repo = await seeded();
    await editValue(repo, 'b1', 'strategy.mission', 'A better mission', user);

    const brand = (await repo.getById('b1'))!;
    expect(brand.identity.strategy.mission).toBe('A better mission');
    expect(coreValueMeta(brand.identityMeta, 'strategy.mission').authority).toBe('confirmed');
  });

  it('an edit records that a human supplied the wording', async () => {
    const repo = await seeded();
    await editValue(repo, 'b1', 'strategy.mission', 'Mine now', user);
    expect(coreValueMeta((await repo.getById('b1'))!.identityMeta, 'strategy.mission').provenance)
      .toBe('user-entered');
  });

  it('an edit leaves neighbours suggested', async () => {
    const repo = await seeded();
    await editValue(repo, 'b1', 'voice.tone', 'Warmer', user);
    expect(await authorityOf(repo, 'voice.tone')).toBe('confirmed');
    expect(await authorityOf(repo, 'colors.primary')).toBe('suggested');
    expect(await authorityOf(repo, 'strategy.mission')).toBe('suggested');
  });

  it('edits a colour through the same shaping as a suggestion', async () => {
    const repo = await seeded();
    await editValue(repo, 'b1', 'colors.primary', { hex: '#ABCDEF' }, user);
    const brand = (await repo.getById('b1'))!;
    expect(brand.identity.colors.primary.hex).toBe('#ABCDEF');
    expect(coreValueMeta(brand.identityMeta, 'colors.primary').authority).toBe('confirmed');
  });
});

describe('a confirmation cannot be walked back — a documented Foundation rule', () => {
  it('demoting a confirmed value floors at confirmed', async () => {
    // 001's deliberate rule: un-adopting is not un-deciding. Pinned here
    // because it is WHY onboarding offers no undo affordance — an un-accept
    // button would silently do nothing, which is worse than no button.
    const repo = await seeded();
    await acceptProposal(repo, 'b1', 'strategy.mission', user);
    await demoteCoreValue(repo, 'b1', 'strategy.mission', 'provisional', user);

    expect(await authorityOf(repo, 'strategy.mission')).toBe('confirmed');
  });

  it('changing your mind is an edit, which keeps the value confirmed', async () => {
    const repo = await seeded();
    await acceptProposal(repo, 'b1', 'strategy.mission', user);
    await editValue(repo, 'b1', 'strategy.mission', 'Actually this', user);

    const brand = (await repo.getById('b1'))!;
    expect(brand.identity.strategy.mission).toBe('Actually this');
    expect(coreValueMeta(brand.identityMeta, 'strategy.mission').authority).toBe('confirmed');
  });
});

describe('the machine can never do any of this', () => {
  it('acceptProposal cannot be called by a machine — the compiler is the guard', async () => {
    const repo = await seeded();
    const ai: Actor = { kind: 'system', agent: 'onboarding-interpreter' };
    // @ts-expect-error SystemActor is not assignable to HumanActor. THIS LINE
    // is the assertion: the guarantee is type-level, so an AI caller cannot be
    // written at all. A runtime check can be forgotten at one call site; a type
    // cannot. If the signature ever widened, this directive would stop erroring
    // and the test would fail to compile.
    void (() => acceptProposal(repo, 'b1', 'voice.tone', ai));
    expect(true).toBe(true);
  });

  it('the runtime guard also refuses a machine reaching confirmed or official', () => {
    const ai: Actor = { kind: 'system', agent: 'onboarding-interpreter' };
    expect(() => assertActorMayReach(ai, 'confirmed')).toThrow(/authorized human/i);
    expect(() => assertActorMayReach(ai, 'official')).toThrow(/authorized human/i);
  });

  it('records WHICH human confirmed, not just that someone did', async () => {
    const repo = await seeded();
    await acceptProposal(repo, 'b1', 'voice.tone', other);
    expect(coreValueMeta((await repo.getById('b1'))!.identityMeta, 'voice.tone').promotedBy).toBe('u2');
  });
});
