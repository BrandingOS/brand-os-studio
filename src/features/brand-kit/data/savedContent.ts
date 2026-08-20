/**
 * The structured content a saved card was last exported with.
 *
 * Downloads rasterise the renderer OFFSCREEN rather than the editor's live
 * DOM, so without this a user could edit an invoice, save it, download it,
 * and get an invoice with the default line items back. The editor's own
 * Download already snapshots what is on screen; this is for every other
 * export path — the card's Download action and the group bundle.
 */
import type { BrandKitTemplate } from '@/features/brandkit/types';
import {
  contentKindForTemplateType,
  hydrateContent,
  type DeliverableContent,
} from '@/features/brandkit/content/kinds';
import { loadBrandCustomizations, type SavedCardCustomization } from './cardCustomizations';

type BrandLike = { name: string };

/**
 * Resolve one template's saved content from an already-loaded map.
 *
 * Takes the map rather than a brand id so a caller rasterising a whole
 * group reads localStorage once instead of once per artifact.
 */
export function contentForTemplate(
  saved: Record<string, SavedCardCustomization>,
  template: Pick<BrandKitTemplate, 'id' | 'type'> | undefined,
  brand: BrandLike,
): DeliverableContent | undefined {
  if (!template) return undefined;
  const kind = contentKindForTemplateType(template.type as string);
  if (!kind) return undefined;
  const record = saved[template.id];
  if (!record) return undefined;
  if (record.content) return hydrateContent(kind, brand, record.content);
  if (kind === 'person') {
    // Saved before the content model existed — read the person forward
    // out of the flat overrides so an old export still says the name it
    // was saved with.
    const o = record.overrides;
    return hydrateContent(kind, brand, {
      kind: 'person',
      fullName: o.title,
      jobTitle: o.subtitle,
      email: o.email,
      phone: o.phone,
      website: o.website,
    });
  }
  return undefined;
}

/** Convenience for a single artifact. Reads storage once. */
export function savedContentFor(
  brandId: string | undefined,
  template: Pick<BrandKitTemplate, 'id' | 'type'> | undefined,
  brand: BrandLike,
): DeliverableContent | undefined {
  return contentForTemplate(loadBrandCustomizations(brandId), template, brand);
}

export { loadBrandCustomizations };
