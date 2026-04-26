/**
 * Shared illustration props + brand palette tokens for the
 * uniex pitch-deck illustration set.
 *
 * Keep tokens here so the whole illustration family stays in
 * lockstep with the brand. Variants can override per-instance
 * but should never hardcode different navy/green values.
 */

import type { CSSProperties } from 'react';

export const PAL = {
  navy: '#001563',
  navyDeep: '#0A0F2E',
  green: '#68BE69',
  greenDark: '#3F8C40',
  white: '#FFFFFF',
  paper: '#F5F7FB',
  orange: '#F59E0B',
  orangeDeep: '#E07B00',
  blue: '#3B82F6',
  blueDeep: '#1E40AF',
  purple: '#A855F7',
  purpleDeep: '#7E2CCC',
  yellow: '#FBBF24',
  red: '#EF4444',
  skin: '#F4C9A8',
  skinShade: '#E0AD86',
  hair: '#0A0F2E',
} as const;

export interface IllustrationProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** When true, renders without a background fill (just the figure). */
  transparent?: boolean;
}
