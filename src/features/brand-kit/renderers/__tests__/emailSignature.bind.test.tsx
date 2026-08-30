/**
 * Email signatures — every kept design carries the whole person.
 *
 * The family shipped with five of thirty designs bound and twenty-five
 * printing a person who does not exist. The interesting half of that
 * failure is not the placeholder — it is that a customer editing "Phone"
 * in the panel on design 12 watched nothing happen, because design 12 had
 * no idea the field existed. That is invisible to a literal scan and to a
 * screenshot; it is only visible by rendering every variant and asking
 * what it declared.
 *
 * `assertFullyBound` is deliberately all-or-nothing. A signature is a
 * block of contact details, and a design that keeps nine of the ten is a
 * design that silently drops the customer's address — a look they chose
 * costing them a detail they entered.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL } from '../../data/cardPresentation';
import { isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import {
  EMAIL_SIG_ARCHIVED_IDS,
  EMAIL_SIG_KEPT_IDS,
  WEB_EMAIL_SIG_EXTENDED,
} from '../WebEmailSignatureExtended';

afterEach(cleanup);

const SECTION = 'web';
const LABEL = 'Email Signature';

/** The ten fields the `person` panel offers. */
const PERSON_PATHS = fieldPathsForFamily('email-sig');

describe('email signature — curation', () => {
  it('shows sixteen designs, not thirty', () => {
    const shown = variantsForCard(SECTION, LABEL, mockBrand);
    expect(shown.map((t) => t.id)).toEqual(EMAIL_SIG_KEPT_IDS);
    expect(shown).toHaveLength(16);
  });

  it('reserves every culled id rather than renumbering', () => {
    // The ids still exist in the template list — a saved customization
    // filed under one still resolves — they are archived, not deleted.
    const allIds = WEB_EMAIL_SIG_EXTENDED.map((t) => `email-sig-${t.idSuffix}`);
    expect(allIds).toHaveLength(30);
    expect(allIds.slice(0, 16)).toEqual(EMAIL_SIG_KEPT_IDS);
    expect(allIds.slice(16)).toEqual(EMAIL_SIG_ARCHIVED_IDS);
    for (const id of EMAIL_SIG_ARCHIVED_IDS) expect(isArchived(id)).toBe(true);
    for (const id of EMAIL_SIG_KEPT_IDS) expect(isArchived(id)).toBe(false);
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
    const names = EMAIL_SIG_KEPT_IDS.map((id) => curatedName(id));
    expect(new Set(names).size).toBe(names.length);
  });

  it('features three of the sixteen, all of them real', () => {
    const featured = DEFAULT_FEATURED_IDS_BY_LABEL[LABEL] ?? [];
    expect(featured).toHaveLength(3);
    for (const id of featured) expect(EMAIL_SIG_KEPT_IDS).toContain(id);
  });
});

describe('email signature — binding', () => {
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
    expect(results).toHaveLength(16);
    expect(boundVariantCount(results)).toBe(16);
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
});
