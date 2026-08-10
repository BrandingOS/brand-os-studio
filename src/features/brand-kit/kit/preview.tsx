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

function renderContentFor(
  def: DeliverableDef,
  customization: SavedCardCustomization | null | undefined,
) {
  if (def.templateType !== 'business-cards' || !customization) return undefined;
  const o = customization.overrides;
  return {
    businessCard: {
      fullName: o.title,
      jobTitle: o.subtitle,
      email: o.email,
      phone: o.phone,
      website: o.website,
    },
  };
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
    renderContentFor(def, customization),
  ) as React.ReactElement | null;
}
