import type { ScaleSurface, SurfaceKey } from '@/shared/types/typescale';

const LABELS: Record<SurfaceKey, string> = { web: 'Web', ui: 'UI', presentation: 'Presentation', social: 'Social' };

interface Props {
  value: SurfaceKey;
  onChange: (k: SurfaceKey) => void;
  surfaces: Record<SurfaceKey, ScaleSurface>;
}

export function SurfaceTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border p-0.5 text-sm">
      {(Object.keys(LABELS) as SurfaceKey[]).map(k => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`px-3 py-1 rounded ${value === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  );
}
