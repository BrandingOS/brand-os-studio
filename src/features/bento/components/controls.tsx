/**
 * The control vocabulary both panels are written in.
 *
 * These were private to `TileInspector` while it was the only panel. The
 * document's own properties — size, ground, grid, spacing — used to live in a
 * toolbar row and two hand-rolled popovers instead, which is the shape a tool
 * bolted onto the app takes rather than one built into it. Folding them into a
 * panel gave the second consumer, so the shared pieces moved here rather than
 * being copied. Nothing about them is generic enough for the DS: they are this
 * feature's arrangement of `DsInput`, `DsSlider` and friends.
 */
import type { ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { DsInput } from '@/shared/ds';
import { brandColors } from '../shuffle';

/**
 * A titled block of controls, separated by a hairline.
 *
 * The head follows the Brand Kit card editor's customise rail — a real title
 * rather than an eyebrow, an optional line of guidance, and a Reset that only
 * appears once there is something to reset. An eyebrow alone reads as a
 * category label; these are the sections of a form.
 */
export function Group({
  label,
  hint,
  onReset,
  children,
}: {
  label?: string;
  hint?: string;
  /** Rendered only when passed AND the group has been changed. */
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="bento-group">
      {label && (
        <div className="bento-group-head">
          <div className="bento-group-head-row">
            <h3 className="bento-group-title">{label}</h3>
            {onReset && (
              <button type="button" className="bento-group-reset" onClick={onReset}>
                Reset
              </button>
            )}
          </div>
          {hint && <p className="bento-group-hint">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A label over a control that has none of its own (DsSelect, DsSegmented). */
export function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bento-labelled">
      <span className="bento-label">{label}</span>
      {children}
    </div>
  );
}

/**
 * The brand's colours as chips, with a hex field for anything else.
 *
 * This is why the document's background is no longer a native `<input
 * type="color">`: that control offers the whole spectrum with the brand's own
 * colours nowhere in it, on a page whose entire job is to compose a graphic
 * from a brand. The chips put the answer first and the field keeps the rest.
 */
export function Swatches({
  label,
  value,
  palette,
  onPick,
}: {
  label: string;
  value?: string;
  palette: string[];
  onPick: (c: string) => void;
}) {
  return (
    <div className="bento-labelled">
      <span className="bento-label">{label}</span>
      <div className="bento-swatches" role="group" aria-label={label}>
        {palette.slice(0, 16).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={`bento-swatchchip${value?.toLowerCase() === c.toLowerCase() ? ' is-on' : ''}`}
            style={{ background: c }}
            title={c}
            aria-label={c}
            aria-pressed={value?.toLowerCase() === c.toLowerCase()}
          />
        ))}
      </div>
      <DsInput
        className="bento-hex"
        placeholder="#000000"
        value={value ?? ''}
        aria-label={`${label} hex`}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
}

/**
 * The colours offered in the panel are the colours the canvas draws in.
 *
 * This used to be its own list, padded with indigo, pink, orange, emerald and
 * sky when the brand was short — so a red brand's Background row offered eight
 * colours it does not own, and picking one put it on the artboard. `shuffle`'s
 * `brandColors` is the single answer to "what may this bento be painted in",
 * and it extends a short brand along its OWN ramp. One list, two readers.
 */
export function buildPalette(brand: Brand | null | undefined): string[] {
  return brandColors(brand).slice(0, 16);
}

export function buildFonts(brand: Brand | null | undefined): string[] {
  const out: string[] = [];
  if (brand?.fonts?.primary) out.push(brand.fonts.primary);
  if (brand?.fonts?.secondary) out.push(brand.fonts.secondary);
  ['Inter', 'Helvetica', 'Georgia', 'Playfair Display', 'Space Grotesk', 'Courier'].forEach((f) => {
    if (!out.includes(f)) out.push(f);
  });
  return out;
}

export const pct = (v: number) => `${v.toFixed(1)}%`;
export const int = (v: number) => `${v.toFixed(0)}`;
