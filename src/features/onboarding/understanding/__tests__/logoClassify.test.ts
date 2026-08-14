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
import type { Print } from '../imageFingerprint';

const img = (name: string, over: Partial<OnboardingAsset> = {}): OnboardingAsset => ({
  id: `i-${name}`, name, sub: '', kind: 'image',
  previewUrl: `blob:${name}`, uploadStatus: 'done', uploadProgress: 1,
  ...over,
});

/** A print with a stated shape. `ratio` is width ÷ height of the artwork. */
const print = (hash: string, ratio = 2): Print => ({ hash, ratio });

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

describe('the same artwork under different filenames is one logo', () => {
  // The case that shipped: three exports of one mark, called "Artboard 26.png",
  // "Artboard 261.png" and "Asset 23.png". Their names agree on nothing and
  // their bytes differ, so both the filename heuristic and the content hash
  // said "three logos" — and the board drew the identical picture three times.
  const same = '1010101010101010101010101010101010101010101010101010101010101010';
  const other = '0101010101010101010101010101010101010101010101010101010101010101';

  it('folds identical artwork into one entry', () => {
    // `isLogo` is what intake sets when it recognises artwork — these names
    // carry no signal of their own, which is exactly the point.
    const items = [
      img('Artboard 26.png', { contentHash: '1', isLogo: true }),
      img('Artboard 261.png', { contentHash: '2', isLogo: true }),
      img('Asset 23.png', { contentHash: '3', isLogo: true }),
    ];
    const prints = new Map(items.map((i) => [i.id, print(same)]));
    const out = classifyLogos(items, prints);
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0].variants).toHaveLength(2);
  });

  it('keeps genuinely different artwork apart', () => {
    const items = [
      img('a.png', { contentHash: '1', isLogo: true }),
      img('b.png', { contentHash: '2', isLogo: true }),
    ];
    const prints = new Map([[items[0].id, print(same)], [items[1].id, print(other)]]);
    expect(classifyLogos(items, prints).groups).toHaveLength(2);
  });

  it('falls back to filenames when a picture could not be read', () => {
    const items = [
      img('brand-logo.svg', { contentHash: '1' }),
      img('brand-logo-white.svg', { contentHash: '2' }),
    ];
    const prints = new Map([[items[0].id, null], [items[1].id, null]]);
    expect(classifyLogos(items, prints).groups).toHaveLength(1);
  });
});

describe('export noise does not make one mark into several', () => {
  it('folds a vector and its raster export', () => {
    // The pair a designer actually hands over. A vector often cannot be
    // fingerprinted on a canvas, so the filename is the only signal left — and
    // "@2x" was enough to split them.
    const out = classifyLogos([
      img('Primary Logo.svg', { contentHash: '1', isLogo: true }),
      img('Primary Logo@2x.png', { contentHash: '2', isLogo: true }),
    ]);
    expect(out.groups).toHaveLength(1);
  });

  it('folds pixel dimensions in a filename', () => {
    const out = classifyLogos([
      img('kaafex-logo.png', { contentHash: '1', isLogo: true }),
      img('kaafex-logo 1024x1024.png', { contentHash: '2', isLogo: true }),
    ]);
    expect(out.groups).toHaveLength(1);
  });

  it('still keeps two genuinely different marks apart', () => {
    const out = classifyLogos([
      img('Logomark.svg', { contentHash: '1', isLogo: true }),
      img('Logotype.svg', { contentHash: '2', isLogo: true }),
    ]);
    expect(out.groups).toHaveLength(2);
  });
});

describe('a filename is read as words, not as letters', () => {
  // The one that shipped and was visible: a wide KAAFEX logotype exported as
  // "Logomark.svg" was labelled ICON on the board, because "mark" is a
  // substring of "logomark".
  it('does not find "mark" inside "logomark"', () => {
    const out = classifyLogos([
      img('Logo.svg', { contentHash: '1', isLogo: true }),
      img('Logomark.svg', { contentHash: '2', isLogo: true }),
    ]);
    expect(out.groups[1].slot).not.toBe('mark');
  });

  it('still finds it when it is its own word', () => {
    const out = classifyLogos([
      img('kaafex-logo.svg', { contentHash: '1', isLogo: true }),
      img('kaafex-mark.svg', { contentHash: '2', isLogo: true }),
    ]);
    expect(out.groups[1].slot).toBe('mark');
  });
});

describe('the folder a designer actually hands over', () => {
  // The real one, from the owner's own archive: a square symbol, a wide
  // logotype and the lockup of the two, in the order a file listing gives
  // them. Every earlier version of this got at least one of the three wrong.
  const FOLDER = [
    { name: 'Logomark.svg', ratio: 1, hash: '1111000011110000111100001111000011110000111100001111000011110000' },
    { name: 'Logotype.svg', ratio: 6.35, hash: '0000111100001111000011110000111100001111000011110000111100001111' },
    { name: 'Primary Logo.svg', ratio: 6.22, hash: '1100110011001100110011001100110011001100110011001100110011001100' },
  ];

  it('puts each of the three where it belongs', () => {
    const items = FOLDER.map((f, i) => img(f.name, { contentHash: `${i}`, isLogo: true }));
    const prints = new Map(items.map((a, i) => [a.id, print(FOLDER[i].hash, FOLDER[i].ratio)]));
    const byName = Object.fromEntries(
      classifyLogos(items, prints).groups.map((g) => [g.lead.name, g.slot]),
    );
    expect(byName['Primary Logo.svg']).toBe('primary');
    expect(byName['Logotype.svg']).toBe('wordmark');
    expect(byName['Logomark.svg']).toBe('mark');
  });
});

describe('the artwork outranks its filename', () => {
  // Two hashes far enough apart that they are never read as one mark.
  const HASHES: Record<string, string> = {
    a: '1010101010101010101010101010101010101010101010101010101010101010',
    b: '0101010101010101010101010101010101010101010101010101010101010101',
  };
  const shaped = (name: string, ratio: number, hash: keyof typeof HASHES) => {
    const a = img(name, { contentHash: hash, isLogo: true });
    return [a, print(HASHES[hash], ratio)] as const;
  };

  it('refuses to call something four times wider than tall an icon', () => {
    const [lead, leadPrint] = shaped('logo.svg', 3, 'a');
    const [wide, widePrint] = shaped('icon.svg', 6, 'b');
    const out = classifyLogos([lead, wide], new Map([[lead.id, leadPrint], [wide.id, widePrint]]));
    expect(out.groups[1].slot).not.toBe('mark');
  });

  it('reads a wide unnamed mark as the wordmark', () => {
    const [lead, leadPrint] = shaped('one.svg', 3, 'a');
    const [wide, widePrint] = shaped('two.svg', 6, 'b');
    const out = classifyLogos([lead, wide], new Map([[lead.id, leadPrint], [wide.id, widePrint]]));
    expect(out.groups[0].slot).toBe('primary');
    expect(out.groups[1].slot).toBe('wordmark');
    expect(out.groups[1].evidence).toContain('shape');
  });

  it('reads a square unnamed mark as the icon', () => {
    const [lead, leadPrint] = shaped('one.svg', 3, 'a');
    const [square, squarePrint] = shaped('two.svg', 1.05, 'b');
    const out = classifyLogos([lead, square], new Map([[lead.id, leadPrint], [square.id, squarePrint]]));
    expect(out.groups[1].slot).toBe('mark');
  });

  it('leaves the in-between shapes to the order they arrived in', () => {
    // A symbol-plus-name lockup is wide without being a wordmark. Guessing
    // here is exactly what the confirmation step exists to avoid.
    const [lead, leadPrint] = shaped('one.svg', 3, 'a');
    const [mid, midPrint] = shaped('two.svg', 2.4, 'b');
    const out = classifyLogos([lead, mid], new Map([[lead.id, leadPrint], [mid.id, midPrint]]));
    expect(out.groups[1].evidence).toBe('the order you brought them');
  });
});
