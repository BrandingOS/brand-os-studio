import { describe, expect, it } from 'vitest';
import type { Asset } from '@/shared/types/brand';
import {
  ASSIGNABLE_CATEGORIES,
  dragCarriesFiles,
  assetExtension,
  assetMetaLine,
  categoryCounts,
  formatBytes,
  isLibraryCategory,
  previewKindFor,
  previewNeedsGround,
  queryAssets,
} from '../model';

function asset(patch: Partial<Asset> & { id: string }): Asset {
  return {
    name: 'file.png',
    type: 'image',
    category: 'photo',
    source: 'upload',
    url: 'https://cdn.test/file.png',
    size: 1024,
    tags: [],
    createdAt: new Date('2026-01-01'),
    ...patch,
  } as Asset;
}

describe('previewKindFor', () => {
  it('draws an SVG as a vector so the transparency ground is applied', () => {
    expect(previewKindFor(asset({ id: 'a', name: 'mark.svg', type: 'icon' }))).toBe('vector');
    expect(
      previewKindFor(asset({ id: 'b', name: 'no-ext', metadata: { format: 'image/svg+xml' } })),
    ).toBe('vector');
  });

  it('never draws a PDF or a font as an image — that is the broken-thumbnail bug', () => {
    expect(previewKindFor(asset({ id: 'c', name: 'brief.pdf', type: 'document' }))).toBe('pdf');
    expect(
      previewKindFor(asset({ id: 'd', name: 'x', metadata: { format: 'application/pdf' } })),
    ).toBe('pdf');
    expect(previewKindFor(asset({ id: 'e', name: 'Inter.woff2', type: 'font' }))).toBe('font');
  });

  it('falls back to a glyph when there is no url to point an <img> at', () => {
    expect(previewKindFor(asset({ id: 'f', url: '' }))).toBe('file');
  });

  it('treats an ordinary image as a raster', () => {
    expect(previewKindFor(asset({ id: 'g', name: 'shot.jpg' }))).toBe('raster');
  });
});

describe('assetExtension', () => {
  it('reads the filename first, then the url, then the mime type', () => {
    expect(assetExtension(asset({ id: 'a', name: 'Logo Final.SVG' }))).toBe('SVG');
    // Names in this product are often WRITTEN, and the extension is only in
    // the url — the seed brands are all like this.
    expect(
      assetExtension(asset({ id: 'b', name: 'Vector Logo — Primary (PNG @2x)', url: '/brands/v/logo-1@2x.png' })),
    ).toBe('PNG');
    expect(
      assetExtension(asset({ id: 'c', name: 'noext', url: '', metadata: { format: 'image/webp' } })),
    ).toBe('WEBP');
  });

  it('ignores a dot that is part of a human-written name', () => {
    expect(assetExtension(asset({ id: 'd', name: 'Logo v1.2 final', url: '' }))).toBe('');
  });

  it('is empty when nothing knows', () => {
    expect(assetExtension(asset({ id: 'e', name: 'noext', url: '', metadata: {} }))).toBe('');
  });
});

describe('previewNeedsGround', () => {
  it('grounds anything that can be transparent — a white logo must not vanish', () => {
    expect(previewNeedsGround(asset({ id: 'a', name: 'x', url: '/brands/v/logo.png' }))).toBe(true);
    expect(previewNeedsGround(asset({ id: 'b', name: 'mark.svg', type: 'icon' }))).toBe(true);
    expect(previewNeedsGround(asset({ id: 'c', name: 'photo.jpg', url: '/p/photo.jpg' }))).toBe(false);
  });

  it('never grounds a glyph — there is no artwork to lose', () => {
    expect(previewNeedsGround(asset({ id: 'd', name: 'brief.pdf', type: 'document' }))).toBe(false);
  });
});

describe('queryAssets', () => {
  const list = [
    asset({ id: '1', name: 'wordmark.svg', category: 'logo', size: 300, createdAt: new Date('2026-03-01') }),
    asset({ id: '2', name: 'store front.jpg', category: 'photo', size: 9000, tags: ['retail'], createdAt: new Date('2026-01-02') }),
    asset({ id: '3', name: 'app icon.png', category: 'icon', size: 500, createdAt: new Date('2026-02-01') }),
  ];

  it('filters by category', () => {
    expect(queryAssets(list, { category: 'logo', search: '', sort: 'recent' }).map((a) => a.id)).toEqual(['1']);
  });

  it('searches names AND tags — a tag is the only handle on IMG_4417.jpg', () => {
    expect(queryAssets(list, { category: 'all', search: 'retail', sort: 'recent' }).map((a) => a.id)).toEqual(['2']);
    expect(queryAssets(list, { category: 'all', search: 'ICON', sort: 'recent' }).map((a) => a.id)).toEqual(['3']);
  });

  it('sorts newest first by default, and by name or size on request', () => {
    expect(queryAssets(list, { category: 'all', search: '', sort: 'recent' }).map((a) => a.id)).toEqual(['1', '3', '2']);
    expect(queryAssets(list, { category: 'all', search: '', sort: 'name' }).map((a) => a.id)).toEqual(['3', '2', '1']);
    expect(queryAssets(list, { category: 'all', search: '', sort: 'size' }).map((a) => a.id)).toEqual(['2', '3', '1']);
  });

  it('does not mutate the array it was given', () => {
    const input = [...list];
    queryAssets(input, { category: 'all', search: '', sort: 'name' });
    expect(input.map((a) => a.id)).toEqual(['1', '2', '3']);
  });
});

describe('categoryCounts', () => {
  it('counts every category plus the total under "all"', () => {
    const counts = categoryCounts([
      asset({ id: '1', category: 'logo' }),
      asset({ id: '2', category: 'logo' }),
      asset({ id: '3', category: 'photo' }),
    ]);
    expect(counts.all).toBe(3);
    expect(counts.logo).toBe(2);
    expect(counts.photo).toBe(1);
    expect(counts.mockup).toBe(0);
  });

  it('ignores categories the library filter does not offer', () => {
    // `Asset['category']` is wider than the library's seven chips
    // (typography, stationery…). Those must not throw or land in a bucket.
    const counts = categoryCounts([asset({ id: '1', category: 'typography' })]);
    expect(counts.all).toBe(1);
    expect(Object.values(counts).filter((n) => n > 0)).toEqual([1]);
  });
});

describe('formatting', () => {
  it('reads sizes in whole bytes and one decimal above', () => {
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('builds the meta line from what the asset actually knows', () => {
    expect(
      assetMetaLine(asset({ id: 'a', name: 'x.png', size: 2048, metadata: { dimensions: { width: 800, height: 600 } } })),
    ).toBe('PNG · 800×600 · 2.0 KB');
    expect(assetMetaLine(asset({ id: 'b', name: 'x', url: '', size: 0, metadata: {} }))).toBe('');
  });
});

describe('dragCarriesFiles', () => {
  it('only a file drag paints the drop veil', () => {
    expect(dragCarriesFiles(['Files'])).toBe(true);
    expect(dragCarriesFiles(['text/plain', 'Files'])).toBe(true);
    // Dragging selected text fires the same events; the veil must stay away.
    expect(dragCarriesFiles(['text/plain'])).toBe(false);
    expect(dragCarriesFiles([])).toBe(false);
    expect(dragCarriesFiles(undefined)).toBe(false);
  });
});

describe('category vocabulary', () => {
  it('offers every real category for reassignment, and never "all"', () => {
    expect(ASSIGNABLE_CATEGORIES).toEqual(['logo', 'photo', 'icon', 'social', 'mockup', 'reference']);
    expect(isLibraryCategory('all')).toBe(true);
    expect(isLibraryCategory('typography')).toBe(false);
    expect(isLibraryCategory(null)).toBe(false);
  });
});
