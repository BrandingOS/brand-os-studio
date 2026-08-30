/**
 * QA Q12 — the board printed a palette the brand does not own.
 *
 * `deliverables/brand-board.png` read ACCENT `#D95F26` for a brand whose
 * accent is `#F59E0B`, and six neutrals labelled `N0…N5` (`#F7F7F8 …
 * `#2D2B31`) that no one had ever chosen. Both were DERIVED: the accent was
 * a triadic rotation of the primary and the neutrals were a tinted ramp off
 * the same hue. The one artefact whose whole job is to state the palette
 * stated a different one.
 *
 * The board reads the brand's own answer now, from the same places
 * `brandToMockBrand` reads it, and falls back to the derivation only for a
 * brand that genuinely has neither.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { raqmBrand } from '@/data/brands/raqm';
import { useBrandBoardStore, brandAccentOf, brandNeutralsOf } from './useBrandBoardStore';

const draft = () => useBrandBoardStore.getState().draft;

beforeEach(() => {
  useBrandBoardStore.setState({ initializedForBrandId: null, history: [], future: [] });
});

describe('the board reads the brand’s own palette', () => {
  it('prints the accent the brand declared, not a rotation of the primary', () => {
    useBrandBoardStore.getState().initFromBrand(raqmBrand);
    // Raqm's own accent — "Alert Amber".
    expect(draft().colors.accent.toUpperCase()).toBe('#F59E0B');
    expect(draft().colors.accent.toUpperCase()).not.toBe('#D95F26');
  });

  it('prints the brand’s own neutrals, under their own names', () => {
    useBrandBoardStore.getState().initFromBrand(raqmBrand);
    const owned = (raqmBrand.guidelines?.colorPalette?.neutral ?? []).map((n) =>
      n.hex.toUpperCase(),
    );
    expect(owned.length).toBeGreaterThan(2);
    // Raqm already lists its own lightest-first, which is the order the
    // canvas reads them in.
    expect(draft().colors.neutrals.map((h) => h.toUpperCase())).toEqual(owned);
    // …and every swatch is named rather than numbered.
    expect(draft().colors.neutralNames).toHaveLength(owned.length);
    for (const name of draft().colors.neutralNames ?? []) {
      expect(name).toBeTruthy();
      expect(name).not.toMatch(/^N\d+$/);
    }
    // Names are unique, so a board never prints one word twice.
    expect(new Set(draft().colors.neutralNames).size).toBe(owned.length);
  });

  it('orders the ladder lightest first, whatever order the brand listed them in', () => {
    // SKAM's own list is darkest-first. Read straight through, the board
    // painted its typography panel black and its type in near-black on it.
    useBrandBoardStore.getState().initFromBrand({
      id: 'skam',
      name: 'SKAM',
      primaryColor: '#EF4444',
      neutrals: ['#000000', '#222222', '#94938E', '#FFFFFF'],
    });
    expect(draft().colors.neutrals).toEqual(['#FFFFFF', '#94938E', '#222222', '#000000']);
    expect(draft().colors.neutralNames?.[0]).toBe('White');
  });

  it('falls back to a derived ramp for a brand that owns no neutrals', () => {
    useBrandBoardStore.getState().initFromBrand({ id: 'x', name: 'X', primaryColor: '#2563EB' });
    expect(draft().colors.neutrals).toHaveLength(6);
    // Nothing to name, so nothing is named — the board says `N0…N5`.
    expect(draft().colors.neutralNames).toBeUndefined();
  });

  it('drops the names when the neutrals are replaced, so no name outlives its colour', () => {
    useBrandBoardStore.getState().initFromBrand(raqmBrand);
    expect(draft().colors.neutralNames).toBeTruthy();
    useBrandBoardStore.getState().setNeutrals(['#111111', '#222222']);
    expect(draft().colors.neutralNames).toBeUndefined();

    useBrandBoardStore.getState().initFromBrand(raqmBrand);
    useBrandBoardStore.getState().shuffleColors();
    expect(draft().colors.neutralNames).toBeUndefined();
  });
});

describe('where the brand keeps its palette', () => {
  it('reads the accent from any of the three places a brand carries it', () => {
    expect(brandAccentOf({ accentColor: '#abc' })).toBe('#AABBCC');
    expect(brandAccentOf({ colorSystem: { accent: { hex: '#123456' } } })).toBe('#123456');
    expect(brandAccentOf({ guidelines: { colorPalette: { accent: { hex: '#F59E0B' } } } })).toBe(
      '#F59E0B',
    );
    expect(brandAccentOf({ accentColor: 'not a colour' })).toBeNull();
    expect(brandAccentOf(null)).toBeNull();
  });

  it('dedupes the neutrals across the places they are mirrored', () => {
    const neutrals = brandNeutralsOf({
      colorSystem: { neutrals: [{ hex: '#FAFAFA' }, { hex: '#0A0A0F' }] },
      guidelines: { colorPalette: { neutral: [{ hex: '#fafafa' }] } },
      neutrals: ['#0A0A0F', '#E5E5E5'],
    });
    // Deduped on the hex, and handed back lightest-first for the ladder.
    expect(neutrals.map((n) => n.hex)).toEqual(['#FAFAFA', '#E5E5E5', '#0A0A0F']);
  });

  it('caps at the six the board can show', () => {
    const many = Array.from({ length: 20 }, (_, i) => `#${i.toString(16).padStart(2, '0')}0000`);
    expect(brandNeutralsOf({ neutrals: many })).toHaveLength(6);
  });
});
