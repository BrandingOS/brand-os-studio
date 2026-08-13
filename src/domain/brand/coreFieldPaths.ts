/**
 * The CLOSED registry of addressable Brand Core DNA values.
 *
 * Authority and provenance are stored in a sidecar map keyed by these paths
 * (see `coreMeta.ts`) rather than by wrapping each value in the identity tree.
 * The sidecar's one real risk is DRIFT — metadata pointing at a value that no
 * longer exists, or a value nobody can address. A closed registry plus the
 * completeness test in `__tests__/coreFieldPaths.test.ts` is what keeps the two
 * honest: a path must resolve against a fully-populated identity, and metadata
 * for anything outside this list is dropped on read.
 *
 * Adding a Core value means adding its path here FIRST, then the field on
 * `BrandIdentity`. The test fails loudly if the two disagree.
 */
import type { BrandIdentity } from './identity';

export const CORE_FIELD_PATHS = [
  // Colors
  'colors.primary',
  'colors.secondary',
  'colors.accent',
  'colors.neutrals',
  // Logos
  'logos.primary',
  'logos.secondary',
  'logos.wordmark',
  'logos.iconmark',
  'logos.mono.black',
  'logos.mono.white',
  'logos.orientations.horizontal',
  'logos.orientations.stacked',
  // Typography
  'typography.primary',
  'typography.secondary',
  'typography.accent',
  'typography.scale',
  // Strategy
  'strategy.mission',
  'strategy.vision',
  'strategy.values',
  'strategy.positioning',
  'strategy.personality',
  'strategy.targetAudience',
  // Voice
  'voice.tone',
  'voice.personality',
  'voice.doList',
  'voice.dontList',
  'voice.examples',
  // Visual style
  'visualStyle.descriptors',
  'visualStyle.cornerStyle',
  'visualStyle.density',
  'visualStyle.contrast',
  'visualStyle.imageryStyle',
  'visualStyle.motion',
  // Rules
  'rules.logo',
  'rules.color',
  'rules.type',
  'rules.voice',
  // Positioning
  'positioning.category',
  'positioning.differentiator',
  'positioning.audiences',
  'positioning.competitors',
] as const;

export type CoreFieldPath = (typeof CORE_FIELD_PATHS)[number];

const PATH_SET: ReadonlySet<string> = new Set(CORE_FIELD_PATHS);

export function isCoreFieldPath(value: unknown): value is CoreFieldPath {
  return typeof value === 'string' && PATH_SET.has(value);
}

/**
 * Walks a dotted path into an identity. Returns `undefined` for anything the
 * brand has not set — an unset Core value is normal, not an error (a user may
 * skip any decision and continue).
 */
export function readCoreValue(
  identity: BrandIdentity | undefined,
  path: CoreFieldPath,
): unknown {
  if (!identity) return undefined;
  let cursor: unknown = identity;
  for (const segment of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/** The Core subsystem a path belongs to — used for grouping in UI and reports. */
export function coreSubsystemOf(path: CoreFieldPath): string {
  return path.split('.')[0];
}
