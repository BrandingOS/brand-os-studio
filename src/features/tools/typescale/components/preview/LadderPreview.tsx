// LadderPreview.tsx
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

export function LadderPreview({ draft, activeSurface }: Props) {
  const surface = draft.surfaces[activeSurface];
  return (
    <div className="ts-preview-card ts-preview-card--tight">
      {[...surface.steps].sort((a, b) => b.index - a.index).map(s => (
        <div key={s.id} className="ts-ladder-row">
          <span className="ts-ladder-id">{s.id}</span>
          <span
            className="ts-ladder-sample"
            style={{
              fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`,
              fontSize: s.fluid?.clamp ?? `${s.sizePx}px`,
              lineHeight: s.lineHeight,
              letterSpacing: `${s.letterSpacingEm}em`,
              fontWeight: s.weight,
            }}
          >
            Quick brown fox
          </span>
          <span className="ts-ladder-meta">
            {s.sizePx}px · {s.lineHeight} · {s.letterSpacingEm}em · {s.weight}
          </span>
        </div>
      ))}
    </div>
  );
}
