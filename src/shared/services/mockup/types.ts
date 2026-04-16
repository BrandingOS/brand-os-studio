// Minimal brand context for a mockup template. We pass only what the
// render function can reasonably use; more keys can be added later without
// breaking existing templates (they just ignore unknown props).

export interface BrandContext {
  brandName: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoSVG?: string | null; // raw SVG string — templates embed via dangerouslySetInnerHTML or fallback
  fontFamily: string;
  displayFontFamily?: string;
}

export interface MockupTemplate {
  id: string;
  label: string;
  category: 'print' | 'digital' | 'physical' | 'social';
  /** Fixed aspect ratio for consistent grid layout. "w:h". */
  aspect: string;
  /** React SVG component. Must fill a viewBox so it scales cleanly. */
  render: React.FC<{ ctx: BrandContext }>;
}
