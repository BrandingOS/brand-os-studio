/**
 * Application use-case: promote (or demote) a Brand Core value's authority.
 *
 * This is the ONLY path to Confirmed or Official. Everything else about the
 * Brand System Foundation is arrangement; this is the guarantee:
 *
 *   The system — including AI — may create and update Core values at Suggested
 *   or Provisional so a user can skip decisions and delegate brand building.
 *   Only an explicit action by an authorized human promotes a value to
 *   Confirmed or Official.
 *
 * The rule is enforced at the TYPE level: `actor` is `HumanActor`, so a system
 * caller cannot construct a valid call. That is deliberate — a runtime check can
 * be forgotten at one call site, a type cannot. Promotion also never rewrites
 * provenance, so a confirmed value still records that it began as an AI
 * suggestion.
 *
 * Reaching `official` additionally records an Official Brand Kit adoption. This
 * op owns the authority change and DELEGATES the adoption row to the adoption
 * service, so each datum keeps exactly one write authority: authority lives
 * here, the adoptions table is written only by that service. Without the split
 * there would be two ways to make a Core value official — the competing-write
 * -path problem this whole feature removes.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import {
  coreValueMeta,
  isAtLeast,
  recordCoreAuthorityChange,
  type Authority,
  type HumanActor,
} from '@/domain/brand/coreMeta';
import { isCoreFieldPath, type CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { IKitAdoptionService } from '@/core/services/IKitAdoptionService';

export interface PromoteOptions {
  /**
   * Supplied by callers that can reach the DI container. When present and the
   * target authority is `official`, the adoption row is written through it
   * BEFORE the authority change is persisted — if the adoption fails, the
   * promotion does not happen and the two cannot diverge.
   */
  adoptions?: IKitAdoptionService;
  note?: string;
}

function assertPath(path: string): asserts path is CoreFieldPath {
  if (!isCoreFieldPath(path)) {
    throw new Error(
      `[promoteCoreValue] "${path}" is not a Core field path. Add it to ` +
        'CORE_FIELD_PATHS first — the registry is closed on purpose.',
    );
  }
}

/**
 * Promote a Core value to Confirmed or Official.
 *
 * @param actor MUST be a human. A system/AI caller cannot satisfy this type.
 */
export async function promoteCoreValue(
  repo: BrandRepository,
  brandId: string,
  path: CoreFieldPath,
  to: Extract<Authority, 'confirmed' | 'official'>,
  actor: HumanActor,
  opts: PromoteOptions = {},
): Promise<CanonicalBrand> {
  assertPath(path);
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`promoteCoreValue: brand not found: ${brandId}`);

  if (to === 'official' && opts.adoptions) {
    // Adoption first: a failure here must leave the brand exactly as it was,
    // rather than an "official" value the Kit has no record of.
    await opts.adoptions.adopt({
      brandId,
      targetKind: 'core_value',
      targetRef: path,
      actor,
      note: opts.note,
      // The adoption service rejects direct core_value adoption; this op is its
      // sanctioned caller and passes the flag that says so.
      viaCorePromotion: true,
    });
  }

  const next: CanonicalBrand = {
    ...brand,
    identityMeta: recordCoreAuthorityChange(brand.identityMeta, path, to, actor),
  };
  assertCanonicalBrand(next);

  try {
    return await repo.save(next);
  } catch (saveError) {
    // Ordering alone only protects one direction. If the adoption landed and
    // the authority write then failed, the Kit would hold a core_value row for
    // a value that is not official — the divergence this op exists to prevent.
    // Undo the adoption so both sides return to their prior state.
    if (to === 'official' && opts.adoptions) {
      try {
        await opts.adoptions.unadopt(brandId, 'core_value', path);
      } catch {
        // Compensation failed too: report the ORIGINAL failure, but make the
        // orphaned adoption discoverable rather than silent.
        console.error(
          `[promoteCoreValue] Persist failed AND the compensating unadopt failed for ` +
            `${brandId}/${path}. An adoption row may exist without official authority.`,
        );
      }
    }
    throw saveError;
  }
}

/**
 * Lower a value's authority.
 *
 * Floors at `confirmed` when the value was already confirmed or official: a
 * human decided once, and un-adopting from the Official Kit is not the same act
 * as un-deciding. Dropping all the way to provisional would erase a human
 * decision as a side effect of a Kit edit.
 */
export async function demoteCoreValue(
  repo: BrandRepository,
  brandId: string,
  path: CoreFieldPath,
  to: Extract<Authority, 'provisional' | 'confirmed'>,
  actor: HumanActor,
  opts: PromoteOptions = {},
): Promise<CanonicalBrand> {
  assertPath(path);
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`demoteCoreValue: brand not found: ${brandId}`);

  const current = coreValueMeta(brand.identityMeta, path);
  const floor: Authority =
    to === 'provisional' && isAtLeast(current.authority, 'confirmed') ? 'confirmed' : to;

  let removedAdoption = false;
  if (isAtLeast(current.authority, 'official') && !isAtLeast(floor, 'official') && opts.adoptions) {
    await opts.adoptions.unadopt(brandId, 'core_value', path);
    removedAdoption = true;
  }

  const next: CanonicalBrand = {
    ...brand,
    identityMeta: recordCoreAuthorityChange(brand.identityMeta, path, floor, actor),
  };
  assertCanonicalBrand(next);

  try {
    return await repo.save(next);
  } catch (saveError) {
    // Mirror of the promote path: the row was already removed, so a failed
    // save would leave the value official with no adoption backing it.
    if (removedAdoption && opts.adoptions) {
      try {
        await opts.adoptions.adopt({
          brandId,
          targetKind: 'core_value',
          targetRef: path,
          actor,
          viaCorePromotion: true,
        });
      } catch {
        console.error(
          `[demoteCoreValue] Persist failed AND the compensating re-adopt failed for ` +
            `${brandId}/${path}. The value may remain official with no adoption record.`,
        );
      }
    }
    throw saveError;
  }
}
