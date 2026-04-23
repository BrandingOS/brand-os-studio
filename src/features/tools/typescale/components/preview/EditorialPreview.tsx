// EditorialPreview.tsx
import type { CSSProperties } from 'react';
import type { Typescale, SurfaceKey, SemanticRole } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

function styleFor(draft: Typescale, surfaceKey: SurfaceKey, role: SemanticRole): CSSProperties | undefined {
  const surface = draft.surfaces[surfaceKey];
  const entry = surface.semantic[role];
  if (!entry) return undefined;
  const step = surface.steps.find(s => s.id === entry.stepId);
  if (!step) return undefined;
  const font = entry.font === 'mono'
    ? draft.fonts.mono
    : entry.font === 'body' ? draft.fonts.body : draft.fonts.heading;
  if (!font) return undefined;
  return {
    fontFamily: `"${font.family}", ${font.fallback}`,
    fontSize: step.fluid?.clamp ?? `${step.sizePx}px`,
    lineHeight: step.lineHeight,
    letterSpacing: `${step.letterSpacingEm}em`,
    fontWeight: entry.weight ?? step.weight,
    textTransform: entry.transform === 'uppercase' ? 'uppercase' : entry.transform === 'lowercase' ? 'lowercase' : 'none',
    margin: 0,
  };
}

export function EditorialPreview({ draft, activeSurface }: Props) {
  return (
    <article
      className="ts-preview-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}
    >
      <h1 style={styleFor(draft, activeSurface, 'h1')}>A typographic system for your brand</h1>
      <h2 style={styleFor(draft, activeSurface, 'h2')}>Set the rhythm, everywhere</h2>
      <p style={styleFor(draft, activeSurface, 'body')}>
        BrandOS turns one typographic decision into a system — for web, UI, presentations, and social
        designs. The same pair, tuned per medium, exported in every format you need.
      </p>
      <h3 style={styleFor(draft, activeSurface, 'h3')}>How it works</h3>
      <p style={styleFor(draft, activeSurface, 'body')}>
        Pick a pair, tune base and ratio per surface, let the engine handle leading and tracking.
        Drop the export into your codebase or Figma and you're done.
      </p>
      <blockquote
        style={{
          ...styleFor(draft, activeSurface, 'bodyLg'),
          borderLeft: '3px solid var(--border-strong)',
          paddingLeft: 16,
          color: 'var(--text-secondary)',
        }}
      >
        "Typography is what language looks like." — Ellen Lupton
      </blockquote>
      <p style={{ ...styleFor(draft, activeSurface, 'caption'), color: 'var(--text-muted)' }}>
        Caption: read the small print.
      </p>
    </article>
  );
}
