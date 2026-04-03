export interface LogoConcept {
  id: string;
  name: string;           // e.g. "The Prism"
  rationale: string;      // 1-2 sentence explanation
  logoUrl: string;        // SVG/PNG URL
  iconUrl?: string;       // Separate icon/symbol URL (optional)
  direction: string;      // e.g. "Geometric & Angular"
  whyItWorks: string[];   // 3-4 bullet points
  symbolBreakdown?: {     // Optional annotation points for symbol explanation
    label: string;
    description: string;
  }[];
  colorVariants: {
    onWhite: string;      // filter for white bg
    onDark: string;       // filter for dark bg
    onBrand: string;      // filter for brand color bg
    mono: string;         // monochrome filter
  };
}

export type PresentationTemplate = 'premium' | 'simple';

export interface LogoPresentationData {
  brandName: string;
  brandBrief: string;
  brandPersonality: string[];
  primaryColor: string;
  concepts: LogoConcept[];
  clientName?: string;
  designerName?: string;
  date?: string;
  template?: PresentationTemplate;
  designGoals?: string[];
  keywords?: string[];
  agencyName?: string;
  version?: string;
}
