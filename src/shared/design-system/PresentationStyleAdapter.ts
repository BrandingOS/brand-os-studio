/**
 * PresentationStyleAdapter
 *
 * Bridges two previously disconnected token systems:
 *   1. Brand tokens (brand.primaryColor, brand.fonts.primary, etc.)
 *   2. PresentationStyle tokens (style.bgDark, style.headingFont, etc.)
 *
 * Both are projected onto the same CSS variable namespace defined in
 * `tokens.css`, so any component (dashboard, slide layout, inspector,
 * export capture) can read `var(--brand-primary)` / `var(--pres-bg-dark)`
 * without caring whether the value came from a Brand or a Style.
 *
 * Two ways to use this:
 *   - `applyBrandTokens(brand, target)` — sets vars on a DOM element (default: documentElement)
 *   - `brandTokenStyle(brand)` — returns a React.CSSProperties object you can spread onto a wrapper
 *   - `presentationStyleTokens(style)` — returns the same shape for a PresentationStyle
 */

import type { Brand } from '@/shared/types/brand';
import type { PresentationStyle } from '@/shared/presentation/styles';
import { loadBrandFonts } from './fonts';

type CSSVarRecord = Record<string, string>;

/** Build a CSS-variable record from a Brand. */
export function brandTokenStyle(brand: Pick<Brand, 'primaryColor' | 'secondaryColor' | 'fonts'> | undefined | null): CSSVarRecord {
  if (!brand) return {};
  const vars: CSSVarRecord = {};
  if (brand.primaryColor) vars['--brand-primary'] = brand.primaryColor;
  if (brand.secondaryColor) vars['--brand-secondary'] = brand.secondaryColor;
  if (brand.fonts?.primary) vars['--brand-font-heading'] = `'${brand.fonts.primary}', system-ui, sans-serif`;
  if (brand.fonts?.secondary) vars['--brand-font-body'] = `'${brand.fonts.secondary}', system-ui, sans-serif`;
  return vars;
}

/** Build a CSS-variable record from a PresentationStyle. */
export function presentationStyleTokens(style: PresentationStyle | undefined | null): CSSVarRecord {
  if (!style) return {};
  const vars: CSSVarRecord = {};
  if ((style as any).bgLight) vars['--pres-bg-light'] = (style as any).bgLight;
  if ((style as any).bgDark) vars['--pres-bg-dark'] = (style as any).bgDark;
  if ((style as any).textOnLight) vars['--pres-text-on-light'] = (style as any).textOnLight;
  if ((style as any).textOnDark) vars['--pres-text-on-dark'] = (style as any).textOnDark;
  if ((style as any).cardRadius) vars['--pres-card-radius'] = String((style as any).cardRadius);
  if ((style as any).accentColor) vars['--pres-accent'] = (style as any).accentColor;
  if ((style as any).headingFont) vars['--brand-font-heading'] = (style as any).headingFont;
  if ((style as any).bodyFont) vars['--brand-font-body'] = (style as any).bodyFont;
  return vars;
}

/**
 * Apply brand tokens directly to a DOM element (default: documentElement).
 * Also triggers font loading so the family is available before paint.
 */
export function applyBrandTokens(
  brand: Pick<Brand, 'primaryColor' | 'secondaryColor' | 'fonts'> | undefined | null,
  target: HTMLElement = document.documentElement,
): void {
  if (!brand) return;
  const vars = brandTokenStyle(brand);
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value);
  }
  loadBrandFonts(brand as Brand);
}
