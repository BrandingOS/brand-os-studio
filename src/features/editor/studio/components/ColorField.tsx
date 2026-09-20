// A colour control that starts with the brand.
//
// The brand's own colours are offered FIRST, as one row, before any
// picker opens. That ordering is the product's argument in miniature:
// the common case in a brand operating system is "use one of our
// colours", and it should cost one click, not a trip through a colour
// wheel that has the brand's palette nowhere in it.
//
// The wheel underneath is `@/shared/components/ColorPickerHSV` — the
// canonical picker, already used by Setup, Guideline and Brand Board.
// The toolbar this replaces had ~400 lines of hand-rolled HSV maths of
// its own.

import { useMemo } from 'react';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import { Swatch } from './chrome';
import { StudioPopover, usePopoverAnchor } from './StudioPopover';

interface Props {
  label: string;
  value: string | null;
  brandKit: BrandKit | null;
  onChange: (value: string | null) => void;
  /** Offer "no fill" — right for a shape's fill and border, wrong for text. */
  allowNone?: boolean;
  disabled?: boolean;
}

export interface BrandSwatch {
  hex: string;
  name: string;
}

/** The brand's colours, named, deduped, core first then the neutral ramp. */
export function brandSwatches(kit: BrandKit | null): BrandSwatch[] {
  if (!kit) return [];
  const out: BrandSwatch[] = [];
  const push = (hex: string | undefined, name: string) => {
    if (!hex) return;
    if (out.some((s) => s.hex.toLowerCase() === hex.toLowerCase())) return;
    out.push({ hex, name });
  };
  push(kit.colors.primary.hex, kit.colors.primary.name || 'Primary');
  push(kit.colors.secondary?.hex, kit.colors.secondary?.name || 'Secondary');
  push(kit.colors.accent?.hex, kit.colors.accent?.name || 'Accent');
  kit.colors.neutrals.forEach((hex, i) => push(hex, `Neutral ${i + 1}`));
  return out;
}

export function ColorField({
  label,
  value,
  brandKit,
  onChange,
  allowNone,
  disabled,
}: Props) {
  const pop = usePopoverAnchor();
  const swatches = useMemo(() => brandSwatches(brandKit), [brandKit]);

  return (
    <>
      <span {...pop.triggerProps} style={{ display: 'inline-flex' }}>
        <Swatch color={value} label={label} disabled={disabled} />
      </span>
      <StudioPopover
        open={pop.open}
        onClose={pop.close}
        anchor={pop.anchor}
        label={label}
        width={252}
      >
        {swatches.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <p className="st-section-label">Brand colours</p>
            <div className="st-swatch-grid">
              {swatches.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  className="st-swatch-btn"
                  style={{ background: s.hex }}
                  title={`${s.name} · ${s.hex}`}
                  aria-label={`${s.name} ${s.hex}`}
                  onClick={() => {
                    onChange(s.hex);
                    pop.close();
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {allowNone ? (
          <button
            type="button"
            className="st-icon-btn st-icon-btn--label"
            style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }}
            onClick={() => {
              onChange(null);
              pop.close();
            }}
          >
            No {label.toLowerCase()}
          </button>
        ) : null}

        <p className="st-section-label">Custom</p>
        <ColorPickerHSV
          hex={value ?? '#000000'}
          compact
          // Live preview on the canvas while dragging the wheel; the
          // commit button is what closes the popover.
          onChange={(hex) => onChange(hex)}
          onCommit={(hex) => {
            onChange(hex);
            pop.close();
          }}
          onCancel={pop.close}
          commitLabel="Apply"
        />
      </StudioPopover>
    </>
  );
}
