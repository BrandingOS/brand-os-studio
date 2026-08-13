/**
 * Logo family resolver — "who is the Primary" is a RELATIVE decision.
 *
 * Uploads classify one by one, so whichever finishes first grabs the
 * Primary slot even when it's just the icon of the family (a dots mark
 * beat the full lockup to it — 2026-08-04). Per-image classification can
 * never fix that; only comparing the family can. Once a better candidate
 * lands, the auto-placed holders are swapped.
 *
 * Only AUTO-placed assets are ever moved: an asset whose current slot is
 * exactly what the router gave it. The moment the user drags a logo, its
 * slot no longer matches the auto map and it becomes untouchable.
 */
import type { LogoSlot, OnboardingAsset } from './intakeTypes';

/** Primary-worthiness by the classifier's slot hint. Lockups
 *  (primary/horizontal/vertical) outrank unhinted uploads (often a flat
 *  lockup export the model couldn't read), which outrank wordmarks, which
 *  outrank bare icon marks. */
const PRIMARY_RANK: Partial<Record<LogoSlot, number>> = {
  primary: 5,
  horizontal: 4,
  vertical: 4,
  light: 3,
  dark: 3,
  wordmark: 2,
  mark: 1,
};

export function primaryRank(aiLogoSlot: LogoSlot | null | undefined): number {
  return (aiLogoSlot && PRIMARY_RANK[aiLogoSlot]) || 3;
}

export interface PrimarySwapPlan {
  promoteId: string;
  demoteId: string;
  demoteTo: LogoSlot;
}

type FamilyAsset = Pick<OnboardingAsset, 'id' | 'logoSlot' | 'aiLogoSlot'>;

/** Swap the auto-placed Primary with a strictly better auto-placed
 *  candidate, if one exists. The demoted logo goes to its own hinted slot
 *  when that slot is free (or being vacated), else to the promoted
 *  asset's old slot. Returns null when there is nothing to fix. */
export function planPrimarySwap(
  assets: FamilyAsset[],
  autoSlots: ReadonlyMap<string, LogoSlot>,
): PrimarySwapPlan | null {
  const isAuto = (a: FamilyAsset) =>
    a.logoSlot != null && autoSlots.get(a.id) === a.logoSlot;

  const holder = assets.find((a) => a.logoSlot === 'primary');
  if (!holder || !isAuto(holder)) return null;

  let best: FamilyAsset = holder;
  for (const a of assets) {
    if (a.id === holder.id || !isAuto(a)) continue;
    if (primaryRank(a.aiLogoSlot) > primaryRank(best.aiLogoSlot)) best = a;
  }
  if (best.id === holder.id) return null;

  const takenByOthers = new Set(
    assets
      .filter((a) => a.logoSlot && a.id !== holder.id && a.id !== best.id)
      .map((a) => a.logoSlot as LogoSlot),
  );
  const hint = holder.aiLogoSlot ?? undefined;
  const demoteTo =
    hint && hint !== 'primary' && !takenByOthers.has(hint)
      ? hint
      : (best.logoSlot as LogoSlot);
  return { promoteId: best.id, demoteId: holder.id, demoteTo };
}
