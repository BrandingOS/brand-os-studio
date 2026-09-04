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

/** A titled block of controls, separated by a hairline. */
export function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="bento-group">
      {label && <span className="ds-eyebrow">{label}</span>}
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

export function buildPalette(brand: Brand | null | undefined): string[] {
  const out: string[] = [];
  if (brand?.primaryColor) out.push(brand.primaryColor);
  if (brand?.secondaryColor) out.push(brand.secondaryColor);
  brand?.guidelines?.colorPalette?.neutral?.forEach((n) => n?.hex && out.push(n.hex));
  const defaults = ['#0F172A', '#6366F1', '#EC4899', '#F97316', '#10B981', '#0EA5E9', '#EAB308', '#94A3B8'];
  defaults.forEach((d) => {
    if (!out.includes(d)) out.push(d);
  });
  return out.slice(0, 16);
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
