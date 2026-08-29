/**
 * Notecard — twelve designs, and no card to show them on.
 *
 * ## The one thing to know before reading this file
 *
 * Notecard is the only family in W1 with **no entry in `KIT_CATALOG` and
 * no row in `legacy-mapping.ts`'s `MAP.stationery`**. The renderers exist,
 * the dispatcher has a `notecard` case, `syntheticTemplates` builds the
 * 130 templates from `__notecard__`, the content kind is `note` and the
 * curation is written — but nothing asks for the card, so nothing renders
 * it. `variantsForCard('stationery', 'Notecard', …)` answers with an
 * empty array, which is why this suite cannot use it and reaches the
 * template list directly instead.
 *
 * That is deliberate on this agent's part, not an oversight: both files
 * that would wire it up are shared and off-limits to a family agent
 * (`W1-RULES.md` — "Never edit `renderers/index.tsx`,
 * `data/legacy-mapping.ts` … the catalog"). Wiring it is one `MAP` row
 * and one `entry({ sectionKey: 'stationery', storageLabel: 'Notecard',
 * group: 'applications', state: 'experimental' })`, and this suite is
 * what proves the family is ready for both. The `notecard` case in the
 * dispatcher and the ids asserted below are the contract those two lines
 * would meet.
 *
 * ## What is measured
 *
 * The same bar every other family clears — twelve kept of a hundred and
 * thirty, every culled id still reserved as a persistence key, a real
 * name and real chips on each survivor, and all three of the note kind's
 * fields declared by every one of them. A note is a greeting, a message
 * and a sign-off; a design that binds two of the three is a design that
 * silently drops whichever one the customer cared about.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, Fragment } from 'react';
import { render, cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { fieldGroupsFor } from '@/features/brandkit/content/fields';
import { isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import { SWEEP_BRAND } from '../__guards__/bindSweep';
import { renderCosmosTemplate } from '../index';
import { NOTECARD_EXTENDED } from '../NotecardExtended';
import { NOTECARD_EXTENDED_2 } from '../NotecardExtended2';

afterEach(cleanup);

const KEPT_IDS = [
  'notecard-ext-1', 'notecard-ext-2', 'notecard-ext-3', 'notecard-ext-5',
  'notecard-ext-8', 'notecard-ext-10', 'notecard-ext-15', 'notecard-ext-18',
  'notecard-ext-19', 'notecard-ext-23', 'notecard-ext-25', 'notecard-ext-30',
];

/** The three fields the `note` panel offers. */
const NOTE_PATHS = fieldGroupsFor('note').flatMap((g) => g.fields.map((f) => f.path));

/**
 * The templates `syntheticTemplates('__notecard__')` would build.
 *
 * Reconstructed here rather than imported because that function is not
 * exported and its module is off-limits. The shape is pinned by the id
 * assertions below and by the dispatcher accepting the `type`.
 */
function notecardTemplates(): BrandKitTemplate[] {
  return [...NOTECARD_EXTENDED, ...NOTECARD_EXTENDED_2].map(
    (t) =>
      ({
        id: `notecard-${t.idSuffix}`,
        name: curatedName(`notecard-${t.idSuffix}`) ?? t.name,
        category: t.category,
        type: 'notecard' as BrandKitTemplate['type'],
        orientation: 'landscape' as const,
        tags: ['notecard', 'extended', t.category],
      }) as BrandKitTemplate,
  );
}

const kept = () => notecardTemplates().filter((t) => !isArchived(t.id));

describe('notecard — curation', () => {
  it('keeps twelve of a hundred and thirty', () => {
    expect(notecardTemplates()).toHaveLength(130);
    expect(kept().map((t) => t.id)).toEqual(KEPT_IDS);
  });

  it('reserves every culled id rather than renumbering', () => {
    const allIds = notecardTemplates().map((t) => t.id);
    expect(new Set(allIds).size).toBe(130);
    for (const id of allIds.filter((id) => !KEPT_IDS.includes(id))) {
      expect(isArchived(id), id).toBe(true);
    }
  });

  it('gives every kept design a designer’s name and its filter chips', () => {
    for (const template of kept()) {
      expect(curatedName(template.id), template.id).toBeTruthy();
      expect(template.name).toBe(curatedName(template.id));
      expect(isGeneratedName(template.name), template.id).toBe(false);
      expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('names no two designs the same', () => {
    const names = KEPT_IDS.map((id) => curatedName(id));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('notecard — binding', () => {
  it('knows the field paths the note panel offers', () => {
    expect(NOTE_PATHS).toEqual(['greeting', 'message', 'signOff']);
  });

  it('binds all three fields in every kept design', () => {
    const content = hydrateContent('note', mockBrand, undefined);
    const missing: string[] = [];
    for (const template of kept()) {
      const { container } = render(
        createElement(
          Fragment,
          null,
          renderCosmosTemplate(template, SWEEP_BRAND, mockBrand, content),
        ),
      );
      const declared = new Set(
        [...container.querySelectorAll('[data-bind]')].map((el) => el.getAttribute('data-bind')),
      );
      cleanup();
      const absent = NOTE_PATHS.filter((p) => !declared.has(p));
      if (absent.length > 0) missing.push(`${template.id} — missing: ${absent.join(', ')}`);
      // The inverse: nothing declared that the panel cannot edit.
      for (const path of declared) {
        expect(NOTE_PATHS, `${template.id} declares ${path}`).toContain(path);
      }
    }
    expect(missing.join('\n')).toBe('');
  });
});
