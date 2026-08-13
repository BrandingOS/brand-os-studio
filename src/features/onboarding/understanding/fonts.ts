/**
 * Font families out of supplied material.
 *
 * A thin adapter over the proven grouping utility: five weights of one typeface
 * are ONE typeface, so the second family must come from a genuinely different
 * one and the recorded name is the family, not "Acme-Bold.ttf".
 */
import { groupFontAssets } from '@/shared/upload/fontFamily';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';

export function groupFontFamilies(items: OnboardingAsset[]): Array<{ family: string; source: string }> {
  const fonts = items.filter((a) => a.kind === 'font' && a.name.trim());
  return groupFontAssets(fonts).map((g) => ({
    family: g.family,
    // Named in the user's terms — the file they gave us, not a classifier.
    source: g.assets[0]?.name ?? 'your files',
  }));
}
