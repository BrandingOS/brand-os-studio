/**
 * The palette survives a save — QA Q1.
 *
 * Renaming "Iris" in the Brand Kit's Colors panel and confirming the write
 * deleted five of raqm's eight colours. White, Pearl, Grey, Charcoal and Black
 * were gone from the brand — not hidden, gone — and the rename itself did not
 * persist either. Both halves of that are here.
 *
 * The mechanism was a DOUBLE COUNT. `mockBrandToPatch` writes the brand's own
 * colours past primary/secondary to the `neutrals` scalar; `migrateBrandToCurrent`
 * separately hydrates `guidelines.colorPalette.neutral` into
 * `colorSystem.neutrals`. `mapColors` concatenated the two views of that one
 * list, so after any save it saw ten entries where the brand had five, decided a
 * list that long must be a generated grey ramp, and applied the ramp filter —
 * which drops greys. Every neutral the brand owned was a grey.
 *
 * The read is exercised through `migrateBrandToCurrent` deliberately: the bug
 * lived in the hydration, so a test that skipped it passed while the product
 * lost data.
 */
import { describe, expect, it } from 'vitest';
import { SEED_BRANDS } from '@/data/brands';
import type { Brand } from '@/shared/types/brand';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandToMockBrand } from '../brandToMockBrand';
import { mockBrandToPatch } from '../mockBrandToPatch';
import type { MockBrand } from '../mockBrand';

/** Every colour the palette surfaces show, in the order they show it. */
function palette(brand: Brand): string[] {
  const m = brandToMockBrand(brand);
  return [...m.colors.core, ...m.colors.accent].map((c) => `${c.name} ${c.hex}`);
}

/** One save, the whole way round: read → mutate → patch → the brand the next
 *  read sees. The patch is merged and re-migrated because that is what the
 *  store does with what the canonical ops hand back. */
function save(before: Brand, mutate: (m: MockBrand) => MockBrand): Brand {
  const next = mutate(brandToMockBrand(before));
  const patch = mockBrandToPatch(next, before);
  return migrateBrandToCurrent({ ...before, ...patch } as Brand);
}

const rename = (name: string) => (m: MockBrand): MockBrand => ({
  ...m,
  colors: {
    ...m.colors,
    core: m.colors.core.map((c, i) => (i === 0 ? { ...c, name } : c)),
  },
});

describe('the palette round-trips through a save', () => {
  for (const seed of SEED_BRANDS) {
    const brand = migrateBrandToCurrent(seed);

    it(`${seed.slug}: renaming one colour keeps every other colour`, () => {
      const before = palette(brand);
      expect(before.length).toBeGreaterThan(2);

      const after = palette(save(brand, rename('Iris QA')));

      // Same colours, same order, same count — only the first row's word moved.
      expect(after).toHaveLength(before.length);
      expect(after.slice(1)).toEqual(before.slice(1));
      expect(after.map((s) => s.split(' ').at(-1))).toEqual(
        before.map((s) => s.split(' ').at(-1)),
      );
    });

    it(`${seed.slug}: the rename itself persists`, () => {
      const hex = brandToMockBrand(brand).colors.core[0]!.hex;
      const after = brandToMockBrand(save(brand, rename('Iris QA')));
      expect(after.colors.core[0]).toMatchObject({ name: 'Iris QA', hex });
    });

    it(`${seed.slug}: saving twice changes nothing more`, () => {
      // The first save is what plants the duplicate; a projection that is not
      // idempotent loses a colour on the save AFTER the one you were watching.
      const once = save(brand, rename('Iris QA'));
      const twice = save(once, (m) => m);
      expect(palette(twice)).toEqual(palette(once));
    });
  }

  it('a hand-picked palette one longer than Core can show is not mistaken for a generated ramp', () => {
    // Six brand colours past primary/secondary — the old tell fired at seven
    // entries and threw all of them away rather than showing the six it can.
    const brand = migrateBrandToCurrent({
      ...SEED_BRANDS[0]!,
      neutrals: ['#FAFAFA', '#E5E5E5', '#C4C4C4', '#8A8A8A', '#3A3A3A', '#0A0A0F'],
    } as Brand);
    const hexes = brandToMockBrand(brand).colors.core.map((c) => c.hex);
    expect(hexes).toContain('#8A8A8A');
    expect(hexes).toContain('#0A0A0F');
  });

  it('a generated grey ramp is still kept out of Core', () => {
    const ramp = Array.from({ length: 32 }, (_, i) => {
      const v = Math.round((i / 31) * 255).toString(16).padStart(2, '0').toUpperCase();
      return `#${v}${v}${v}`;
    });
    const brand = migrateBrandToCurrent({ ...SEED_BRANDS[3]!, neutrals: ramp } as Brand);
    const core = brandToMockBrand(brand).colors.core.map((c) => c.hex);
    // Not one step of it reached the brand's own colours.
    expect(core.filter((hex) => ramp.includes(hex))).toEqual([]);
  });
});
