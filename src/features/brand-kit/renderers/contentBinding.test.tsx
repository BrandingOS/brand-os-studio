/**
 * The predicate is DERIVED. This is what proves the derivation is right.
 *
 * Every kept variant of every family that has a content kind is rendered
 * through the real dispatcher with real content, and the presence of a
 * `[data-bind]` region — the mark `<Bind>` leaves on any text a renderer
 * declared — is compared against what `rendererBindsContent` claims. A
 * renderer that loses its content prop, or a family that is converted
 * without being wired, fails here rather than shipping a silent no-op edit
 * into Design.
 *
 * Two earlier versions of this gate were wrong in the same way and this
 * test is the reason we know:
 *
 *   • It was first written as a wave boundary read out of the dispatcher,
 *     claiming 22 bound invoice designs. Rendering them found 8.
 *   • It was then written as a hand-kept table, which stayed at "only
 *     invoices bind" while ten more families were converted — so `Use
 *     Template` was dark across the whole kit and nothing said so. Hence
 *     the sweep below covers EVERY family with a kind, not just the ones
 *     someone remembered to list.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderCosmosTemplate } from './index';
import { rendererBindsContent, CONTENT_BOUND_TEMPLATE_TYPES } from './contentBinding';
import { isArchived } from './curation';
import { variantsForCard } from '../data/legacy-mapping';
import { DELIVERABLES } from '../kit/registry';
import { getContentTypeConfig } from '@/features/editor/content-types';
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

/** Every deliverable whose family was put on the content model. */
const KINDED = DELIVERABLES.filter((d) => contentKindForTemplateType(d.templateType) !== null);
/** Every deliverable Brand Kit actually offers `Use Template` on. */
const WIRED = DELIVERABLES.filter((d) => d.contentTypeId);

const synthetic = (id: string, type: string) =>
  ({ id, type: type as BrandKitTemplate['type'] });

describe('the gate and the registry agree about which families are wired', () => {
  it('knows about every family Brand Kit hands to Design', () => {
    expect(WIRED.length).toBeGreaterThan(0);
    for (const def of WIRED) {
      expect(CONTENT_BOUND_TEMPLATE_TYPES).toContain(def.templateType);
    }
  });

  /**
   * The regression this whole rewrite exists for: a family that gains a
   * content kind but no `contentTypeId` is fully converted and still
   * unreachable — the tile menu offers `Use Template` disabled forever,
   * with no failing test anywhere.
   */
  it('leaves no converted family unwired', () => {
    const unwired = KINDED.filter((d) => !d.contentTypeId).map((d) => d.label);
    expect(unwired).toEqual([]);
  });

  /**
   * A `contentTypeId` naming a Fabric config would create the document,
   * navigate to it, and open an EMPTY canvas — the shell picks its
   * renderer from the content type alone.
   */
  it('names a registered content type that the template-instance renderer paints', () => {
    for (const def of WIRED) {
      const cfg = getContentTypeConfig(def.contentTypeId as string);
      expect(cfg.renderer, `${def.label} → ${def.contentTypeId}`).toBe('template-instance');
    }
  });

  it('leaves Brand Guides unwired on purpose — they are drawn from the brand', () => {
    const guides = DELIVERABLES.filter((d) => d.sectionKey === 'brand-guides');
    expect(guides.length).toBeGreaterThan(0);
    for (const def of guides) {
      expect(contentKindForTemplateType(def.templateType)).toBeNull();
      expect(def.contentTypeId).toBeUndefined();
      expect(rendererBindsContent(synthetic(`${def.templateType}-ext-1`, def.templateType))).toBe(
        false,
      );
    }
  });
});

describe('rendererBindsContent agrees with what the renderers actually do', () => {
  for (const def of KINDED) {
    it(`agrees with what ${def.label} renders, variant by variant`, () => {
      const kind = contentKindForTemplateType(def.templateType);
      if (!kind) throw new Error(`${def.label} lost its content kind`);
      const content = defaultContentFor(kind, mockBrand);
      // `variantsForCard` is the KEPT set — what a drilldown can reach.
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
      // Everything binding is the SUCCESS state: curation archives the
      // designs that do not, so the gate's job is to stay in agreement
      // with the renderers, not to find stragglers.
      expect(bound).toBe(variants.length);
    });
  }
});

describe('what it refuses, and why', () => {
  it('refuses a legacy (non-extension) id, which routes to the content-blind renderer', () => {
    expect(rendererBindsContent({ id: 'invoices-3', type: 'invoices' })).toBe(false);
  });

  /**
   * Archived ids stay reserved (a saved customization can still name one)
   * so the gate has to answer for them even though no tile shows them.
   * Taken from curation rather than hardcoded — an id list would be a
   * second copy of the very record this predicate now derives from.
   */
  it('refuses an archived design in an otherwise wired family', () => {
    const archivedIds: string[] = [];
    for (const def of KINDED) {
      for (let n = 1; n <= 140 && archivedIds.length < 3; n += 1) {
        const id = `${def.templateType}-ext-${n}`;
        if (isArchived(id)) archivedIds.push(id);
      }
      if (archivedIds.length >= 3) break;
    }
    expect(archivedIds.length).toBeGreaterThan(0);
    for (const id of archivedIds) {
      const type = id.replace(/-ext-\d+$/, '');
      expect(rendererBindsContent(synthetic(id, type)), id).toBe(false);
    }
  });

  it('refuses a brand-asset card, which paints the brand and not a deliverable', () => {
    expect(rendererBindsContent(synthetic('brand-asset-logo-ext-1', 'brand-asset-logo'))).toBe(
      false,
    );
  });

  it('refuses a template type nobody has modelled', () => {
    expect(rendererBindsContent(synthetic('made-up-ext-1', 'made-up'))).toBe(false);
  });

  it('refuses a missing template rather than throwing', () => {
    expect(rendererBindsContent(null)).toBe(false);
    expect(rendererBindsContent(undefined)).toBe(false);
  });
});
