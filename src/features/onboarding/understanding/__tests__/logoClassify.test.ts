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
import type { Artwork } from '../artwork';

const img = (name: string, over: Partial<OnboardingAsset> = {}): OnboardingAsset => ({
  id: `i-${name}`, name, sub: '', kind: 'image',
  previewUrl: `blob:${name}`, uploadStatus: 'done', uploadProgress: 1,
  ...over,
});

/** A reading of one picture. Defaults to an unremarkable dark symbol. */
const seen = (over: Partial<Artwork> = {}): Artwork => ({
  hash: '1010101010101010101010101010101010101010101010101010101010101010',
  ratio: 1,
  parts: 'shape',
  arrangement: null,
  tone: 'dark',
  ...over,
});

/** The three things a logo can be, as this module reads them. */
const SYMBOL = { parts: 'shape', ratio: 1 } as const;
const WORDS = { parts: 'text', ratio: 6 } as const;
const LOCKUP = { parts: 'both', arrangement: 'beside', ratio: 5 } as const;
const STACKED = { parts: 'both', arrangement: 'stacked', ratio: 1.2 } as const;

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
    const out = classifyLogos([img('acme-logo.svg', { contentHash: '1' })]);
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

  it('treats a logo-ish filename as a logo', () => {
    for (const name of ['mark.svg', 'acme-logo.png', 'wordmark.png', 'monogram.png']) {
      expect(classifyLogos([img(name, { contentHash: name })]).groups).toHaveLength(1);
    }
  });

  it('does NOT treat a file as a logo because it is a vector', () => {
    // `.svg` used to qualify on its own. An illustration, a pattern, a diagram
    // and an icon sheet are all SVG, and every one of them was landing on the
    // logo board — out of Brand Assets, where the user had put it.
    for (const name of ['illustration.svg', 'pattern-tile.svg', 'hero-artwork.svg']) {
      expect(classifyLogos([img(name, { contentHash: name })]).groups).toHaveLength(0);
    }
  });

  it('takes a cut-out picture that READS as a mark, name or no name', () => {
    // Neither signal is enough alone; together they separate a logo from a
    // photograph, which is the pair that actually needed telling apart.
    const item = img('Frame 12.png', { contentHash: '1', hasTransparency: true });
    const art = new Map([[item.id, seen({ parts: 'shape' })]]);
    expect(classifyLogos([item], art).groups).toHaveLength(1);
  });

  it('refuses a cut-out picture whose artwork says nothing', () => {
    const item = img('Frame 12.png', { contentHash: '1', hasTransparency: true });
    const art = new Map([[item.id, seen({ parts: 'unclear', arrangement: null })]]);
    expect(classifyLogos([item], art).groups).toHaveLength(0);
  });

  it('refuses an opaque picture even when the artwork is legible', () => {
    const item = img('Frame 12.png', { contentHash: '1' });
    const art = new Map([[item.id, seen({ parts: 'shape' })]]);
    expect(classifyLogos([item], art).groups).toHaveLength(0);
  });

  it('never moves something the user placed in Brand Assets', () => {
    // Named like a logo, shaped like a logo — and put in Brand Assets by a
    // person, which outranks both.
    const out = classifyLogos([
      img('acme-logo.svg', { contentHash: '1', placement: 'assets', isLogo: true }),
    ]);
    expect(out.groups).toHaveLength(0);
  });
});

describe('the picture names the role', () => {
  // The rule in one line: a symbol on its own is the icon, the name set as
  // type is the wordmark, and the two together are the logo — beside each
  // other, or stacked.
  const board = (...marks: Array<[string, Partial<Artwork>]>) => {
    const items = marks.map(([name], i) => img(name, { contentHash: `${i}`, isLogo: true }));
    const art = new Map(
      marks.map(([, over], i) => [
        items[i].id,
        seen({ hash: HASHES[i], ...over }),
      ]),
    );
    return Object.fromEntries(classifyLogos(items, art).groups.map((g) => [g.lead.name, g.slot]));
  };
  // Far enough apart that no two are ever read as one mark.
  const HASHES = [
    '1111000011110000111100001111000011110000111100001111000011110000',
    '0000111100001111000011110000111100001111000011110000111100001111',
    '1100110011001100110011001100110011001100110011001100110011001100',
    '0011001100110011001100110011001100110011001100110011001100110011',
  ];

  it('the folder a designer actually hands over', () => {
    // The real one, from the owner's own archive — and the case every earlier
    // version got wrong, because `Logomark.svg` is a symbol and `Logotype.svg`
    // is not, and no filename rule can tell you that.
    expect(
      board(
        ['Logomark.svg', SYMBOL],
        ['Logotype.svg', WORDS],
        ['Primary Logo.svg', LOCKUP],
      ),
    ).toEqual({
      'Logomark.svg': 'mark',
      'Logotype.svg': 'wordmark',
      'Primary Logo.svg': 'primary',
    });
  });

  it('a symbol above the name is the vertical lockup', () => {
    expect(board(['stacked.svg', STACKED])).toEqual({ 'stacked.svg': 'vertical' });
  });

  it('says what it saw, in words a person would use', () => {
    const item = img('anything.svg', { contentHash: '1', isLogo: true });
    const out = classifyLogos([item], new Map([[item.id, seen(LOCKUP)]]));
    expect(out.groups[0].evidence).toBe('the symbol sits beside the name');
  });

  it('outranks the filename outright', () => {
    // The exact file that shipped labelled Icon: a wide logotype called
    // "Logomark.svg". The name says icon; the picture says otherwise.
    expect(board(['Logomark.svg', WORDS])).toEqual({ 'Logomark.svg': 'wordmark' });
  });

  it('falls back to the filename only when the picture could not be read', () => {
    const items = [
      img('brand-wordmark.svg', { contentHash: '1' }),
      img('brand-icon.svg', { contentHash: '2' }),
    ];
    const art = new Map([[items[0].id, null], [items[1].id, null]]);
    const slots = classifyLogos(items, art).groups.map((g) => g.slot);
    expect(slots).toEqual(['wordmark', 'mark']);
  });
});

describe('light artwork is the on-dark version', () => {
  const HASH = '1111000011110000111100001111000011110000111100001111000011110000';
  const pair = (order: Array<'dark' | 'light'>) => {
    const items = order.map((t, i) => img(`logo-${t}.svg`, { contentHash: `${i}`, isLogo: true }));
    const art = new Map(
      order.map((tone, i) => [items[i].id, seen({ hash: HASH, tone, ...LOCKUP })]),
    );
    return Object.fromEntries(classifyLogos(items, art).groups.map((g) => [g.lead.name, g.slot]));
  };

  it('puts the light twin in the On dark slot', () => {
    expect(pair(['dark', 'light'])).toEqual({
      'logo-dark.svg': 'primary',
      'logo-light.svg': 'dark',
    });
  });

  it('gets the same answer whichever was uploaded first', () => {
    // Asked in supply order, the white one uploaded first would take the
    // primary role and leave the black one homeless.
    expect(pair(['light', 'dark'])).toEqual({
      'logo-dark.svg': 'primary',
      'logo-light.svg': 'dark',
    });
  });

  it('says why', () => {
    const items = [
      img('a.svg', { contentHash: '1', isLogo: true }),
      img('b.svg', { contentHash: '2', isLogo: true }),
    ];
    const art = new Map([
      [items[0].id, seen({ hash: HASH, tone: 'dark', ...LOCKUP })],
      [items[1].id, seen({ hash: HASH, tone: 'light', ...LOCKUP })],
    ]);
    const light = classifyLogos(items, art).groups.find((g) => g.slot === 'dark');
    expect(light?.evidence).toBe('the artwork is light — made to sit on dark');
  });

  it('does not hold a light logo back when it is the only one', () => {
    const item = img('white-logo.svg', { contentHash: '1', isLogo: true });
    const art = new Map([[item.id, seen({ tone: 'light', ...LOCKUP })]]);
    expect(classifyLogos([item], art).groups[0].slot).toBe('primary');
  });
});

describe('the same drawing in two dresses', () => {
  const HASH = '1010101010101010101010101010101010101010101010101010101010101010';

  it('folds two exports of one mark into one entry', () => {
    // Same drawing, same tone, different file. The names agree on nothing —
    // "Artboard 26.png" and "Asset 23.png" — which is exactly the real case.
    const items = [
      img('Artboard 26.png', { contentHash: '1', isLogo: true }),
      img('Asset 23.png', { contentHash: '2', isLogo: true }),
    ];
    const art = new Map(items.map((i) => [i.id, seen({ hash: HASH })]));
    const out = classifyLogos(items, art);
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0].variants).toHaveLength(1);
  });

  it('keeps a light twin separate, so it can hold its own slot', () => {
    // Same drawing, and coverage alone would call them identical — the tone is
    // what makes them two entries rather than one hidden behind the other.
    const items = [
      img('a.svg', { contentHash: '1', isLogo: true }),
      img('b.svg', { contentHash: '2', isLogo: true }),
    ];
    const art = new Map([
      [items[0].id, seen({ hash: HASH, tone: 'dark' })],
      [items[1].id, seen({ hash: HASH, tone: 'light' })],
    ]);
    expect(classifyLogos(items, art).groups).toHaveLength(2);
  });

  it('keeps genuinely different marks apart', () => {
    const items = [
      img('a.png', { contentHash: '1', isLogo: true }),
      img('b.png', { contentHash: '2', isLogo: true }),
    ];
    const art = new Map([
      [items[0].id, seen({ hash: HASH })],
      [items[1].id, seen({ hash: '0101010101010101010101010101010101010101010101010101010101010101' })],
    ]);
    expect(classifyLogos(items, art).groups).toHaveLength(2);
  });

  it('folds by filename when neither picture could be read', () => {
    const items = [
      img('brand-logo.svg', { contentHash: '1' }),
      img('brand-logo-white.svg', { contentHash: '2' }),
    ];
    const art = new Map([[items[0].id, null], [items[1].id, null]]);
    expect(classifyLogos(items, art).groups).toHaveLength(1);
  });

  it('folds a vector and its raster export by name alone', () => {
    const out = classifyLogos([
      img('Primary Logo.svg', { contentHash: '1', isLogo: true }),
      img('Primary Logo@2x.png', { contentHash: '2', isLogo: true }),
    ]);
    expect(out.groups).toHaveLength(1);
  });
});
