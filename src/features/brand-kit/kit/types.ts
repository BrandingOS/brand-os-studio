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

/**
 * Who made this deliverable.
 *
 * The Kit is the brand's approved FINAL deliverables, and a user's own
 * finished business card — the one their printer actually produced — is as
 * final as anything BrandingOS generates. Both live here; which is which
 * must never be guessable, because "is this ours or theirs?" decides whether
 * regenerating is safe.
 *
 * Absent on every record written before uploads existed. Read it through
 * `itemOrigin`, never directly.
 */
export type KitItemOrigin = 'generated' | 'uploaded';

/** The file behind an uploaded deliverable. Absent on generated items. */
export type KitUpload = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Set when the bytes reached Supabase storage rather than a data URL. */
  storagePath?: string;
  uploadedAt: string;
};

/** `variantId` for an uploaded item, which renders from its file, not a template. */
export const UPLOADED_VARIANT_ID = '__uploaded__';

export type KitItem = {
  id: string;
  /** BrandKitTemplate id this item renders with. `UPLOADED_VARIANT_ID` when uploaded. */
  variantId: string;
  status: KitItemStatus;
  /** Per-item customization (content, colors, logo, font picks). */
  customization: SavedCardCustomization | null;
  createdAt: string;
  approvedAt?: string;
  /** Defaults to 'generated' when absent — see KitItemOrigin. */
  origin?: KitItemOrigin;
  /** Present only when origin is 'uploaded'. */
  upload?: KitUpload;
};

/** The one place that reads an item's provenance, so the default lives once. */
export function itemOrigin(item: KitItem): KitItemOrigin {
  return item.origin ?? 'generated';
}

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
  /**
   * Where this deliverable sits in the brand's folder tree — the SAME tree
   * Library and Designs use. Nullable and absent by default: a deliverable
   * that has never been filed lives at the root, which is what every existing
   * record means.
   */
  folderId?: string | null;
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
