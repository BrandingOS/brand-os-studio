export interface LogoConcept {
  id: string;
  name: string;           // e.g. "The Prism"
  rationale: string;      // 1-2 sentence explanation
  logoUrl: string;        // SVG/PNG URL
  direction: string;      // e.g. "Geometric & Angular"
  whyItWorks: string[];   // 3-4 bullet points
  colorVariants: {
    onWhite: string;      // filter for white bg
    onDark: string;       // filter for dark bg
    onBrand: string;      // filter for brand color bg
    mono: string;         // monochrome filter
  };
}

export interface LogoPresentationData {
  brandName: string;
  brandBrief: string;
  brandPersonality: string[];
  primaryColor: string;
  concepts: LogoConcept[];
  clientName?: string;
  designerName?: string;
  date?: string;
}
