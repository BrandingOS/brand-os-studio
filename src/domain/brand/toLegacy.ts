/**
 * CanonicalBrand → legacy Brand patch (Stage 2A adapter boundary, used by the
 * Stage 2B write path).
 *
 * Produces a `Partial<Brand>` that writes the canonical identity back into the
 * legacy shape CONSISTENTLY across all representations a not-yet-migrated
 * consumer might read (v3 fields + legacy scalars), so nothing sees stale data
 * during the transition. It deliberately does NOT write the `guidelines.*`
 * mirror: the mirror is being retired as a source of truth, and not writing it
 * is what prevents it from ever drifting ahead of the canonical value again.
 */
import type { Brand } from '@/shared/types/brand';
import type { CanonicalBrand } from './identity';

export function toLegacyBrandPatch(c: CanonicalBrand): Partial<Brand> {
  const { colors, logos, typography, strategy, voice } = c.identity;

  const patch: Partial<Brand> = {
    name: c.name,

    // Canonical identity blob — the durable home (migration 013 `identity`
    // column for authed users; the localStorage snapshot for guests) for the
    // fields with NO legacy column: accent/neutrals, numeric font weights, rich
    // voice. `fromLegacyBrand` overlays exactly those from here on read. Written
    // one-way (canonical → legacy); nothing reads it as a competing authority.
    identity: c.identity,
    identitySchemaVersion: c.identitySchemaVersion,

    // Colors — write BOTH the scalar and the v3 token so every consumer agrees.
    primaryColor: colors.primary.hex,
    secondaryColor: colors.secondary?.hex,
    accentColor: colors.accent?.hex,
    neutrals: colors.neutrals?.map((n) => n.hex),
    colorSystem: colors,

    // Logos — v3 asset-ref system is authoritative.
    logoSystem: logos,

    // Typography — scalar families + v3 tokens.
    fonts: {
      primary: typography.primary.family,
      secondary: typography.secondary?.family,
    },
    typography,

    // Strategy — the legacy scalar is the mission string.
    strategy: strategy.mission,

    // Voice — the legacy scalar consumers read is `tone`.
    tone: voice.tone,

    isPublic: c.isPublic,
    publicUrl: c.publicUrl,
  };

  // Omit undefined values so projecting a change to one subsystem (e.g. a color
  // save) never wipes an unrelated legacy field (tone / neutrals / secondaryColor)
  // when the canonical brand simply doesn't carry it. Callers that merge this patch
  // into store state must not receive `key: undefined`.
  for (const k of Object.keys(patch) as (keyof Partial<Brand>)[]) {
    if (patch[k] === undefined) delete patch[k];
  }

  return patch;
}
