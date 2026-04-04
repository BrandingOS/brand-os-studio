import type { LayoutPreset } from '../types';

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'stacked',
    label: 'Stacked',
    description: 'Icon above the brand name',
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Icon to the left of the brand name',
  },
  {
    id: 'wordmark',
    label: 'Wordmark',
    description: 'Text only, no icon',
  },
  {
    id: 'symbol',
    label: 'Symbol',
    description: 'Icon only, no text',
  },
  {
    id: 'embedded',
    label: 'Embedded',
    description: 'Icon integrated inside the text',
  },
  {
    id: 'badge',
    label: 'Badge',
    description: 'Circular badge with icon and text',
  },
];

export const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Raleway',
  'Oswald',
  'Roboto',
  'Lato',
  'Open Sans',
  'Nunito',
  'Space Grotesk',
  'DM Sans',
  'Outfit',
  'Sora',
  'Manrope',
  'Clash Display',
  'Satoshi',
  'Cabinet Grotesk',
  'General Sans',
  'Switzer',
];

export const COLOR_PRESETS = [
  { name: 'Indigo',       primary: '#6366f1', secondary: '#a855f7' },
  { name: 'Ocean',        primary: '#0ea5e9', secondary: '#06b6d4' },
  { name: 'Emerald',      primary: '#10b981', secondary: '#34d399' },
  { name: 'Sunset',       primary: '#f97316', secondary: '#fb923c' },
  { name: 'Rose',         primary: '#f43f5e', secondary: '#fb7185' },
  { name: 'Slate',        primary: '#475569', secondary: '#94a3b8' },
  { name: 'Amber',        primary: '#f59e0b', secondary: '#fbbf24' },
  { name: 'Violet',       primary: '#8b5cf6', secondary: '#c084fc' },
  { name: 'Teal',         primary: '#14b8a6', secondary: '#5eead4' },
  { name: 'Crimson',      primary: '#dc2626', secondary: '#f87171' },
  { name: 'Midnight',     primary: '#1e293b', secondary: '#334155' },
  { name: 'Forest',       primary: '#166534', secondary: '#22c55e' },
];
