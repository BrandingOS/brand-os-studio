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
  type DeliverableContent,
} from '@/features/brandkit/content/kinds';
import { contentFromCustomization } from '../data/savedContent';

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
 * Delegates to `contentFromCustomization` — the ONE rule for "what does
 * this card say", shared with the download paths and the card editor's
 * preview. It had been reimplemented here, minus the explicit guard that
 * keeps a stored `person` record from being read as an invoice.
 */
function renderContentFor(
  def: DeliverableDef,
  brand: MockBrand,
  customization: SavedCardCustomization | null | undefined,
): DeliverableContent | undefined {
  return contentFromCustomization(
    customization,
    contentKindForTemplateType(def.templateType),
    brand,
  );
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
