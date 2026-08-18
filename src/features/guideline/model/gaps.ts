/**
 * Brand values the guideline leans on hardest, and whether this brand has them.
 *
 * Advisory, never a gate. Every page renders without these — it renders with a
 * lettermark instead of a logo, a system typeface instead of the brand's, a
 * generated line instead of the mission. Saying so before the build is more
 * useful than discovering it on page 3, and Setup is where the fix lives.
 */
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import type { Brand } from '@/shared/types/brand';

export function findGaps(brand: Brand): string[] {
  const gaps: string[] = [];
  // Checked against both extremes: a brand whose only mark is white has no
  // readable variant on white, and vice versa. Either one counts as having a logo.
  if (!pickLogoOnBackground(brand, '#ffffff') && !pickLogoOnBackground(brand, '#000000')) {
    gaps.push('a logo');
  }
  if (!brand.fonts?.primary) gaps.push('a typeface');
  if (!brand.guidelines?.strategy?.mission) gaps.push('a mission');
  return gaps;
}
