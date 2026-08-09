/**
 * Logo subsystem finalization (B2) — durable Asset-backed logos.
 *
 * Once a logo is staged through `stageLogoAssignment`, its `logoSystem` refs +
 * `brandAssets` records persist (migration 014 columns / localStorage), and
 * `migrateBrandToCurrent` PREFERS them over re-deriving ids from URL hashes. So
 * the assetId is durable: it is minted once and survives reloads unchanged.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { stageLogoAssignment } from '@/shared/assets/assetOperations';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1', slug: 'acme', name: 'Acme', schemaVersion: 3,
    primaryColor: '#111111', fonts: { primary: 'Inter' }, tone: 't', audience: 'a', assets: [],
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
    ...overrides,
  } as Brand;
}

describe('durable logo Asset persistence', () => {
  it('the staged assetId is the ref, and survives reload unchanged', () => {
    const brand = makeBrand();
    const { patch, asset } = stageLogoAssignment(brand, {
      role: 'primary',
      url: 'https://cdn/acme-logo.png',
      kind: 'logo',
      name: 'Acme primary',
    });
    // The ref points at the minted asset id, not a URL.
    expect(patch.logoSystem?.primary?.assetId).toBe(asset.id);
    expect(patch.brandAssets?.some((a) => a.id === asset.id)).toBe(true);

    // Persisted brand (as the DB row / localStorage would hold it).
    const persisted = makeBrand({ logoSystem: patch.logoSystem, brandAssets: patch.brandAssets, logo: patch.logo, logoAssets: patch.logoAssets });

    // Reload once…
    const r1 = migrateBrandToCurrent(persisted);
    expect(r1.logoSystem?.primary?.assetId).toBe(asset.id); // preferred, not re-derived
    // …and again — stable fixed point.
    const r2 = migrateBrandToCurrent(r1);
    expect(r2.logoSystem?.primary?.assetId).toBe(asset.id);
    // The record is still resolvable to its URL (URL is output detail).
    const rec = r2.brandAssets?.find((a) => a.id === asset.id);
    expect(Object.values(rec?.formats ?? {})[0]?.url).toBe('https://cdn/acme-logo.png');
  });

  it('replacing the URL in the same slot keeps ONE ref and updates the record', () => {
    const brand = makeBrand();
    const first = stageLogoAssignment(brand, { role: 'primary', url: 'https://cdn/v1.png', kind: 'logo', name: 'v1' });
    const withV1 = makeBrand({ logoSystem: first.patch.logoSystem, brandAssets: first.patch.brandAssets });
    const second = stageLogoAssignment(withV1, { role: 'primary', url: 'https://cdn/v2.png', kind: 'logo', name: 'v2', replaceAssetId: first.asset.id });
    // Same id, new url (durable ref; URL is the output detail that changed).
    expect(second.patch.logoSystem?.primary?.assetId).toBe(first.asset.id);
    const rec = second.patch.brandAssets?.find((a) => a.id === first.asset.id);
    expect(Object.values(rec?.formats ?? {})[0]?.url).toBe('https://cdn/v2.png');
  });
});
