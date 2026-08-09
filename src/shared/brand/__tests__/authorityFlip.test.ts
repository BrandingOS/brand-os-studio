/**
 * Brand System finalization B4 — the authority flip.
 *
 * Once a brand carries a canonical identity blob (`identity` at the current
 * schema version), `migrateBrandToCurrent` hydrates the brand's legacy/v3 fields
 * FROM the blob, so a stale legacy scalar can never override the canonical value.
 * A brand with NO blob still bootstraps from legacy (unchanged behavior).
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { fromLegacyBrand, toLegacyBrandPatch, CANONICAL_BRAND_SCHEMA_VERSION } from '@/domain/brand';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';

function makeLegacy(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1', slug: 'acme', name: 'Acme', schemaVersion: 3,
    primaryColor: '#111111', fonts: { primary: 'Inter' }, tone: 'friendly', audience: 'builders',
    assets: [], createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
    ...overrides,
  } as Brand;
}

/** Build a canonical identity blob for a brand, as the write path would persist. */
function withBlob(base: Brand, canonicalSource: Brand): Brand {
  const patch = toLegacyBrandPatch(fromLegacyBrand(canonicalSource));
  return { ...base, identity: patch.identity, identitySchemaVersion: patch.identitySchemaVersion };
}

describe('authority flip — canonical blob wins over stale legacy', () => {
  it('a stale primaryColor/tone/fonts scalar cannot override the canonical blob', () => {
    // Blob says the brand is #00AA00 / "canonical tone" / "Satoshi".
    const canonical = makeLegacy({ primaryColor: '#00aa00', tone: 'canonical tone', fonts: { primary: 'Satoshi' } });
    // The DB row still carries STALE legacy scalars (a pre-flip writer).
    const staleRow = makeLegacy({ primaryColor: '#ff0000', tone: 'stale tone', fonts: { primary: 'Arial' } });
    const hydrated = migrateBrandToCurrent(withBlob(staleRow, canonical));

    expect(hydrated.primaryColor).toBe('#00aa00'); // canonical wins
    expect(hydrated.colorSystem?.primary?.hex).toBe('#00aa00');
    expect(hydrated.tone).toBe('canonical tone');
    expect(hydrated.fonts?.primary).toBe('Satoshi');
  });

  it('recovers accent/neutrals (no legacy column) from the blob', () => {
    const canonical = makeLegacy({ accentColor: '#abcabc', neutrals: ['#eee', '#333'] });
    // Authed row lost accent/neutrals (dropped by the column whitelist).
    const strippedRow = makeLegacy({ accentColor: undefined, neutrals: undefined });
    const hydrated = migrateBrandToCurrent(withBlob(strippedRow, canonical));

    expect(hydrated.accentColor).toBe('#abcabc');
    expect(hydrated.neutrals).toEqual(['#eee', '#333']);
  });

  it('hydrates the guidelines.strategy read-home from the blob', () => {
    const canonical = makeLegacy({
      guidelines: { strategy: { mission: 'M', vision: 'V', values: ['a'], positioning: 'P', personality: [], targetAudience: 'T' } },
    });
    const staleRow = makeLegacy({ guidelines: { strategy: { mission: 'old', vision: 'old', values: [], positioning: 'old', personality: [], targetAudience: '' } } });
    const hydrated = migrateBrandToCurrent(withBlob(staleRow, canonical));

    expect(hydrated.guidelines?.strategy?.vision).toBe('V');
    expect(hydrated.guidelines?.strategy?.values).toEqual(['a']);
  });

  it('a legacy-only brand (no blob) bootstraps from legacy, unchanged', () => {
    const legacyOnly = makeLegacy({ primaryColor: '#123456', identity: undefined });
    const migrated = migrateBrandToCurrent(legacyOnly);
    expect(migrated.primaryColor).toBe('#123456'); // legacy is authoritative for bootstrap
    expect(migrated.identity).toBeUndefined();
  });

  it('bootstrap → first canonical write → thereafter canonical wins', () => {
    // 1) Legacy-only brand.
    const legacyOnly = makeLegacy({ primaryColor: '#0000ff', identity: undefined });
    expect(migrateBrandToCurrent(legacyOnly).primaryColor).toBe('#0000ff');
    // 2) A canonical write mints the blob (from the current legacy).
    const afterWrite = withBlob(legacyOnly, legacyOnly);
    expect(afterWrite.identitySchemaVersion).toBe(CANONICAL_BRAND_SCHEMA_VERSION);
    // 3) A later stale legacy scalar cannot override the blob.
    const withStaleEdit = { ...afterWrite, primaryColor: '#999999' };
    expect(migrateBrandToCurrent(withStaleEdit).primaryColor).toBe('#0000ff'); // canonical wins
  });
});
