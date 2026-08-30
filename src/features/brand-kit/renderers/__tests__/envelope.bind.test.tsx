/**
 * Envelope — sixteen designs, and every one of them can be posted.
 *
 * An envelope carries exactly two things: who it is from and who it is
 * going to. That is a lower bar than any other family here and it is
 * still the one the family failed — 130 variants shipped, roughly seventy
 * of them addressed to a "Jane Smith" who does not exist, a hundred named
 * by the loop that emitted them, and none of them able to tell the panel
 * that an address had lines in it.
 *
 * ## Why the required paths are what they are
 *
 * `sender.lines` is a `stringList`, so the PANEL addresses the list and
 * the ARTWORK addresses its members. `sender.lines.0` is the path a
 * design can actually declare and the one a click on the first address
 * line has to resolve to; `fieldPathsForFamily` reports the list's own
 * path because that is what the panel's control is filed under. The two
 * are the same field seen from opposite ends, so the list path is
 * expanded here rather than demanded of the artwork.
 *
 * The second sweep is the stronger one: whatever number of lines the
 * content actually carries, every one of them is declared. A design that
 * binds line one and prints line two as text is a design that drops the
 * postcode — which is the whole envelope.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL, isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import { ENVELOPE_EXTENDED } from '../EnvelopeExtended';
import { ENVELOPE_EXTENDED_2 } from '../EnvelopeExtended2';

afterEach(cleanup);

const SECTION = 'stationery';
const LABEL = 'Envelope';

const KEPT_IDS = [
  'envelope-ext-1', 'envelope-ext-2', 'envelope-ext-3', 'envelope-ext-4',
  'envelope-ext-6', 'envelope-ext-7', 'envelope-ext-9', 'envelope-ext-12',
  'envelope-ext-14', 'envelope-ext-16', 'envelope-ext-20', 'envelope-ext-21',
  'envelope-ext-25', 'envelope-ext-26', 'envelope-ext-27', 'envelope-ext-30',
];

/** The panel's own five, with the two lists addressed at their first row. */
const ADDRESS_PATHS = [
  'sender.name',
  'sender.lines.0',
  'recipient.name',
  'recipient.lines.0',
  'postageLabel',
];

describe('envelope — curation', () => {
  it('shows sixteen designs, not a hundred and thirty', () => {
    const shown = variantsForCard(SECTION, LABEL, mockBrand);
    expect(shown.map((t) => t.id)).toEqual(KEPT_IDS);
  });

  it('reserves every culled id rather than renumbering', () => {
    const allIds = [
      ...ENVELOPE_EXTENDED.map((t) => `envelope-${t.idSuffix}`),
      ...ENVELOPE_EXTENDED_2.map((t) => `envelope-${t.idSuffix}`),
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
      expect(template.name).toBe(curatedName(template.id));
      expect(isGeneratedName(template.name), template.id).toBe(false);
      expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('names no two designs the same', () => {
    const names = KEPT_IDS.map((id) => curatedName(id));
    expect(new Set(names).size).toBe(names.length);
  });

  it('features three of the sixteen, none of them a generator’s output', () => {
    const featured = DEFAULT_FEATURED_IDS_BY_LABEL[LABEL] ?? [];
    expect(featured).toHaveLength(3);
    for (const id of featured) {
      expect(KEPT_IDS).toContain(id);
      expect(isGeneratedName(curatedName(id)), id).toBe(false);
    }
  });
});

describe('envelope — binding', () => {
  it('knows the field paths the address panel offers', () => {
    expect(fieldPathsForFamily('envelope')).toEqual([
      'sender.name',
      'sender.lines',
      'recipient.name',
      'recipient.lines',
      'postageLabel',
    ]);
  });

  it('binds every field in every kept design', () => {
    assertFullyBound({ sectionKey: SECTION, storageLabel: LABEL }, ADDRESS_PATHS);
  });

  it('leaves no design unbound', () => {
    const results = renderAllVariants(SECTION, LABEL);
    expect(results).toHaveLength(16);
    expect(boundVariantCount(results)).toBe(16);
  });

  it('declares every address LINE the content carries, not only the first', () => {
    // The postcode lives on the last line. A design that binds line one
    // and prints the rest as text loses whatever the customer typed
    // there — and loses it silently, which is the whole failure mode.
    const content = hydrateContent('address', mockBrand, undefined) as {
      sender: { lines: string[] };
      recipient: { lines: string[] };
    } & DeliverableContent;
    expect(content.sender.lines.length).toBeGreaterThan(1);
    expect(content.recipient.lines.length).toBeGreaterThan(1);

    const required = [
      ...content.sender.lines.map((_, i) => `sender.lines.${i}`),
      ...content.recipient.lines.map((_, i) => `recipient.lines.${i}`),
    ];
    assertFullyBound({ sectionKey: SECTION, storageLabel: LABEL, content }, required);
  });

  it('declares nothing it cannot edit', () => {
    // A declared path must resolve to a control. List members are
    // accepted at any index — that is what the list control edits.
    const known = new Set(ADDRESS_PATHS);
    for (const result of renderAllVariants(SECTION, LABEL)) {
      for (const path of result.paths) {
        const normalised = path.replace(/\.\d+$/, '.0');
        expect(known.has(normalised), `${result.template.id} declares ${path}`).toBe(true);
      }
    }
  });
});
