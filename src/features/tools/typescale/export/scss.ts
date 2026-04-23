import type { SemanticRole, Typescale } from '@/shared/types/typescale';
import { cssFallback, cssString } from './_escape';

export function serializeScss(t: Typescale): string {
  const lines: string[] = [];
  lines.push(`$font-heading: "${cssString(t.fonts.heading.family)}", ${cssFallback(t.fonts.heading.fallback)};`);
  lines.push(`$font-body: "${cssString(t.fonts.body.family)}", ${cssFallback(t.fonts.body.fallback)};`);
  if (t.fonts.mono) lines.push(`$font-mono: "${cssString(t.fonts.mono.family)}", ${cssFallback(t.fonts.mono.fallback)};`);
  lines.push('');
  lines.push('$typescale: (');
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    lines.push(`  ${surface.key}: (`);
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const size = step.fluid?.clamp ?? `${step.sizePx}px`;
      lines.push(
        `    ${role}: ( size: ${size}, line-height: ${step.lineHeight}, letter-spacing: ${step.letterSpacingEm}em, weight: ${entry.weight ?? step.weight} ),`,
      );
    }
    lines.push('  ),');
  }
  lines.push(');');
  return lines.join('\n');
}
