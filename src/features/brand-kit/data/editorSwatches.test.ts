/**
 * QA Q16 — the deliverable editors offered the generated grey ladder as
 * brand colours: 39 swatches for an 8-colour brand, two names that collided
 * with the brand's own and one hex that duplicated a brand colour outright.
 *
 * The claims here are the three the defect names: what is offered is the
 * brand's palette, nothing is offered twice, and no two swatches share a name.
 */
import { describe, it, expect } from 'vitest';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { NEUTRAL_RAMP } from '@/features/setup/data/neutralRamp';
import { normalizeHex } from './colorPaletteExport';
import { editorSwatches } from './editorSwatches';

// MIGRATED, because that is the only shape the editor ever sees — and it is
// what gives raqm its five neutrals and its 32-step generated ladder.
const BRANDS = SEED_BRANDS.map((b) => brandToMockBrand(migrateBrandToCurrent(b)));

describe('editorSwatches', () => {
  it.each(BRANDS.map((b) => [b.name, b] as const))(
    '%s — the brand’s own palette comes first, and all of it does',
    (_name, brand) => {
      const swatches = editorSwatches(brand);
      const own = [...brand.colors.core, ...brand.colors.accent];
      const leading = swatches.slice(0, own.length);
      expect(leading.map((s) => normalizeHex(s.hex))).toEqual(
        own.map((c) => normalizeHex(c.hex)),
      );
      expect(leading.every((s) => !s.neutral)).toBe(true);
    },
  );

  it.each(BRANDS.map((b) => [b.name, b] as const))(
    '%s — no two swatches share a hex',
    (_name, brand) => {
      const hexes = editorSwatches(brand).map((s) => normalizeHex(s.hex));
      expect(new Set(hexes).size).toBe(hexes.length);
    },
  );

  it.each(BRANDS.map((b) => [b.name, b] as const))(
    '%s — no two swatches share a name',
    (_name, brand) => {
      const names = editorSwatches(brand).map((s) => s.name.trim().toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    },
  );

  it.each(BRANDS.map((b) => [b.name, b] as const))(
    '%s — the 32-step ladder is not offered as the brand’s colours',
    (_name, brand) => {
      const swatches = editorSwatches(brand);
      // Far short of 8 + 32, and short enough to read at a glance.
      expect(swatches.length).toBeLessThanOrEqual(brand.colors.core.length + brand.colors.accent.length + 9);
      expect(swatches.length).toBeLessThan(NEUTRAL_RAMP.length);
      // And nothing carries one of the ladder's decorative words, which is
      // where `Charcoal 2` and `Pearl 2` came from.
      const ladderWords = new Set(NEUTRAL_RAMP.map((s) => s.name.toLowerCase()));
      const offeredNeutrals = swatches.filter((s) => s.neutral);
      expect(offeredNeutrals.every((s) => !ladderWords.has(s.name.toLowerCase()))).toBe(true);
      expect(offeredNeutrals.length).toBeGreaterThan(0);
    },
  );
});
