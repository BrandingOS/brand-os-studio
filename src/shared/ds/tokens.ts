/**
 * BrandingOS Design System v1 — TypeScript mirror of tokens.css.
 * Used where token values are needed in logic (contrast checks, canvas
 * rendering, tests). Keep in sync with tokens.css — the unit test in
 * tokens.test.ts asserts the accessibility floor over these values.
 */

export const dsLight = {
  bg: '#f5f4ef',
  surface: '#ffffff',
  surfaceHover: '#efeee8',
  surfaceSubtle: '#faf9f5',
  border: '#e6e4dd',
  dash: '#d4d1c7',
  text: '#0e0e0e',
  textSecondary: '#55534c',
  textMuted: '#8a877e',
  accent: '#111113',
  accentFg: '#f5f4ef',
  success: '#2f9e5f',
  warning: '#b98324',
  danger: '#b4453a',
  successBg: '#eaf3ec',
  successFg: '#2f7a4d',
  warningBg: '#faf6ec',
  warningFg: '#96691c',
  dangerBg: '#faf0ee',
  dangerFg: '#a03c31',
} as const;

export const dsDark = {
  bg: '#141414',
  surface: '#1d1c1a',
  surfaceHover: '#252420',
  surfaceSubtle: '#191816',
  border: '#2c2b27',
  dash: '#3a3833',
  text: '#f5f4f0',
  textSecondary: '#b3b0a8',
  textMuted: '#7d7a72',
  accent: '#f5f4f0',
  accentFg: '#141414',
  success: '#3fae6d',
  warning: '#d9a544',
  danger: '#d4685c',
  successBg: '#1e2b22',
  successFg: '#7bc698',
  warningBg: '#2a241a',
  warningFg: '#e0b25e',
  dangerBg: '#2a1d1b',
  dangerFg: '#e08b80',
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
