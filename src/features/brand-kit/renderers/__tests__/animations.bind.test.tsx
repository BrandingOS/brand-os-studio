/**
 * Animations — ten designs per card, and every one of them is editable.
 *
 * The family arrived as four cards advertising thirty designs each. There
 * were ten: the template list was `[...stills, ...stills, ...stills]`, so
 * "Logo Reveal" offered the same picture three times over, and the picture
 * did not move — the file declared no `@keyframes` at all
 * (`.audit/CODE.md` §7).
 *
 * Two things are asserted here and they are different failures. **Curation**
 * is what the customer BROWSES: eighty duplicate ids gone from every
 * surface without one of them ceasing to be a valid persistence key.
 * **Binding** is what the customer EDITS: a motion piece has three fields
 * — the word, how long it runs and whether it repeats — and a design that
 * declares the word but not the duration is a design where the Quick Edit
 * duration control moves a number and nothing else. That is invisible to a
 * screenshot and to a literal scan; it is only visible by rendering every
 * variant and asking what it declared.
 *
 * Whether the designs actually MOVE is the other half, and jsdom cannot
 * answer it — see `animations.motion.browser.test.tsx`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import {
  DEFAULT_FEATURED_IDS_BY_LABEL,
  isGeneratedName,
} from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import {
  ANIMATION_ARCHIVED_IDS,
  ANIMATION_FAMILIES,
  ANIMATION_ID_COUNT,
  ANIMATION_KEPT_COUNT,
  ANIMATION_KEPT_IDS,
  ANIMATION_KEPT_IDS_BY_TYPE,
  FADE_EXTENDED,
  LOGO_REVEAL_EXTENDED,
  ROTATE_EXTENDED,
  SLIDE_IN_EXTENDED,
} from '../AnimationsExtended';

afterEach(cleanup);

const SECTION = 'animations';

/** The three fields the `motion` panel offers. */
const MOTION_PATHS = fieldPathsForFamily('anim-reveal');

/** The four cards, with the id list each one reserves. */
const CARDS = [
  { label: 'Logo Reveal', type: 'anim-reveal', all: LOGO_REVEAL_EXTENDED },
  { label: 'Slide In', type: 'anim-slide', all: SLIDE_IN_EXTENDED },
  { label: 'Fade', type: 'anim-fade', all: FADE_EXTENDED },
  { label: 'Rotate', type: 'anim-rotate', all: ROTATE_EXTENDED },
] as const;

describe('animations — curation', () => {
  it('covers the four cards the catalog lists', () => {
    expect(ANIMATION_FAMILIES.map((f) => f.label)).toEqual(CARDS.map((c) => c.label));
    expect(ANIMATION_FAMILIES.map((f) => f.type)).toEqual(CARDS.map((c) => c.type));
  });

  for (const card of CARDS) {
    it(`${card.label} shows ten designs, not thirty`, () => {
      const shown = variantsForCard(SECTION, card.label, mockBrand);
      expect(shown.map((t) => t.id)).toEqual(ANIMATION_KEPT_IDS_BY_TYPE[card.type]);
      expect(shown).toHaveLength(ANIMATION_KEPT_COUNT);
    });

    it(`${card.label} reserves every culled id rather than renumbering`, () => {
      // The tripled ids still exist in the template list — a saved
      // customization filed under one still resolves — they are archived,
      // not deleted.
      const allIds = card.all.map((t) => `${card.type}-${t.idSuffix}`);
      expect(allIds).toHaveLength(ANIMATION_ID_COUNT);
      expect(allIds.slice(0, ANIMATION_KEPT_COUNT)).toEqual(
        ANIMATION_KEPT_IDS_BY_TYPE[card.type],
      );
      for (const id of allIds.slice(ANIMATION_KEPT_COUNT)) {
        expect(ANIMATION_ARCHIVED_IDS, id).toContain(id);
        expect(isArchived(id), id).toBe(true);
      }
      for (const id of ANIMATION_KEPT_IDS_BY_TYPE[card.type]!) {
        expect(isArchived(id), id).toBe(false);
      }
    });

    it(`${card.label} features three of its ten, all of them real`, () => {
      const featured = DEFAULT_FEATURED_IDS_BY_LABEL[card.label] ?? [];
      expect(featured).toHaveLength(3);
      for (const id of featured) {
        expect(ANIMATION_KEPT_IDS_BY_TYPE[card.type], id).toContain(id);
      }
      // Three readings, not one design three times.
      expect(new Set(featured).size).toBe(3);
    });
  }

  it('archives eighty ids across the four cards', () => {
    expect(ANIMATION_ARCHIVED_IDS).toHaveLength(
      CARDS.length * (ANIMATION_ID_COUNT - ANIMATION_KEPT_COUNT),
    );
    expect(ANIMATION_KEPT_IDS).toHaveLength(CARDS.length * ANIMATION_KEPT_COUNT);
    // An id is kept or archived, never both.
    for (const id of ANIMATION_KEPT_IDS) expect(ANIMATION_ARCHIVED_IDS).not.toContain(id);
  });

  it('gives every kept design a designer’s name and its filter chips', () => {
    for (const card of CARDS) {
      for (const template of variantsForCard(SECTION, card.label, mockBrand)) {
        expect(curatedName(template.id), template.id).toBeTruthy();
        // Curation is what the drilldown renders, so the two must agree.
        expect(template.name).toBe(curatedName(template.id));
        expect(isGeneratedName(template.name), template.id).toBe(false);
        expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('names no two designs in a card the same', () => {
    for (const card of CARDS) {
      const names = ANIMATION_KEPT_IDS_BY_TYPE[card.type]!.map((id) => curatedName(id));
      expect(new Set(names).size, card.label).toBe(names.length);
    }
  });
});

describe('animations — binding', () => {
  it('knows the field paths the motion panel offers', () => {
    expect(MOTION_PATHS).toEqual(['text', 'durationMs', 'loop']);
  });

  for (const card of CARDS) {
    it(`${card.label} binds all three fields in every kept design`, () => {
      assertFullyBound({ sectionKey: SECTION, storageLabel: card.label }, MOTION_PATHS);
    });

    it(`${card.label} leaves no design unbound`, () => {
      const results = renderAllVariants(SECTION, card.label);
      expect(results).toHaveLength(ANIMATION_KEPT_COUNT);
      expect(boundVariantCount(results)).toBe(ANIMATION_KEPT_COUNT);
    });

    it(`${card.label} declares nothing it cannot edit`, () => {
      // The inverse guard: a path that is not a panel field is a region
      // the customer can click and then find no control for.
      const known = new Set(MOTION_PATHS);
      for (const result of renderAllVariants(SECTION, card.label)) {
        for (const path of result.paths) {
          expect(known.has(path), `${result.template.id} declares ${path}`).toBe(true);
        }
      }
    });
  }
});
