/**
 * Shared helpers for rendering a kit item (or candidate template) as a
 * live brand-aware preview. Used by the deliverable cards, the review
 * overlay, and the owned-collection drilldown so every surface paints
 * an item the same way: brand + the item's saved color picks, and
 * prop-driven content where the renderer supports it (business cards).
 */
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { renderCosmosTemplate } from '../renderers';
import { variantsForCard } from '../data/legacy-mapping';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import type { DeliverableDef } from './registry';
import {
  contentKindForTemplateType,
  hydrateContent,
  type DeliverableContent,
} from '../content/kinds';

/** Project the brand through an item's saved color picks. */
export function previewBrandFor(
  sourceBrand: Brand,
  customization: SavedCardCustomization | null | undefined,
): Brand {
  if (!customization) return sourceBrand;
  const next: Brand = { ...sourceBrand };
  if (customization.color) next.primaryColor = customization.color;
  if (customization.secondaryColor) next.secondaryColor = customization.secondaryColor;
  return next;
}

/**
 * The structured content an item renders with.
 *
 * Prefers the saved `content` — real nested data, including an invoice's
 * line items — and falls back to reading a `person` out of the legacy
 * flat overrides, so a business card customized before the content model
 * existed still paints the name it was saved with.
 */
function renderContentFor(
  def: DeliverableDef,
  brand: MockBrand,
  customization: SavedCardCustomization | null | undefined,
): DeliverableContent | undefined {
  const kind = contentKindForTemplateType(def.templateType);
  if (!kind) return undefined;
  if (customization?.content) return hydrateContent(kind, brand, customization.content);
  if (kind === 'person' && customization) {
    const o = customization.overrides;
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

export function templateForVariant(
  def: DeliverableDef,
  brand: MockBrand,
  variantId: string,
): BrandKitTemplate | undefined {
  return variantsForCard(def.sectionKey, def.label, brand).find((t) => t.id === variantId);
}

/** Live preview of a template with an item's customization applied.
 *  Returns null when the template or brand is unavailable — callers
 *  fall back to a non-rendered tile. Typed as ReactElement so the
 *  result can feed `snapshotTemplatePng` directly. */
export function renderKitPreview(
  def: DeliverableDef,
  template: BrandKitTemplate | undefined,
  customization: SavedCardCustomization | null | undefined,
  sourceBrand: Brand | undefined,
  mockBrand: MockBrand,
): React.ReactElement | null {
  if (!template || !sourceBrand) return null;
  return renderCosmosTemplate(
    template,
    previewBrandFor(sourceBrand, customization),
    mockBrand,
    renderContentFor(def, mockBrand, customization),
  ) as React.ReactElement | null;
}
