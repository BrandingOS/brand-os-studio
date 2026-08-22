/**
 * The rules a kit export lives or dies by.
 *
 * Two of the three assertions here are about a bug that shipped: every
 * `logos/*.png` in every export was a blank tile and every `logos/*.svg`
 * was a wrapper pointing at a URL the recipient could not resolve, because
 * the Brand Kit was zipping Setup's PREVIEW markup instead of the logo.
 */
import { describe, it, expect } from 'vitest';
import {
  buildAboutMarkdown,
  buildBrandJson,
  compressionFor,
  extractLogoHref,
  logoExtension,
  slugifyName,
} from './kitExport';
import { mockBrand } from '@/features/setup/data/mockBrand';

const WRAPPER = (href: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#F5F4EF"/>
    <image href="${href}" x="20" y="20" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>
    <text x="50%" y="95%" opacity="0">Acme</text>
  </svg>`;

describe('extractLogoHref', () => {
  it('finds the artwork inside a Setup preview wrapper', () => {
    expect(extractLogoHref(WRAPPER('https://cdn.example.com/logo.svg'))).toBe(
      'https://cdn.example.com/logo.svg',
    );
  });

  it('reads the xlink form older exports still carry', () => {
    const svg = '<svg><image xlink:href="/assets/mark.png" width="10" height="10"/></svg>';
    expect(extractLogoHref(svg)).toBe('/assets/mark.png');
  });

  it('returns null for artwork that IS the svg', () => {
    // The generated lettermark a brand with no logo falls back to. This
    // one rasterizes correctly and must keep shipping as-is.
    const lettermark =
      '<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/>' +
      '<text x="100" y="120" font-size="90">A</text></svg>';
    expect(extractLogoHref(lettermark)).toBeNull();
  });

  it('is not fooled by the word href elsewhere in the markup', () => {
    const svg = '<svg><desc>href="nope"</desc><rect/></svg>';
    expect(extractLogoHref(svg)).toBeNull();
  });
});

describe('logoExtension', () => {
  it('takes the extension from the path when there is one', () => {
    expect(logoExtension('https://cdn.example.com/a/logo.svg')).toBe('svg');
    expect(logoExtension('https://cdn.example.com/logo.PNG')).toBe('png');
  });

  it('ignores a query string', () => {
    expect(logoExtension('https://cdn.example.com/logo.svg?v=3&t=1')).toBe('svg');
  });

  it('falls back to the served mime type when the path has none', () => {
    expect(logoExtension('https://cdn.example.com/asset/9f2c1', 'image/svg+xml')).toBe('svg');
    expect(logoExtension('https://cdn.example.com/asset/9f2c1', 'image/png;charset=x')).toBe('png');
  });

  it('reads a data url inline', () => {
    expect(logoExtension('data:image/svg+xml;base64,PHN2Zz4=')).toBe('svg');
  });

  it('normalises jpeg to jpg so two variants cannot collide by name', () => {
    expect(logoExtension('https://x.test/a.jpeg')).toBe('jpg');
    expect(logoExtension('https://x.test/a', 'image/jpeg')).toBe('jpg');
  });
});

describe('compressionFor', () => {
  it('STOREs bytes that are already a compressed stream', () => {
    for (const name of ['card.png', 'photo.JPG', 'Inter.woff2', 'mark.ttf', 'deck.pdf']) {
      expect(compressionFor(name)).toBe('STORE');
    }
  });

  it('DEFLATEs the text, which is where compression actually pays', () => {
    for (const name of ['about.md', 'brand.json', 'primary.svg', 'fonts.txt']) {
      expect(compressionFor(name)).toBe('DEFLATE');
    }
  });

  it('defaults to DEFLATE for anything it does not recognise', () => {
    expect(compressionFor('README')).toBe('DEFLATE');
  });
});

describe('the documents at the root of every bundle', () => {
  it('writes the brand name as the about title', () => {
    expect(buildAboutMarkdown(mockBrand).startsWith(`# ${mockBrand.name}`)).toBe(true);
  });

  it('carries the strategy answers in brand.json, not just the palette', () => {
    // Strategy is what Setup and the review both call the brand's own
    // answers; a machine-readable export that drops them is describing
    // the colours and calling it the brand.
    const json = JSON.parse(buildBrandJson(mockBrand));
    expect(json).toHaveProperty('strategy');
    expect(json.name).toBe(mockBrand.name);
    expect(Array.isArray(json.colors)).toBe(true);
  });
});

describe('slugifyName', () => {
  it('never yields an empty filename', () => {
    expect(slugifyName('  ///  ')).toBe('brand');
  });
});
