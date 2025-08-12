export interface Brand {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  fonts: {
    primary: string;
    secondary?: string;
  };
  tone: string;
  audience: string;
  strategy?: string;
  guidelines?: BrandGuidelines;
  assets: Asset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandGuidelines {
  strategy?: string;
  logoSystem?: string;
  colorPalette?: ColorPalette;
  typography?: Typography;
  voiceAndTone?: string;
  applications?: string;
}

export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string;
  neutral: string[];
}

export interface Typography {
  primary: FontDefinition;
  secondary?: FontDefinition;
  scale: FontScale;
}

export interface FontDefinition {
  family: string;
  weights: number[];
  fallbacks: string[];
}

export interface FontScale {
  h1: string;
  h2: string;
  h3: string;
  body: string;
  caption: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'font' | 'logo' | 'document';
  url: string;
  size: number;
  tags: string[];
  createdAt: Date;
}

export interface CreateBrandInput {
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  fonts: {
    primary: string;
    secondary?: string;
  };
  tone: string;
  audience: string;
}