/**
 * The only module in onboarding that promotes anything.
 *
 * Concentrating promotion here is what makes the per-value rule checkable in
 * one place instead of trusted across a dozen call sites:
 *
 *   - Accepting a value promotes exactly that value.
 *   - Editing a value writes it and then promotes it — a human write alone
 *     records `provisional`, so the promotion is what makes an edit count as a
 *     decision.
 *   - "Looks right" on a section is a LOOP over the per-value act. It produces
 *     the identical record and introduces no section-level authority.
 *   - Reading is never accepting. Nothing here is reachable from a render path.
 *   - `official` is unreachable: the target is hard-coded to `confirmed`, and
 *     the signature offers no way to ask for anything else.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { HumanActor } from '@/domain/brand/coreMeta';
import { promoteCoreValue } from '@/application/brand/promoteCoreValue';
import { applyProposals } from './applyProposals';

/**
 * Confirm one value.
 *
 * No adoption service is passed, deliberately: `promoteCoreValue` only records
 * a Kit adoption when the target is `official`, and onboarding never adopts
 * (FR-030). Passing one would be an invitation to widen the target later.
 */
export async function acceptProposal(
  repo: BrandRepository,
  brandId: string,
  path: CoreFieldPath,
  actor: HumanActor,
): Promise<void> {
  await promoteCoreValue(repo, brandId, path, 'confirmed', actor);
}

/**
 * Confirm every value in a section.
 *
 * Sequential rather than concurrent: each op loads, mutates and saves the whole
 * brand, so running them in parallel would have them overwrite one another —
 * the last save would win and the rest of the promotions would vanish.
 */
export async function acceptAll(
  repo: BrandRepository,
  brandId: string,
  paths: CoreFieldPath[],
  actor: HumanActor,
): Promise<void> {
  for (const path of paths) {
    await acceptProposal(repo, brandId, path, actor);
  }
}

/**
 * There is deliberately NO un-accept here.
 *
 * `demoteCoreValue` floors at `confirmed` for anything already confirmed —
 * 001's rule that un-adopting from the Kit is not the same act as un-deciding.
 * That rule is right for the Kit and it means a confirmation cannot be walked
 * back to `suggested` through the canonical ops.
 *
 * Rather than reach around it, onboarding simply does not offer undo: a value
 * the user confirmed stays confirmed, and changing their mind is an edit (which
 * changes the value and keeps it confirmed) or a later change in Setup. An
 * affordance that silently failed to lower the authority would be worse than
 * no affordance at all.
 */

/**
 * Change a value and confirm it in one act.
 *
 * Written as the user (so provenance records that a human supplied this
 * wording) and then promoted (because a human write alone lands at
 * `provisional`, not `confirmed`).
 */
export async function editValue(
  repo: BrandRepository,
  brandId: string,
  path: CoreFieldPath,
  value: unknown,
  actor: HumanActor,
): Promise<void> {
  await editValues(repo, brandId, [{ path, value }], actor);
}

/**
 * Change several values as ONE act.
 *
 * A palette is one decision, not three. Writing primary, secondary and the
 * neutrals through three separate `editValue` calls means three load-mutate-save
 * cycles against the same record, and the middle one reads what the first wrote
 * only because they happen to be awaited in order — a fragile way to save a
 * single edit. `applyProposals` already batches by the op that owns each path,
 * so handing it the whole set is both correct and one round trip per subsystem.
 *
 * The promotion still happens per value, through the same `acceptAll` loop, so
 * this introduces no group authority: it is the identical record, written once.
 */
export async function editValues(
  repo: BrandRepository,
  brandId: string,
  values: ReadonlyArray<{ path: CoreFieldPath; value: unknown }>,
  actor: HumanActor,
): Promise<void> {
  if (!values.length) return;
  // Shares `applyProposals` rather than duplicating its op-batching, so the
  // edit path cannot drift from the suggestion path in how it shapes a colour
  // or a typeface. Only the actor and provenance differ.
  const report = await applyProposals(
    repo,
    brandId,
    values.map(({ path, value }) => ({
      corePath: path,
      value,
      provenance: 'inferred' as const,
      evidence: 'you',
    })),
    { actor, provenance: 'user-entered' },
  );
  if (report.failed.length) throw new Error(report.failed[0].reason);

  // The write alone records `provisional`. This is what makes an edit count as
  // a decision (FR-025).
  await acceptAll(repo, brandId, report.applied, actor);
}
