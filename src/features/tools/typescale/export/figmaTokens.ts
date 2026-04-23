import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeFigmaTokens(t: Typescale): string {
  const out: any = { global: {} };
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    const leaf: any = {};
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const font = entry.font === 'mono' ? t.fonts.mono?.family : entry.font === 'body' ? t.fonts.body.family : t.fonts.heading.family;
      leaf[role] = {
        type: 'typography',
        value: {
          fontFamily: font,
          fontWeight: `${entry.weight ?? step.weight}`,
          fontSize: step.fluid?.clamp ?? `${step.sizePx}px`,
          lineHeight: `${step.lineHeight}`,
          letterSpacing: `${Math.round(step.letterSpacingEm * 10000) / 100}%`,
          textCase: entry.transform === 'uppercase' ? 'uppercase' : entry.transform === 'lowercase' ? 'lowercase' : 'none',
        },
      };
    }
    out.global[surface.key] = leaf;
  }
  return JSON.stringify(out, null, 2);
}
