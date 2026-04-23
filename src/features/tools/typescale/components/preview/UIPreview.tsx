// UIPreview.tsx
import type { Typescale, SurfaceKey, SemanticRole } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

export function UIPreview({ draft, activeSurface }: Props) {
  const surface = draft.surfaces[activeSurface];
  const size = (role: SemanticRole): string | undefined => {
    const entry = surface.semantic[role]; if (!entry) return undefined;
    const step = surface.steps.find(s => s.id === entry.stepId); if (!step) return undefined;
    return step.fluid?.clamp ?? `${step.sizePx}px`;
  };
  return (
    <div className="ts-preview-card">
      <div
        style={{
          fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`,
          fontSize: size('h1'),
          color: 'var(--text-primary)',
        }}
      >
        Dashboard
      </div>
      <div
        className="ts-ui-metric-label"
        style={{
          fontFamily: `"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`,
          fontSize: size('body'),
          marginTop: 4,
        }}
      >
        Revenue over the last 30 days
      </div>
      <div
        style={{
          marginTop: 28,
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}
      >
        {['Sessions', 'Conversions', 'Revenue'].map((label) => (
          <div key={label} className="ts-ui-card">
            <div
              className="ts-ui-metric-label"
              style={{
                fontFamily: `"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`,
                fontSize: size('caption'),
              }}
            >
              {label}
            </div>
            <div
              className="ts-ui-metric-value"
              style={{
                fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`,
                fontSize: size('h3'),
              }}
            >
              12,840
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
