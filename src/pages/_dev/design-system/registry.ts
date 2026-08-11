/**
 * DS Controller — the ONE canonical schema.
 *
 * This registry drives BOTH columns of the controller: the left control
 * panel and the right live-preview sections are generated from the same
 * SECTIONS list, in the same order — there is no second taxonomy to
 * drift. Metadata ONLY (names, grouping, purpose, consumers, control
 * kind). Default VALUES are never duplicated here: the controller reads
 * them at runtime from the real tokens.css via computed-style probes, so
 * tokens.css/tokens.ts stay the single canonical source. A unit test
 * asserts every cssVar listed here actually exists in tokens.css, and
 * that this registry covers every token in tokens.json.
 *
 * Deliberately restrained: only system-level decisions are exposed. Type
 * scale, per-component paddings, border widths etc. are component design,
 * not tokens — they appear in FIXED_PROPERTIES below (read-only), not as
 * invented tokens.
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

export type SectionId =
  | 'surfaces'
  | 'text'
  | 'accent'
  | 'borders'
  | 'forms'
  | 'status'
  | 'shape'
  | 'spacing'
  | 'elevation'
  | 'motion'
  | 'typography';

export interface TokenDef {
  cssVar: string;
  label: string;
  /** Section id — the single taxonomy both columns render. */
  group: SectionId;
  /** true → the token has separate light/dark values; false → one global value. */
  perMode: boolean;
  kind: TokenKind;
  /** One sentence: what this token means in the system. */
  purpose: string;
  /** Where it shows up — DS primitives and/or app surfaces. */
  usedBy: string[];
  /** Token exists in tokens.json but nothing consumes it today. */
  unused?: boolean;
  hint?: string;
}

export interface SectionDef {
  id: SectionId;
  title: string;
  /** One line under the section title on the preview side. */
  blurb: string;
}

/** The canonical section list — order is the order BOTH columns render. */
export const SECTIONS: SectionDef[] = [
  { id: 'surfaces', title: 'Surfaces', blurb: 'The stage, the cards on it, and the scrim above it.' },
  { id: 'text', title: 'Text', blurb: 'The four text roles — heading to placeholder.' },
  { id: 'accent', title: 'Accent & actions', blurb: 'The one charcoal accent and what sits on it.' },
  { id: 'borders', title: 'Borders & lines', blurb: 'Card borders, dividers, and dashed drop zones.' },
  { id: 'forms', title: 'Forms & focus', blurb: 'Focus and validation treatment on fields.' },
  { id: 'status', title: 'Status colors', blurb: 'Success, warning, danger — dot, wash, border, text.' },
  { id: 'shape', title: 'Shape', blurb: 'The six corner radii, pill to panel.' },
  { id: 'spacing', title: 'Spacing', blurb: 'The 4px-base spacing scale.' },
  { id: 'elevation', title: 'Elevation', blurb: 'Warm-neutral shadows, xs to float.' },
  { id: 'motion', title: 'Motion', blurb: 'One easing, three durations.' },
  { id: 'typography', title: 'Typography', blurb: 'The product face and the mono face.' },
];

const t = (
  cssVar: string,
  label: string,
  group: SectionId,
  kind: TokenKind,
  purpose: string,
  usedBy: string[],
  extra: Partial<TokenDef> = {},
): TokenDef => ({
  cssVar,
  label,
  group,
  kind,
  purpose,
  usedBy,
  perMode: kind === 'color' || kind === 'text' ? true : false,
  ...extra,
});

export const DS_TOKENS: TokenDef[] = [
  // ── Surfaces ─────────────────────────────────────────────────
  t('--ds-bg', 'Background', 'surfaces', 'color', 'The page stage every surface sits on.', ['Pages', 'Workspace shell']),
  t('--ds-surface', 'Surface', 'surfaces', 'color', 'Cards, panels, inputs, menus.', ['Cards', 'Inputs', 'Menus', 'Modals']),
  t('--ds-surface-hover', 'Surface hover', 'surfaces', 'color', 'Quiet hover fill on rows and tiles.', ['Menu items', 'Chips', 'Secondary buttons', 'Studio hovers']),
  t('--ds-surface-subtle', 'Surface subtle', 'surfaces', 'color', 'Recessed wells — asset rows, drop zones.', ['Asset rows', 'Drop zones', 'Studio wells']),
  t('--ds-scrim', 'Modal scrim', 'surfaces', 'text', 'The dimming veil behind modals.', ['Modals', 'Confirm dialogs', 'Pickers']),

  // ── Text ─────────────────────────────────────────────────────
  t('--ds-text', 'Text', 'text', 'color', 'Primary copy — near-black / warm white.', ['Headings', 'Body', 'Buttons']),
  t('--ds-text-secondary', 'Text secondary', 'text', 'color', 'Supporting copy one step quieter.', ['Descriptions', 'Labels']),
  t('--ds-text-muted', 'Text muted', 'text', 'color', 'Meta, eyebrows, timestamps.', ['Eyebrows', 'Meta rows', 'Empty states']),
  t('--ds-text-placeholder', 'Placeholder', 'text', 'color', 'Placeholder text inside empty fields.', ['Inputs', 'Textareas', 'Selects']),

  // ── Accent & actions ─────────────────────────────────────────
  t('--ds-accent', 'Accent', 'accent', 'color', 'The one solid accent — primary buttons, active nav.', ['Primary buttons', 'Active tabs', 'Progress fill']),
  t('--ds-accent-fg', 'Accent foreground', 'accent', 'color', 'Text and icons on the accent.', ['Primary button label', 'Active tab label']),

  // ── Borders & lines ──────────────────────────────────────────
  t('--ds-border', 'Border', 'borders', 'color', '1px hairline on every card and field.', ['Cards', 'Inputs', 'Menus', 'Studio chrome']),
  t('--ds-border-strong', 'Border strong', 'borders', 'text', 'Emphasis ramp of border — hover and selected edges.', ['Studio chrome (tile hovers, scrollbars)'], {
    hint: 'No DS-component consumer yet — Studio chrome only',
  }),
  t('--ds-hairline', 'Hairline', 'borders', 'color', 'Internal dividers inside a surface.', ['Menu dividers', 'List rows']),
  t('--ds-dash', 'Dash', 'borders', 'color', 'Dashed outline of empty slots and drop zones.', ['Drop zones', 'Empty states', 'Add-chips']),
  t('--ds-dash-strong', 'Dash strong', 'borders', 'text', 'Hover/drag ramp of dash.', ['Studio drop-target hovers'], {
    hint: 'No DS-component consumer yet — Studio chrome only',
  }),

  // ── Forms & focus ────────────────────────────────────────────
  t('--ds-focus-border', 'Focus border', 'forms', 'color', 'Border of a focused field.', ['Inputs', 'Textareas']),
  t('--ds-focus-ring', 'Focus ring', 'forms', 'text', 'The 3px ring around any focused control.', ['Inputs', 'Buttons', 'Switches', 'Menu items'], { hint: 'rgba() ring color' }),
  t('--ds-error-border', 'Error border', 'forms', 'color', 'Border of an invalid field.', ['Inputs', 'Textareas', 'Validation states']),
  t('--ds-error-ring', 'Error ring', 'forms', 'text', 'The 3px ring around an invalid field.', ['Inputs', 'Textareas', 'Validation states'], { hint: 'rgba() ring color' }),

  // ── Status colors ────────────────────────────────────────────
  t('--ds-success', 'Success', 'status', 'color', 'Positive status — dots, confirmations.', ['Status dots', 'Badges']),
  t('--ds-success-bg', 'Success wash', 'status', 'color', 'Soft background of success badges.', ['Badges']),
  t('--ds-success-fg', 'Success text', 'status', 'color', 'Readable success text on the wash.', ['Badges']),
  t('--ds-warning', 'Warning', 'status', 'color', 'Caution — warm amber, never yellow-green.', ['Badges', 'Draft dots']),
  t('--ds-warning-bg', 'Warning wash', 'status', 'color', 'Soft background of warning badges and banners.', ['Badges', 'Banners']),
  t('--ds-warning-border', 'Warning border', 'status', 'color', 'Border of warning banners.', ['Banners']),
  t('--ds-warning-fg', 'Warning text', 'status', 'color', 'Readable warning text on the wash.', ['Badges', 'Banners']),
  t('--ds-danger', 'Danger', 'status', 'color', 'Destructive actions and failures.', ['Danger buttons', 'Badges', 'Menu items']),
  t('--ds-danger-bg', 'Danger wash', 'status', 'color', 'Soft background of danger badges and banners.', ['Badges', 'Banners', 'Menu hover']),
  t('--ds-danger-border', 'Danger border', 'status', 'color', 'Border of danger banners.', ['Banners']),
  t('--ds-danger-fg', 'Danger text', 'status', 'color', 'Readable danger text on the wash.', ['Badges', 'Banners']),

  // ── Shape ────────────────────────────────────────────────────
  t('--ds-radius-pill', 'Pill', 'shape', 'size', 'Fully-round: buttons, chips, search inputs.', ['Buttons', 'Chips', 'Pill inputs']),
  t('--ds-radius-control', 'Control', 'shape', 'size', 'Small controls: nav buttons, menu items.', ['Menu items', 'Segmented', 'Kbd']),
  t('--ds-radius-tile', 'Tile', 'shape', 'size', 'Small tiles and swatches.', ['Swatches', 'Tiles']),
  t('--ds-radius-menu', 'Menu', 'shape', 'size', 'Menus, toasts, banners.', ['Menus', 'Toasts', 'Banners']),
  t('--ds-radius-card', 'Card', 'shape', 'size', 'Cards, fields, modals.', ['Cards', 'Inputs', 'Modals']),
  t('--ds-radius-panel', 'Panel', 'shape', 'size', 'Page-level floating panels.', ['Panels', 'Sidebars']),

  // ── Spacing ──────────────────────────────────────────────────
  t('--ds-space-1', 'Space 1 · 4px', 'spacing', 'size', 'Tightest gap — icon-to-label.', ['Studio chrome']),
  t('--ds-space-2', 'Space 2 · 8px', 'spacing', 'size', 'Gap between small controls.', ['Studio chrome']),
  t('--ds-space-3', 'Space 3 · 12px', 'spacing', 'size', 'Row gaps inside components.', ['Studio chrome']),
  t('--ds-space-4', 'Space 4 · 16px', 'spacing', 'size', 'Default gap between blocks.', ['Studio chrome']),
  t('--ds-space-5', 'Space 5 · 20px', 'spacing', 'size', 'Section-internal padding.', ['Studio chrome']),
  t('--ds-space-6', 'Space 6 · 24px', 'spacing', 'size', 'Card and modal padding.', ['Modals']),
  t('--ds-space-8', 'Space 8 · 32px', 'spacing', 'size', 'Large section gap.', [], { unused: true }),
  t('--ds-space-12', 'Space 12 · 48px', 'spacing', 'size', 'Page-level gap.', [], { unused: true }),
  t('--ds-space-16', 'Space 16 · 64px', 'spacing', 'size', 'Hero-level gap.', ['Studio chrome']),

  // ── Elevation ────────────────────────────────────────────────
  t('--ds-shadow-xs', 'Shadow xs', 'elevation', 'shadow', 'Resting lift for small tiles.', ['Upload tiles', 'Studio chrome']),
  t('--ds-shadow-sm', 'Shadow sm', 'elevation', 'shadow', 'Cards at rest.', ['Cards', 'Panels']),
  t('--ds-shadow-md', 'Shadow md', 'elevation', 'shadow', 'Hovered / lifted cards.', ['Card hovers', 'Menus']),
  t('--ds-shadow-float', 'Shadow float', 'elevation', 'shadow', 'The biggest float — modals, pickers.', ['Modals', 'Floating panels']),

  // ── Motion ───────────────────────────────────────────────────
  t('--ds-ease', 'Easing', 'motion', 'easing', 'The one easing curve for everything.', ['All transitions']),
  t('--ds-duration-state', 'State · hover/fade', 'motion', 'duration', 'Hovers, fades, small state flips.', ['Buttons', 'Menu items', 'Inputs']),
  t('--ds-duration-panel', 'Panel · slide', 'motion', 'duration', 'Panels and the tab-bar slide.', ['Tab bar', 'Panels']),
  t('--ds-duration-modal', 'Modal · enter', 'motion', 'duration', 'Modal scale-in.', ['Modals']),

  // ── Typography ───────────────────────────────────────────────
  t('--ds-font', 'Product face', 'typography', 'font', 'The one product typeface.', ['Everything']),
  t('--ds-font-mono', 'Mono face', 'typography', 'font', 'Hex codes and technical values.', ['Kbd', 'Hex readouts']),
];

/** Which draft scope a token edits in a given mode. */
export function tokenScope(def: TokenDef, mode: ThemeMode): ThemeMode | 'global' {
  return def.perMode ? mode : 'global';
}

export const tokensForSection = (id: SectionId): TokenDef[] =>
  DS_TOKENS.filter((d) => d.group === id);

/* ─── Coverage: fixed / component-owned properties ─────────────
 * Visual decisions the showcase demonstrates that are deliberately NOT
 * tokens. Shown read-only below the token sections so nobody hunts for
 * a control that doesn't exist — and so nobody invents tokens for them. */

export interface FixedProperty {
  component: string;
  property: string;
  value: string;
  reason: string;
}

export const FIXED_PROPERTIES: FixedProperty[] = [
  {
    component: 'Focus treatment',
    property: 'Ring width',
    value: '3px',
    reason: 'The charcoal focus ring is always 3px — a system constant, not a knob. Its COLOR is the Focus ring token.',
  },
  {
    component: 'Cards · fields · menus',
    property: 'Border width',
    value: '1px',
    reason: 'One hairline weight everywhere; only the border COLOR is tokenized.',
  },
  {
    component: 'DsButton',
    property: 'Disabled state',
    value: 'primary at 40% opacity',
    reason: 'DS rule: grey is never an enabled state — disabled derives from the accent, no separate token.',
  },
  {
    component: 'DsButton',
    property: 'Danger solid',
    value: 'only non-charcoal filled button',
    reason: 'A rule, not a value: danger solid is reserved for irreversible deletes.',
  },
  {
    component: 'Icons',
    property: 'Stroke',
    value: '1.8px line icons',
    reason: 'Icons are 1.8px-stroke lines, never filled — a drawing rule for the icon set.',
  },
  {
    component: 'DsEyebrow',
    property: 'Case + tracking',
    value: 'uppercase · 0.14em',
    reason: 'Eyebrows are the ONLY uppercase in the system; tokenizing would invite misuse.',
  },
  {
    component: 'Type scale',
    property: 'Font sizes / weights',
    value: 'per component role',
    reason: 'The scale is component design (34/20/13.5/12/11…), owned by each primitive, not tokens.',
  },
  {
    component: 'DsSwitch · DsCheckbox',
    property: 'Control dimensions',
    value: '34×20 track · 16px box',
    reason: 'Selection-control geometry is component-owned; resizing it is a component redesign.',
  },
  {
    component: 'Buttons · inputs',
    property: 'Paddings / heights',
    value: 'per size variant (md / sm)',
    reason: 'Density belongs to the component size variants, not the token sheet.',
  },
];
