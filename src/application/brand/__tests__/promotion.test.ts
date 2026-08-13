/**
 * The promotion guarantee, tested end-to-end through the real repository facade.
 *
 * This is the constitution's hardest rule made executable: AI proposes, only an
 * explicit action by an authorized human disposes. Every assertion here is one
 * way that rule could be broken.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import type {
  AdoptInput,
  IKitAdoptionService,
  KitAdoption,
} from '@/core/services/IKitAdoptionService';
import { assertAdoptable } from '@/core/services/IKitAdoptionService';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { coreValueMeta, type CoreFieldPath, type HumanActor } from '@/domain/brand';
import { changeBrandColors } from '../changeBrandColor';
import { changeBrandVoiceTone } from '../changeBrandVoice';
import { demoteCoreValue, promoteCoreValue } from '../promoteCoreValue';

const human: HumanActor = { kind: 'human', userId: 'u1' };
const AI = { kind: 'system' as const, agent: 'ai-suggester' };

function seedBrand(): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    schemaVersion: 3,
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: 'friendly',
    audience: 'builders',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Brand;
}

/** Minimal in-memory brands service — the same shape the repo facade expects. */
function makeRepo() {
  let row = seedBrand();
  const svc: Partial<IBrandsService> = {
    getById: async (id: string) => (id === row.id ? row : null),
    getBySlug: async (slug: string) => (slug === row.slug ? row : null),
    update: async (_id: string, patch: Partial<Brand>) => {
      row = { ...row, ...patch, updatedAt: new Date() };
      return row;
    },
  };
  return {
    repo: new BrandServiceRepository(svc as IBrandsService),
    current: () => row,
  };
}

/** Records adoptions and enforces the shared guard, like a real implementation. */
function makeAdoptions() {
  const rows: KitAdoption[] = [];
  const service: IKitAdoptionService = {
    list: async () => rows,
    adopt: async (input: AdoptInput) => {
      assertAdoptable(input);
      const row: KitAdoption = {
        id: `ad-${rows.length + 1}`,
        brandId: input.brandId,
        targetKind: input.targetKind,
        targetRef: input.targetRef,
        adoptedBy: input.actor.userId,
        adoptedAt: '2026-08-13T00:00:00.000Z',
      };
      rows.push(row);
      return row;
    },
    unadopt: async (_b, kind, ref) => {
      const i = rows.findIndex((r) => r.targetKind === kind && r.targetRef === ref);
      if (i >= 0) rows.splice(i, 1);
    },
    isAdopted: async (_b, kind, ref) =>
      rows.some((r) => r.targetKind === kind && r.targetRef === ref),
  };
  return { service, rows };
}

describe('ordinary writes never reach a human-only authority', () => {
  it('an AI colour write lands at provisional with ai-suggested provenance', async () => {
    const { repo } = makeRepo();
    const out = await changeBrandColors(
      repo,
      'b1',
      { primary: { hex: '#abcdef' } },
      { actor: AI },
    );
    const meta = coreValueMeta(out.identityMeta, 'colors.primary');
    expect(meta.authority).toBe('provisional');
    expect(meta.provenance).toBe('ai-suggested');
  });

  it('a human write also stops at provisional — writing is not confirming', async () => {
    const { repo } = makeRepo();
    const out = await changeBrandVoiceTone(repo, 'b1', 'bold', { actor: human });
    expect(coreValueMeta(out.identityMeta, 'voice.tone').authority).toBe('provisional');
    expect(coreValueMeta(out.identityMeta, 'voice.tone').provenance).toBe('user-entered');
  });

  it('only the paths actually touched are stamped', async () => {
    const { repo } = makeRepo();
    const out = await changeBrandColors(repo, 'b1', { primary: { hex: '#abcdef' } });
    expect(out.identityMeta?.['colors.primary']).toBeDefined();
    expect(out.identityMeta?.['colors.secondary']).toBeUndefined();
  });
});

describe('promoteCoreValue is the only route to confirmed/official', () => {
  it('promotes to confirmed and stamps the human', async () => {
    const { repo } = makeRepo();
    await changeBrandColors(repo, 'b1', { primary: { hex: '#abcdef' } }, { actor: AI });
    const out = await promoteCoreValue(repo, 'b1', 'colors.primary', 'confirmed', human);

    const meta = coreValueMeta(out.identityMeta, 'colors.primary');
    expect(meta.authority).toBe('confirmed');
    expect(meta.promotedBy).toBe('u1');
  });

  it('preserves provenance — "AI-suggested AND user-confirmed" stays sayable', async () => {
    const { repo } = makeRepo();
    await changeBrandColors(repo, 'b1', { primary: { hex: '#abcdef' } }, { actor: AI });
    const out = await promoteCoreValue(repo, 'b1', 'colors.primary', 'confirmed', human);
    expect(coreValueMeta(out.identityMeta, 'colors.primary').provenance).toBe('ai-suggested');
  });

  it('rejects a path outside the closed registry', async () => {
    const { repo } = makeRepo();
    await expect(
      // Deliberately bypassing the type to prove the RUNTIME guard also holds —
      // a path can reach this op from untyped data (a stored draft, an API body).
      promoteCoreValue(repo, 'b1', 'colors.tertiary' as CoreFieldPath, 'confirmed', human),
    ).rejects.toThrow(/not a Core field path/i);
  });
});

describe('official promotion delegates the adoption row', () => {
  it('writes the adoption through the adoption service, not itself', async () => {
    const { repo } = makeRepo();
    const { service, rows } = makeAdoptions();

    const out = await promoteCoreValue(repo, 'b1', 'voice.tone', 'official', human, {
      adoptions: service,
    });

    expect(coreValueMeta(out.identityMeta, 'voice.tone').authority).toBe('official');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      targetKind: 'core_value',
      targetRef: 'voice.tone',
      adoptedBy: 'u1',
    });
  });

  it('a direct core_value adoption is rejected — one entry point only', async () => {
    const { service } = makeAdoptions();
    await expect(
      service.adopt({
        brandId: 'b1',
        targetKind: 'core_value',
        targetRef: 'voice.tone',
        actor: human,
      }),
    ).rejects.toThrow(/promoteCoreValue/);
  });

  it('does NOT change authority when the delegated adoption fails', async () => {
    const { repo } = makeRepo();
    const failing: IKitAdoptionService = {
      list: async () => [],
      adopt: vi.fn().mockRejectedValue(new Error('network down')),
      unadopt: async () => {},
      isAdopted: async () => false,
    };

    await expect(
      promoteCoreValue(repo, 'b1', 'voice.tone', 'official', human, { adoptions: failing }),
    ).rejects.toThrow(/network down/);

    const after = await repo.getById('b1');
    expect(coreValueMeta(after!.identityMeta, 'voice.tone').authority).not.toBe('official');
  });
});

describe('demotion', () => {
  it('floors at confirmed — un-adopting is not un-deciding', async () => {
    const { repo } = makeRepo();
    const { service, rows } = makeAdoptions();
    await promoteCoreValue(repo, 'b1', 'voice.tone', 'official', human, { adoptions: service });

    const out = await demoteCoreValue(repo, 'b1', 'voice.tone', 'provisional', human, {
      adoptions: service,
    });

    expect(coreValueMeta(out.identityMeta, 'voice.tone').authority).toBe('confirmed');
    expect(rows).toHaveLength(0);
  });

  it('a never-confirmed value can be demoted to provisional', async () => {
    const { repo } = makeRepo();
    const out = await demoteCoreValue(repo, 'b1', 'colors.primary', 'provisional', human);
    expect(coreValueMeta(out.identityMeta, 'colors.primary').authority).toBe('provisional');
  });
});
