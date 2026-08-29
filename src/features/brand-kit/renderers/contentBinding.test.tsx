/**
 * The predicate is a table. This is what makes it trustworthy.
 *
 * Every variant of every WIRED family is rendered through the real
 * dispatcher with real content, and the presence of a `[data-bind]` region
 * — the mark `<Bind>` leaves on any text a renderer declared — is compared
 * against what `rendererBindsContent` claims. A renderer that gains or
 * loses its content prop fails here rather than shipping a silent no-op
 * edit into Design.
 *
 * The first version of that table read the wave boundary out of
 * `renderCosmosTemplate`'s dispatcher and claimed 22 bound invoice
 * designs. This test rendered them and found 8.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderCosmosTemplate } from './index';
import { rendererBindsContent, CONTENT_BOUND_TEMPLATE_TYPES } from './contentBinding';
import { variantsForCard } from '../data/legacy-mapping';
import { DELIVERABLES } from '../kit/registry';
import { contentKindForTemplateType, defaultContentFor } from '@/features/brandkit/content/kinds';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';

const brand = {
  id: 'skam',
  slug: 'skam',
  name: 'SKAM',
  primaryColor: '#1A1A2E',
  secondaryColor: '#C56B3F',
  fonts: { primary: 'Inter' },
  assets: [],
} as unknown as Brand;

afterEach(cleanup);

/** The deliverables Brand Kit actually offers `Use Template` on. */
const WIRED = DELIVERABLES.filter((d) => d.contentTypeId);

describe('rendererBindsContent', () => {
  it('knows about every family Brand Kit hands to Design', () => {
    expect(WIRED.length).toBeGreaterThan(0);
    for (const def of WIRED) {
      expect(CONTENT_BOUND_TEMPLATE_TYPES).toContain(def.templateType);
    }
  });

  for (const def of WIRED) {
    it(`agrees with what ${def.label} actually renders, variant by variant`, () => {
      const kind = contentKindForTemplateType(def.templateType);
      if (!kind) throw new Error(`${def.label} has a contentTypeId but no content kind`);
      const content = defaultContentFor(kind, mockBrand);
      const variants = variantsForCard(def.sectionKey, def.label);
      expect(variants.length).toBeGreaterThan(0);

      const disagreements: string[] = [];
      let bound = 0;
      for (const template of variants) {
        const claimed = rendererBindsContent(template);
        const { container } = render(
          <>{renderCosmosTemplate(template, brand, mockBrand, content)}</>,
        );
        const actual = container.querySelector('[data-bind]') !== null;
        cleanup();
        if (claimed !== actual) {
          disagreements.push(`${template.id}: predicate=${claimed} rendered=${actual}`);
        }
        if (actual) bound += 1;
      }
      expect(disagreements).toEqual([]);
      // A family where nothing binds would make the comparison vacuous.
      expect(bound).toBeGreaterThan(0);
      // Everything binding is the SUCCESS state now: curation archives the
      // designs that do not, so the gate's job is to stay in agreement with
      // the renderers, not to find stragglers.
    });
  }

  it('refuses a legacy (non-extension) id, which routes to the content-blind renderer', () => {
    expect(rendererBindsContent({ id: 'invoices-3', type: 'invoices' })).toBe(false);
  });

  it('refuses a family Brand Kit does not hand to Design', () => {
    // `envelope` / `letterhead` are synthetic template types — they are
    // not members of the legacy `BrandKitModuleType` union, which is why
    // `renderCosmosTemplate` casts them at its own switch too.
    const synthetic = (id: string, type: string) =>
      ({ id, type: type as BrandKitTemplate['type'] });
    expect(rendererBindsContent(synthetic('envelope-ext-3', 'envelope'))).toBe(false);
    expect(rendererBindsContent(synthetic('letterhead-ext-1', 'letterhead'))).toBe(false);
  });

  it('refuses a missing template rather than throwing', () => {
    expect(rendererBindsContent(null)).toBe(false);
    expect(rendererBindsContent(undefined)).toBe(false);
  });
});
