/**
 * Mockups — eight cards, 48 scenes, and every one of them says the whole
 * label.
 *
 * A mockup is the deliverable a customer is most likely to look at and
 * least likely to read carefully, which is exactly why the old family got
 * away with what it did: 170 designs, none bound, every one printing
 * `brand.name.charAt(0)` and a hardcoded studio grey. Nothing on screen
 * looked broken. Editing anything did nothing.
 *
 * The interesting assertion here is not "the text is bound" — it is that a
 * scene with no surface for a field STILL declares it. A mug has nowhere
 * to print a URL and a sticker sheet has nowhere for a badge; if those
 * scenes simply omitted the field, the customer would type into a panel
 * control that repaints nothing, on some designs and not others.
 * `DeclareRest` is what closes that, and this sweep is what proves it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import {
  DEFAULT_FEATURED_IDS_BY_LABEL,
  isGeneratedName,
} from '../../data/cardPresentation';
import { KIT_CATALOG } from '../../catalog/catalog';
import { curatedName, isArchived, tagsFor } from '../curation';
import { MOCKUP_ARCHIVED_IDS } from '../curation/mockups';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import { MOCKUP_SCENES } from '../MockupsExtended';
import { SIGNAGE_SCENES } from '../MockupSignageExtended';
import { CARD_STACK_SCENES } from '../MockupCardStackExtended';
import { DEVICE_SCENES } from '../MockupDeviceExtended';
import { MUG_SCENES } from '../MockupMugExtended';
import { TSHIRT_SCENES } from '../MockupTShirtExtended';
import { TOTE_SCENES } from '../MockupToteExtended';
import { STICKER_SCENES } from '../MockupStickerExtended';
import { BILLBOARD_SCENES } from '../MockupBillboardExtended';

afterEach(cleanup);

const SECTION = 'mockups';

/** The four fields the `mockupLabel` panel offers. */
const LABEL_PATHS = fieldPathsForFamily('mockup-mug');

/** Every card in the group, with the id prefix its designs come out under. */
const CARDS = [
  { label: 'Signage', prefix: 'mockups', first: 21 },
  { label: 'Apparel', prefix: 'mockup-tshirt', first: 1 },
  { label: 'Mug', prefix: 'mockup-mug', first: 1 },
  { label: 'Tote', prefix: 'mockup-tote', first: 1 },
  { label: 'Sticker', prefix: 'mockup-sticker', first: 1 },
  { label: 'Business Card Stack', prefix: 'mockups', first: 27 },
  { label: 'Device Screen', prefix: 'mockups', first: 33 },
  { label: 'Billboard', prefix: 'mockup-billboard', first: 1 },
] as const;

const expectedIds = (prefix: string, first: number) =>
  Array.from({ length: 6 }, (_, i) => `${prefix}-ext-${first + i}`);

describe('mockups — the group is routed', () => {
  it('routes all eight catalog labels', () => {
    const catalogLabels = KIT_CATALOG.filter((e) => e.sectionKey === SECTION).map(
      (e) => e.storageLabel,
    );
    expect(catalogLabels).toHaveLength(8);
    // The card list here and the catalog's are the same eight, so a label
    // added to one and forgotten in the other fails rather than showing an
    // empty shelf.
    expect([...catalogLabels].sort()).toEqual(CARDS.map((c) => c.label).sort());
    for (const label of catalogLabels) {
      expect(variantsForCard(SECTION, label, mockBrand).length, label).toBe(6);
    }
  });

  for (const { label, prefix, first } of CARDS) {
    it(`${label} offers its own six designs`, () => {
      const shown = variantsForCard(SECTION, label, mockBrand);
      expect(shown.map((t) => t.id)).toEqual(expectedIds(prefix, first));
    });
  }

  it('never lets the three cards sharing the `mockups` type overlap', () => {
    // Signage, Business Card Stack and Device Screen all render through
    // the `mockups` template type, so their ids come out of ONE range.
    // Two modules claiming `mockups-ext-27` would show the same design on
    // two cards and file both under one persistence key.
    const ids = MOCKUP_SCENES.map((s) => s.idSuffix);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      ...SIGNAGE_SCENES.map((s) => s.idSuffix),
      ...CARD_STACK_SCENES.map((s) => s.idSuffix),
      ...DEVICE_SCENES.map((s) => s.idSuffix),
    ]);
    expect(ids[0]).toBe('ext-21');
    expect(ids[ids.length - 1]).toBe('ext-38');
  });
});

describe('mockups — curation', () => {
  it('keeps 48 scenes of the 170 that arrived', () => {
    const kept = [
      MUG_SCENES,
      TSHIRT_SCENES,
      TOTE_SCENES,
      STICKER_SCENES,
      BILLBOARD_SCENES,
      MOCKUP_SCENES,
    ].reduce((n, list) => n + list.length, 0);
    expect(kept).toBe(48);
  });

  it('reserves every culled id rather than renumbering', () => {
    // 5 families × 24 retired designs, plus the whole original twenty of
    // the shared `mockups` range.
    expect(MOCKUP_ARCHIVED_IDS).toHaveLength(24 * 5 + 20);
    for (const id of MOCKUP_ARCHIVED_IDS) expect(isArchived(id), id).toBe(true);
    // …and nothing still on offer is archived.
    for (const { label } of CARDS) {
      for (const t of variantsForCard(SECTION, label, mockBrand)) {
        expect(isArchived(t.id), t.id).toBe(false);
      }
    }
  });

  it('never reuses an id the old grab-bag already spent', () => {
    // `mockups-ext-1 … -20` were the phone case / wine bottle / concert
    // ticket set. The new scenes start at 21 on purpose.
    for (let n = 1; n <= 20; n += 1) {
      expect(isArchived(`mockups-ext-${n}`)).toBe(true);
    }
    expect(MOCKUP_SCENES.some((s) => s.idSuffix === 'ext-20')).toBe(false);
  });

  it('gives every kept design a designer’s name and its filter chips', () => {
    for (const { label } of CARDS) {
      for (const template of variantsForCard(SECTION, label, mockBrand)) {
        expect(curatedName(template.id), template.id).toBeTruthy();
        expect(template.name).toBe(curatedName(template.id));
        expect(isGeneratedName(template.name), template.id).toBe(false);
        expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('names no two designs in a card the same', () => {
    for (const { label } of CARDS) {
      const names = variantsForCard(SECTION, label, mockBrand).map((t) => t.name);
      expect(new Set(names).size, label).toBe(names.length);
    }
  });

  it('features three real designs on every card', () => {
    for (const { label } of CARDS) {
      const featured = DEFAULT_FEATURED_IDS_BY_LABEL[label] ?? [];
      expect(featured, label).toHaveLength(3);
      const ids = variantsForCard(SECTION, label, mockBrand).map((t) => t.id);
      for (const id of featured) expect(ids, label).toContain(id);
    }
  });
});

describe('mockups — binding', () => {
  it('knows the field paths the mockupLabel panel offers', () => {
    expect(LABEL_PATHS).toEqual(['primaryText', 'secondaryText', 'badge', 'url']);
  });

  for (const { label } of CARDS) {
    it(`${label} binds every field in every design`, () => {
      assertFullyBound({ sectionKey: SECTION, storageLabel: label }, LABEL_PATHS);
    });
  }

  it('leaves no design unbound', () => {
    for (const { label } of CARDS) {
      const results = renderAllVariants(SECTION, label);
      expect(results, label).toHaveLength(6);
      expect(boundVariantCount(results), label).toBe(6);
    }
  });

  it('declares nothing it cannot edit', () => {
    const known = new Set(LABEL_PATHS);
    for (const { label } of CARDS) {
      for (const result of renderAllVariants(SECTION, label)) {
        for (const path of result.paths) {
          expect(known.has(path), `${result.template.id} declares ${path}`).toBe(true);
        }
      }
    }
  });
});
