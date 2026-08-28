/**
 * What a brand's icon set may be made of.
 *
 * The catalogue is 3,550 entries and most of it is not brand material: the
 * braille alphabet, `circle-a` … `circle-z`, `square-0` … `square-9`,
 * age-restriction badges, emoji faces, and several hundred arrows, carets and
 * sort handles. A suggester that ranks over all of it will offer them, and the
 * first thing anyone saw on the Icons page was Braille A, B, C and D.
 */
import { describe, expect, it } from 'vitest';
import { isBrandIconCandidate, suggestIconsForBrand } from './suggestIcons';
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
});

describe('what a brand is offered', () => {
  it('never offers a name it refuses', () => {
    for (const text of ['Kaafex', 'A coffee shop for早 risers', 'Vector — a design studio', '']) {
      for (const name of suggestIconsForBrand(text, 50)) {
        expect(isBrandIconCandidate(name)).toBe(true);
      }
    }
  });

  it('offers only icons that exist', () => {
    // A suggestion the catalogue does not carry renders as an empty tile.
    for (const name of suggestIconsForBrand('a bakery and coffee house', 50)) {
      expect(CATALOGUE.has(name)).toBe(true);
    }
  });

  it('does not let a single letter in a name match a brand token', () => {
    // "a" is inside "Kaafex", and that alone used to be enough to rank the
    // whole braille alphabet — the bug this file exists for.
    expect(suggestIconsForBrand('Kaafex', 50).some((n) => n.includes('braille'))).toBe(false);
  });

  it('still finds the obvious ones', () => {
    const picks = suggestIconsForBrand('a coffee shop', 50);
    expect(picks).toContain('fi-rr-coffee');
  });

  it('varies the families rather than running one dry', () => {
    // "cloud" is a synonym for tech, and the catalogue answers it with
    // cloud-drizzle, cloud-hail, cloud-meatball and twenty more weather
    // states. Ranking alone offered them all before anything else.
    const head = suggestIconsForBrand('a design studio for tech startups', 24).slice(0, 12);
    const clouds = head.filter((n) => n.startsWith('fi-rr-cloud'));
    expect(clouds.length).toBeLessThanOrEqual(3);
  });

  it('and falls back to the starter pack rather than to noise', () => {
    // A brand whose words match nothing gets a usable set, not the leftovers
    // of a loose match against its own name.
    const picks = suggestIconsForBrand('Zzyq Vrrk', 50);
    expect(picks.length).toBe(50);
    for (const name of picks) expect(CATALOGUE.has(name)).toBe(true);
  });
});
