/**
 * DS Controller — editable-token registry.
 *
 * Metadata ONLY (names, grouping, control kind). Default VALUES are never
 * duplicated here: the controller reads them at runtime from the real
 * tokens.css via computed-style probes, so tokens.css/tokens.ts stay the
 * single canonical source. A unit test asserts every cssVar listed here
 * actually exists in tokens.css.
 *
 * Deliberately restrained: only system-level decisions are exposed. Type
 * scale, per-component paddings, border widths etc. are component design,
 * not tokens — do not add them here without adding real tokens first.
 */

export type ThemeMode = 'light' | 'dark';

export type TokenKind =
  | 'color'      // #rrggbb — color picker + hex text
  | 'text'       // free string (rgba() colors, scrims)
  | 'size'       // px number
  | 'shadow'     // raw box-shadow string
  | 'duration'   // ms number
  | 'easing'     // timing function string
  | 'font';      // font-family stack

export interface TokenDef {
  cssVar: string;
  label: string;
  group: TokenGroup;
  /** true → the token has separate light/dark values; false → one global value. */
  perMode: boolean;
  kind: TokenKind;
  hint?: string;
}

export const TOKEN_GROUPS = [
  'Core colors',
  'Status colors',
  'Borders',
  'Typography',
  'Radius',
  'Spacing',
  'Shadows',
  'Motion',
] as const;
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

const color = (cssVar: string, label: string, hint?: string): TokenDef => ({
  cssVar, label, hint, group: 'Core colors', perMode: true, kind: 'color',
});

export const DS_TOKENS: TokenDef[] = [
  // Core colors — per mode
  color('--ds-bg', 'Background', 'The stage every page sits on'),
  color('--ds-surface', 'Surface', 'Cards, panels, inputs'),
  color('--ds-surface-hover', 'Surface hover', 'Row hovers, quiet fills'),
  color('--ds-surface-subtle', 'Surface subtle', 'Asset rows, drop zones'),
  color('--ds-text', 'Text', 'Near-black / warm white'),
  color('--ds-text-secondary', 'Text secondary', 'Supporting copy'),
  color('--ds-text-muted', 'Text muted', 'Meta, eyebrows'),
  color('--ds-text-placeholder', 'Placeholder'),
  color('--ds-accent', 'Accent', 'Primary buttons, active nav'),
  color('--ds-accent-fg', 'Accent foreground', 'Text on the accent'),
  color('--ds-focus-border', 'Focus border'),
  { cssVar: '--ds-focus-ring', label: 'Focus ring', group: 'Core colors', perMode: true, kind: 'text', hint: '3px ring color (rgba)' },
  { cssVar: '--ds-scrim', label: 'Modal scrim', group: 'Core colors', perMode: true, kind: 'text' },

  // Status colors — per mode
  { cssVar: '--ds-success', label: 'Success', group: 'Status colors', perMode: true, kind: 'color', hint: 'Status dots, confirmations' },
  { cssVar: '--ds-success-bg', label: 'Success wash', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-success-fg', label: 'Success text', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-warning', label: 'Warning', group: 'Status colors', perMode: true, kind: 'color', hint: 'Warm amber, never yellow-green' },
  { cssVar: '--ds-warning-bg', label: 'Warning wash', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-warning-border', label: 'Warning border', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-warning-fg', label: 'Warning text', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-danger', label: 'Danger', group: 'Status colors', perMode: true, kind: 'color', hint: 'Destructive actions, errors' },
  { cssVar: '--ds-danger-bg', label: 'Danger wash', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-danger-border', label: 'Danger border', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-danger-fg', label: 'Danger text', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-error-border', label: 'Field error border', group: 'Status colors', perMode: true, kind: 'color' },
  { cssVar: '--ds-error-ring', label: 'Field error ring', group: 'Status colors', perMode: true, kind: 'text' },

  // Borders — per mode
  { cssVar: '--ds-border', label: 'Border', group: 'Borders', perMode: true, kind: 'color', hint: '1px, on every card and field' },
  { cssVar: '--ds-hairline', label: 'Hairline', group: 'Borders', perMode: true, kind: 'color', hint: 'Internal dividers' },
  { cssVar: '--ds-dash', label: 'Dash', group: 'Borders', perMode: true, kind: 'color', hint: 'Empty slots and drop zones' },

  // Typography — global (one product face; the type scale is per-role in
  // components, deliberately not tokenized)
  { cssVar: '--ds-font', label: 'Product face', group: 'Typography', perMode: false, kind: 'font' },
  { cssVar: '--ds-font-mono', label: 'Mono face', group: 'Typography', perMode: false, kind: 'font', hint: 'Hex codes, technical values' },

  // Radius — global
  { cssVar: '--ds-radius-pill', label: 'Pill', group: 'Radius', perMode: false, kind: 'size', hint: 'Buttons, chips, search inputs' },
  { cssVar: '--ds-radius-control', label: 'Control', group: 'Radius', perMode: false, kind: 'size', hint: 'Nav-bar controls, menu items' },
  { cssVar: '--ds-radius-tile', label: 'Tile', group: 'Radius', perMode: false, kind: 'size' },
  { cssVar: '--ds-radius-menu', label: 'Menu', group: 'Radius', perMode: false, kind: 'size', hint: 'Menus, toasts, banners' },
  { cssVar: '--ds-radius-card', label: 'Card', group: 'Radius', perMode: false, kind: 'size', hint: 'Cards, tiles, fields, modals' },
  { cssVar: '--ds-radius-panel', label: 'Panel', group: 'Radius', perMode: false, kind: 'size', hint: 'Page-level floating panels' },

  // Spacing — global, 4px base
  { cssVar: '--ds-space-1', label: 'Space 1', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-2', label: 'Space 2', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-3', label: 'Space 3', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-4', label: 'Space 4', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-5', label: 'Space 5', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-6', label: 'Space 6', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-8', label: 'Space 8', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-12', label: 'Space 12', group: 'Spacing', perMode: false, kind: 'size' },
  { cssVar: '--ds-space-16', label: 'Space 16', group: 'Spacing', perMode: false, kind: 'size' },

  // Shadows — global, warm-neutral, never tinted
  { cssVar: '--ds-shadow-xs', label: 'Shadow xs', group: 'Shadows', perMode: false, kind: 'shadow' },
  { cssVar: '--ds-shadow-sm', label: 'Shadow sm', group: 'Shadows', perMode: false, kind: 'shadow' },
  { cssVar: '--ds-shadow-md', label: 'Shadow md', group: 'Shadows', perMode: false, kind: 'shadow' },
  { cssVar: '--ds-shadow-float', label: 'Shadow float', group: 'Shadows', perMode: false, kind: 'shadow' },

  // Motion — one easing, three durations
  { cssVar: '--ds-ease', label: 'Easing', group: 'Motion', perMode: false, kind: 'easing', hint: 'The one easing for everything' },
  { cssVar: '--ds-duration-state', label: 'State', group: 'Motion', perMode: false, kind: 'duration', hint: 'Hovers, fades' },
  { cssVar: '--ds-duration-panel', label: 'Panel', group: 'Motion', perMode: false, kind: 'duration', hint: 'Panels, tab slide' },
  { cssVar: '--ds-duration-modal', label: 'Modal', group: 'Motion', perMode: false, kind: 'duration', hint: 'Modals' },
];

/** Which draft scope a token edits in a given mode. */
export function tokenScope(def: TokenDef, mode: ThemeMode): ThemeMode | 'global' {
  return def.perMode ? mode : 'global';
}
