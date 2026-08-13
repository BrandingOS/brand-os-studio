/**
 * Official Brand Kit — adoption records.
 *
 * The Official Brand Kit is what a brand OFFICIALLY owns and has adopted. It is
 * modelled as adoption records that REFERENCE a Core value, a Library item, or a
 * kit deliverable — never as copies of them. The referenced object remains the
 * one canonical object wherever it lives, so adopting cannot fork the truth and
 * un-adopting cannot delete material.
 *
 * Two rules are structural rather than conventional:
 *
 *  1. Nothing enters the Kit automatically. Not uploads, not generations, not
 *     approvals implied by usage. There is no trigger, no generation hook, and
 *     no default insert path — `adopt()` is the only writer.
 *
 *  2. Core values have exactly ONE entry point: `promoteCoreValue(…, 'official')`
 *     in the application layer, which delegates the row to this service. Calling
 *     `adopt({ targetKind: 'core_value' })` directly is rejected. Without that
 *     split there would be two ways to make a Core value official — precisely
 *     the competing-write-path problem the Brand System Foundation removes.
 *
 * See specs/001-brand-system-foundation/contracts/services.md §3.
 */

import type { HumanActor } from '@/domain/brand/coreMeta';

export type AdoptTargetKind = 'core_value' | 'library_item' | 'kit_deliverable';

/** The actor performing an adoption. Typed human-only (re-exported from the
 *  domain so there is ONE definition): a system/AI caller cannot construct it,
 *  so it cannot compile an adoption. Widening to teams/roles later means
 *  extending that type, not relaxing a runtime check. */
export type { HumanActor };

export interface KitAdoption {
  id: string;
  brandId: string;
  targetKind: AdoptTargetKind;
  /** CoreFieldPath | Library item id | `${DeliverableKey}::${itemId}` */
  targetRef: string;
  adoptedBy: string;
  /** ISO timestamp. */
  adoptedAt: string;
  note?: string;
}

export interface AdoptInput {
  brandId: string;
  targetKind: AdoptTargetKind;
  targetRef: string;
  actor: HumanActor;
  note?: string;
  /**
   * Set ONLY by `promoteCoreValue`, which owns the Core authority change and
   * delegates the adoption row here. It is the single sanctioned caller for
   * `targetKind: 'core_value'`; every other caller is rejected so a Core value
   * cannot be made official through a second path.
   */
  viaCorePromotion?: boolean;
}

export interface IKitAdoptionService {
  list(brandId: string): Promise<KitAdoption[]>;
  /**
   * Records an adoption. Stores a reference plus adoption metadata only.
   *
   * @throws when `targetKind === 'core_value'` without `viaCorePromotion` —
   *         use `promoteCoreValue` instead.
   */
  adopt(input: AdoptInput): Promise<KitAdoption>;
  /** Removes ONLY the adoption record. The referenced item is untouched. */
  unadopt(brandId: string, targetKind: AdoptTargetKind, targetRef: string): Promise<void>;
  isAdopted(brandId: string, targetKind: AdoptTargetKind, targetRef: string): Promise<boolean>;
}

/** Guard shared by every implementation so the rule cannot drift between them. */
export function assertAdoptable(input: AdoptInput): void {
  if (input.targetKind === 'core_value' && !input.viaCorePromotion) {
    throw new Error(
      '[KitAdoptionService] Core values cannot be adopted directly. Use ' +
        "promoteCoreValue(repo, brandId, path, 'official', actor) — it owns the " +
        'authority change and delegates the adoption record here.',
    );
  }
}
