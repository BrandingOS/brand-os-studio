/**
 * DraftPreview — large live preview of the current draft variant.
 *
 * Sits at the top of the main page area, above the gallery. Updates
 * in real time as the user edits the draft in the rail. This is the
 * "what will this variant look like" surface — the user can see
 * exactly what they're about to add before clicking the bottom CTA.
 *
 * Not interactive: clicking does nothing. The Add button in the rail
 * is the only way to commit it.
 */
import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { renderSvg } from '../render/renderSvg';
import type {
  BrandSlogan,
  PaletteContext,
  SourceLogo,
  VariantSpec,
} from '../engine/types';

interface DraftPreviewProps {
  source: SourceLogo;
  draft: VariantSpec;
  palette: PaletteContext;
  slogan: BrandSlogan;
}

export function DraftPreview({ source, draft, palette, slogan }: DraftPreviewProps) {
  const svg = useMemo(
    () => renderSvg({ source, spec: draft, palette, slogan, width: 800, height: 500 }),
    [source, draft, palette, slogan],
  );

  // Background of the preview surface reflects the variant's spec
  // background. Transparent uses a checker pattern so the user can
  // see the alpha they'll get on export.
  const tileBg =
    draft.background.kind === 'solid'
      ? draft.background.value
      : draft.background.kind === 'brand'
        ? palette.brandColors[0]?.hex
        : undefined;

  const tileBgStyle = tileBg
    ? { background: tileBg }
    : {
        backgroundImage:
          'linear-gradient(45deg, #f3f3f3 25%, transparent 25%), linear-gradient(-45deg, #f3f3f3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f3f3 75%), linear-gradient(-45deg, transparent 75%, #f3f3f3 75%)',
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0',
      };

  return (
    <section className="mb-10">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Live preview
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {draft.label} · click "Add this variant" in the rail to save it
          </p>
        </div>
      </header>
      <div
        className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border shadow-sm"
        style={tileBgStyle}
      >
        <div
          className="flex h-[70%] w-[70%] items-center justify-center [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </section>
  );
}
