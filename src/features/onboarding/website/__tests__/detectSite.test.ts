import { describe, expect, it } from 'vitest';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { detectSiteInText, detectedBesidesPill, scanTarget } from '../detectSite';

const link = (url: string): OnboardingAsset => ({
  id: url,
  name: url,
  sub: 'Link',
  kind: 'link',
  previewUrl: null,
  sourceUrl: url,
  uploadStatus: 'done',
  uploadProgress: 1,
});

describe('a website address inside what the user typed', () => {
  it('finds a bare domain in prose', () => {
    expect(detectSiteInText('Everything about us is on northwind.studio — the projects, the team.')).toBe('northwind.studio');
  });

  it('finds a full url and drops the scheme and www', () => {
    expect(detectSiteInText('See https://www.Northwind-Arch.com/projects for more')).toBe('northwind-arch.com');
  });

  it('a social profile is a link, never the website', () => {
    expect(detectSiteInText('Follow us at instagram.com/northwind.studio')).toBeNull();
    expect(detectSiteInText('linkedin.com/company/northwind and www.tiktok.com/@nw')).toBeNull();
  });

  it('an email address is not a website', () => {
    expect(detectSiteInText('Write to hello@northwind.studio for a quote')).toBeNull();
  });

  it('abbreviations that look like domains are ignored', () => {
    expect(detectSiteInText('Calm homes, i.e. nothing loud')).toBeNull();
  });

  it('takes the first website when a social link comes first', () => {
    expect(detectSiteInText('instagram.com/nw and northwind.studio')).toBe('northwind.studio');
  });

  it('nothing in the text means nothing to read', () => {
    expect(detectSiteInText('')).toBeNull();
    expect(detectSiteInText('An architecture studio in Copenhagen.')).toBeNull();
  });
});

describe('which site the scan reads', () => {
  it('the pill wins over a different address in the description', () => {
    const t = scanTarget([link('https://northwind.studio')], 'Our old site northwind-arch.com has the early work');
    expect(t).toEqual({ url: 'https://northwind.studio', host: 'northwind.studio', source: 'pill' });
    expect(detectedBesidesPill([link('https://northwind.studio')], 'Our old site northwind-arch.com')).toBe('northwind-arch.com');
  });

  it('with no pill the detected address is the target', () => {
    expect(scanTarget([], 'we are at northwind.studio')).toEqual({
      url: 'https://northwind.studio',
      host: 'northwind.studio',
      source: 'description',
    });
  });

  it('a dismissed address is not re-detected', () => {
    expect(scanTarget([], 'we are at northwind.studio', 'northwind.studio')).toBeNull();
    expect(detectedBesidesPill([], 'we are at northwind.studio', 'northwind.studio')).toBeNull();
  });

  it('the pill and the description naming the same site is one site', () => {
    expect(detectedBesidesPill([link('https://www.northwind.studio')], 'find us at northwind.studio')).toBeNull();
  });

  it('a social pill is not a website target', () => {
    expect(scanTarget([link('https://instagram.com/nw')], 'nothing else')).toBeNull();
  });
});
