/**
 * PreviewCanvas — the big center preview.
 *
 * Renders the active variant via `renderSvg` and lets the user flip
 * the background quickly to sanity-check the lockup against light,
 * dark, and brand surfaces. The background flips are PREVIEW-ONLY:
 * they don't mutate the spec. The user has to commit a background in
 * the right pane for it to bake into the spec.
 */
import { useMemo, useState } from 'react';
import { renderSvg } from '../render/renderSvg';
import type { PaletteContext, SourceLogo, VariantSpec } from '../engine/types';
import { cn } from '@/lib/utils';

interface PreviewCanvasProps {
  source: SourceLogo;
  spec: VariantSpec;
  palette: PaletteContext;
}

type PreviewBg = 'committed' | 'light' | 'dark' | 'brand';

export function PreviewCanvas({ source, spec, palette }: PreviewCanvasProps) {
  const [bg, setBg] = useState<PreviewBg>('committed');

  const bgStyle = useMemo(() => previewBgStyle(bg, spec, palette), [bg, spec, palette]);

  const svg = useMemo(() => {
    // For preview-only background overrides we render the spec but draw
    // it on a styled wrapper instead of changing the spec itself.
    const previewSpec = bg === 'committed' ? spec : { ...spec, background: { kind: 'transparent' as const } };
    return renderSvg({ source, spec: previewSpec, palette, width: 800, height: 600 });
  }, [bg, source, spec, palette]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'relative flex flex-1 items-center justify-center transition-colors',
          'min-h-0 overflow-hidden',
        )}
        style={bgStyle}
      >
        <div
          className="max-h-[80%] max-w-[80%]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="flex items-center justify-center gap-2 border-t bg-muted/30 px-4 py-2">
        <span className="mr-1 text-xs text-muted-foreground">Preview on:</span>
        {(['committed', 'light', 'dark', 'brand'] as PreviewBg[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBg(b)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors',
              bg === b ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-background',
            )}
          >
            {b === 'committed' ? 'Spec' : b}
          </button>
        ))}
      </div>
    </div>
  );
}

function previewBgStyle(bg: PreviewBg, spec: VariantSpec, palette: PaletteContext): React.CSSProperties {
  if (bg === 'light') return { background: '#FFFFFF' };
  if (bg === 'dark') return { background: '#0A0A0A' };
  if (bg === 'brand') return { background: palette.brandColors[0]?.hex ?? '#0A0A0A' };
  // committed: render the spec's actual background
  if (spec.background.kind === 'transparent') {
    return {
      backgroundImage:
        'linear-gradient(45deg, #f3f3f3 25%, transparent 25%), linear-gradient(-45deg, #f3f3f3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f3f3 75%), linear-gradient(-45deg, transparent 75%, #f3f3f3 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
    };
  }
  if (spec.background.kind === 'solid') return { background: spec.background.value ?? '#fff' };
  if (spec.background.kind === 'brand')
    return { background: palette.brandColors[0]?.hex ?? '#fff' };
  return { background: '#FFFFFF' };
}
