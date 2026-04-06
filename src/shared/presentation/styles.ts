/**
 * Presentation Styles
 *
 * Visual token sets that determine how page layouts render.
 * The same layout components produce entirely different visual results
 * depending on which PresentationStyle is active.
 */

// ── Type ───────────────────────────────────────────────

export interface PresentationStyle {
  id: string;
  name: string;
  description: string;
  preview: string; // CSS gradient for thumbnail card

  // Geometry
  cornerRadius: number; // px — 0=sharp, 24=very rounded
  cardRadius: number; // inner card radius

  // Colors (hex)
  bgLight: string;
  bgDark: string;
  bgAccent: string; // 'brand' = use brand.primaryColor
  textOnLight: string;
  textOnDark: string;
  textMuted: string;
  borderColor: string;

  // Typography
  headingFont: 'display' | 'sans' | 'serif';
  headingWeight: number; // 400-900
  bodyFont: 'sans' | 'serif' | 'mono';
  headingSize: string; // clamp expression for hero titles
  subheadingSize: string;
  bodySize: string;
  labelSize: string;
  labelTracking: string; // letter-spacing for uppercase labels

  // Layout
  pagePadding: string; // percentage e.g. '7%'
  contentGap: string; // gap between content sections
  coverAlign: 'center' | 'left' | 'right' | 'split';
  gridColumns: 2 | 3 | 4;

  // Chrome
  showHeaderRule: boolean;
  showFooterRule: boolean;
  headerStyle: 'bar' | 'minimal' | 'none';

  // Effects
  cardShadow: string; // CSS box-shadow
  cardBorder: string; // CSS border
  overlayOpacity: number; // 0-1 for image overlays
  imageFilter: string; // CSS filter for images
}

// ── Style Definitions ──────────────────────────────────

const minimal: PresentationStyle = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean and restrained — sharp edges, generous whitespace, nothing extra.',
  preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',

  cornerRadius: 0,
  cardRadius: 0,

  bgLight: '#FFFFFF',
  bgDark: '#0A0A0A',
  bgAccent: 'brand',
  textOnLight: '#171717',
  textOnDark: '#FAFAFA',
  textMuted: '#A3A3A3',
  borderColor: '#E5E5E5',

  headingFont: 'sans',
  headingWeight: 500,
  bodyFont: 'sans',
  headingSize: 'clamp(2rem, 4vw, 3.5rem)',
  subheadingSize: 'clamp(1.125rem, 2vw, 1.5rem)',
  bodySize: 'clamp(0.875rem, 1.2vw, 1rem)',
  labelSize: '0.6875rem',
  labelTracking: '0.08em',

  pagePadding: '8%',
  contentGap: '2.5rem',
  coverAlign: 'center',
  gridColumns: 2,

  showHeaderRule: false,
  showFooterRule: false,
  headerStyle: 'minimal',

  cardShadow: 'none',
  cardBorder: 'none',
  overlayOpacity: 0.3,
  imageFilter: 'none',
};

const rounded: PresentationStyle = {
  id: 'rounded',
  name: 'Rounded',
  description: 'Warm and approachable — soft corners, gentle shadows, natural tones.',
  preview: 'linear-gradient(135deg, #f0e6d3, #e8d5b8)',

  cornerRadius: 20,
  cardRadius: 16,

  bgLight: '#FAFAF7',
  bgDark: '#1A1A1A',
  bgAccent: 'brand',
  textOnLight: '#2D2A26',
  textOnDark: '#F5F0EB',
  textMuted: '#9C9487',
  borderColor: '#E8E2D9',

  headingFont: 'display',
  headingWeight: 700,
  bodyFont: 'sans',
  headingSize: 'clamp(2rem, 4.5vw, 3.75rem)',
  subheadingSize: 'clamp(1.125rem, 2.2vw, 1.625rem)',
  bodySize: 'clamp(0.9375rem, 1.3vw, 1.0625rem)',
  labelSize: '0.75rem',
  labelTracking: '0.06em',

  pagePadding: '6%',
  contentGap: '2rem',
  coverAlign: 'center',
  gridColumns: 3,

  showHeaderRule: false,
  showFooterRule: false,
  headerStyle: 'minimal',

  cardShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
  cardBorder: '1px solid rgba(0, 0, 0, 0.04)',
  overlayOpacity: 0.35,
  imageFilter: 'none',
};

const cncpt: PresentationStyle = {
  id: 'cncpt',
  name: 'CNCPT',
  description: 'Architectural and editorial — serif type, sharp geometry, considered space.',
  preview: 'linear-gradient(135deg, #1a1a1a, #333333)',

  cornerRadius: 0,
  cardRadius: 0,

  bgLight: '#FFFFFF',
  bgDark: '#0F0F0F',
  bgAccent: 'brand',
  textOnLight: '#0F0F0F',
  textOnDark: '#F0F0F0',
  textMuted: '#8A8A8A',
  borderColor: '#D4D4D4',

  headingFont: 'serif',
  headingWeight: 400,
  bodyFont: 'sans',
  headingSize: 'clamp(2.5rem, 5.5vw, 5rem)',
  subheadingSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
  bodySize: 'clamp(0.9375rem, 1.25vw, 1.0625rem)',
  labelSize: '0.6875rem',
  labelTracking: '0.15em',

  pagePadding: '9%',
  contentGap: '3rem',
  coverAlign: 'left',
  gridColumns: 2,

  showHeaderRule: true,
  showFooterRule: false,
  headerStyle: 'minimal',

  cardShadow: 'none',
  cardBorder: '1px solid #D4D4D4',
  overlayOpacity: 0.25,
  imageFilter: 'none',
};

const bold: PresentationStyle = {
  id: 'bold',
  name: 'Bold',
  description: 'High-impact and vibrant — heavy type, tight spacing, full bleed.',
  preview: 'linear-gradient(135deg, #FF3B30, #FF6B35)',

  cornerRadius: 4,
  cardRadius: 4,

  bgLight: '#FFFFFF',
  bgDark: '#111111',
  bgAccent: 'brand',
  textOnLight: '#111111',
  textOnDark: '#FFFFFF',
  textMuted: '#6B6B6B',
  borderColor: '#E0E0E0',

  headingFont: 'display',
  headingWeight: 900,
  bodyFont: 'sans',
  headingSize: 'clamp(2.5rem, 6vw, 5.5rem)',
  subheadingSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
  bodySize: 'clamp(1rem, 1.4vw, 1.125rem)',
  labelSize: '0.75rem',
  labelTracking: '0.1em',

  pagePadding: '5%',
  contentGap: '1.75rem',
  coverAlign: 'center',
  gridColumns: 3,

  showHeaderRule: false,
  showFooterRule: false,
  headerStyle: 'bar',

  cardShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.18), 0 4px 12px -4px rgba(0, 0, 0, 0.1)',
  cardBorder: 'none',
  overlayOpacity: 0.45,
  imageFilter: 'none',
};

const corporate: PresentationStyle = {
  id: 'corporate',
  name: 'Corporate',
  description: 'Structured and professional — navy tones, clear hierarchy, trusted feel.',
  preview: 'linear-gradient(135deg, #0F1B2D, #1E3A5F)',

  cornerRadius: 8,
  cardRadius: 6,

  bgLight: '#F8FAFC',
  bgDark: '#0F1B2D',
  bgAccent: 'brand',
  textOnLight: '#1E293B',
  textOnDark: '#E2E8F0',
  textMuted: '#94A3B8',
  borderColor: '#CBD5E1',

  headingFont: 'sans',
  headingWeight: 600,
  bodyFont: 'sans',
  headingSize: 'clamp(1.875rem, 4vw, 3.25rem)',
  subheadingSize: 'clamp(1.125rem, 2vw, 1.5rem)',
  bodySize: 'clamp(0.9375rem, 1.25vw, 1.0625rem)',
  labelSize: '0.6875rem',
  labelTracking: '0.1em',

  pagePadding: '7%',
  contentGap: '2.25rem',
  coverAlign: 'left',
  gridColumns: 3,

  showHeaderRule: true,
  showFooterRule: true,
  headerStyle: 'bar',

  cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
  cardBorder: '1px solid #CBD5E1',
  overlayOpacity: 0.4,
  imageFilter: 'none',
};

const playful: PresentationStyle = {
  id: 'playful',
  name: 'Playful',
  description: 'Fun and energetic — big rounds, warm colors, bouncy proportions.',
  preview: 'linear-gradient(135deg, #FF6B6B, #FFA07A)',

  cornerRadius: 24,
  cardRadius: 20,

  bgLight: '#FFF8F0',
  bgDark: '#1F1A16',
  bgAccent: 'brand',
  textOnLight: '#2D1F14',
  textOnDark: '#FFF0E6',
  textMuted: '#B09080',
  borderColor: '#F0DED0',

  headingFont: 'display',
  headingWeight: 800,
  bodyFont: 'sans',
  headingSize: 'clamp(2.25rem, 5vw, 4.25rem)',
  subheadingSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
  bodySize: 'clamp(1rem, 1.35vw, 1.125rem)',
  labelSize: '0.75rem',
  labelTracking: '0.06em',

  pagePadding: '6%',
  contentGap: '2rem',
  coverAlign: 'center',
  gridColumns: 3,

  showHeaderRule: false,
  showFooterRule: false,
  headerStyle: 'minimal',

  cardShadow: '0 6px 24px -6px rgba(255, 107, 107, 0.2), 0 3px 10px -3px rgba(0, 0, 0, 0.06)',
  cardBorder: '1px solid rgba(255, 160, 122, 0.15)',
  overlayOpacity: 0.3,
  imageFilter: 'none',
};

const editorial: PresentationStyle = {
  id: 'editorial',
  name: 'Editorial',
  description: 'Magazine-inspired — elegant serifs, asymmetric layout, refined contrast.',
  preview: 'linear-gradient(135deg, #2C1810, #4A3020)',

  cornerRadius: 0,
  cardRadius: 0,

  bgLight: '#FDFBF7',
  bgDark: '#1C1410',
  bgAccent: 'brand',
  textOnLight: '#1C1410',
  textOnDark: '#F5F0E8',
  textMuted: '#8C7B6B',
  borderColor: '#D9CEBD',

  headingFont: 'serif',
  headingWeight: 700,
  bodyFont: 'serif',
  headingSize: 'clamp(2.25rem, 5vw, 4.5rem)',
  subheadingSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
  bodySize: 'clamp(0.9375rem, 1.3vw, 1.0625rem)',
  labelSize: '0.625rem',
  labelTracking: '0.18em',

  pagePadding: '8%',
  contentGap: '2.75rem',
  coverAlign: 'split',
  gridColumns: 2,

  showHeaderRule: true,
  showFooterRule: true,
  headerStyle: 'minimal',

  cardShadow: 'none',
  cardBorder: '1px solid #D9CEBD',
  overlayOpacity: 0.3,
  imageFilter: 'none',
};

const dark: PresentationStyle = {
  id: 'dark',
  name: 'Dark',
  description: 'Cinematic and immersive — deep backgrounds, soft glows, polished surfaces.',
  preview: 'linear-gradient(135deg, #0A0A0F, #1a1a2e)',

  cornerRadius: 12,
  cardRadius: 10,

  bgLight: '#141418',
  bgDark: '#0A0A0F',
  bgAccent: 'brand',
  textOnLight: '#E4E4E7',
  textOnDark: '#FAFAFA',
  textMuted: '#71717A',
  borderColor: '#27272A',

  headingFont: 'display',
  headingWeight: 600,
  bodyFont: 'sans',
  headingSize: 'clamp(2rem, 4.5vw, 4rem)',
  subheadingSize: 'clamp(1.125rem, 2.2vw, 1.625rem)',
  bodySize: 'clamp(0.9375rem, 1.25vw, 1.0625rem)',
  labelSize: '0.6875rem',
  labelTracking: '0.1em',

  pagePadding: '7%',
  contentGap: '2.25rem',
  coverAlign: 'center',
  gridColumns: 3,

  showHeaderRule: false,
  showFooterRule: false,
  headerStyle: 'minimal',

  cardShadow: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 8px 40px -12px rgba(0, 0, 0, 0.6)',
  cardBorder: 'none',
  overlayOpacity: 0.5,
  imageFilter: 'none',
};

const glass: PresentationStyle = {
  id: 'glass',
  name: 'Glass',
  description: 'Frosted and luminous — translucent layers, gradient washes, modern depth.',
  preview: 'linear-gradient(135deg, #667eea, #764ba2)',

  cornerRadius: 16,
  cardRadius: 14,

  bgLight: '#F0F0FA',
  bgDark: '#12101F',
  bgAccent: 'brand',
  textOnLight: '#1A1830',
  textOnDark: '#F0EEF8',
  textMuted: '#8B87A8',
  borderColor: 'rgba(255, 255, 255, 0.12)',

  headingFont: 'display',
  headingWeight: 600,
  bodyFont: 'sans',
  headingSize: 'clamp(2rem, 4.5vw, 3.75rem)',
  subheadingSize: 'clamp(1.125rem, 2.2vw, 1.625rem)',
  bodySize: 'clamp(0.9375rem, 1.3vw, 1.0625rem)',
  labelSize: '0.6875rem',
  labelTracking: '0.08em',

  pagePadding: '6%',
  contentGap: '2rem',
  coverAlign: 'center',
  gridColumns: 3,

  showHeaderRule: false,
  showFooterRule: false,
  headerStyle: 'minimal',

  cardShadow: '0 8px 32px -8px rgba(102, 126, 234, 0.15), 0 4px 16px -4px rgba(0, 0, 0, 0.08)',
  cardBorder: '1px solid rgba(255, 255, 255, 0.1)',
  overlayOpacity: 0.6,
  imageFilter: 'none',
};

const swiss: PresentationStyle = {
  id: 'swiss',
  name: 'Swiss',
  description: 'Grid-locked and precise — International Typographic Style, strict geometry.',
  preview: 'linear-gradient(135deg, #FF0000, #CC0000)',

  cornerRadius: 0,
  cardRadius: 0,

  bgLight: '#FFFFFF',
  bgDark: '#000000',
  bgAccent: '#FF0000',
  textOnLight: '#000000',
  textOnDark: '#FFFFFF',
  textMuted: '#666666',
  borderColor: '#000000',

  headingFont: 'sans',
  headingWeight: 800,
  bodyFont: 'sans',
  headingSize: 'clamp(2.25rem, 5vw, 4.5rem)',
  subheadingSize: 'clamp(1.125rem, 2.2vw, 1.5rem)',
  bodySize: 'clamp(0.9375rem, 1.25vw, 1rem)',
  labelSize: '0.625rem',
  labelTracking: '0.2em',

  pagePadding: '6%',
  contentGap: '2rem',
  coverAlign: 'left',
  gridColumns: 4,

  showHeaderRule: true,
  showFooterRule: true,
  headerStyle: 'bar',

  cardShadow: 'none',
  cardBorder: '2px solid #000000',
  overlayOpacity: 0.35,
  imageFilter: 'grayscale(0.2)',
};

// ── Exports ────────────────────────────────────────────

export const PRESENTATION_STYLES: PresentationStyle[] = [
  minimal,
  rounded,
  cncpt,
  bold,
  corporate,
  playful,
  editorial,
  dark,
  glass,
  swiss,
];

/**
 * Look up a style by its id. Falls back to 'minimal' if not found.
 */
export function getStyleById(id: string): PresentationStyle {
  return PRESENTATION_STYLES.find((s) => s.id === id) ?? minimal;
}

/**
 * Extract spacing defaults from a style as customizer-compatible numbers.
 * Used to sync user-facing settings when the user picks a new style.
 *
 * - pagePadding '8%' → padding 80 (the % * 10)
 * - contentGap '2rem' → margins 20 (rem * 10)
 * - cardRadius (px) → cornerRadius (px, unchanged)
 */
export function getStyleSpacingDefaults(style: PresentationStyle): {
  padding: number;
  margins: number;
  cornerRadius: number;
} {
  // Extract percentage from pagePadding
  const padMatch = style.pagePadding.match(/(\d+(?:\.\d+)?)/);
  const padding = padMatch ? Math.round(parseFloat(padMatch[1]) * 10) : 60;

  // Extract rem from contentGap
  const gapMatch = style.contentGap.match(/(\d+(?:\.\d+)?)/);
  const margins = gapMatch ? Math.round(parseFloat(gapMatch[1]) * 10) : 20;

  return {
    padding: Math.max(20, Math.min(120, padding)),
    margins: Math.max(10, Math.min(80, margins)),
    cornerRadius: style.cardRadius,
  };
}
