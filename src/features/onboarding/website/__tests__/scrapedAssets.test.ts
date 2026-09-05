import { describe, expect, it } from 'vitest';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { scrapedItems } from '../scrapedAssets';
import { EVIDENCE } from './fromWebsite.test';

let n = 0;
const genId = () => `id-${++n}`;
const svgB64 = btoa('<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>');

const ev = {
  ...EVIDENCE,
  logoCandidates: [
    { url: 'https://northwind.studio/assets/logo.svg', source: 'header-img' as const, score: 100, bytes: svgB64, contentType: 'image/svg+xml', byteLength: 60 },
    { url: 'https://northwind.studio/#inline-0', source: 'svg-inline' as const, score: 95, inline: '<svg xmlns="http://www.w3.org/2000/svg"/>' },
    { url: 'https://northwind.studio/favicon.ico', source: 'favicon' as const, score: 20, bytes: 'AAAA', contentType: 'image/x-icon', byteLength: 3 },
    { url: 'https://northwind.studio/apple.png', source: 'apple-touch-icon' as const, score: 45, bytes: btoa('png'), contentType: 'image/png', byteLength: 3 },
    { url: 'https://northwind.studio/share.jpg', source: 'og-image' as const, score: 10, bytes: btoa('jpg'), contentType: 'image/jpeg', byteLength: 3 },
    { url: 'https://northwind.studio/nobytes.png', source: 'header-img' as const, score: 80 },
  ],
};

describe('scraped logos become uploads', () => {
  const { logos } = scrapedItems(ev, [], genId);

  it('carries real bytes as a File, named from the site, marked as the website\'s', () => {
    expect(logos[0]._file).toBeInstanceOf(File);
    expect(logos[0]._file?.name).toBe('logo.svg');
    expect(logos[0]).toMatchObject({ kind: 'image', origin: 'website', sub: 'From your website', sourceUrl: 'https://northwind.studio/assets/logo.svg', isLogo: true, uploadStatus: 'done' });
  });

  it('an inline svg becomes a file too', () => {
    expect(logos[1]._file?.type).toBe('image/svg+xml');
    expect(logos[1].sourceUrl).toBeUndefined();
  });

  it('icons are offered to the detector without being called logos; og:image, .ico and byteless candidates are skipped', () => {
    expect(logos.map((l) => l._file?.name)).toEqual(['logo.svg', 'logo-2.svg', 'apple.png']);
    expect(logos[2].isLogo).toBe(false);
  });
});

describe('a rescan brings nothing twice', () => {
  it('skips logos already in the store by address and inline artwork by size', () => {
    const first = scrapedItems(ev, [], genId);
    const again = scrapedItems(ev, [...first.logos, ...first.links], genId);
    expect(again.logos).toEqual([]);
    expect(again.links).toEqual([]);
  });
});

describe('scraped links become link items', () => {
  const existing: OnboardingAsset[] = [{ id: 'u1', name: 'northwind.studio', sub: 'Link', kind: 'link', previewUrl: null, sourceUrl: 'https://www.instagram.com/northwind.studio/', uploadStatus: 'done', uploadProgress: 1 }];

  it('adds each social profile once, with the platform the review knows and a handle', () => {
    const { links } = scrapedItems(ev, [], genId);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ kind: 'link', socialPlatform: 'instagram', handle: '@northwind.studio', origin: 'website', sub: 'From your website' });
    expect(links[1]).toMatchObject({ socialPlatform: 'pinterest' });
  });

  it('never duplicates a link the user already added, even with a trailing slash or www', () => {
    const { links } = scrapedItems(ev, existing, genId);
    expect(links.map((l) => l.socialPlatform)).toEqual(['pinterest']);
  });

  it('maps x onto the review\'s twitter id', () => {
    const { links } = scrapedItems({ ...ev, links: [{ url: 'https://x.com/northwind', platform: 'x', page: '' }] }, [], genId);
    expect(links[0].socialPlatform).toBe('twitter');
  });
});
