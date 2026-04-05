/**
 * Layout Configuration System for Guideline Templates
 *
 * Each template defines where page chrome elements appear:
 * - corners: topLeft, topRight, bottomLeft, bottomRight
 * - content: what goes in each position (logo, brandName, sectionName, pageNumber, date, custom text)
 * - styling: font sizes, opacity, spacing
 *
 * This makes every template fully customizable for future editing.
 */

export type ChromePosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'topCenter' | 'bottomCenter';

export type ChromeContent =
  | { type: 'logo' }
  | { type: 'brandName' }
  | { type: 'sectionName' }
  | { type: 'pageNumber'; format?: 'simple' | 'padded' | 'of-total' }
  | { type: 'date'; format?: 'year' | 'full' }
  | { type: 'text'; value: string }
  | { type: 'divider' }
  | { type: 'none' };

export interface ChromeConfig {
  topLeft?: ChromeContent[];
  topRight?: ChromeContent[];
  topCenter?: ChromeContent[];
  bottomLeft?: ChromeContent[];
  bottomRight?: ChromeContent[];
  bottomCenter?: ChromeContent[];
  // Header bar
  headerBar?: boolean;
  headerBarColor?: string; // 'transparent' | 'brand' | hex
  headerBarBorder?: boolean;
  // Margins
  pagePadding: number; // percentage
  contentGap: number; // px
}

export interface TemplateLayout {
  id: string;
  name: string;
  description: string;
  preview: string; // CSS gradient or color for the card preview
  chrome: ChromeConfig;
  // Page styles
  coverStyle: 'centered' | 'left-aligned' | 'full-bleed' | 'split' | 'cinematic';
  sectionDividerStyle: 'numbered-large' | 'full-color' | 'minimal-line' | 'hero-number';
  contentLayout: 'two-column' | 'single-column' | 'asymmetric' | 'grid';
  // Colors
  lightPageBg: string;
  darkPageBg: string;
  accentPageBg: string; // 'brand' means use brand.primaryColor
  // Typography
  titleWeight: number;
  bodySize: string; // clamp expression
  sectionLabelSize: string;
  // Toggles
  showSectionNumbers: boolean;
  showHeaderRule: boolean;
  showFooterRule: boolean;
}

// ─── TEMPLATE DEFINITIONS ──────────────────────────────────────

export const TEMPLATE_LAYOUTS: TemplateLayout[] = [
  {
    id: 'hyperhyve',
    name: 'Studio',
    description: 'Structured grid with centered logo header and section navigation',
    preview: 'linear-gradient(135deg, #6C3CE0, #4F2DA0)',
    chrome: {
      topLeft: [{ type: 'brandName' }, { type: 'divider' }, { type: 'sectionName' }],
      topRight: [{ type: 'logo' }],
      bottomLeft: [{ type: 'pageNumber', format: 'padded' }],
      bottomRight: [],
      headerBar: true,
      headerBarBorder: true,
      pagePadding: 5,
      contentGap: 24,
    },
    coverStyle: 'centered',
    sectionDividerStyle: 'numbered-large',
    contentLayout: 'two-column',
    lightPageBg: '#ffffff',
    darkPageBg: '#1a1a2e',
    accentPageBg: 'brand',
    titleWeight: 700,
    bodySize: 'clamp(10px,1vw,14px)',
    sectionLabelSize: '10px',
    showSectionNumbers: true,
    showHeaderRule: true,
    showFooterRule: false,
  },
  {
    id: 'identity',
    name: 'Identity',
    description: 'Full-bleed color blocks with bold logo displays',
    preview: 'linear-gradient(135deg, #0000FF, #0033CC)',
    chrome: {
      topLeft: [{ type: 'sectionName' }],
      topRight: [],
      bottomLeft: [{ type: 'text', value: '©' }, { type: 'brandName' }],
      bottomRight: [{ type: 'pageNumber', format: 'simple' }],
      headerBar: false,
      pagePadding: 4,
      contentGap: 16,
    },
    coverStyle: 'full-bleed',
    sectionDividerStyle: 'full-color',
    contentLayout: 'single-column',
    lightPageBg: '#ffffff',
    darkPageBg: '#000000',
    accentPageBg: 'brand',
    titleWeight: 900,
    bodySize: 'clamp(11px,1.1vw,15px)',
    sectionLabelSize: '9px',
    showSectionNumbers: false,
    showHeaderRule: false,
    showFooterRule: false,
  },
  {
    id: 'noteform',
    name: 'Noteform',
    description: 'Dark cinematic with editorial metadata and photography',
    preview: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
    chrome: {
      topLeft: [{ type: 'brandName' }, { type: 'text', value: 'Brand Guidelines' }, { type: 'date', format: 'year' }],
      topCenter: [{ type: 'text', value: '●' }, { type: 'text', value: 'FAQ' }],
      topRight: [{ type: 'logo' }],
      bottomLeft: [],
      bottomRight: [{ type: 'pageNumber', format: 'of-total' }],
      headerBar: true,
      headerBarColor: 'transparent',
      headerBarBorder: false,
      pagePadding: 5,
      contentGap: 32,
    },
    coverStyle: 'cinematic',
    sectionDividerStyle: 'hero-number',
    contentLayout: 'asymmetric',
    lightPageBg: '#f5f5f0',
    darkPageBg: '#1a1a1a',
    accentPageBg: 'brand',
    titleWeight: 700,
    bodySize: 'clamp(10px,0.95vw,13px)',
    sectionLabelSize: '8px',
    showSectionNumbers: true,
    showHeaderRule: false,
    showFooterRule: false,
  },
  {
    id: 'signal',
    name: 'Signal',
    description: 'Bright accent hero blocks with oversized section numbers',
    preview: 'linear-gradient(135deg, #FF3B30, #FF6B35)',
    chrome: {
      topLeft: [{ type: 'brandName' }, { type: 'text', value: 'Pitch Document' }, { type: 'date', format: 'year' }],
      topCenter: [{ type: 'text', value: '●' }, { type: 'text', value: 'Client' }],
      topRight: [{ type: 'logo' }],
      bottomLeft: [{ type: 'sectionName' }],
      bottomRight: [{ type: 'pageNumber', format: 'padded' }],
      headerBar: true,
      headerBarColor: 'transparent',
      headerBarBorder: false,
      pagePadding: 4,
      contentGap: 20,
    },
    coverStyle: 'split',
    sectionDividerStyle: 'hero-number',
    contentLayout: 'grid',
    lightPageBg: '#f5f5f0',
    darkPageBg: '#1a1a1a',
    accentPageBg: 'brand',
    titleWeight: 800,
    bodySize: 'clamp(10px,1vw,14px)',
    sectionLabelSize: '8px',
    showSectionNumbers: true,
    showHeaderRule: false,
    showFooterRule: false,
  },
];

export function getLayoutById(id: string): TemplateLayout {
  return TEMPLATE_LAYOUTS.find(l => l.id === id) || TEMPLATE_LAYOUTS[0];
}
