/**
 * Existing kit approvals become Official Brand Kit adoptions.
 *
 * Before this feature, "approved" was a status on an item inside the kit's own
 * localStorage blob — private to the Brand Kit surface, invisible to anything
 * else, and carrying no record of who decided or when. Adoption records are the
 * product-wide answer to "what does this brand officially own?", so the
 * approvals that already exist belong there.
 *
 * Like the Library ingest, this is:
 *
 *  - **idempotent** — adoption is keyed on (brand, kind, ref) and the service
 *    treats a repeat as already-adopted, so re-running changes nothing;
 *  - **additive** — the kit blob is only READ. Approved items keep their
 *    status, so the Brand Kit surface behaves exactly as before and a rollback
 *    is "ignore the adoptions", not a restore;
 *  - **attributed** — each adoption records the brand owner and the item's
 *    original `approvedAt` where the kit captured one, rather than pretending
 *    the decision happened at migration time.
 */
import type { IKitAdoptionService } from '@/core/services/IKitAdoptionService';
import type { HumanActor } from '@/domain/brand/coreMeta';
import { getKitStateRepository } from './repository';
import { approvedItems } from './types';
import type { DeliverableKey } from './types';

export interface ApprovalMigrationReport {
  brandId: string;
  dryRun: boolean;
  /** `${DeliverableKey}::${itemId}` refs that are (or would be) adopted. */
  adopted: string[];
  alreadyAdopted: string[];
  /** No kit state stored for this brand — nothing to migrate. */
  noKitState: boolean;
}

/** The stable ref for an approved deliverable item. */
export function deliverableRef(key: DeliverableKey, itemId: string): string {
  return `${key}::${itemId}`;
}

export async function migrateApprovalsToAdoptions(
  brandId: string,
  adoptions: IKitAdoptionService,
  actor: HumanActor,
  opts: { dryRun?: boolean } = {},
): Promise<ApprovalMigrationReport> {
  const dryRun = opts.dryRun ?? false;
  const state = await getKitStateRepository().load(brandId);

  if (!state) {
    return { brandId, dryRun, adopted: [], alreadyAdopted: [], noKitState: true };
  }

  const adopted: string[] = [];
  const alreadyAdopted: string[] = [];

  for (const [key, record] of Object.entries(state.deliverables)) {
    for (const item of approvedItems(record)) {
      const ref = deliverableRef(key as DeliverableKey, item.id);

      if (await adoptions.isAdopted(brandId, 'kit_deliverable', ref)) {
        alreadyAdopted.push(ref);
        continue;
      }
      if (dryRun) {
        adopted.push(ref);
        continue;
      }

      await adoptions.adopt({
        brandId,
        targetKind: 'kit_deliverable',
        targetRef: ref,
        actor,
        // Attribute the decision to when it was actually made, where the kit
        // recorded it. A missing approvedAt just means the note is omitted —
        // better than inventing a timestamp.
        ...(item.approvedAt ? { note: `approved ${item.approvedAt}` } : {}),
      });
      adopted.push(ref);
    }
  }

  return { brandId, dryRun, adopted, alreadyAdopted, noKitState: false };
}
