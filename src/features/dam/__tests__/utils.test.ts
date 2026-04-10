import { describe, it, expect } from 'vitest';
import { detectAssetType, detectCategory } from '../utils';

describe('detectAssetType', () => {
  it('returns icon for SVG', () => {
    expect(detectAssetType({ type: 'image/svg+xml' })).toBe('icon');
  });

  it('returns image for PNG', () => {
    expect(detectAssetType({ type: 'image/png' })).toBe('image');
  });

  it('returns image for JPEG', () => {
    expect(detectAssetType({ type: 'image/jpeg' })).toBe('image');
  });

  it('returns document for PDF', () => {
    expect(detectAssetType({ type: 'application/pdf' })).toBe('document');
  });

  it('returns font for font types', () => {
    expect(detectAssetType({ type: 'font/woff2' })).toBe('font');
  });

  it('defaults to document for unknown types', () => {
    expect(detectAssetType({ type: 'application/zip' })).toBe('document');
  });
});

describe('detectCategory', () => {
  it('detects logo from filename', () => {
    expect(detectCategory('my-logo.png', 'image/png')).toBe('logo');
    expect(detectCategory('Company_Logo_v2.svg', 'image/svg+xml')).toBe('logo');
  });

  it('detects icon from filename', () => {
    expect(detectCategory('app-icon.png', 'image/png')).toBe('icon');
  });

  it('detects favicon from filename', () => {
    expect(detectCategory('favicon.ico', 'image/x-icon')).toBe('icon');
  });

  it('detects mockup from filename', () => {
    expect(detectCategory('tshirt-mockup.jpg', 'image/jpeg')).toBe('mockup');
    expect(detectCategory('phone-mock-up.png', 'image/png')).toBe('mockup');
  });

  it('detects social from filename', () => {
    expect(detectCategory('instagram-post.jpg', 'image/jpeg')).toBe('social');
    expect(detectCategory('facebook-cover.png', 'image/png')).toBe('social');
    expect(detectCategory('twitter-header.jpg', 'image/jpeg')).toBe('social');
  });

  it('detects reference from filename', () => {
    expect(detectCategory('moodboard.pdf', 'application/pdf')).toBe('reference');
    expect(detectCategory('inspo-board.jpg', 'image/jpeg')).toBe('reference');
  });

  it('falls back to icon for SVG mime', () => {
    expect(detectCategory('something.svg', 'image/svg+xml')).toBe('icon');
  });

  it('falls back to reference for PDF mime', () => {
    expect(detectCategory('document.pdf', 'application/pdf')).toBe('reference');
  });

  it('defaults to photo for unmatched files', () => {
    expect(detectCategory('sunset.jpg', 'image/jpeg')).toBe('photo');
    expect(detectCategory('banner.png', 'image/png')).toBe('photo');
  });

  it('is case insensitive', () => {
    expect(detectCategory('MY-LOGO.PNG', 'image/png')).toBe('logo');
    expect(detectCategory('MOCKUP.JPG', 'image/jpeg')).toBe('mockup');
  });
});
