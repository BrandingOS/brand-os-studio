/**
 * Letterhead — twenty designs, and every one of them is the same letter.
 *
 * The family shipped 130 variants. What they were, measured rather than
 * reviewed: 128 of them declared exactly ONE of the letter kind's eight
 * fields, a hundred were named by the generator that emitted them ("Wave
 * 2 · 43" — and the kit FEATURED two of those on the page a customer
 * opens first), and two rendered a sheet of grey rules with nothing on
 * it at all.
 *
 * The interesting half of that is not the placeholder text. It is that a
 * customer editing "Subject" in the panel on design 43 watched nothing
 * happen, because design 43 had never heard of the field. That failure is
 * invisible to a literal scan, invisible to a screenshot, and invisible
 * to anyone reviewing the artwork — it is only visible by rendering every
 * variant and asking what it declared.
 *
 * `assertFullyBound` is all-or-nothing on purpose. A letter is a header,
 * an addressee and a body; a design that binds seven of the eight is a
 * design where one thing the customer typed silently does not appear on
 * the page they are about to print.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL, isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import { LETTERHEAD_EXTENDED } from '../LetterheadExtended';
import { LETTERHEAD_EXTENDED_2 } from '../LetterheadExtended2';

afterEach(cleanup);

const SECTION = 'stationery';
const LABEL = 'Letterhead';

/** The eight fields the `letter` panel offers. */
const LETTER_PATHS = fieldPathsForFamily('letterhead');

const KEPT_IDS = Array.from({ length: 20 }, (_, i) => `letterhead-ext-${i + 1}`);

describe('letterhead — curation', () => {
  it('shows twenty designs, not a hundred and thirty', () => {
    const shown = variantsForCard(SECTION, LABEL, mockBrand);
    expect(shown.map((t) => t.id)).toEqual(KEPT_IDS);
  });

  it('reserves every culled id rather than renumbering', () => {
    // A template id is a persistence key: `brandos:brand-kit:state` and
    // the saved Quick Edits are filed under it. An id that stops
    // resolving is somebody's saved work stopping resolving with it, so
    // all 130 stay in the template list and 110 are simply not offered.
    const allIds = [
      ...LETTERHEAD_EXTENDED.map((t) => `letterhead-${t.idSuffix}`),
      ...LETTERHEAD_EXTENDED_2.map((t) => `letterhead-${t.idSuffix}`),
    ];
    expect(allIds).toHaveLength(130);
    expect(new Set(allIds).size).toBe(130);
    for (const id of KEPT_IDS) expect(isArchived(id), id).toBe(false);
    for (const id of allIds.filter((id) => !KEPT_IDS.includes(id))) {
      expect(isArchived(id), id).toBe(true);
    }
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

  it('features three of the twenty, none of them a generator’s output', () => {
    const featured = DEFAULT_FEATURED_IDS_BY_LABEL[LABEL] ?? [];
    expect(featured).toHaveLength(3);
    for (const id of featured) {
      expect(KEPT_IDS).toContain(id);
      expect(isGeneratedName(curatedName(id)), id).toBe(false);
    }
  });
});

describe('letterhead — binding', () => {
  it('knows the field paths the letter panel offers', () => {
    expect(LETTER_PATHS).toEqual(
      expect.arrayContaining([
        'senderName',
        'senderAddress',
        'website',
        'phone',
        'date',
        'recipient',
        'subject',
        'body',
      ]),
    );
    expect(LETTER_PATHS).toHaveLength(8);
  });

  it('binds every field in every kept design', () => {
    assertFullyBound({ sectionKey: SECTION, storageLabel: LABEL }, LETTER_PATHS);
  });

  it('leaves no design unbound', () => {
    const results = renderAllVariants(SECTION, LABEL);
    expect(results).toHaveLength(20);
    expect(boundVariantCount(results)).toBe(20);
  });

  it('declares nothing it cannot edit', () => {
    // The inverse guard: a path that is not a panel field is a region a
    // customer can click on the artifact and then find no control for.
    const known = new Set(LETTER_PATHS);
    for (const result of renderAllVariants(SECTION, LABEL)) {
      for (const path of result.paths) {
        expect(known.has(path), `${result.template.id} declares ${path}`).toBe(true);
      }
    }
  });
});
