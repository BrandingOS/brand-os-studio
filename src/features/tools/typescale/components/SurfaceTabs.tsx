import type { ScaleSurface, SurfaceKey } from '@/shared/types/typescale';

const LABELS: Record<SurfaceKey, string> = { web: 'Web', ui: 'UI', presentation: 'Presentation', social: 'Social' };

interface Props {
  value: SurfaceKey;
  onChange: (k: SurfaceKey) => void;
  surfaces: Record<SurfaceKey, ScaleSurface>;
}

/**
 * Surface tabs — pill row using the cosmos `.editor-cats` + `.editor-cat`
 * vocabulary, the same bottom-underline pills used by the Color System
 * tool's Brand / Fonts / Logo tabs.
 */
export function SurfaceTabs({ value, onChange }: Props) {
  return (
    <div className="editor-cats" role="tablist" aria-label="Surface">
      {(Object.keys(LABELS) as SurfaceKey[]).map(k => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`editor-cat${value === k ? ' is-active' : ''}`}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  );
}
