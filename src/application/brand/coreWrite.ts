/**
 * Shared plumbing for recording WHO wrote a Core value and WHERE it came from.
 *
 * Every canonical write op takes an optional trailing `CoreWriteOptions`. It is
 * optional on purpose: making it required would have meant editing every
 * existing call site in the same change that introduced the concept, which is
 * the kind of blast radius that turns an evolution into a rewrite. Call sites
 * adopt it as they are migrated.
 *
 * The default actor is a HUMAN, which is accurate rather than lax: every
 * current caller of these ops is a direct user action in a UI surface (Setup,
 * Brand Board, editor tools). And it cannot be used to launder an AI write into
 * brand truth, because ordinary writes never reach Confirmed or Official no
 * matter who performs them — only `promoteCoreValue` does, and it takes an
 * explicit human actor with no default.
 */
import {
  recordCoreWrite,
  type Actor,
  type HumanActor,
  type Provenance,
} from '@/domain/brand/coreMeta';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { CanonicalBrand } from '@/domain/brand';

/**
 * Stand-in for call sites that have not yet been given the acting user. Not a
 * placeholder to leave lying around: as auth-aware surfaces pass a real user
 * id, this disappears from the write path.
 */
export const UNATTRIBUTED_ACTOR: HumanActor = { kind: 'human', userId: 'unattributed' };

export interface CoreWriteOptions {
  actor?: Actor;
  /**
   * Defaults from the actor: a human writes `user-entered`, the system writes
   * `ai-suggested`. Pass explicitly for `inferred` (derived from evidence) or
   * `imported` (migration).
   */
  provenance?: Provenance;
}

export function resolveActor(opts?: CoreWriteOptions): Actor {
  return opts?.actor ?? UNATTRIBUTED_ACTOR;
}

export function resolveProvenance(opts?: CoreWriteOptions): Provenance {
  if (opts?.provenance) return opts.provenance;
  return resolveActor(opts).kind === 'human' ? 'user-entered' : 'ai-suggested';
}

/**
 * Stamps metadata for each path this write touched. Pure — returns a new brand;
 * the caller still validates and persists.
 */
export function withCoreWrites(
  brand: CanonicalBrand,
  paths: readonly CoreFieldPath[],
  opts?: CoreWriteOptions,
): CanonicalBrand {
  if (!paths.length) return brand;
  const actor = resolveActor(opts);
  const provenance = resolveProvenance(opts);
  const now = new Date().toISOString();

  let meta = brand.identityMeta;
  for (const path of paths) {
    meta = recordCoreWrite(meta, path, actor, provenance, now);
  }
  return { ...brand, identityMeta: meta };
}
