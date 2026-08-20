/**
 * The dashboard card's own name and cover.
 *
 * Two things are being defended here, and both are the kind of bug that looks
 * like nothing in a diff: that renaming a PROJECT never reaches the brand, and
 * that a cover is identified by its Library id rather than by a url that the
 * Library is free to replace or delete underneath it.
 */
import { describe, expect, it } from 'vitest';
import {
  brandCardLabel,
  hasProjectLabel,
  mergeWorkspaceCard,
  resolveBrandCover,
} from './workspaceCard';
import type { Brand } from '@/shared/types/brand';

const brand = (over: Partial<Brand> = {}): Brand =>
  ({
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#123456',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as Brand;

describe('what a card is called', () => {
  it('is the brand name when the project was never renamed', () => {
    expect(brandCardLabel(brand())).toBe('Acme');
    expect(hasProjectLabel(brand())).toBe(false);
  });

  it('is the project label once there is one', () => {
    const b = brand({ workspaceCard: { label: 'Acme — rebrand' } });
    expect(brandCardLabel(b)).toBe('Acme — rebrand');
    expect(hasProjectLabel(b)).toBe(true);
    // The whole point: the brand is still called what it is called.
    expect(b.name).toBe('Acme');
  });

  it('ignores a label of only whitespace rather than showing an empty card', () => {
    expect(brandCardLabel(brand({ workspaceCard: { label: '   ' } }))).toBe('Acme');
  });

  it('does not claim a project name when the label merely repeats the brand', () => {
    expect(hasProjectLabel(brand({ workspaceCard: { label: 'Acme' } }))).toBe(false);
  });

  it('never renders nothing, even for a brand with no name at all', () => {
    expect(brandCardLabel(brand({ name: '' }))).toBe('Untitled');
    expect(brandCardLabel(undefined)).toBe('Untitled');
  });
});

describe('which picture a card shows', () => {
  const withAsset = (over: Partial<Brand> = {}) =>
    brand({
      brandAssets: [
        {
          id: 'asset-1',
          kind: 'image',
          name: 'Studio shot',
          formats: { png: { url: 'https://cdn/current.png', size: 1 } },
          tags: [],
        },
      ],
      ...over,
    } as Partial<Brand>);

  it('has none by default', () => {
    expect(resolveBrandCover(brand())).toBeUndefined();
  });

  it('resolves the id against the brand library, live', () => {
    const b = withAsset({ workspaceCard: { coverAssetId: 'asset-1' } });
    expect(resolveBrandCover(b)).toBe('https://cdn/current.png');
  });

  it('follows the asset when its url changes — the reason the id is stored', () => {
    const b = withAsset({ workspaceCard: { coverAssetId: 'asset-1' } });
    const moved = {
      ...b,
      brandAssets: [
        { ...b.brandAssets![0], formats: { png: { url: 'https://cdn/v2.png', size: 1 } } },
      ],
    } as Brand;
    expect(resolveBrandCover(moved)).toBe('https://cdn/v2.png');
  });

  it('shows nothing when the asset is gone, rather than a url it used to have', () => {
    // The projection drops tombstoned items, so an unresolvable id means the
    // user deleted the picture. Falling back to a remembered url would keep
    // material on screen that the brand has removed.
    const b = brand({
      workspaceCard: { coverAssetId: 'asset-1', coverUrl: 'https://cdn/stale.png' },
      brandAssets: [],
    });
    expect(resolveBrandCover(b)).toBeUndefined();
  });

  it('uses a bare url only when there is no asset id at all', () => {
    const b = brand({ workspaceCard: { coverUrl: 'https://cdn/external.png' } });
    expect(resolveBrandCover(b)).toBe('https://cdn/external.png');
  });
});

describe('merging a change into the card', () => {
  it('keeps the fields it was not asked about', () => {
    const next = mergeWorkspaceCard({ label: 'Client A' }, { coverAssetId: 'asset-1' });
    expect(next).toEqual({ label: 'Client A', coverAssetId: 'asset-1' });
  });

  it('drops a field that is cleared', () => {
    const next = mergeWorkspaceCard(
      { label: 'Client A', coverAssetId: 'asset-1' },
      { coverAssetId: undefined },
    );
    expect(next).toEqual({ label: 'Client A' });
  });

  it('returns null — not undefined — when the last field goes', () => {
    // `undefined` is read as "no change" by the patch splitter and by the
    // adapter, so clearing the last field would leave the old card in place.
    expect(mergeWorkspaceCard({ label: 'Client A' }, { label: '' })).toBeNull();
    expect(mergeWorkspaceCard(undefined, {})).toBeNull();
  });
});
