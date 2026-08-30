/**
 * A LEGIBLE FLOOR FOR TYPE, AT TILE SCALE ONLY.
 *
 * Every renderer in this folder is authored against a 260px stage — that is
 * the ScalingStage contract, and it is what `snapshotTemplatePng` mounts, so
 * a 3.4px deck footer is 13.6px in the 1040px PNG the kit hands over. At that
 * size the proportion is right and must not move.
 *
 * The drilldown TILE is a different question. It draws the same design at
 * roughly 347px with no scaling at all, so the smallest roles paint at their
 * authored pixel size and simply vanish: QA measured Envelope "Postage" at
 * 3.0px, Letterhead's date and address at 3.9px, deck footers at 3.4px,
 * Business Card contacts at 5.2px and the Website nav at 5.0px (Q19). The
 * tile's whole job is choosing between variants, and you cannot choose
 * between three letterheads whose only difference you cannot read.
 *
 * So the floor is a CSS custom property, and it is set by the SURFACE rather
 * than by the design:
 *
 *  • The drilldown tile sets `--bk-type-floor` (see `brand-kit.css`), so
 *    nothing there paints below it.
 *  • The offscreen export host, the card covers and the editor preview set
 *    nothing, so the property falls back to `0px`, `max()` is the identity,
 *    and every exported pixel is byte-for-byte what it was.
 *
 * It is a FLOOR, not a scale: only the roles that were too small to read
 * move, and a headline is untouched. That is deliberate — scaling all the
 * type up would be a different design, while raising only what had fallen
 * below the readable minimum is the same design, legible.
 */

/** The property a surface sets to declare its own minimum. */
export const TYPE_FLOOR_VAR = '--bk-type-floor';

/**
 * A font size that can never paint below the surface's floor.
 *
 * Accepts what the renderers already write: a number of px, a `"3.4px"`
 * string, or a bare number from a `size` prop. Anything it cannot read as a
 * length is handed back untouched, so a `cqw` or an `em` is never rewritten
 * into a unit it did not ask for.
 */
export function typePx(value: number | string): string {
  const px =
    typeof value === 'number'
      ? value
      : /^\s*-?[0-9]*\.?[0-9]+\s*(px)?\s*$/.test(value)
        ? parseFloat(value)
        : NaN;
  if (!Number.isFinite(px)) return String(value);
  return `max(var(${TYPE_FLOOR_VAR}, 0px), ${px}px)`;
}
