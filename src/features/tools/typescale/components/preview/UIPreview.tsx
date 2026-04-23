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
    <div className="rounded-lg border p-6 bg-background">
      <div style={{ fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`, fontSize: size('h1') }}>
        Dashboard
      </div>
      <div style={{ fontFamily: `"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`, fontSize: size('body') }} className="mt-2 text-muted-foreground">
        Revenue over the last 30 days
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {['Sessions','Conversions','Revenue'].map((label) => (
          <div key={label} className="rounded border p-3">
            <div style={{ fontFamily:`"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`, fontSize: size('caption') }} className="text-muted-foreground">{label}</div>
            <div style={{ fontFamily:`"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`, fontSize: size('h3') }}>12,840</div>
          </div>
        ))}
      </div>
    </div>
  );
}
