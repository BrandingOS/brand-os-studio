import type { ScaleSurface, SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeCss(t: Typescale): string {
  const lines: string[] = [':root {'];
  lines.push(`  --font-heading: "${t.fonts.heading.family}", ${t.fonts.heading.fallback};`);
  lines.push(`  --font-body: "${t.fonts.body.family}", ${t.fonts.body.fallback};`);
  if (t.fonts.mono) {
    lines.push(`  --font-mono: "${t.fonts.mono.family}", ${t.fonts.mono.fallback};`);
  }
  for (const surface of Object.values(t.surfaces)) emitSurface(lines, surface);
  lines.push('}');
  return lines.join('\n');
}

function emitSurface(lines: string[], surface: ScaleSurface) {
  const byId = new Map(surface.steps.map(s => [s.id, s]));
  for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, NonNullable<ReturnType<typeof Object.entries>>[number][1]][]) {
    if (!entry) continue;
    const step = byId.get(entry.stepId);
    if (!step) continue;
    const size = step.fluid?.clamp ?? `${step.sizePx}px`;
    lines.push(`  --text-${surface.key}-${role}: ${size};`);
    lines.push(`  --leading-${surface.key}-${role}: ${step.lineHeight};`);
    lines.push(`  --tracking-${surface.key}-${role}: ${step.letterSpacingEm}em;`);
    lines.push(`  --weight-${surface.key}-${role}: ${entry.weight ?? step.weight};`);
  }
}
