/**
 * Business cards — every kept design carries the whole person.
 *
 * The family advertised 130 designs. What a customer could actually edit
 * was a different number: `.audit/CODE.md` §2 found ~55 of the hundred
 * Wave-2 cards printing the literal "VP" OVER the bound job title, so the
 * panel's Job title field committed, autosaved, and changed nothing on
 * screen. That failure is invisible to a literal scan (the string "VP" is
 * not a placeholder anybody banned) and invisible to a screenshot (the card
 * looks fine). It is only visible by rendering every variant and asking
 * what it declared.
 *
 * `assertFullyBound` is deliberately all-or-nothing. A business card IS the
 * ten fields; a design that carries nine of them is a design that silently
 * drops the pronouns, or the address, or the handle — a look the customer
 * chose costing them a detail they entered.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { renderCosmosTemplate } from '../index';
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
import { BUSINESS_CARDS_EXTENDED } from '../BusinessCardsExtended';
import {
  BUSINESS_CARDS_EXTENDED_2,
  BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS,
} from '../BusinessCardsExtended2';

afterEach(cleanup);

const SECTION = 'stationery';
const LABEL = 'Business Card';

/** The ten fields the `person` panel offers. */
const PERSON_PATHS = fieldPathsForFamily('business-cards');

/** Wave 1's eighteen, then Wave 2's six. */
const KEPT_IDS = [...BUSINESS_CARDS_EXTENDED, ...BUSINESS_CARDS_EXTENDED_2].map(
  (t) => `business-cards-${t.idSuffix}`,
);

/** The twelve `TEMPLATE_LIBRARY` generates, all of them unreachable by an edit. */
const LEGACY_IDS = Array.from({ length: 12 }, (_, i) => `business-cards-${i + 1}`);

describe('business cards — curation', () => {
  it('shows twenty-four designs, not a hundred and thirty', () => {
    const shown = variantsForCard(SECTION, LABEL, mockBrand);
    expect(shown.map((t) => t.id)).toEqual(KEPT_IDS);
    expect(shown).toHaveLength(24);
  });

  it('reserves every culled id rather than renumbering', () => {
    // The ids stay valid persistence keys — a saved customization filed
    // under one still resolves — they are archived, not deleted.
    for (const id of LEGACY_IDS) expect(isArchived(id), id).toBe(true);
    expect(BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS).toHaveLength(94);
    for (const id of BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS) expect(isArchived(id), id).toBe(true);
    for (const id of KEPT_IDS) expect(isArchived(id), id).toBe(false);
  });

  it('keeps the two waves on their own side of the dispatch boundary', () => {
    // `renderers/index.tsx` sends `ext-19` and up to Wave 2 rebased by 18.
    // Renumbering either array would silently repoint every saved card.
    expect(BUSINESS_CARDS_EXTENDED.map((t) => t.idSuffix)).toEqual(
      Array.from({ length: 18 }, (_, i) => `ext-${i + 1}`),
    );
    expect(BUSINESS_CARDS_EXTENDED_2.map((t) => t.idSuffix)).toEqual(
      Array.from({ length: 6 }, (_, i) => `ext-${i + 19}`),
    );
    expect(BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS[0]).toBe('business-cards-ext-25');
    expect(BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS.at(-1)).toBe('business-cards-ext-118');
  });

  it('gives every kept design a designer’s name and its filter chips', () => {
    for (const template of variantsForCard(SECTION, LABEL, mockBrand)) {
      expect(curatedName(template.id), template.id).toBeTruthy();
      // Curation is what the drilldown renders, so the two must agree.
      expect(template.name).toBe(curatedName(template.id));
      expect(isGeneratedName(template.name), template.id).toBe(false);
      expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('names no two designs the same', () => {
    const names = KEPT_IDS.map((id) => curatedName(id));
    expect(new Set(names).size).toBe(names.length);
  });

  it('features three of the twenty-four, all of them real', () => {
    const featured = DEFAULT_FEATURED_IDS_BY_LABEL[LABEL] ?? [];
    expect(featured).toHaveLength(3);
    for (const id of featured) {
      expect(KEPT_IDS, id).toContain(id);
      expect(isArchived(id), id).toBe(false);
    }
  });
});

describe('business cards — binding', () => {
  it('knows the field paths the person panel offers', () => {
    expect(PERSON_PATHS).toEqual(
      expect.arrayContaining([
        'fullName',
        'jobTitle',
        'pronouns',
        'company',
        'tagline',
        'address',
        'email',
        'phone',
        'website',
        'socialHandle',
      ]),
    );
  });

  it('binds every field in every kept design', () => {
    assertFullyBound({ sectionKey: SECTION, storageLabel: LABEL }, PERSON_PATHS);
  });

  it('leaves no design unbound', () => {
    const results = renderAllVariants(SECTION, LABEL);
    expect(results).toHaveLength(24);
    expect(boundVariantCount(results)).toBe(24);
  });

  it('declares nothing it cannot edit', () => {
    // The inverse guard: a path that is not a panel field is a region the
    // customer can click and then find no control for.
    const known = new Set(PERSON_PATHS);
    for (const result of renderAllVariants(SECTION, LABEL)) {
      for (const path of result.paths) {
        expect(known.has(path), `${result.template.id} declares ${path}`).toBe(true);
      }
    }
  });

  it('gives every design a back as well as a front', () => {
    // A card has two sides. Every design here draws both, which is what
    // stopped the brand and the person having to share one face.
    for (const template of variantsForCard(SECTION, LABEL, mockBrand)) {
      const { container } = render(
        <>{renderCosmosTemplate(template, mockBrand as never, mockBrand, undefined)}</>,
      );
      expect(container.querySelector('[data-bk-card-stage]'), template.id).toBeTruthy();
      expect(container.querySelector('[data-bk-card-side="front"]'), template.id).toBeTruthy();
      expect(container.querySelector('[data-bk-card-back]'), template.id).toBeTruthy();
      cleanup();
    }
  });
});
