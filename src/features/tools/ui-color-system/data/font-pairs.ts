/**
 * Curated Google Fonts pairings for the brand system. Every entry
 * produces two CSS font-family stacks: `displayStack` for headlines /
 * display type, `bodyStack` for body copy. Pairings are chosen to
 * cover editorial, modern, contemporary, technical, bold, elegant,
 * and geometric voices so any brand archetype can find a fit.
 */
export interface FontPair {
  id: string;
  label: string;
  /** Google Fonts css2 family specs to load, e.g. 'Inter:wght@400;500;700'. Empty = system only. */
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
    id: 'elegant',
    label: 'Elegant',
    gfonts: ['Cormorant+Garamond:ital,wght@0,400;0,500;0,700;1,400', 'Inter:wght@400;500;600'],
    displayStack: `"Cormorant Garamond", ${SYSTEM_SERIF}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'Timeless elegance',
    previewBody: 'Cormorant Garamond paired with Inter.',
  },
  {
    id: 'fashion',
    label: 'Fashion',
    gfonts: ['Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400', 'Inter:wght@400;500;600'],
    displayStack: `"Bodoni Moda", ${SYSTEM_SERIF}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'High fashion',
    previewBody: 'Bodoni Moda — pure editorial couture.',
  },
  {
    id: 'classic',
    label: 'Classic',
    gfonts: ['Lora:ital,wght@0,400;0,500;0,700;1,400', 'Source+Sans+3:wght@400;500;600'],
    displayStack: `"Lora", ${SYSTEM_SERIF}`,
    bodyStack: `"Source Sans 3", ${SYSTEM_SANS}`,
    previewDisplay: 'Traditional craft',
    previewBody: 'Lora + Source Sans — book-like readability.',
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
    id: 'geometric',
    label: 'Geometric',
    gfonts: ['Poppins:wght@400;500;600;700;800'],
    displayStack: `"Poppins", ${SYSTEM_SANS}`,
    bodyStack: `"Poppins", ${SYSTEM_SANS}`,
    previewDisplay: 'Clean geometry',
    previewBody: 'Poppins — rounded, friendly, universal.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    gfonts: ['Inter:wght@400;500;600;700;800'],
    displayStack: `"Inter", ${SYSTEM_SANS}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'The default',
    previewBody: 'Inter for everything — clean and neutral.',
  },
  {
    id: 'startup',
    label: 'Startup',
    gfonts: ['Outfit:wght@400;500;600;700;800'],
    displayStack: `"Outfit", ${SYSTEM_SANS}`,
    bodyStack: `"Outfit", ${SYSTEM_SANS}`,
    previewDisplay: 'Ship fast',
    previewBody: 'Outfit — modern SaaS staple.',
  },
  {
    id: 'warm',
    label: 'Warm',
    gfonts: ['Manrope:wght@400;500;600;700;800'],
    displayStack: `"Manrope", ${SYSTEM_SANS}`,
    bodyStack: `"Manrope", ${SYSTEM_SANS}`,
    previewDisplay: 'Human & warm',
    previewBody: 'Manrope — softly humanist sans.',
  },
  {
    id: 'architect',
    label: 'Architectural',
    gfonts: ['Unbounded:wght@400;500;700;800', 'Inter:wght@400;500;600'],
    displayStack: `"Unbounded", ${SYSTEM_SANS}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'Bold architecture',
    previewBody: 'Unbounded display + Inter body — statement feel.',
  },
  {
    id: 'crisp',
    label: 'Crisp',
    gfonts: ['Plus+Jakarta+Sans:wght@400;500;600;700;800'],
    displayStack: `"Plus Jakarta Sans", ${SYSTEM_SANS}`,
    bodyStack: `"Plus Jakarta Sans", ${SYSTEM_SANS}`,
    previewDisplay: 'Crisp & clear',
    previewBody: 'Plus Jakarta Sans — considered modern sans.',
  },
  {
    id: 'wave',
    label: 'Wave',
    gfonts: ['Syne:wght@400;500;600;700;800', 'Inter:wght@400;500;600'],
    displayStack: `"Syne", ${SYSTEM_SANS}`,
    bodyStack: `"Inter", ${SYSTEM_SANS}`,
    previewDisplay: 'Creative pulse',
    previewBody: 'Syne display + Inter body — energetic.',
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
