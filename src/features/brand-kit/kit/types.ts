/**
 * Domain types for the Brand Kit deliverable lifecycle.
 *
 * A deliverable (e.g. `stationery::Business Card`) starts NOT CREATED.
 * Generation produces candidate items; the user reviews and approves
 * them into an owned collection with one primary item. Persisted state
 * stores only items + last error — the lifecycle status is DERIVED so
 * storage can never hold an inconsistent status/items pair. The
 * transient `generating` phase lives in the store's in-memory set.
 */
import type { SavedCardCustomization } from '../data/cardCustomizations';
import type { KitSectionKey } from '../components/BrandKitSidebar';

/** `${sectionKey}::${label}` — e.g. "stationery::Business Card". */
export type DeliverableKey = string;

export function deliverableKey(sectionKey: KitSectionKey, label: string): DeliverableKey {
  return `${sectionKey}::${label}`;
}

export type KitItemStatus = 'candidate' | 'approved' | 'archived';

export type KitItem = {
  id: string;
  /** BrandKitTemplate id this item renders with. */
  variantId: string;
  status: KitItemStatus;
  /** Per-item customization (content, colors, logo, font picks). */
  customization: SavedCardCustomization | null;
  createdAt: string;
  approvedAt?: string;
};

export type DeliverableRecord = {
  items: KitItem[];
  /** Among approved items; null when none approved. */
  primaryItemId: string | null;
  /** Last generation failure, cleared on retry. */
  error: string | null;
  /** Every variant id ever proposed/added — regenerate excludes these
   *  so "Show me more" walks further down the ranked library. */
  seenVariantIds: string[];
  updatedAt: string;
};

export type BrandKitState = {
  version: 1;
  deliverables: Record<DeliverableKey, DeliverableRecord>;
};

export type DeliverableStatus = 'not-created' | 'generating' | 'review' | 'approved';

export function emptyRecord(now: string): DeliverableRecord {
  return { items: [], primaryItemId: null, error: null, seenVariantIds: [], updatedAt: now };
}

export function emptyKitState(): BrandKitState {
  return { version: 1, deliverables: {} };
}

/** Lifecycle status derived from a record (see module doc). */
export function deriveStatus(
  record: DeliverableRecord | undefined,
  isGenerating: boolean,
): DeliverableStatus {
  if (isGenerating) return 'generating';
  if (!record) return 'not-created';
  if (record.items.some((i) => i.status === 'approved')) return 'approved';
  if (record.items.some((i) => i.status === 'candidate')) return 'review';
  return 'not-created';
}

export function approvedItems(record: DeliverableRecord | undefined): KitItem[] {
  return (record?.items ?? []).filter((i) => i.status === 'approved');
}

export function candidateItems(record: DeliverableRecord | undefined): KitItem[] {
  return (record?.items ?? []).filter((i) => i.status === 'candidate');
}

export function primaryItem(record: DeliverableRecord | undefined): KitItem | null {
  if (!record) return null;
  const approved = approvedItems(record);
  if (approved.length === 0) return null;
  return approved.find((i) => i.id === record.primaryItemId) ?? approved[0];
}
