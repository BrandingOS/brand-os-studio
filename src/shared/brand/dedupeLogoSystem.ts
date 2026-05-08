// dedupeLogoSystem — clean a brand's logo system so each role's URL is
// unique. Several seed brands and user-imported brands had every
// non-primary role pointing at the SAME asset URL as primary (because
// the brand owner only had one mark). Downstream UIs were left to
// filter the duplicates at display, which violates the contract the
// user articulated: "even in the database itself, not just in the
// frontend filter."
//
// What gets dropped: any role whose URL matches a higher-priority
// role's URL. Priority order is the same as `LogoSystem`'s field
// declaration: primary > secondary > wordmark > iconmark > black > white.
// Roles with no URL are left untouched.
//
// What gets kept: clearSpace, minSize, usage rules, and the
// description/usage prose on the surviving role entries — these are
// the brand-author intent and shouldn't be lost just because two
// roles happened to share an asset.
//
// Pure function — does not mutate the input.

import type { LogoSystem, LogoVariant } from '@/shared/types/brand';
import type { LogoSystemRefs, LogoRef } from '@/shared/types/brandAssets';

type LegacyRoleKey =
  | 'primary'
  | 'secondary'
  | 'wordmark'
  | 'iconmark'
  | 'blackVersion'
  | 'whiteVersion';

const ROLE_ORDER: ReadonlyArray<LegacyRoleKey> = [
  'primary',
  'secondary',
  'wordmark',
  'iconmark',
  'blackVersion',
  'whiteVersion',
];

export function dedupeLogoSystem(
  system: LogoSystem | undefined,
): LogoSystem | undefined {
  if (!system) return system;

  const seen = new Set<string>();
  const out: LogoSystem = {
    primary: system.primary,
    clearSpace: system.clearSpace,
    minSize: system.minSize,
    usage: system.usage,
  };

  for (const role of ROLE_ORDER) {
    const variant: LogoVariant | undefined = system[role];
    if (!variant?.url) {
      // Preserve unset entries unchanged. Nothing to dedupe.
      if (variant && role !== 'primary') (out as Record<string, LogoVariant>)[role] = variant;
      continue;
    }
    if (seen.has(variant.url)) {
      // Duplicate URL — drop this role from the output. The earlier
      // role with the same URL wins.
      continue;
    }
    seen.add(variant.url);
    if (role !== 'primary') (out as Record<string, LogoVariant>)[role] = variant;
  }

  return out;
}

/**
 * v3 dedupe — strips a non-primary `LogoRef` whose `assetId` matches a
 * higher-priority role's id. Same intent as `dedupeLogoSystem` but
 * operates on the post-migration `LogoSystemRefs` shape that the v3
 * brand record carries on `brand.logoSystem`.
 *
 * Priority order: primary > secondary > wordmark > iconmark > mono.black >
 * mono.white > horizontal > stacked.
 *
 * Pure — does not mutate the input.
 */
export function dedupeLogoSystemRefs(
  refs: LogoSystemRefs | undefined,
): LogoSystemRefs | undefined {
  if (!refs) return refs;

  const seenIds = new Set<string>();
  const keep = <K extends LogoRef | undefined>(ref: K): K => {
    if (!ref?.assetId) return ref;
    if (seenIds.has(ref.assetId)) return undefined as K;
    seenIds.add(ref.assetId);
    return ref;
  };

  const primary = keep(refs.primary);
  const secondary = keep(refs.secondary);
  const wordmark = keep(refs.wordmark);
  const iconmark = keep(refs.iconmark);
  const monoBlack = keep(refs.mono?.black);
  const monoWhite = keep(refs.mono?.white);
  const horizontal = keep(refs.orientations?.horizontal);
  const stacked = keep(refs.orientations?.stacked);

  return {
    ...refs,
    primary,
    secondary,
    wordmark,
    iconmark,
    mono:
      monoBlack || monoWhite
        ? { black: monoBlack, white: monoWhite }
        : undefined,
    orientations:
      horizontal || stacked
        ? { horizontal, stacked }
        : refs.orientations,
  };
}
