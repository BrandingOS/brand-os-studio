/**
 * Curated Google Fonts pairings for the brand system. Every entry
 * produces two CSS font-family stacks: `displayStack` for headlines /
 * display type, `bodyStack` for body copy. Pairings are chosen to
 * cover editorial, modern, contemporary, technical, and bold voices
 * so any brand archetype can find a fit.
 */
export interface FontPair {
  id: string;
  label: string;
  /** Google Fonts css2 family specs to load, e.g. ['Inter:wght@400;500;700']. Empty = system only. */
  gfonts: string[];
  displayStack: string;
  bodyStack: string;
  previewDisplay: string;
  previewBody: string;
}

const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SYSTEM_SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif';

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'default',
    label: 'System default',
    gfonts: [],
    displayStack: SYSTEM_SERIF,
    bodyStack: SYSTEM_SANS,
    previewDisplay: 'Serif display',
    previewBody: 'Clean sans for long-form copy.',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    gfonts: ['Instrument+Serif:ital@0;1', 'Inter:wght@400;500;600;700'],
    displayStack: `"Instrument Serif", ${SYSTEM_SERIF}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'A magazine voice',
    previewBody: 'Instrument Serif paired with Inter.',
  },
  {
    id: 'modern',
    label: 'Modern',
    gfonts: ['Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400', 'Inter:wght@400;500;600;700'],
    displayStack: `"Fraunces", ${SYSTEM_SERIF}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'Sharp & modern',
    previewBody: 'Fraunces with Inter — new-century feel.',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    gfonts: ['Playfair+Display:ital,wght@0,400;0,700;1,400', 'Inter:wght@400;500;600;700'],
    displayStack: `"Playfair Display", ${SYSTEM_SERIF}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'Quietly premium',
    previewBody: 'Playfair Display + Inter for boutique brands.',
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    gfonts: ['DM+Serif+Display:ital@0;1', 'DM+Sans:wght@400;500;700'],
    displayStack: `"DM Serif Display", ${SYSTEM_SERIF}`,
    bodyStack: `"DM Sans", ${SYSTEM_SANS}`,
    previewDisplay: 'Warm & contemporary',
    previewBody: 'DM Serif Display with DM Sans.',
  },
  {
    id: 'tech',
    label: 'Tech',
    gfonts: ['Space+Grotesk:wght@400;500;600;700'],
    displayStack: `"Space Grotesk", ${SYSTEM_SANS}`,
    bodyStack: `"Space Grotesk", ${SYSTEM_SANS}`,
    previewDisplay: 'Engineered',
    previewBody: 'Space Grotesk throughout for a unified tech feel.',
  },
  {
    id: 'bold',
    label: 'Bold Sans',
    gfonts: ['Archivo:ital,wght@0,400;0,700;0,900;1,400'],
    displayStack: `"Archivo", ${SYSTEM_SANS}`,
    bodyStack: `"Archivo", ${SYSTEM_SANS}`,
    previewDisplay: 'Confident',
    previewBody: 'Archivo — punchy display and readable body.',
  },
  {
    id: 'soft',
    label: 'Soft Humanist',
    gfonts: ['Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500', 'Nunito:wght@400;600;700'],
    displayStack: `"Fraunces", ${SYSTEM_SERIF}`,
    bodyStack: `"Nunito", ${SYSTEM_SANS}`,
    previewDisplay: 'Warm & friendly',
    previewBody: 'Fraunces with Nunito — approachable and human.',
  },
];

export const DEFAULT_FONT_PAIR: FontPair = FONT_PAIRS[0];

export function getFontPairById(id: string): FontPair {
  return FONT_PAIRS.find((p) => p.id === id) ?? DEFAULT_FONT_PAIR;
}
