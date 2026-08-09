import { describe, it, expect } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import { InMemoryBrandRepository } from '../InMemoryBrandRepository';

function makeCanonical(overrides: Partial<CanonicalBrand> = {}): CanonicalBrand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    identity: {
      colors: { primary: { hex: '#111111' } },
      logos: { primary: { assetId: 'a1' } },
      typography: { primary: { family: 'Inter', weights: [400] } },
      strategy: { values: [], personality: [], aboutSections: [] },
      voice: { personality: [], doList: [], dontList: [], examples: [], tone: 'calm' },
    },
    isPublic: false,
    identitySchemaVersion: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

describe('BrandRepository round-trip (write → persist → read → same meaning)', () => {
  it('saves and reads back by id with semantic equality', async () => {
    const repo = new InMemoryBrandRepository();
    await repo.save(makeCanonical());
    const back = await repo.getById('b1');
    expect(back).not.toBeNull();
    expect(back!.identity.colors.primary.hex).toBe('#111111');
    expect(back!.identity.logos.primary?.assetId).toBe('a1');
    expect(back!.identity.typography.primary.family).toBe('Inter');
    expect(back!.identity.voice.tone).toBe('calm');
    expect(back!.name).toBe('Acme');
  });

  it('reads back by slug', async () => {
    const repo = new InMemoryBrandRepository();
    await repo.save(makeCanonical());
    expect((await repo.getBySlug('acme'))!.id).toBe('b1');
  });

  it('a saved primary color survives reload unchanged (no stale-mirror revert)', async () => {
    const repo = new InMemoryBrandRepository();
    await repo.save(makeCanonical()); // primary #111111
    // simulate an edit: change primary to #ff0000 and save again
    const edited = makeCanonical({
      identity: { ...makeCanonical().identity, colors: { primary: { hex: '#ff0000' } } },
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });
    await repo.save(edited);
    const back = await repo.getById('b1');
    expect(back!.identity.colors.primary.hex).toBe('#ff0000'); // NOT reverted to #111111
  });

  it('returns null for unknown id/slug', async () => {
    const repo = new InMemoryBrandRepository();
    expect(await repo.getById('nope')).toBeNull();
    expect(await repo.getBySlug('nope')).toBeNull();
  });
});
