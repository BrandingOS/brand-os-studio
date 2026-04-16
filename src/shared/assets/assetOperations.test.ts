import { describe, it, expect } from 'vitest';
import {
  stageAsset,
  stageLogoAssignment,
  stageLogoRemoval,
  stageAssetDeletion,
  hashUrl,
  detectFormatFromUrl,
} from './assetOperations';
import type { Brand } from '@/shared/types/brand';

function emptyBrand(): Brand {
  return {
    id: 'b-1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#000',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    brandAssets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('hashUrl', () => {
  it('is deterministic', () => {
    expect(hashUrl('a')).toBe(hashUrl('a'));
    expect(hashUrl('a')).not.toBe(hashUrl('b'));
  });
});

describe('detectFormatFromUrl', () => {
  it.each([
    ['https://x/a.svg', 'svg'],
    ['data:image/svg+xml,...', 'svg'],
    ['data:image/png;base64,..', 'png'],
    ['data:image/webp;base64,..', 'webp'],
    ['file.jpg', 'jpg'],
    ['x.pdf', 'pdf'],
    ['no-extension', 'png'],
  ])('%s → %s', (url, fmt) => {
    expect(detectFormatFromUrl(url)).toBe(fmt);
  });
});

describe('stageAsset', () => {
  it('creates a new asset when brand is empty', () => {
    const b = emptyBrand();
    const { brandAssets, asset } = stageAsset(b, {
      url: 'https://cdn/a.svg',
      kind: 'logo',
      name: 'A',
    });
    expect(brandAssets.length).toBe(1);
    expect(asset.id).toMatch(/^asset-/);
    expect(asset.formats.svg?.url).toBe('https://cdn/a.svg');
    expect(asset.metadata.version).toBe(1);
  });

  it('dedupes — same URL produces the same asset id, no duplicate in list', () => {
    let b = emptyBrand();
    const first = stageAsset(b, { url: 'u', kind: 'logo', name: 'N' });
    b = { ...b, brandAssets: first.brandAssets };
    const second = stageAsset(b, { url: 'u', kind: 'logo', name: 'N' });
    expect(second.asset.id).toBe(first.asset.id);
    expect(second.brandAssets.length).toBe(1);
    expect(second.asset.metadata.version).toBe(2); // version bumped
  });

  it('replaces an asset by id — same id, bumped version', () => {
    let b = emptyBrand();
    const first = stageAsset(b, { url: 'u1', kind: 'logo', name: 'N' });
    b = { ...b, brandAssets: first.brandAssets };
    const replaced = stageAsset(b, {
      url: 'u2',
      kind: 'logo',
      name: 'N2',
      replaceAssetId: first.asset.id,
    });
    expect(replaced.asset.id).toBe(first.asset.id);
    expect(replaced.asset.metadata.version).toBe(2);
    expect(replaced.brandAssets.length).toBe(1);
  });
});

describe('stageLogoAssignment', () => {
  it('writes a logoSystem ref and mirrors legacy fields on primary', () => {
    const b = emptyBrand();
    const { patch } = stageLogoAssignment(b, {
      url: 'https://cdn/p.svg',
      kind: 'logo',
      name: 'Primary',
      role: 'primary',
    });
    expect(patch.logoSystem?.primary?.assetId).toBeDefined();
    expect(patch.logo).toBe('https://cdn/p.svg');
    expect(patch.logoAssets?.full).toBe('https://cdn/p.svg');
  });

  it('mirrors iconmark to logoAssets.icon', () => {
    const { patch } = stageLogoAssignment(emptyBrand(), {
      url: 'u',
      kind: 'logo',
      name: 'I',
      role: 'iconmark',
    });
    expect(patch.logoAssets?.icon).toBe('u');
    expect(patch.logoSystem?.iconmark?.assetId).toBeDefined();
  });

  it('tags the asset with its role', () => {
    const { asset } = stageLogoAssignment(emptyBrand(), {
      url: 'u',
      kind: 'logo',
      name: 'P',
      role: 'primary',
    });
    expect(asset.role).toBe('logo.primary');
  });
});

describe('stageLogoRemoval', () => {
  it('clears the ref and mirrors legacy fields', () => {
    let b = emptyBrand();
    const { patch: assignPatch } = stageLogoAssignment(b, {
      url: 'u',
      kind: 'logo',
      name: 'P',
      role: 'primary',
    });
    b = { ...b, ...assignPatch };

    const removePatch = stageLogoRemoval(b, 'primary');
    expect(removePatch.logoSystem?.primary).toBeUndefined();
    expect(removePatch.logo).toBeUndefined();
    expect(removePatch.logoAssets?.full).toBeUndefined();
  });
});

describe('stageAssetDeletion', () => {
  it('removes asset and scrubs refs', () => {
    let b = emptyBrand();
    const { patch } = stageLogoAssignment(b, {
      url: 'u',
      kind: 'logo',
      name: 'P',
      role: 'primary',
    });
    b = { ...b, ...patch };
    const assetId = patch.logoSystem!.primary!.assetId;

    const del = stageAssetDeletion(b, assetId);
    expect(del.brandAssets?.length).toBe(0);
    expect(del.logoSystem?.primary).toBeUndefined();
  });
});
