import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeTailwindV3(t: Typescale): string {
  const fontSizes: string[] = [];
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const size = step.fluid?.clamp ?? `${step.sizePx}px`;
      fontSizes.push(
        `        '${surface.key}-${role}': ['${size}', { lineHeight: '${step.lineHeight}', letterSpacing: '${step.letterSpacingEm}em', fontWeight: '${entry.weight ?? step.weight}' }],`,
      );
    }
  }
  return `/** Paste into tailwind.config.(js|ts) */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        heading: ['"${t.fonts.heading.family}"', ${quoteList(t.fonts.heading.fallback)}],
        body:    ['"${t.fonts.body.family}"', ${quoteList(t.fonts.body.fallback)}],${t.fonts.mono ? `
        mono:    ['"${t.fonts.mono.family}"', ${quoteList(t.fonts.mono.fallback)}],` : ''}
      },
      fontSize: {
${fontSizes.join('\n')}
      },
    },
  },
};`;
}

function quoteList(fallback: string): string {
  return fallback.split(',').map(s => `'${s.trim()}'`).join(', ');
}
