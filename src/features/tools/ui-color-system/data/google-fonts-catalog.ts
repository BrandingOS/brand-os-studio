/**
 * Curated catalogue of popular Google Fonts, sorted roughly by
 * category so the search UI can cluster "serif" / "sans" / "display"
 * results. Variable weights are specified so the <link> loader can
 * pull usable weights without an API call.
 */
export type FontCategory = 'serif' | 'sans' | 'display' | 'mono';

export interface GoogleFontEntry {
  /** Exact Google Fonts family name, e.g. "Instrument Serif". */
  name: string;
  category: FontCategory;
  /** css2 variant suffix, e.g. 'ital,wght@0,400;0,700;1,400'. */
  weights: string;
}

export const GOOGLE_FONTS_CATALOG: GoogleFontEntry[] = [
  // Serif — editorial / premium
  { name: 'Instrument Serif', category: 'serif', weights: 'ital@0;1' },
  { name: 'Fraunces', category: 'serif', weights: 'ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400' },
  { name: 'Playfair Display', category: 'serif', weights: 'ital,wght@0,400;0,700;0,800;1,400' },
  { name: 'Cormorant Garamond', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Bodoni Moda', category: 'serif', weights: 'ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400' },
  { name: 'DM Serif Display', category: 'serif', weights: 'ital@0;1' },
  { name: 'DM Serif Text', category: 'serif', weights: 'ital@0;1' },
  { name: 'EB Garamond', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Lora', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Merriweather', category: 'serif', weights: 'ital,wght@0,400;0,700;0,900;1,400' },
  { name: 'Libre Baskerville', category: 'serif', weights: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Libre Caslon Text', category: 'serif', weights: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Crimson Pro', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Source Serif 4', category: 'serif', weights: 'ital,opsz,wght@0,8..60,400;0,8..60,700;1,8..60,400' },
  { name: 'Noto Serif', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'PT Serif', category: 'serif', weights: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Cardo', category: 'serif', weights: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Spectral', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Alegreya', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Zilla Slab', category: 'serif', weights: 'ital,wght@0,400;0,500;0,700;1,400' },

  // Sans — workhorses
  { name: 'Inter', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Roboto', category: 'sans', weights: 'wght@400;500;700;900' },
  { name: 'Manrope', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'DM Sans', category: 'sans', weights: 'wght@400;500;700' },
  { name: 'Space Grotesk', category: 'sans', weights: 'wght@400;500;600;700' },
  { name: 'Plus Jakarta Sans', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Poppins', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Montserrat', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Work Sans', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Nunito', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Nunito Sans', category: 'sans', weights: 'ital,wght@0,400;0,600;0,700;0,800;1,400' },
  { name: 'Outfit', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Archivo', category: 'sans', weights: 'ital,wght@0,400;0,700;0,800;0,900;1,400' },
  { name: 'Archivo Narrow', category: 'sans', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Figtree', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Urbanist', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Sora', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Lexend', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Karla', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Mulish', category: 'sans', weights: 'ital,wght@0,400;0,500;0,700;0,800;1,400' },
  { name: 'Open Sans', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Lato', category: 'sans', weights: 'ital,wght@0,400;0,700;0,900;1,400' },
  { name: 'Raleway', category: 'sans', weights: 'ital,wght@0,400;0,500;0,700;0,800;1,400' },
  { name: 'Source Sans 3', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'IBM Plex Sans', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Quicksand', category: 'sans', weights: 'wght@400;500;600;700' },
  { name: 'Barlow', category: 'sans', weights: 'ital,wght@0,400;0,500;0,700;0,800;1,400' },
  { name: 'Rubik', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Roboto Flex', category: 'sans', weights: 'opsz,wght@8..144,400;8..144,700' },
  { name: 'Albert Sans', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Onest', category: 'sans', weights: 'wght@400;500;600;700;800' },
  { name: 'Public Sans', category: 'sans', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Kanit', category: 'sans', weights: 'ital,wght@0,400;0,500;0,700;0,800;1,400' },

  // Display — statement pieces
  { name: 'Syne', category: 'display', weights: 'wght@400;500;600;700;800' },
  { name: 'Unbounded', category: 'display', weights: 'wght@400;500;700;800' },
  { name: 'Bricolage Grotesque', category: 'display', weights: 'opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800' },
  { name: 'Big Shoulders Display', category: 'display', weights: 'wght@400;500;700;900' },
  { name: 'Abril Fatface', category: 'display', weights: 'wght@400' },
  { name: 'Anton', category: 'display', weights: 'wght@400' },
  { name: 'Bebas Neue', category: 'display', weights: 'wght@400' },
  { name: 'Oswald', category: 'display', weights: 'wght@400;500;600;700' },
  { name: 'Righteous', category: 'display', weights: 'wght@400' },
  { name: 'Russo One', category: 'display', weights: 'wght@400' },
  { name: 'Playfair', category: 'display', weights: 'ital,opsz,wght@0,5..1200,400;0,5..1200,700;1,5..1200,400' },
  { name: 'Lobster', category: 'display', weights: 'wght@400' },
  { name: 'Pacifico', category: 'display', weights: 'wght@400' },
  { name: 'Caveat', category: 'display', weights: 'wght@400;500;600;700' },
  { name: 'Satisfy', category: 'display', weights: 'wght@400' },
  { name: 'Dancing Script', category: 'display', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Great Vibes', category: 'display', weights: 'wght@400' },
  { name: 'Tenor Sans', category: 'display', weights: 'wght@400' },
  { name: 'Italiana', category: 'display', weights: 'wght@400' },
  { name: 'Limelight', category: 'display', weights: 'wght@400' },
  { name: 'Yeseva One', category: 'display', weights: 'wght@400' },
  { name: 'Khula', category: 'display', weights: 'wght@400;600;700;800' },
  { name: 'Amatic SC', category: 'display', weights: 'wght@400;700' },
  { name: 'Shrikhand', category: 'display', weights: 'wght@400' },
  { name: 'Fjalla One', category: 'display', weights: 'wght@400' },
  { name: 'DM Mono', category: 'mono', weights: 'ital,wght@0,400;0,500;1,400' },
  { name: 'JetBrains Mono', category: 'mono', weights: 'ital,wght@0,400;0,500;0,700;1,400' },
  { name: 'Space Mono', category: 'mono', weights: 'ital,wght@0,400;0,700;1,400' },
  { name: 'IBM Plex Mono', category: 'mono', weights: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Fira Code', category: 'mono', weights: 'wght@400;500;600;700' },
];

export function searchGoogleFonts(query: string): GoogleFontEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return GOOGLE_FONTS_CATALOG.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 24);
}

export function findGoogleFont(name: string): GoogleFontEntry | undefined {
  return GOOGLE_FONTS_CATALOG.find((f) => f.name === name);
}
