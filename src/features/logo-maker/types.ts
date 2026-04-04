// ─── Logo Maker Types ───────────────────────────────────────────────

export type LogoLayout = 'stacked' | 'horizontal' | 'wordmark' | 'symbol' | 'embedded' | 'badge';

export interface LogoConfig {
  icon: string | null;
  iconCategory: string;
  brandName: string;
  tagline: string;
  layout: LogoLayout;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase';
  iconSize: number;
  showGradient: boolean;
  gradientAngle: number;
  shadow: boolean;
  borderRadius: number;
}

export interface IconItem {
  name: string;
  category: string;
}

export interface IconCategory {
  id: string;
  label: string;
  icons: string[];
}

export interface LayoutPreset {
  id: LogoLayout;
  label: string;
  description: string;
}

export interface LogoSuggestion {
  id: string;
  config: Partial<LogoConfig>;
  label: string;
}

export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  icon: 'Hexagon',
  iconCategory: 'business',
  brandName: 'Brand',
  tagline: '',
  layout: 'stacked',
  primaryColor: '#6366f1',
  secondaryColor: '#a855f7',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  fontSize: 32,
  letterSpacing: 0,
  textTransform: 'none',
  iconSize: 48,
  showGradient: false,
  gradientAngle: 135,
  shadow: false,
  borderRadius: 0,
};
