/**
 * Logo classification.
 *
 * Three claims, in the order the pipeline applies them: exact duplicates
 * collapse, near-duplicate variants group instead of stacking up, and a role
 * with no supporting evidence is left EMPTY rather than guessed into.
 */
import { describe, it, expect } from 'vitest';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { classifyLogos } from '../logoClassify';

const img = (name: string, over: Partial<OnboardingAsset> = {}): OnboardingAsset => ({
  id: `i-${name}`, name, sub: '', kind: 'image',
  previewUrl: `blob:${name}`, uploadStatus: 'done', uploadProgress: 1,
  ...over,
});

describe('exact duplicates', () => {
  it('collapse by content hash, even under a different filename', () => {
    const out = classifyLogos([
      img('logo.svg', { contentHash: 'abc' }),
      img('logo-copy-final.svg', { contentHash: 'abc' }),
    ]);
    expect(out.groups).toHaveLength(1);
    expect(out.duplicatesIgnored).toBe(1);
  });

  it('leaves genuinely different files alone', () => {
    const out = classifyLogos([
      img('logo.svg', { contentHash: 'abc' }),
      img('icon.svg', { contentHash: 'def' }),
    ]);
    expect(out.groups).toHaveLength(2);
    expect(out.duplicatesIgnored).toBe(0);
  });
});

describe('near-duplicate variants', () => {
  it('group under one entry rather than listing separately', () => {
    const out = classifyLogos([
      img('northwind-logo.svg', { contentHash: '1' }),
      img('northwind-logo-white.svg', { contentHash: '2' }),
    ]);
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0].variants).toHaveLength(1);
  });

  it('does not group two different marks', () => {
    const out = classifyLogos([
      img('northwind-logo.svg', { contentHash: '1' }),
      img('sub-brand-logo.svg', { contentHash: '2' }),
    ]);
    expect(out.groups).toHaveLength(2);
  });
});

describe('roles come from evidence, never from a free slot', () => {
  it('reads a role out of the filename', () => {
    const out = classifyLogos([
      img('brand-wordmark.svg', { contentHash: '1' }),
      img('brand-icon.svg', { contentHash: '2' }),
    ]);
    const slots = out.groups.map((g) => g.slot);
    expect(slots).toContain('wordmark');
    expect(slots).toContain('mark');
  });

  it('honours what the classifier already decided', () => {
    const out = classifyLogos([img('a.svg', { contentHash: '1', aiLogoSlot: 'horizontal' })]);
    expect(out.groups[0].slot).toBe('horizontal');
    expect(out.groups[0].evidence).toBe('what we saw in the file');
  });

  it('gives a contested role to one claimant and a free slot to the other', () => {
    // Both name themselves "icon", so only one can hold that role. The loser is
    // not hidden — every logo the user brought gets a place they can correct.
    const out = classifyLogos([
      img('one-icon.svg', { contentHash: '1' }),
      img('two-icon.svg', { contentHash: '2' }),
    ]);
    expect(out.groups.filter((g) => g.slot === 'mark')).toHaveLength(1);
    expect(out.groups.filter((g) => g.slot === null)).toHaveLength(0);
    expect(new Set(out.groups.map((g) => g.slot)).size).toBe(2);
  });

  it('places every logo the user brought', () => {
    const out = classifyLogos([
      img('a-logo.svg', { contentHash: '1' }),
      img('b-logo.svg', { contentHash: '2' }),
      img('c-logo.svg', { contentHash: '3' }),
      img('d-logo.svg', { contentHash: '4' }),
    ]);
    expect(out.groups).toHaveLength(4);
    expect(out.groups.every((g) => g.slot !== null)).toBe(true);
    // and never twice into the same slot
    expect(new Set(out.groups.map((g) => g.slot)).size).toBe(4);
  });

  it('says plainly when a placement rests only on the order', () => {
    const out = classifyLogos([
      img('a-logo.svg', { contentHash: '1' }),
      img('b-logo.svg', { contentHash: '2' }),
    ]);
    expect(out.groups[1].evidence).toBe('the order you brought them');
  });

  it('names the first unroled logo primary, and says why', () => {
    const out = classifyLogos([img('artwork.svg', { contentHash: '1' })]);
    expect(out.groups[0].slot).toBe('primary');
    expect(out.groups[0].evidence).toBe('the first logo you brought');
  });

  it('a generated variant is not a logo of its own', () => {
    const out = classifyLogos([
      img('logo.svg', { contentHash: '1' }),
      img('logo-bw.svg', { contentHash: '2', generated: true }),
    ]);
    expect(out.groups).toHaveLength(1);
  });

  it('nothing in, nothing out', () => {
    expect(classifyLogos([]).groups).toEqual([]);
  });
});

describe('an image that is not a logo is not treated as one', () => {
  it('keeps photographs out of the logo board', () => {
    const out = classifyLogos([
      img('team-photo.jpg', { contentHash: '1' }),
      img('office-front.jpg', { contentHash: '2' }),
    ]);
    // They are not lost — they simply belong in Brand Assets.
    expect(out.groups).toHaveLength(0);
  });

  it('trusts the classifier when it has spoken', () => {
    expect(
      classifyLogos([img('DSC_0041.jpg', { contentHash: '1', aiPlacement: 'logos' })]).groups,
    ).toHaveLength(1);
    expect(
      classifyLogos([img('brand-logo.svg', { contentHash: '1', aiPlacement: 'images' })]).groups,
    ).toHaveLength(0);
  });

  it('treats vector artwork and logo-ish filenames as logos', () => {
    for (const name of ['mark.svg', 'acme-logo.png', 'wordmark.png', 'monogram.png']) {
      expect(classifyLogos([img(name, { contentHash: name })]).groups).toHaveLength(1);
    }
  });
});
