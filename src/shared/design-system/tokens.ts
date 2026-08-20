/**
 * BrandingOS Design System — Design Tokens
 *
 * Central source of truth for all design values.
 * These tokens are used by components and map to CSS variables / Tailwind classes.
 */

// ─── Typography Scale ────────────────────────────────────────────────
export const typography = {
  fonts: {
    display: 'font-display', // Plus Jakarta Sans
    body: 'font-sans',       // Inter
    mono: 'font-mono',       // System monospace
  },
  sizes: {
    'xs': 'text-xs',         // 12px
    'sm': 'text-sm',         // 14px
    'base': 'text-base',     // 16px
    'lg': 'text-lg',         // 18px
    'xl': 'text-xl',         // 20px
    '2xl': 'text-2xl',       // 24px
    '3xl': 'text-3xl',       // 30px
    '4xl': 'text-4xl',       // 36px
    '5xl': 'text-5xl',       // 48px
    '6xl': 'text-6xl',       // 60px
  },
  weights: {
    normal: 'font-normal',   // 400
    medium: 'font-medium',   // 500
    semibold: 'font-semibold', // 600
    bold: 'font-bold',       // 700
  },
  leading: {
    tight: 'leading-tight',   // 1.25
    snug: 'leading-snug',     // 1.375
    normal: 'leading-normal', // 1.5
    relaxed: 'leading-relaxed', // 1.625
  },
} as const;

// ─── Spacing Scale (4px base) ────────────────────────────────────────
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ─── Spacing Semantic Tokens ─────────────────────────────────────────
export const spacingTokens = {
  // Page-level
  pageInset: 'px-4 sm:px-6 lg:px-8',
  pageY: 'py-6 lg:py-8',

  // Section-level
  sectionGap: 'space-y-8',
  sectionY: 'py-8',

  // Card-level
  cardPadding: 'p-5 sm:p-6',
  cardGap: 'gap-4',

  // Component-level
  inputGap: 'gap-2',
  buttonGap: 'gap-2',
  inlineGap: 'gap-3',
  stackGap: 'space-y-4',

  // Grid gaps
  gridGapSm: 'gap-3',
  gridGapMd: 'gap-4',
  gridGapLg: 'gap-6',
} as const;

// ─── Elevation / Shadows ─────────────────────────────────────────────
export const elevation = {
  0: 'shadow-none',
  1: 'shadow-sm',            // Subtle cards
  2: 'shadow-md',            // Elevated cards
  3: 'shadow-lg',            // Dropdowns, popovers
  4: 'shadow-xl',            // Modals
  5: 'shadow-2xl',           // Floating elements
  elegant: 'shadow-elegant', // Custom premium shadow
  glow: 'shadow-glow',       // Glow effect
} as const;

// ─── Border Radius Scale ─────────────────────────────────────────────
export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',          // 10px
  md: 'rounded-md',          // 12px
  lg: 'rounded-lg',          // 14px (default)
  xl: 'rounded-xl',          // 16px
  '2xl': 'rounded-2xl',      // 20px
  full: 'rounded-full',      // Pill
} as const;

// ─── Z-Index Scale ───────────────────────────────────────────────────
export const zIndex = {
  base: 'z-0',
  raised: 'z-10',
  dropdown: 'z-20',
  sticky: 'z-30',
  overlay: 'z-40',
  modal: 'z-50',
  toast: 'z-[60]',
  tooltip: 'z-[70]',
  max: 'z-[100]',
} as const;

// ─── Transition Presets ──────────────────────────────────────────────
export const transitions = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
  spring: 'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
} as const;

// ─── Container Widths ────────────────────────────────────────────────
export const containers = {
  xs: 'max-w-md',            // 448px — modals, small forms
  sm: 'max-w-xl',            // 576px — focused content
  md: 'max-w-3xl',           // 768px — article width
  lg: 'max-w-5xl',           // 1024px — standard page
  xl: 'max-w-6xl',           // 1152px — wide page (container-tight)
  '2xl': 'max-w-7xl',        // 1280px — full dashboard
  full: 'max-w-full',        // No limit
} as const;

// ─── Grid Presets ────────────────────────────────────────────────────
export const grids = {
  '1col': 'grid grid-cols-1',
  '2col': 'grid grid-cols-1 md:grid-cols-2',
  '3col': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  '4col': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  'auto-fill-sm': 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
  'auto-fill-md': 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
  'auto-fill-lg': 'grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))]',
} as const;

// ─── Color Semantic Tokens (class references) ────────────────────────
export const colors = {
  // Surfaces
  surface: {
    base: 'bg-background',
    raised: 'bg-card',
    muted: 'bg-muted',
    overlay: 'bg-background/80 backdrop-blur-sm',
    inverse: 'bg-primary',
  },
  // Text
  text: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    inverse: 'text-primary-foreground',
    accent: 'text-primary',
    danger: 'text-destructive',
  },
  // Borders
  border: {
    default: 'border-border',
    muted: 'border-border/50',
    strong: 'border-foreground/20',
    accent: 'border-primary',
  },
} as const;

// ─── Animation Presets ───────────────────────────────────────────────
export const animations = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  slideIn: 'animate-slide-in-right',
  slideOut: 'animate-slide-out-right',
  float: 'animate-float',
  glow: 'animate-glow',
} as const;
