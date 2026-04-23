// LadderPreview.tsx
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

/**
 * LadderPreview — typography-poster view of every step in the active
 * surface. Alternating tinted rows let each size breathe without the
 * table feel of the old layout.
 */
export function LadderPreview({ draft, activeSurface }: Props) {
  const surface = draft.surfaces[activeSurface];
  const heading = draft.fonts.heading;
  return (
    <div className="ts-ladder">
      {[...surface.steps]
        .sort((a, b) => b.index - a.index)
        .map((s, i) => (
          <div
            key={s.id}
            className={`ts-ladder-row${i % 2 === 0 ? ' ts-ladder-row--alt' : ''}`}
          >
            <div
              className="ts-ladder-sample"
              style={{
                fontFamily: `"${heading.family}", ${heading.fallback}`,
                fontSize: s.fluid?.clamp ?? `${s.sizePx}px`,
                lineHeight: s.lineHeight,
                letterSpacing: `${s.letterSpacingEm}em`,
                fontWeight: s.weight,
              }}
            >
              The quick brown fox
            </div>
            <div className="ts-ladder-meta">
              <span className="ts-ladder-meta-id">{s.id}</span>
              <span className="ts-ladder-meta-size">{s.sizePx}px</span>
              <span className="ts-ladder-meta-rest">
                {s.lineHeight.toFixed(2)} · {s.weight}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
