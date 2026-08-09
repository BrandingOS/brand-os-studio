import { describe, it, expect } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import type { BrandRepository } from '@/domain/brand/repository';
import { InMemoryBrandRepository } from '@/platform/brand/InMemoryBrandRepository';
import { canonicalToRow, rowToCanonical, type BrandRow } from '@/platform/brand/brandRow';
import { changeBrandColor, changeBrandPrimaryColor } from '../changeBrandColor';

function makeCanonical(overrides: Partial<CanonicalBrand> = {}): CanonicalBrand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    identity: {
      colors: { primary: { hex: '#111111', name: 'Ink' } },
      logos: {},
      typography: { primary: { family: 'Inter' } },
      strategy: { values: [], personality: [], aboutSections: [] },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
    },
    isPublic: false,
    identitySchemaVersion: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

async function seededRepo(): Promise<BrandRepository> {
  const repo = new InMemoryBrandRepository();
  await repo.save(makeCanonical());
  return repo;
}

describe('Stage 2D — Color System end-to-end through the canonical stack', () => {
  it('intent → use-case → canonical → repository → reload returns the new value', async () => {
    const repo = await seededRepo();
    const saved = await changeBrandPrimaryColor(repo, 'b1', '#ff0000');
    expect(saved.identity.colors.primary.hex).toBe('#ff0000');

    // Reload (a fresh read, as a page refresh would do).
    const reloaded = await repo.getById('b1');
    expect(reloaded!.identity.colors.primary.hex).toBe('#ff0000');
  });

  it('a hex-only change preserves the color token metadata (name)', async () => {
    const repo = await seededRepo(); // primary { hex:#111111, name:'Ink' }
    const saved = await changeBrandPrimaryColor(repo, 'b1', '#ff0000');
    expect(saved.identity.colors.primary.hex).toBe('#ff0000');
    expect(saved.identity.colors.primary.name).toBe('Ink'); // metadata not wiped
  });

  it('a second consumer (e.g. Guidelines) reads the same canonical value', async () => {
    const repo = await seededRepo();
    await changeBrandPrimaryColor(repo, 'b1', '#00ff00');
    // Guidelines would read the same brand (here by slug) and get the canonical value.
    const asGuidelinesReads = await repo.getBySlug('acme');
    expect(asGuidelinesReads!.identity.colors.primary.hex).toBe('#00ff00');
  });

  it('NO legacy mirror can resurrect the old value (canonical identity is authoritative)', async () => {
    // A row where a stale legacy scalar (#999999) diverges from stored identity.
    let row: BrandRow = {
      ...(() => {
        const w = canonicalToRow(makeCanonical()); // identity + scalars = #111111
        return { id: 'b1', slug: 'acme', created_at: '2026-01-01', updated_at: '2026-01-02', ...w };
      })(),
      primary_color: '#999999', // deliberately stale legacy scalar
    };
    const repo: BrandRepository = {
      async getById() { return rowToCanonical(row); },
      async getBySlug() { return rowToCanonical(row); },
      async save(b) { const w = canonicalToRow(b); row = { ...row, ...w }; return rowToCanonical(row); },
    };

    // Even with the stale scalar present, the read yields the canonical identity.
    expect((await repo.getById('b1'))!.identity.colors.primary.hex).toBe('#111111');

    // Change through the use-case; reload yields the new value, not the stale scalar.
    await changeBrandPrimaryColor(repo, 'b1', '#abcdef');
    expect((await repo.getById('b1'))!.identity.colors.primary.hex).toBe('#abcdef');
  });

  it('supports secondary and accent roles', async () => {
    const repo = await seededRepo();
    await changeBrandColor(repo, 'b1', 'secondary', { hex: '#222222' });
    await changeBrandColor(repo, 'b1', 'accent', { hex: '#333333' });
    const b = await repo.getById('b1');
    expect(b!.identity.colors.secondary?.hex).toBe('#222222');
    expect(b!.identity.colors.accent?.hex).toBe('#333333');
    // primary untouched
    expect(b!.identity.colors.primary.hex).toBe('#111111');
  });

  it('rejects an invalid hex before persisting', async () => {
    const repo = await seededRepo();
    await expect(changeBrandPrimaryColor(repo, 'b1', 'not-a-hex')).rejects.toThrow(/Invalid CanonicalBrand/);
    // The stored value is unchanged.
    expect((await repo.getById('b1'))!.identity.colors.primary.hex).toBe('#111111');
  });

  it('throws when the brand does not exist', async () => {
    const repo = await seededRepo();
    await expect(changeBrandPrimaryColor(repo, 'missing', '#000000')).rejects.toThrow(/not found/);
  });
});
