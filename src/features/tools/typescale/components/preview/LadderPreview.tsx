// LadderPreview.tsx
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

export function LadderPreview({ draft, activeSurface }: Props) {
  const surface = draft.surfaces[activeSurface];
  return (
    <div className="space-y-2 rounded-lg border p-4">
      {[...surface.steps].sort((a,b)=>b.index-a.index).map(s => (
        <div key={s.id} className="flex items-baseline gap-3 border-b pb-2 last:border-none">
          <span className="w-12 shrink-0 text-xs text-muted-foreground">{s.id}</span>
          <span
            style={{
              fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`,
              fontSize: s.fluid?.clamp ?? `${s.sizePx}px`,
              lineHeight: s.lineHeight,
              letterSpacing: `${s.letterSpacingEm}em`,
              fontWeight: s.weight,
            }}
          >Quick brown fox</span>
          <span className="ml-auto text-xs text-muted-foreground">{s.sizePx}px · {s.lineHeight} · {s.letterSpacingEm}em · {s.weight}</span>
        </div>
      ))}
    </div>
  );
}
