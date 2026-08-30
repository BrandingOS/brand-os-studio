/**
 * The bridge between a Logos drilldown TILE and the variant it was drawn from.
 *
 * Its own module because it is the one thing both the page and the panel need
 * to agree on, and neither is a sensible home for the other's import.
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { logoCombosFor } from '../../data/recolorLogo';

/**
 * Which variant a Logos drilldown TILE was drawn from.
 *
 * The wall is the brand's own artwork first (one tile per uploaded logo),
 * then every mark × ground combination `logoCombosFor` emits, and the ids
 * are positional — `brand-asset-logo-ext-<n>` — so the mapping is index
 * arithmetic over exactly the two lists `legacy-mapping.ts` concatenates.
 * `sourceIndex`, never `logoIndex`: the latter is pinned to 0 on purpose so
 * the wall reads as one system.
 */
export function logoSourceForTemplate(brand: MockBrand, templateId: string): number | null {
  const match = /^brand-asset-logo-ext-(\d+)$/.exec(templateId);
  if (!match) return null;
  const at = Number(match[1]) - 1;
  if (!Number.isInteger(at) || at < 0) return null;
  const logos = brand.logos ?? [];
  if (at < logos.length) return at;
  const combo = logoCombosFor(brand)[at - logos.length];
  if (!combo) return null;
  return combo.sourceIndex >= 0 && combo.sourceIndex < logos.length ? combo.sourceIndex : null;
}
