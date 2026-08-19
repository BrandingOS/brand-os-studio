/**
 * The brand's sections, as the guideline's Brand panel presents them.
 *
 * Named here rather than in the panel so the sidebar header can title a
 * drill-down without importing the panel component.
 */
export type BrandSection =
  | 'logo' | 'colors' | 'typography' | 'iconography' | 'voice' | 'strategy' | 'website';

export const BRAND_SECTION_LABEL: Record<BrandSection, string> = {
  logo: 'Logo',
  colors: 'Colours',
  typography: 'Typography',
  iconography: 'Iconography',
  voice: 'Voice & Tone',
  strategy: 'Strategy',
  website: 'Website',
};
