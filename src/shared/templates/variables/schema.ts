/**
 * Variable Schema — the complete registry of brand variables available
 * for binding in templates.
 */

export interface VariableInfo {
  path: string;
  label: string;
  type: 'color' | 'text' | 'image' | 'font' | 'number';
  category: 'colors' | 'typography' | 'identity' | 'strategy' | 'voice';
  example: string;
}

/** All available brand variables that template authors can bind to. */
export const BRAND_VARIABLES: VariableInfo[] = [
  // Identity
  { path: 'brand.name',          label: 'Brand Name',      type: 'text',  category: 'identity', example: 'Acme Inc' },
  { path: 'brand.logo',          label: 'Logo (primary)',   type: 'image', category: 'identity', example: '/logo.png' },
  { path: 'brand.logo.icon',     label: 'Logo (icon)',      type: 'image', category: 'identity', example: '/icon.png' },
  { path: 'brand.logo.wordmark', label: 'Logo (wordmark)',  type: 'image', category: 'identity', example: '/wordmark.png' },
  { path: 'brand.logo.dark',     label: 'Logo (dark)',      type: 'image', category: 'identity', example: '/logo-dark.png' },
  { path: 'brand.logo.light',    label: 'Logo (light)',     type: 'image', category: 'identity', example: '/logo-light.png' },

  // Colors
  { path: 'brand.colors.primary',       label: 'Primary Color',     type: 'color', category: 'colors', example: '#0066FF' },
  { path: 'brand.colors.secondary',     label: 'Secondary Color',   type: 'color', category: 'colors', example: '#00D4AA' },
  { path: 'brand.colors.primary.light', label: 'Primary (light)',   type: 'color', category: 'colors', example: '#66AAFF' },
  { path: 'brand.colors.primary.dark',  label: 'Primary (dark)',    type: 'color', category: 'colors', example: '#003399' },
  { path: 'brand.colors.primary.10',    label: 'Primary (10%)',     type: 'color', category: 'colors', example: '#0066FF1A' },
  { path: 'brand.colors.primary.20',    label: 'Primary (20%)',     type: 'color', category: 'colors', example: '#0066FF33' },

  // Typography
  { path: 'brand.fonts.primary',   label: 'Primary Font',   type: 'font', category: 'typography', example: 'Inter' },
  { path: 'brand.fonts.secondary', label: 'Secondary Font', type: 'font', category: 'typography', example: 'Playfair Display' },

  // Strategy
  { path: 'brand.tone',                  label: 'Brand Tone',    type: 'text', category: 'strategy', example: 'Professional' },
  { path: 'brand.audience',              label: 'Target Audience', type: 'text', category: 'strategy', example: 'Tech professionals, 25-35' },
  { path: 'brand.strategy.mission',      label: 'Mission',        type: 'text', category: 'strategy', example: 'To empower...' },
  { path: 'brand.strategy.vision',       label: 'Vision',         type: 'text', category: 'strategy', example: 'A world where...' },
  { path: 'brand.strategy.positioning',  label: 'Positioning',    type: 'text', category: 'strategy', example: 'The leading...' },

  // Voice
  { path: 'brand.voice.style', label: 'Voice Style', type: 'text', category: 'voice', example: 'Warm and professional' },
];

/** Group variables by category for the builder UI */
export function getVariablesByCategory(): Record<string, VariableInfo[]> {
  const groups: Record<string, VariableInfo[]> = {};
  for (const v of BRAND_VARIABLES) {
    if (!groups[v.category]) groups[v.category] = [];
    groups[v.category].push(v);
  }
  return groups;
}
