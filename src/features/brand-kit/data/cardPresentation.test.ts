/**
 * How a card presents itself — shape, and whether its designs are named
 * by a person.
 */
import { describe, it, expect } from 'vitest';
import { aspectForLabel, isGeneratedName, PICKER_ASPECT_BY_LABEL } from './cardPresentation';
import { KIT_CATALOG } from '../catalog/catalog';
import { variantsForCard } from './legacy-mapping';

describe('aspectForLabel', () => {
  it('draws the wide mockup scenes wide', () => {
    for (const label of ['Signage', 'Billboard', 'Device Screen', 'Business Card Stack']) {
      expect(aspectForLabel(label), label).toBe(1.6);
    }
  });

  it('draws the object-fills-the-frame mockups square', () => {
    for (const label of ['Mug', 'Tote', 'Sticker', 'Apparel']) {
      expect(aspectForLabel(label), label).toBe(1);
    }
  });

  it('keeps the shapes the stationery family already had', () => {
    expect(aspectForLabel('Business Card')).toBe(1.6);
    expect(aspectForLabel('Letterhead')).toBeCloseTo(1 / 1.414, 5);
    expect(aspectForLabel('Story')).toBeCloseTo(9 / 16, 5);
  });

  it('falls an unknown label back to landscape rather than to nothing', () => {
    expect(aspectForLabel('Something Nobody Has Built')).toBe(1.6);
  });

  it('gives every mockup entry in the catalog a shape of its own', () => {
    const mockups = KIT_CATALOG.filter((e) => e.sectionKey === 'mockups');
    expect(mockups.length).toBeGreaterThan(0);
    for (const e of mockups) {
      expect(
        PICKER_ASPECT_BY_LABEL,
        `${e.storageLabel} would fall back to the landscape default`,
      ).toHaveProperty(e.storageLabel);
    }
  });
});

describe('isGeneratedName', () => {
  it('recognises the loop-index name the Wave 2 generator emits', () => {
    expect(isGeneratedName('Wave 2 · 43')).toBe(true);
    expect(isGeneratedName('Wave 1 · 7')).toBe(true);
    expect(isGeneratedName('Wave 10 · 100')).toBe(true);
    expect(isGeneratedName('  Wave 2 · 43  ')).toBe(true);
  });

  it('does not mistake a real design name that happens to say Wave', () => {
    for (const name of ['Wave', 'Second Wave', 'Wave Break', 'Wave 2', 'Waveform · 3']) {
      expect(isGeneratedName(name), name).toBe(false);
    }
  });

  it('wants the middle dot the generator actually emits, not a hyphen', () => {
    expect(isGeneratedName('Wave 2 - 43')).toBe(false);
  });

  it('answers for a missing name rather than throwing', () => {
    expect(isGeneratedName(undefined)).toBe(false);
    expect(isGeneratedName(null)).toBe(false);
    expect(isGeneratedName('')).toBe(false);
  });

  it('no longer finds a generated name in the business card library', () => {
    // This assertion used to read `toBeGreaterThan(50)`: Business Card was
    // the worst family in the kit, 100 of its 118 designs loop-named "Wave
    // 2 · 43", and the predicate existed to count them. The family is now
    // curated to 24 designs that each carry a name a designer gave them,
    // so the honest assertion is the inverse — and it is the one that can
    // only be satisfied by doing the work, not by weakening the predicate.
    const cards = variantsForCard('stationery', 'Business Card');
    expect(cards.length).toBeGreaterThan(0);
    const generated = cards.filter((t) => isGeneratedName(t.name));
    expect(
      generated.map((t) => `${t.id} — ${t.name}`),
      'a generated name is back in the shipped Business Card library',
    ).toEqual([]);
  });

  it('still matches the generator output it was written for', () => {
    // The predicate is worthless if it matches nothing, and the check
    // above can no longer prove it does. These are the exact strings the
    // Wave 2 loop emitted, so the guard stays provably alive after the
    // last family that shipped them has been curated away.
    for (const n of [1, 43, 95, 100]) {
      expect(isGeneratedName(`Wave 2 · ${String(n).padStart(2, '0')}`), String(n)).toBe(true);
    }
  });
});
