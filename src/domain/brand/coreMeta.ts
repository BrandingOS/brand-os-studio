/**
 * Brand Core DNA — authority and provenance.
 *
 * These are TWO INDEPENDENT DIMENSIONS, and keeping them independent is the
 * whole point:
 *
 *   authority  — how far the brand has ADOPTED a value
 *                suggested → provisional → confirmed → official
 *   provenance — where the value CAME FROM
 *                user-entered | ai-suggested | inferred | imported
 *
 * Collapsing them (the tempting "status: inferred | confirmed | official") loses
 * the sentence the product most needs to be able to say: *this palette was
 * AI-suggested AND the user confirmed it*. Provenance is a permanent record of
 * origin and never changes when a value is promoted.
 *
 * The rule that everything else protects: the system — including AI — may write
 * at any authority BELOW confirmed. Only an explicit action by an authorized
 * human promotes to confirmed or official. There is no time-based, usage-based,
 * or AI-driven promotion anywhere in this module.
 */
import { CORE_FIELD_PATHS, isCoreFieldPath, readCoreValue, type CoreFieldPath } from './coreFieldPaths';
import type { BrandIdentity } from './identity';

export type Authority = 'suggested' | 'provisional' | 'confirmed' | 'official';

export type Provenance = 'user-entered' | 'ai-suggested' | 'inferred' | 'imported';

/** Ranked weakest → strongest. Exported so ordering is defined in ONE place. */
export const AUTHORITY_ORDER: readonly Authority[] = [
  'suggested',
  'provisional',
  'confirmed',
  'official',
] as const;

/** The authorities a human action is required to reach. */
export const HUMAN_ONLY_AUTHORITIES: readonly Authority[] = ['confirmed', 'official'] as const;

export interface CoreValueMeta {
  authority: Authority;
  provenance: Provenance;
  /** User id for a human write, agent identifier for a system write. */
  setBy: string | null;
  /** ISO timestamp. */
  setAt: string;
  /** Set only when authority reached confirmed/official — always a human. */
  promotedBy?: string;
  promotedAt?: string;
}

export type IdentityMeta = Partial<Record<CoreFieldPath, CoreValueMeta>>;

/**
 * Who is performing a write.
 *
 * `system` covers AI suggestions, inference, and migrations alike — the thing
 * they have in common is that no human decided, which is exactly what the
 * promotion rule cares about. Widening to teams/roles later means extending
 * `HumanActor`, not relaxing this distinction.
 */
export type HumanActor = { kind: 'human'; userId: string };
export type SystemActor = { kind: 'system'; agent: string };
export type Actor = HumanActor | SystemActor;

/**
 * INV-4 — a value with no metadata entry.
 *
 * `provisional`/`imported` rather than `confirmed`: data that predates the
 * sidecar was set by a user in the old product, but we have no record of the
 * act, so claiming confirmation would be inventing provenance. Migration
 * backfill upgrades what it can actually evidence; everything else stays here.
 */
export const DEFAULT_CORE_VALUE_META: Readonly<CoreValueMeta> = Object.freeze({
  authority: 'provisional' as Authority,
  provenance: 'imported' as Provenance,
  setBy: null,
  setAt: '1970-01-01T00:00:00.000Z',
});

const AUTHORITY_SET: ReadonlySet<string> = new Set(AUTHORITY_ORDER);
const PROVENANCE_SET: ReadonlySet<string> = new Set([
  'user-entered',
  'ai-suggested',
  'inferred',
  'imported',
]);

/** INV-5 — authority comparison. */
export function isAtLeast(authority: Authority, min: Authority): boolean {
  return AUTHORITY_ORDER.indexOf(authority) >= AUTHORITY_ORDER.indexOf(min);
}

export function isHumanOnlyAuthority(a: Authority): boolean {
  return HUMAN_ONLY_AUTHORITIES.includes(a);
}

function isCoreValueMeta(v: unknown): v is CoreValueMeta {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.authority === 'string' &&
    AUTHORITY_SET.has(m.authority) &&
    typeof m.provenance === 'string' &&
    PROVENANCE_SET.has(m.provenance)
  );
}

/**
 * INV-1 — drop metadata for paths outside the registry, and anything that is
 * not a well-formed entry.
 *
 * Self-healing on read rather than throwing: a renamed or removed Core value
 * would otherwise make a brand permanently unloadable, and stale metadata is
 * inert — it describes nothing.
 */
export function sanitizeIdentityMeta(raw: unknown): IdentityMeta {
  if (!raw || typeof raw !== 'object') return {};
  const out: IdentityMeta = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isCoreFieldPath(key)) continue;
    if (!isCoreValueMeta(value)) continue;
    out[key] = {
      authority: value.authority,
      provenance: value.provenance,
      setBy: typeof value.setBy === 'string' ? value.setBy : null,
      setAt: typeof value.setAt === 'string' ? value.setAt : DEFAULT_CORE_VALUE_META.setAt,
      ...(typeof value.promotedBy === 'string' ? { promotedBy: value.promotedBy } : {}),
      ...(typeof value.promotedAt === 'string' ? { promotedAt: value.promotedAt } : {}),
    };
  }
  return out;
}

/** Reads a value's metadata. NEVER returns null — absent resolves to the default. */
export function coreValueMeta(
  meta: IdentityMeta | undefined,
  path: CoreFieldPath,
): CoreValueMeta {
  return meta?.[path] ?? { ...DEFAULT_CORE_VALUE_META };
}

/**
 * INV-3 — the guard every write path shares.
 *
 * A system actor reaching for confirmed/official is a PROGRAMMING error, not a
 * user-input error: it means a caller tried to launder an AI suggestion into
 * brand truth. It throws rather than silently downgrading, because a silent
 * downgrade would hide the bug and leave the caller believing it succeeded.
 */
export function assertActorMayReach(actor: Actor, authority: Authority): void {
  if (actor.kind === 'human') return;
  if (!isHumanOnlyAuthority(authority)) return;
  throw new Error(
    `[BrandCore] A system actor ("${actor.agent}") attempted to set authority ` +
      `"${authority}". Only an explicit action by an authorized human can promote a ` +
      'value to Confirmed or Official.',
  );
}

function actorId(actor: Actor): string {
  return actor.kind === 'human' ? actor.userId : actor.agent;
}

/**
 * Records a WRITE to a Core value (not a promotion — see `promoteCoreValue`).
 *
 * Two behaviors are deliberate:
 *  - A human editing a confirmed/official value KEEPS its authority. They
 *    already decided; changing the value is another decision of the same weight.
 *  - The system editing a confirmed/official value DEMOTES it to provisional.
 *    It must not silently overwrite settled truth and leave it looking settled;
 *    demoting surfaces that the value now needs a human's eyes again.
 */
export function recordCoreWrite(
  meta: IdentityMeta | undefined,
  path: CoreFieldPath,
  actor: Actor,
  provenance: Provenance,
  now: string = new Date().toISOString(),
): IdentityMeta {
  const current = coreValueMeta(meta, path);
  const settled = isAtLeast(current.authority, 'confirmed');

  let authority: Authority;
  if (actor.kind === 'human') {
    authority = settled ? current.authority : 'provisional';
  } else {
    authority = settled ? 'provisional' : current.authority === 'suggested' ? 'suggested' : 'provisional';
  }

  const next: CoreValueMeta = {
    authority,
    provenance,
    setBy: actorId(actor),
    setAt: now,
  };

  // Promotion stamps survive only while the value stays settled.
  if (isAtLeast(authority, 'confirmed') && current.promotedBy) {
    next.promotedBy = current.promotedBy;
    next.promotedAt = current.promotedAt;
  }

  return { ...(meta ?? {}), [path]: next };
}

/**
 * Applies a promotion or demotion. `promoteCoreValue` in the application layer
 * is the only caller; it owns the human-actor requirement at the type level.
 */
export function recordCoreAuthorityChange(
  meta: IdentityMeta | undefined,
  path: CoreFieldPath,
  to: Authority,
  actor: HumanActor,
  now: string = new Date().toISOString(),
): IdentityMeta {
  const current = coreValueMeta(meta, path);
  const next: CoreValueMeta = {
    // INV-2 — provenance is NOT rewritten by promotion.
    provenance: current.provenance,
    authority: to,
    setBy: current.setBy ?? actor.userId,
    setAt: current.setAt,
  };
  if (isAtLeast(to, 'confirmed')) {
    next.promotedBy = actor.userId;
    next.promotedAt = now;
  }
  return { ...(meta ?? {}), [path]: next };
}

/**
 * Progress, for DISPLAY ONLY.
 *
 * Nothing in the product may gate on this: an incomplete Core must never block
 * creation. It exists so a surface can show "12 of 40 confirmed" without any
 * code path being tempted to require completeness.
 */
export function coreCompleteness(
  identity: BrandIdentity | undefined,
  meta: IdentityMeta | undefined,
): { confirmed: number; set: number; total: number } {
  let confirmed = 0;
  let set = 0;
  for (const path of CORE_FIELD_PATHS) {
    const value = readCoreValue(identity, path);
    const present = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
    if (!present) continue;
    set += 1;
    if (isAtLeast(coreValueMeta(meta, path).authority, 'confirmed')) confirmed += 1;
  }
  return { confirmed, set, total: CORE_FIELD_PATHS.length };
}
