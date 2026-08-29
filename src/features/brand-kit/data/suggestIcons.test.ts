/**
 * What a brand is offered, and what it is never offered.
 *
 * The catalogue is 3,557 entries and most of it is not brand material: the
 * braille alphabet, `circle-a` … `circle-z`, `square-0` … `square-9`,
 * age-restriction badges, emoji faces, several hundred arrows — and, less
 * obviously, Waste Pollution, Anatomical Heart, Blender Phone and Turkey. A
 * suggester that RANKS over all of it will offer them, because those names are
 * spelled out of ordinary English words. The fix was to stop ranking over the
 * catalogue at all and rank inside a curated pack instead.
 */
import { describe, expect, it } from 'vitest';
import {
  isBrandIconCandidate,
  resolveIconPack,
  searchableIconNames,
  suggestIconsForBrand,
} from './suggestIcons';
import { ICON_PACKS, iconPack } from './iconPacks';
import { FLATICON_RR_NAMES } from './flaticonNames';

const CATALOGUE = new Set<string>(FLATICON_RR_NAMES);

describe('what may be offered at all', () => {
  it('refuses the encoding alphabets and the glyph grids', () => {
    for (const name of ['fi-rr-braille-a', 'fi-rr-circle-a', 'fi-rr-square-7', 'fi-rr-dice-d20']) {
      expect(isBrandIconCandidate(name)).toBe(false);
    }
  });

  it('refuses interface chrome and emoji faces', () => {
    for (const name of [
      'fi-rr-arrow-alt-circle-down',
      'fi-rr-caret-right',
      'fi-rr-sort-alpha-down',
      'fi-rr-border-inner',
      'fi-rr-angle-double-left',
      'fi-rr-face-confused',
      'fi-rr-grin-tongue',
      'fi-rr-percent-50',
      'fi-rr-age-restriction-eighteen',
    ]) {
      expect(isBrandIconCandidate(name)).toBe(false);
    }
  });

  it('and keeps the symbols a brand is actually made of', () => {
    for (const name of [
      'fi-rr-star',
      'fi-rr-heart',
      'fi-rr-rocket',
      'fi-rr-camera',
      'fi-rr-shield-check',
      'fi-rr-coffee',
    ]) {
      expect(isBrandIconCandidate(name)).toBe(true);
    }
  });

  it('the editor searches a filtered catalogue, not the raw one', () => {
    const names = searchableIconNames();
    expect(names.length).toBeGreaterThan(2000);
    expect(names.length).toBeLessThan(FLATICON_RR_NAMES.length);
    expect(names.some((n) => n.startsWith('fi-rr-braille'))).toBe(false);
  });
});

describe('which pack, and on what evidence', () => {
  it('a recorded industry beats the brand’s prose', () => {
    const { pack, reason } = resolveIconPack('a coffee shop for early risers', {
      industry: 'finance',
    });
    expect(pack.id).toBe('finance');
    expect(reason).toBe('industry');
  });

  it('the user’s own pick beats the recorded industry', () => {
    const { pack, reason } = resolveIconPack('', { industry: 'finance', pack: 'creative' });
    expect(pack.id).toBe('creative');
    expect(reason).toBe('chosen');
  });

  it('falls to the brand’s words when no industry is recorded', () => {
    const { pack, reason } = resolveIconPack('a bakery and coffee house serving pastry');
    expect(pack.id).toBe('food');
    expect(reason).toBe('text');
  });

  it('and to the general pack rather than to a guess', () => {
    const { pack, reason } = resolveIconPack('Zzyq Vrrk');
    expect(pack.id).toBe('general');
    expect(reason).toBe('default');
  });
});

describe('what a brand is offered', () => {
  it('never offers a name it refuses', () => {
    for (const text of ['Kaafex', 'A coffee shop for early risers', 'Vector — a studio', '']) {
      for (const name of suggestIconsForBrand(text, 50)) {
        expect(isBrandIconCandidate(name)).toBe(true);
      }
    }
  });

  it('offers only icons that exist', () => {
    for (const name of suggestIconsForBrand('a bakery and coffee house', 50)) {
      expect(CATALOGUE.has(name)).toBe(true);
    }
  });

  it('never offers anything outside the pack it chose', () => {
    // This is the whole of D41. A fintech is offered finance symbols and
    // nothing else — no Waste, no Building NGO, no Broken Chain.
    const picks = suggestIconsForBrand('payments, invoices and treasury', 50, {
      industry: 'finance',
    });
    const allowed = new Set(iconPack('finance').icons.map((n) => `fi-rr-${n}`));
    for (const name of picks) expect(allowed.has(name), name).toBe(true);
  });

  it('a card game is offered a card game’s symbols', () => {
    const picks = suggestIconsForBrand('a card game studio', 50, { industry: 'entertainment' });
    const allowed = new Set(iconPack('creative').icons.map((n) => `fi-rr-${n}`));
    for (const name of picks) expect(allowed.has(name), name).toBe(true);
    expect(picks).toContain('fi-rr-dice');
  });

  it('is a designed set, not a round number — 24 to 32, never 50', () => {
    const picks = suggestIconsForBrand('a coffee shop', 50);
    expect(picks.length).toBeGreaterThanOrEqual(24);
    expect(picks.length).toBeLessThanOrEqual(32);
  });

  it('max trims and never pads', () => {
    expect(suggestIconsForBrand('a coffee shop', 12)).toHaveLength(12);
    expect(suggestIconsForBrand('a coffee shop', 0)).toHaveLength(0);
  });

  it('does not let a single letter in a name match a brand token', () => {
    expect(suggestIconsForBrand('Kaafex', 50).some((n) => n.includes('braille'))).toBe(false);
  });

  it('the brand’s own words decide the ORDER inside its pack', () => {
    const picks = suggestIconsForBrand('a coffee shop and bakery', 50, { industry: 'food-beverage' });
    expect(picks.indexOf('fi-rr-coffee')).toBeLessThan(5);
  });

  it('is deterministic — the same brand gets the same set twice', () => {
    const a = suggestIconsForBrand('a design studio for tech startups', 50);
    const b = suggestIconsForBrand('a design studio for tech startups', 50);
    expect(a).toEqual(b);
  });

  it('applies one weight to the whole set', () => {
    const picks = suggestIconsForBrand('a coffee shop', 8, { weight: 'br' });
    for (const name of picks) expect(name.startsWith('fi-br-')).toBe(true);
  });

  it('no pack ever contributes the audit’s off-brand glyphs', () => {
    const offered = new Set(ICON_PACKS.flatMap((p) => [...p.icons].map((n) => `fi-rr-${n}`)));
    for (const bad of [
      'fi-rr-waste', 'fi-rr-waste-pollution', 'fi-rr-turkey',
      'fi-rr-anatomical-heart', 'fi-rr-blender-phone', 'fi-rr-cvv-card',
    ]) {
      expect(offered.has(bad), bad).toBe(false);
    }
  });
});
