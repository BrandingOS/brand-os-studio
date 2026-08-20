/**
 * The ONE place the Design editor reaches into Brand Kit's artwork.
 *
 * Those renderers (~6,400 lines of hand-tuned, absolutely-positioned
 * designs) are the reason this renderer exists at all: converting them
 * into Fabric layers would be lossy, enormous, and would throw away the
 * quality that makes them worth keeping.
 *
 * Confining the import to this file means the artwork can move to a
 * shared domain layer later — when a second family proves the need —
 * by editing one module rather than thirty.
 */
import type { ReactNode } from 'react';
import { renderCosmosTemplate } from '@/features/brand-kit/renderers';
import { variantsForCard } from '@/features/brand-kit/data/legacy-mapping';
import { DELIVERABLES } from '@/features/brand-kit/kit/registry';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { DeliverableContent } from '@/features/brandkit/content';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';

/**
 * A template id back to the design it names.
 *
 * Ids are globally unique across the library (`invoices-ext-4`,
 * `letterhead-ext-69`), so a scan across deliverables is unambiguous.
 * Brand-asset cards are skipped: they need a brand to enumerate and are
 * not deliverables.
 */
export function resolveTemplate(templateId: string): BrandKitTemplate | null {
  for (const deliverable of DELIVERABLES) {
    const variants = variantsForCard(deliverable.sectionKey, deliverable.label);
    const hit = variants.find((t) => t.id === templateId);
    if (hit) return hit;
  }
  return null;
}

export function renderArtwork(
  template: BrandKitTemplate,
  brand: Brand,
  mockBrand: MockBrand,
  content: DeliverableContent,
): ReactNode {
  return renderCosmosTemplate(template, brand, mockBrand, content);
}
