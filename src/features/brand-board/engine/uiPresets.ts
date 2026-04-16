export interface UIPreset {
  name: string;
  borderRadius: number;
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'bold';
  spacing: 'compact' | 'comfortable' | 'spacious';
}

export const UI_PRESETS: UIPreset[] = [
  { name: 'Sharp & tight', borderRadius: 0, shadowIntensity: 'none', spacing: 'compact' },
  { name: 'Subtle soft', borderRadius: 4, shadowIntensity: 'subtle', spacing: 'comfortable' },
  { name: 'Rounded modern', borderRadius: 8, shadowIntensity: 'medium', spacing: 'comfortable' },
  { name: 'Pill shaped', borderRadius: 16, shadowIntensity: 'subtle', spacing: 'spacious' },
  { name: 'Bold cards', borderRadius: 12, shadowIntensity: 'bold', spacing: 'comfortable' },
  { name: 'Minimal flat', borderRadius: 2, shadowIntensity: 'none', spacing: 'spacious' },
  { name: 'Glassmorphism', borderRadius: 20, shadowIntensity: 'medium', spacing: 'spacious' },
  { name: 'Corporate', borderRadius: 4, shadowIntensity: 'subtle', spacing: 'compact' },
];

export const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  subtle: '0 1px 3px rgba(0,0,0,0.08)',
  medium: '0 4px 12px rgba(0,0,0,0.1)',
  bold: '0 8px 30px rgba(0,0,0,0.15)',
};
