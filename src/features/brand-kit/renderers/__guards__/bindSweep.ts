/**
 * The bind sweep — "every visible text is a field."
 *
 * A design that does not declare its text through `<Bind path=…>` accepts
 * an edit in the panel, commits it, autosaves it, and never repaints. The
 * failure is silent, which is why it has to be measured rather than
 * reviewed: `contentBinding.test.tsx` rendered the invoice family and found
 * 8 bound designs where the dispatcher's wave boundary claimed 22.
 *
 * This module renders EVERY variant a family offers through the real
 * dispatcher and reports which content paths each one actually declared.
 * A family agent's finish line is `assertFullyBound(family, paths)` passing
 * for their family with the kind's own field paths.
 *
 * Runs in the jsdom (unit) project. It mounts real React, so a caller must
 * `cleanup()` — `renderAllVariants` cleans up after itself between
 * variants, and leaves nothing mounted when it returns.
 */
import { createElement, Fragment } from 'react';
import { render, cleanup } from '@testing-library/react';
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { mockBrand as defaultMockBrand } from '@/features/setup/data/mockBrand';
import {
  contentKindForTemplateType,
  hydrateContent,
  type DeliverableContent,
} from '@/features/brandkit/content/kinds';
import { fieldGroupsFor } from '@/features/brandkit/content/fields';
import { variantsForCard } from '../../data/legacy-mapping';
import { renderCosmosTemplate } from '../index';

/** A brand-shaped stand-in with enough on it for any renderer to paint. */
export const SWEEP_BRAND = {
  id: 'sweep',
  slug: 'sweep',
  name: 'Nuworld',
  primaryColor: '#2550E3',
  secondaryColor: '#111113',
  fonts: { primary: 'Inter', secondary: 'DM Sans' },
  assets: [],
} as unknown as Brand;

/** Which family to sweep. `sectionKey`/`storageLabel` are catalog identity. */
export type FamilyRef = {
  sectionKey: string;
  storageLabel: string;
  brand?: Brand;
  mock?: MockBrand;
  /** Overrides the content the sweep paints with. Defaults to the kind's. */
  content?: DeliverableContent;
};

export type VariantBinding = {
  template: BrandKitTemplate;
  /** Every `data-bind` path this variant declared, de-duplicated, sorted. */
  paths: string[];
};

/**
 * Render every variant of a family and collect its declared bind paths.
 *
 * The content passed is `hydrateContent(kind, brand, undefined)` — the
 * kind's own defaults for this brand — because that is what the drilldown
 * grid and every offscreen export pass. A family with no content kind still
 * sweeps: it simply reports no paths anywhere, which is the honest answer
 * and the thing its family agent has to change.
 */
export function renderAllVariants(
  sectionKey: string,
  storageLabel: string,
  brand: Brand = SWEEP_BRAND,
  options: { mock?: MockBrand; content?: DeliverableContent } = {},
): VariantBinding[] {
  const mock = options.mock ?? defaultMockBrand;
  // `variantsForCard`'s sectionKey is the storage half of a deliverable
  // key — a plain string here so a family added after this module (Mockups)
  // does not have to widen a union to be sweepable.
  const variants = variantsForCard(sectionKey as never, storageLabel, mock);

  const results: VariantBinding[] = [];
  for (const template of variants) {
    const kind = contentKindForTemplateType(template.type as string);
    const content =
      options.content ?? (kind ? hydrateContent(kind, mock, undefined) : undefined);

    // `createElement` rather than JSX so this helper stays a `.ts` module —
    // it is machinery, not artwork, and nothing here renders of its own.
    const { container } = render(
      createElement(Fragment, null, renderCosmosTemplate(template, brand, mock, content)),
    );
    const paths = new Set<string>();
    for (const el of Array.from(container.querySelectorAll('[data-bind]'))) {
      const path = el.getAttribute('data-bind');
      if (path) paths.add(path);
    }
    cleanup();
    results.push({ template, paths: [...paths].sort() });
  }
  return results;
}

/** The content paths a kind's panel offers, list items flattened to index 0. */
export function fieldPathsForFamily(templateType: string): string[] {
  const kind = contentKindForTemplateType(templateType);
  if (!kind) return [];
  const paths: string[] = [];
  for (const group of fieldGroupsFor(kind)) {
    for (const field of group.fields) {
      if (field.type === 'list') {
        for (const item of field.itemFields) paths.push(`${field.path}.0.${item.path}`);
      } else {
        paths.push(field.path);
      }
    }
  }
  return paths;
}

/** How many variants of a sweep declared at least one path. */
export function boundVariantCount(results: ReadonlyArray<VariantBinding>): number {
  return results.filter((r) => r.paths.length > 0).length;
}

/** A per-variant table of what is missing. Empty string when nothing is. */
export function formatMissing(
  results: ReadonlyArray<VariantBinding>,
  requiredPaths: ReadonlyArray<string>,
): string {
  const rows: string[] = [];
  for (const r of results) {
    const missing = requiredPaths.filter((p) => !r.paths.includes(p));
    if (missing.length > 0) rows.push(`  ${r.template.id} (${r.template.name}) — missing: ${missing.join(', ')}`);
  }
  return rows.join('\n');
}

/**
 * Every variant of a family declares every required path, or this throws
 * with the list of which variants miss which.
 *
 * This is the assertion a family agent runs LAST. It is deliberately
 * all-or-nothing: a family where nine designs of twenty bind is a family
 * where a customer's edit works on some cards and silently vanishes on the
 * others, which is worse than one where it never works at all.
 */
export function assertFullyBound(
  family: FamilyRef,
  requiredPaths: ReadonlyArray<string>,
): void {
  const results = renderAllVariants(family.sectionKey, family.storageLabel, family.brand, {
    mock: family.mock,
    content: family.content,
  });
  if (results.length === 0) {
    throw new Error(
      `bind sweep: ${family.sectionKey}::${family.storageLabel} has no variants to render`,
    );
  }
  const report = formatMissing(results, requiredPaths);
  if (report) {
    throw new Error(
      `bind sweep: ${family.sectionKey}::${family.storageLabel} — ` +
        `${results.length - boundVariantCount(results)} of ${results.length} variants declare nothing.\n${report}\n`,
    );
  }
}
