/*
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source of truth: src/shared/ds/tokens.json
 * Regenerate with:  npm run gen:tokens
 * (The /_dev/design-system Controller's Save button runs the same codegen.)
 */

/** Light-mode token values, camelCased from tokens.json. */
export const dsLight = {
  bg: '#f5f4ef',
  surface: '#ffffff',
  surfaceHover: '#efeee8',
  surfaceSubtle: '#faf9f5',
  border: '#e6e4dd',
  hairline: '#efeee8',
  dash: '#d4d1c7',
  text: '#0e0e0e',
  textSecondary: '#55534c',
  textMuted: '#8a877e',
  textPlaceholder: '#a3a099',
  accent: '#111113',
  accentFg: '#f5f4ef',
  success: '#2f9e5f',
  warning: '#b98324',
  danger: '#b4453a',
  successBg: '#eaf3ec',
  successFg: '#2f7a4d',
  warningBg: '#faf6ec',
  warningBorder: '#e8d9b8',
  warningFg: '#96691c',
  dangerBg: '#faf0ee',
  dangerBorder: '#e8c5c0',
  dangerFg: '#a03c31',
  focusRing: 'rgba(17, 17, 19, 0.16)',
  focusBorder: '#b3b0a6',
  errorBorder: '#d98a80',
  errorRing: 'rgba(180, 69, 58, 0.1)',
  scrim: 'rgba(10, 10, 10, 0.35)',
} as const;

/** Dark-mode token values, camelCased from tokens.json. */
export const dsDark = {
  bg: '#141414',
  surface: '#1d1c1a',
  surfaceHover: '#252420',
  surfaceSubtle: '#191816',
  border: '#2c2b27',
  hairline: '#2c2b27',
  dash: '#3a3833',
  text: '#f5f4f0',
  textSecondary: '#b3b0a8',
  textMuted: '#7d7a72',
  textPlaceholder: '#7d7a72',
  accent: '#f5f4f0',
  accentFg: '#141414',
  success: '#3fae6d',
  warning: '#d9a544',
  danger: '#d4685c',
  successBg: '#1e2b22',
  successFg: '#7bc698',
  warningBg: '#2a241a',
  warningBorder: '#4a3d22',
  warningFg: '#e0b25e',
  dangerBg: '#2a1d1b',
  dangerBorder: '#4a2c28',
  dangerFg: '#e08b80',
  focusRing: 'rgba(245, 244, 240, 0.14)',
  focusBorder: '#55534c',
  errorBorder: '#a05248',
  errorRing: 'rgba(212, 104, 92, 0.14)',
  scrim: 'rgba(0, 0, 0, 0.5)',
} as const;

export const dsMotion = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  durationState: 150,
  durationPanel: 220,
  durationModal: 360,
} as const;

export const dsRadius = {
  pill: 999,
  control: 8,
  tile: 10,
  menu: 12,
  card: 14,
  panel: 18,
} as const;
