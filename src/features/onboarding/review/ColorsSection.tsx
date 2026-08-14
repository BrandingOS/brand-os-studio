/**
 * Colors — the retired colour board.
 *
 * Source priority is visible here rather than explained: when a logo exists the
 * palette comes FROM the logo, and "Suggest palettes" only appears when there
 * is nothing to extract from. A suggestion never silently becomes the brand's
 * palette — choosing one is an act the user performs.
 */
import { DsButton } from '@/shared/ds';
import { ReviewCard } from './ReviewCard';

export interface Swatch {
  id: string;
  hex: string;
  /** The first swatch is the brand's primary. */
  primary?: boolean;
}

export interface ColorsSectionProps {
  swatches: Swatch[];
  decided: boolean;
  /** Palette directions offered when there is no evidence to extract from. */
  suggestions: Array<{ name: string; hexes: string[] }>;
  canExtract: boolean;
  busy?: boolean;
  onLooksRight(): void;
  onAdd(): void;
  onExtractFromLogo(): void;
  onExtractFromImage(): void;
  onSuggest(): void;
  onApplyPalette(hexes: string[]): void;
  onRemove(id: string): void;
}

export function ColorsSection({
  swatches, decided, suggestions, canExtract, busy,
  onLooksRight, onAdd, onExtractFromLogo, onExtractFromImage, onSuggest, onApplyPalette, onRemove,
}: ColorsSectionProps) {
  return (
    <ReviewCard
      title="Colors"
      meta={swatches.length ? `${swatches.length} ${swatches.length === 1 ? 'colour' : 'colours'}` : undefined}
      onLooksRight={swatches.length ? onLooksRight : undefined}
      looksRightDisabled={decided || busy}
      empty="No colours yet — extract them from your logo, or pick one."
      footer={
        <>
          {canExtract && (
            <DsButton size="sm" tone="secondary" onClick={onExtractFromLogo}>
              Extract from logo
            </DsButton>
          )}
          <button type="button" className="onb-hint-link" onClick={onExtractFromImage}>
            Extract from an image
          </button>
          <button type="button" className="onb-hint-link" onClick={onAdd}>
            Add a colour
          </button>
          {!canExtract && (
            <button type="button" className="onb-hint-link" onClick={onSuggest}>
              Suggest palettes
            </button>
          )}
        </>
      }
    >
      {swatches.length > 0 && (
        <div className="onb-sw">
          {swatches.map((s) => (
            <div className={`onb-sw-i${s.primary ? ' is-primary' : ''}`} key={s.id}>
              <span className="onb-sw-c" style={{ background: s.hex }} />
              <span className="onb-sw-h">{s.hex.replace('#', '')}</span>
              <button type="button" className="onb-sw-x" onClick={() => onRemove(s.id)}>
                <span className="sr-only">Remove {s.hex}</span>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {swatches.length === 0 && suggestions.length > 0 && (
        <div className="onb-palettes">
          {suggestions.map((p) => (
            <button
              type="button"
              className="onb-palette"
              key={p.name}
              onClick={() => onApplyPalette(p.hexes)}
            >
              <span className="onb-palette-sw">
                {p.hexes.slice(0, 5).map((h) => (
                  <i key={h} style={{ background: h }} />
                ))}
              </span>
              <span className="onb-palette-n">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </ReviewCard>
  );
}
