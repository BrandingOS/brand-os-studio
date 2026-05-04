/**
 * Shared helpers for the Flaticon UICONS rounded weight family.
 * Used by:
 *   • BrandKitCardEditor — per-icon weight toggle in the editor.
 *   • BrandKitCosmosPage — global weight switcher in the Icons
 *     drilldown header.
 */

/** Rounded weight prefixes shipped with the loaded UICONS stylesheets.
 *  Order is lightest → heaviest, then solid — drives the toggle UI. */
export const ICON_WEIGHTS = [
  { id: 'tr', label: 'Thin' },
  { id: 'rr', label: 'Regular' },
  { id: 'br', label: 'Bold' },
  { id: 'sr', label: 'Solid' },
] as const;

export type IconWeightId = (typeof ICON_WEIGHTS)[number]['id'];

/** Strip any UICONS prefix off a class name and return the bare slug
 *  (e.g. `fi-rr-camera` → `camera`). Falls back to the input when no
 *  prefix is found, so non-UICONS strings pass through unchanged. */
export function stripIconPrefix(className: string): string {
  return className.replace(/^fi-(rr|br|sr|rs|bs|ss|tr|ts|brands)-/, '');
}

/** Return the weight prefix of a UICONS class name, or 'rr' if it
 *  doesn't carry one (or is in a non-rounded family). */
export function detectIconWeight(className: string): IconWeightId {
  const m = className.match(/^fi-(rr|br|sr|tr)-/);
  return (m?.[1] as IconWeightId) ?? 'rr';
}

/** Re-prefix a class name with the chosen rounded weight. */
export function withIconWeight(className: string, weight: IconWeightId): string {
  return `fi-${weight}-${stripIconPrefix(className)}`;
}
