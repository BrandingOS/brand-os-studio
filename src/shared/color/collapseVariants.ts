import type { LogoVariant } from './brandRules';

export interface CollapsedVariantGroup {
  fingerprint: string;
  representative: LogoVariant;
  variants: LogoVariant[];
  backgrounds: { id: string; label: string; color: string; contrastScore: number }[];
}

/**
 * Groups visually-identical logo variants (same image + filter) into
 * collapsed groups. Each group shows one logo with multiple background options.
 */
export function collapseVariants(variants: LogoVariant[]): CollapsedVariantGroup[] {
  const groups = new Map<string, LogoVariant[]>();

  for (const v of variants) {
    const key = v.visualFingerprint || `${v.logoSrc}|${v.logoFilter ?? 'none'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  return Array.from(groups.entries()).map(([fingerprint, members]) => {
    // Sort by priority (lower = first), pick first as representative
    const sorted = [...members].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    const representative = sorted[0];

    return {
      fingerprint,
      representative,
      variants: sorted,
      backgrounds: sorted.map(v => ({
        id: v.id,
        label: v.name,
        color: v.bgColor,
        contrastScore: v.contrastScore,
      })),
    };
  });
}
