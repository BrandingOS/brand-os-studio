import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeTailwindV4(t: Typescale): string {
  const lines: string[] = ['@theme {'];
  lines.push(`  --font-heading: "${t.fonts.heading.family}", ${t.fonts.heading.fallback};`);
  lines.push(`  --font-body: "${t.fonts.body.family}", ${t.fonts.body.fallback};`);
  if (t.fonts.mono) lines.push(`  --font-mono: "${t.fonts.mono.family}", ${t.fonts.mono.fallback};`);
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const size = step.fluid?.clamp ?? `${step.sizePx}px`;
      const key = `${surface.key}-${role}`;
      lines.push(`  --text-${key}: ${size};`);
      lines.push(`  --text-${key}--line-height: ${step.lineHeight};`);
      lines.push(`  --text-${key}--letter-spacing: ${step.letterSpacingEm}em;`);
      lines.push(`  --text-${key}--font-weight: ${entry.weight ?? step.weight};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}
