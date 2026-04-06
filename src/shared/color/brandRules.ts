import type { Brand } from '@/shared/types/brand';

// ─── Color Utilities ───────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.179;
}

export function isDarkColor(hex: string): boolean {
  return !isLightColor(hex);
}

// ─── Logo Variant Rules ────────────────────────────────────────

export type LogoVariantType =
  | 'color-light'     // Color logo on white/light bg
  | 'color-dark'      // Color logo on dark bg (if logo has enough contrast)
  | 'white-on-brand'  // White logo on brand primary bg
  | 'white-on-dark'   // White logo on dark/black bg
  | 'black-on-light'  // Black logo on white/light bg
  | 'brand-on-light'  // Brand-color logo on white bg
  | 'mono-dark'       // Monochrome dark for print
  | 'mono-light';     // Monochrome light for reverse print

export interface LogoVariant {
  id: string;
  name: string;
  type: LogoVariantType;
  bgColor: string;
  logoSrc: string;
  logoFilter?: string;
  description: string;
  recommendedUse: string;
  isValid: boolean;
  contrastScore: number;
  warnings: string[];
  category: 'primary' | 'inverse' | 'monochrome' | 'accent';
  downloadFormats: string[];
}

export function generateLogoVariants(brand: Brand): LogoVariant[] {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const logoSrc = brand.logo || '';
  const hasLogo = !!brand.logo;

  if (!hasLogo) return [];

  const pIsLight = isLightColor(p);

  const variants: LogoVariant[] = [
    // PRIMARY VARIANTS
    {
      id: 'color-on-white',
      name: 'Full Color',
      type: 'color-light',
      bgColor: '#FFFFFF',
      logoSrc,
      description: 'Original logo on white background',
      recommendedUse: 'Website headers, documents, presentations on light surfaces',
      isValid: true,
      contrastScore: contrastRatio(p, '#FFFFFF'),
      warnings: [],
      category: 'primary',
      downloadFormats: ['SVG', 'PNG', 'PDF'],
    },
    {
      id: 'color-on-light',
      name: 'On Light Gray',
      type: 'color-light',
      bgColor: '#F5F5F5',
      logoSrc,
      description: 'Original logo on light gray background',
      recommendedUse: 'Card surfaces, subtle backgrounds, secondary placements',
      isValid: true,
      contrastScore: contrastRatio(p, '#F5F5F5'),
      warnings: [],
      category: 'primary',
      downloadFormats: ['SVG', 'PNG'],
    },

    // INVERSE VARIANTS
    {
      id: 'white-on-brand',
      name: 'White on Brand',
      type: 'white-on-brand',
      bgColor: p,
      logoSrc,
      logoFilter: 'brightness(0) invert(1)',
      description: `White logo on ${brand.name} brand color`,
      recommendedUse: 'Hero sections, branded surfaces, social media covers',
      isValid: contrastRatio('#FFFFFF', p) >= 3,
      contrastScore: contrastRatio('#FFFFFF', p),
      warnings: contrastRatio('#FFFFFF', p) < 3 ? ['Low contrast — white logo may not be visible on this brand color'] : [],
      category: 'inverse',
      downloadFormats: ['SVG', 'PNG', 'PDF'],
    },
    {
      id: 'white-on-dark',
      name: 'White on Dark',
      type: 'white-on-dark',
      bgColor: '#0A0A0F',
      logoSrc,
      logoFilter: 'brightness(0) invert(1)',
      description: 'White logo on dark/black background',
      recommendedUse: 'Dark mode, video outros, dark presentations, merchandise',
      isValid: true,
      contrastScore: contrastRatio('#FFFFFF', '#0A0A0F'),
      warnings: [],
      category: 'inverse',
      downloadFormats: ['SVG', 'PNG', 'PDF'],
    },

    // MONOCHROME
    {
      id: 'black-on-white',
      name: 'Black Mono',
      type: 'black-on-light',
      bgColor: '#FFFFFF',
      logoSrc,
      logoFilter: 'grayscale(1) brightness(0)',
      description: 'Single-color black logo for monochrome applications',
      recommendedUse: 'Print (newspapers, fax), embossing, legal documents, stamps',
      isValid: true,
      contrastScore: 21,
      warnings: [],
      category: 'monochrome',
      downloadFormats: ['SVG', 'PNG', 'PDF', 'EPS'],
    },
    {
      id: 'white-mono',
      name: 'White Mono',
      type: 'mono-light',
      bgColor: '#1A1A2E',
      logoSrc,
      logoFilter: 'brightness(0) invert(1)',
      description: 'Single-color white logo for dark surfaces',
      recommendedUse: 'Dark backgrounds, photography overlays, event backdrops',
      isValid: true,
      contrastScore: contrastRatio('#FFFFFF', '#1A1A2E'),
      warnings: [],
      category: 'monochrome',
      downloadFormats: ['SVG', 'PNG'],
    },

    // ACCENT VARIANTS
    {
      id: 'on-secondary',
      name: `On ${brand.secondaryColor ? 'Secondary' : 'Accent'}`,
      type: 'white-on-brand',
      bgColor: s,
      logoSrc,
      logoFilter: isDarkColor(s) ? 'brightness(0) invert(1)' : 'grayscale(1) brightness(0)',
      description: `Logo on secondary brand color`,
      recommendedUse: 'Accent surfaces, campaign materials, seasonal variants',
      isValid: contrastRatio(isDarkColor(s) ? '#FFFFFF' : '#000000', s) >= 3,
      contrastScore: contrastRatio(isDarkColor(s) ? '#FFFFFF' : '#000000', s),
      warnings: contrastRatio(isDarkColor(s) ? '#FFFFFF' : '#000000', s) < 3 ? ['Low contrast on secondary color'] : [],
      category: 'accent',
      downloadFormats: ['SVG', 'PNG'],
    },
    {
      id: 'transparent',
      name: 'Transparent',
      type: 'color-light',
      bgColor: 'transparent',
      logoSrc,
      description: 'Original logo with transparent background',
      recommendedUse: 'Overlays, watermarks, layered compositions, presentations',
      isValid: true,
      contrastScore: 0,
      warnings: ['Transparent — contrast depends on placement surface'],
      category: 'primary',
      downloadFormats: ['SVG', 'PNG'],
    },
  ];

  return variants;
}

// ─── Profile Icon Rules ────────────────────────────────────────

export interface ProfileIconConfig {
  logoSrc: string;
  bgColor: string;
  logoFilter?: string;
  padding: string;
  shape: 'circle' | 'rounded-square';
  isValid: boolean;
  warning?: string;
}

export function getProfileIconConfig(brand: Brand): ProfileIconConfig[] {
  const p = brand.primaryColor;
  const hasLogo = !!brand.logo;

  if (!hasLogo) {
    return [{
      logoSrc: '',
      bgColor: p,
      padding: '25%',
      shape: 'circle',
      isValid: true,
    }];
  }

  const configs: ProfileIconConfig[] = [
    // Brand color bg + white logo
    {
      logoSrc: brand.logo!,
      bgColor: p,
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'circle',
      isValid: contrastRatio('#FFFFFF', p) >= 3,
      warning: contrastRatio('#FFFFFF', p) < 3 ? 'Low contrast' : undefined,
    },
    // White bg + color logo
    {
      logoSrc: brand.logo!,
      bgColor: '#FFFFFF',
      padding: '20%',
      shape: 'circle',
      isValid: true,
    },
    // Dark bg + white logo
    {
      logoSrc: brand.logo!,
      bgColor: '#0A0A0F',
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'circle',
      isValid: true,
    },
    // Brand color bg + white logo (square)
    {
      logoSrc: brand.logo!,
      bgColor: p,
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'rounded-square',
      isValid: contrastRatio('#FFFFFF', p) >= 3,
    },
    // White bg (square)
    {
      logoSrc: brand.logo!,
      bgColor: '#FFFFFF',
      padding: '20%',
      shape: 'rounded-square',
      isValid: true,
    },
    // Dark bg (square)
    {
      logoSrc: brand.logo!,
      bgColor: '#0A0A0F',
      logoFilter: 'brightness(0) invert(1)',
      padding: '20%',
      shape: 'rounded-square',
      isValid: true,
    },
  ];

  return configs.filter(c => c.isValid);
}

// ─── Brand Validation ──────────────────────────────────────────

export interface BrandValidationResult {
  isValid: boolean;
  issues: BrandIssue[];
  score: number; // 0-100
}

export interface BrandIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

export function validateBrand(brand: Brand): BrandValidationResult {
  const issues: BrandIssue[] = [];

  // Logo checks
  if (!brand.logo) {
    issues.push({ severity: 'warning', field: 'logo', message: 'No logo uploaded — using text fallback' });
  }

  // Color checks
  if (!brand.primaryColor) {
    issues.push({ severity: 'error', field: 'primaryColor', message: 'Primary brand color is missing' });
  }

  if (brand.primaryColor && brand.secondaryColor) {
    const cr = contrastRatio(brand.primaryColor, brand.secondaryColor);
    if (cr < 1.5) {
      issues.push({ severity: 'warning', field: 'colors', message: 'Primary and secondary colors are too similar — may cause confusion' });
    }
  }

  // White text on primary
  if (brand.primaryColor) {
    const whiteOnPrimary = contrastRatio('#FFFFFF', brand.primaryColor);
    if (whiteOnPrimary < 3) {
      issues.push({ severity: 'warning', field: 'primaryColor', message: `White text on primary color has low contrast (${whiteOnPrimary.toFixed(1)}:1) — inverse logos may not be visible` });
    }
  }

  // Typography checks
  if (!brand.fonts?.primary) {
    issues.push({ severity: 'warning', field: 'fonts', message: 'No primary font selected' });
  }

  // Name checks
  if (!brand.name || brand.name.length < 2) {
    issues.push({ severity: 'error', field: 'name', message: 'Brand name is too short or missing' });
  }

  // Score calculation
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 25 - warningCount * 10);

  return {
    isValid: errorCount === 0,
    issues,
    score,
  };
}

// ─── Safe Logo Selection ───────────────────────────────────────

export function getSafeLogoForBackground(brand: Brand, bgColor: string): { filter?: string; warning?: string } {
  if (!brand.logo) return {};

  const bgIsLight = isLightColor(bgColor);
  const brandColorLuminance = relativeLuminance(brand.primaryColor);

  if (bgIsLight) {
    // Light background — use original color logo (should be dark/vivid enough)
    const cr = contrastRatio(brand.primaryColor, bgColor);
    if (cr < 2) {
      return { filter: 'grayscale(1) brightness(0)', warning: 'Logo color too similar to background — using black version' };
    }
    return {};
  } else {
    // Dark background — use white version
    return { filter: 'brightness(0) invert(1)' };
  }
}
