import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeW3c(t: Typescale): string {
  const out: any = { typescale: {} };
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    const leaf: any = {};
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const font = entry.font === 'mono' ? t.fonts.mono?.family : entry.font === 'body' ? t.fonts.body.family : t.fonts.heading.family;
      leaf[role] = {
        $type: 'typography',
        $value: {
          fontFamily: font,
          fontSize: step.fluid?.clamp ?? `${step.sizePx}px`,
          fontWeight: entry.weight ?? step.weight,
          lineHeight: step.lineHeight,
          letterSpacing: `${step.letterSpacingEm}em`,
        },
      };
    }
    out.typescale[surface.key] = leaf;
  }
  return JSON.stringify(out, null, 2);
}
