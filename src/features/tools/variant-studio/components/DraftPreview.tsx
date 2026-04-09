/**
 * DraftPreview — live preview of the current draft variant + the
 * primary "Add this variant" CTA right beneath it.
 *
 * Sits at the top of the main page area, above the gallery. Updates
 * in real time as the user edits the draft in the rail. The Add
 * button used to live in the rail's sticky bottom; moving it here
 * means the user always sees the action button next to the visual
 * they're previewing — there's no doubt about how to commit a draft
 * to the gallery.
 *
 * Constrained to a comfortable size (max-w-2xl) so it doesn't
 * dominate the page on wide screens — the gallery is still the main
 * surface, the preview is just the "what am I about to add" cue.
 */
import { useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onAdd: () => void;
}

export function DraftPreview({ source, draft, palette, slogan, onAdd }: DraftPreviewProps) {
  const svg = useMemo(
    () => renderSvg({ source, spec: draft, palette, slogan, width: 600, height: 400 }),
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
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
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
            {draft.label}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-2xl space-y-3">
        <div
          className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border shadow-sm"
          style={tileBgStyle}
        >
          <div
            className="flex h-[70%] w-[70%] items-center justify-center [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        {/* The Add CTA lives right under the preview — that's the
            primary action of the studio. The user sees the variant
            they're about to commit and the button to commit it,
            both in the same eye line. */}
        <Button className="w-full" size="lg" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add this variation
        </Button>
      </div>
    </section>
  );
}
