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
  type ContentKind,
  type DeliverableContent,
} from '@/features/brandkit/content/kinds';
import { loadBrandCustomizations, type SavedCardCustomization } from './cardCustomizations';

type BrandLike = { name: string };

/**
 * Resolve ONE saved customization record into structured content for the
 * given kind — the single rule "what does this card say" defers to,
 * whatever record the caller already has in hand.
 *
 * `contentForTemplate` (a map + template lookup, for the download paths)
 * and `BrandKitCardEditor`'s preview (which already holds the ONE record
 * it cares about — `initialCustomization`) both call this rather than
 * each encoding the resolution rule separately.
 *
 * `strictNullChecks` is off, so a stored value belonging to a DIFFERENT
 * kind (e.g. a person record read against an invoice) is not something
 * the type system will catch — guarded explicitly here rather than
 * trusted to `hydrateContent`'s own (also-present) guard.
 */
export function contentFromCustomization(
  record: SavedCardCustomization | null | undefined,
  kind: ContentKind | null,
  brand: BrandLike,
  /**
   * The template's TYPE, so a kind whose defaults differ per family fills
   * in as the document this template actually is. Only `deck` reads it —
   * a business plan and a pitch are two documents, not one (QA Q10).
   */
  variant?: string,
): DeliverableContent | undefined {
  if (!kind || !record) return undefined;
  if (record.content && record.content.kind === kind) {
    return hydrateContent(kind, brand, record.content, variant);
  }
  if (!record.content && kind === 'person') {
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
  return contentFromCustomization(saved[template.id], kind, brand, template.type as string);
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
