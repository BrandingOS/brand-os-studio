/**
 * Variable Map — flattens a Brand object into a key-value map
 * that the interpolation engine can resolve {{variables}} against.
 */
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';

/**
 * Build a flat variable map from a Brand object.
 *
 * Maps brand properties to the `{{brand.*}}` namespace:
 * - brand.colors.primary → brand.primaryColor
 * - brand.fonts.primary → brand.fonts.primary
 * - brand.logo → brand.logo
 * - etc.
 *
 * Also computes derived variables (lighten, darken, opacity).
 */
export function buildVariableMap(brand: Brand): Record<string, string> {
  const map: Record<string, string> = {};

  // Identity
  map['brand.name'] = brand.name || '';
  map['brand.logo'] = brand.logo || '';
  map['brand.logo.full'] = logoUrl(brand) || '';
  map['brand.logo.icon'] = logoUrl(brand, 'iconmark') || '';
  map['brand.logo.wordmark'] = logoUrl(brand, 'wordmark') || '';
  map['brand.logo.dark'] = logoUrl(brand, 'mono.black') || '';
  map['brand.logo.light'] = logoUrl(brand, 'mono.white') || '';
  map['brand.logo.alternate'] = brand.logoAssets?.alternate || '';

  // Colors
  const primary = brand.primaryColor || '#000000';
  const secondary = brand.secondaryColor || '#666666';
  map['brand.colors.primary'] = primary;
  map['brand.colors.secondary'] = secondary;
  map['brand.colors.primary.light'] = lighten(primary, 20);
  map['brand.colors.primary.dark'] = darken(primary, 20);
  map['brand.colors.primary.10'] = withOpacity(primary, 0.1);
  map['brand.colors.primary.20'] = withOpacity(primary, 0.2);
  map['brand.colors.primary.30'] = withOpacity(primary, 0.3);
  map['brand.colors.primary.50'] = withOpacity(primary, 0.5);
  map['brand.colors.secondary.light'] = lighten(secondary, 20);
  map['brand.colors.secondary.dark'] = darken(secondary, 20);
  map['brand.colors.secondary.10'] = withOpacity(secondary, 0.1);
  map['brand.colors.secondary.20'] = withOpacity(secondary, 0.2);

  // Palette from guidelines (if set)
  const palette = brand.guidelines?.colorPalette;
  if (palette?.primary?.hex) map['brand.colors.palette.primary'] = palette.primary.hex;
  if (palette?.secondary?.hex) map['brand.colors.palette.secondary'] = palette.secondary.hex;

  // Typography
  map['brand.fonts.primary'] = brand.fonts?.primary || 'Inter';
  map['brand.fonts.secondary'] = brand.fonts?.secondary || brand.fonts?.primary || 'Inter';

  // Strategy
  map['brand.tone'] = brand.tone || '';
  map['brand.audience'] = brand.audience || '';
  const strategy = brand.guidelines?.strategy;
  map['brand.strategy.mission'] = strategy?.mission || '';
  map['brand.strategy.vision'] = strategy?.vision || '';
  map['brand.strategy.positioning'] = strategy?.positioning || '';
  if (strategy?.values) {
    strategy.values.forEach((v, i) => {
      map[`brand.strategy.values.${i}`] = v;
    });
  }

  // Voice
  const voice = brand.guidelines?.voiceAndTone;
  map['brand.voice.style'] = voice?.voice || '';
  if (voice?.toneAttributes) {
    voice.toneAttributes.forEach((a, i) => {
      map[`brand.voice.attributes.${i}`] = a;
    });
  }

  return map;
}

// ─── Color utilities (inline to avoid circular deps) ───────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function withOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex.slice(0, 7) + alpha;
}
