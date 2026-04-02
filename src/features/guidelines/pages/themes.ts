/**
 * Guideline Theme System
 *
 * Each theme defines the visual language for guideline pages.
 * Themes control: colors, typography scale, page layout, accent style.
 */

export interface GuidelineTheme {
  id: string;
  name: string;
  description: string;
  // Page backgrounds alternate between these
  pageBg: { primary: string; secondary: string; accent: string };
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Section label style
  sectionLabelStyle: 'uppercase-small' | 'large-bold' | 'numbered' | 'accent-bar';
  // Title style
  titleScale: 'huge' | 'large' | 'medium';
  // Layout density
  density: 'spacious' | 'normal' | 'compact';
  // Accent placement
  accentStyle: 'line' | 'block' | 'circle' | 'none';
  // Page chrome
  showPageNumbers: boolean;
  showBrandMark: boolean;
  // Card / container style on light pages
  cardStyle: 'bordered' | 'elevated' | 'flat' | 'filled';
}

export const GUIDELINE_THEMES: GuidelineTheme[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, editorial with generous white space',
    pageBg: { primary: '#ffffff', secondary: '#0A0A0F', accent: 'brand' },
    textPrimary: '#0A0A0F',
    textSecondary: '#666666',
    textMuted: '#999999',
    sectionLabelStyle: 'uppercase-small',
    titleScale: 'large',
    density: 'spacious',
    accentStyle: 'line',
    showPageNumbers: true,
    showBrandMark: true,
    cardStyle: 'bordered',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Dark surfaces with vivid brand color blocks',
    pageBg: { primary: '#0A0A0F', secondary: '#0A0A0F', accent: 'brand' },
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#666666',
    sectionLabelStyle: 'accent-bar',
    titleScale: 'huge',
    density: 'normal',
    accentStyle: 'block',
    showPageNumbers: true,
    showBrandMark: true,
    cardStyle: 'filled',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Structured grid, professional, enterprise-ready',
    pageBg: { primary: '#ffffff', secondary: '#F5F5F5', accent: 'brand' },
    textPrimary: '#1a1a1a',
    textSecondary: '#555555',
    textMuted: '#aaaaaa',
    sectionLabelStyle: 'numbered',
    titleScale: 'medium',
    density: 'compact',
    accentStyle: 'line',
    showPageNumbers: true,
    showBrandMark: true,
    cardStyle: 'bordered',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-style with oversized type and drama',
    pageBg: { primary: '#ffffff', secondary: '#0A0A0F', accent: 'brand' },
    textPrimary: '#0A0A0F',
    textSecondary: '#444444',
    textMuted: '#888888',
    sectionLabelStyle: 'large-bold',
    titleScale: 'huge',
    density: 'spacious',
    accentStyle: 'circle',
    showPageNumbers: false,
    showBrandMark: true,
    cardStyle: 'flat',
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Black & white with single accent color',
    pageBg: { primary: '#ffffff', secondary: '#000000', accent: 'brand' },
    textPrimary: '#000000',
    textSecondary: '#333333',
    textMuted: '#999999',
    sectionLabelStyle: 'uppercase-small',
    titleScale: 'large',
    density: 'normal',
    accentStyle: 'none',
    showPageNumbers: true,
    showBrandMark: false,
    cardStyle: 'bordered',
  },
];

export function getThemeById(id: string): GuidelineTheme {
  return GUIDELINE_THEMES.find(t => t.id === id) || GUIDELINE_THEMES[0];
}
