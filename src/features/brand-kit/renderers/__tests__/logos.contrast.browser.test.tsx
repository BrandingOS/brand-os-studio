/**
 * The Logos wall is ASSETS — the brand's variants and the grounds they read
 * on. Usage rules (clear space, minimum size, misuse) belong to the Guideline
 * (`features/guidelines/pages/LogoMisusePage.tsx`); a rule drawn as a tile
 * beside the real variants reads as one more variant and ships in the export
 * as one more file. This pins both halves: nothing on the wall is a rule, and
 * every pairing the wall offers clears the floor.
 */
import { describe, it, expect } from 'vitest';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { logoCombosFor, MIN_PAIRING_CONTRAST } from '../../data/recolorLogo';

const BRANDS = SEED_BRANDS.slice(0, 2);
const RULE_NAME = /clear space|minimum size|^never\b/i;

describe('the Logos wall', () => {
  for (const brand of BRANDS) {
    it(`holds variants and pairings only for ${brand.name} — no usage rules`, () => {
      const mock = brandToMockBrand(brand);
      const combos = logoCombosFor(mock);
      const all = variantsForCard('brand-assets', 'Logos', mock);

      expect(all.length).toBe(mock.logos.length + combos.length);
      for (const t of combos) expect(['pairing', 'treatment']).toContain(t.kind);
      expect(all.filter((t) => RULE_NAME.test(t.name)).map((t) => t.name)).toEqual([]);
    });

    it(`offers no pairing below ${MIN_PAIRING_CONTRAST}:1 for ${brand.name}`, () => {
      const pairings = logoCombosFor(brandToMockBrand(brand)).filter((t) => t.kind === 'pairing');
      expect(pairings.length).toBeGreaterThan(0);
      for (const p of pairings) expect(p.contrast).toBeGreaterThanOrEqual(MIN_PAIRING_CONTRAST);
    });
  }
});
