import { describe, it, expect } from 'vitest';
import { detectAssetKind, iconForKind } from './assetTypeIcon';

describe('detectAssetKind', () => {
  it('detects images', () => {
    expect(detectAssetKind('logo.png', 'image/png')).toBe('image');
    expect(detectAssetKind('pic.jpg', 'image/jpeg')).toBe('image');
    expect(detectAssetKind('icon.svg', 'image/svg+xml')).toBe('image');
  });
  it('detects pdfs', () => {
    expect(detectAssetKind('guide.pdf', 'application/pdf')).toBe('pdf');
  });
  it('detects fonts', () => {
    expect(detectAssetKind('Inter.otf', 'font/otf')).toBe('font');
    expect(detectAssetKind('Inter.ttf', 'application/octet-stream')).toBe('font');
    expect(detectAssetKind('Inter.woff2', '')).toBe('font');
  });
  it('detects design files', () => {
    expect(detectAssetKind('hero.fig', '')).toBe('design');
    expect(detectAssetKind('brand.ai', '')).toBe('design');
    expect(detectAssetKind('layout.sketch', '')).toBe('design');
    expect(detectAssetKind('cover.psd', '')).toBe('design');
  });
  it('detects zips', () => {
    expect(detectAssetKind('kit.zip', 'application/zip')).toBe('zip');
  });
});

describe('iconForKind', () => {
  it('returns a public path', () => {
    expect(iconForKind('pdf')).toBe('/onboarding-v3/icons/pdf.svg');
    expect(iconForKind('link')).toBe('/onboarding-v3/icons/link.svg');
    expect(iconForKind('font')).toBe('/onboarding-v3/icons/logo.svg');
  });
});
