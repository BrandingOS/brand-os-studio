/**
 * PRODUCT PATTERNS — semantics only.
 *
 * A pattern is a repeated composition that belongs to the Studio's shared
 * chrome rather than to the design system's primitives. Its source of truth is
 * `src/shared/styles/workspace.css`, not `src/shared/ds/*`.
 *
 * Why this layer exists, measured rather than assumed: the rendered Setup
 * screen carries 509 semantically-classed nodes, of which exactly 8 are DS
 * components (`ds-eyebrow`) plus 2 more inside a CLOSED modal. The other 92
 * distinct signatures are all defined in `workspace.css` and are shared with
 * Brand Kit and Guideline. A Figma file modelling only `shared/ds` would
 * describe ~1.6% of the screen and leave the rest as raw frames.
 *
 * See docs/code-to-figma/SETUP-COMPOSITION-MAP.md for the evidence, and
 * FIGMA-ARCHITECTURE-CONTRACT.md §2 and §4 for the promotion rule.
 *
 * The same prohibition as the component manifest applies and is enforced by
 * `figma.patterns.test.ts`: NOT ONE colour, length, radius, shadow or font name
 * may appear here. Values are measured from the running product.
 *
 * A pattern is measured IN SITU — on the real screen, at the occurrence named
 * by `at` — because that is where it ships. There is no harness cell for it.
 */

export interface FxPattern {
  /** Component name in Figma, under the `pattern/` prefix. */
  key: string;
  /** Root of every sid this pattern produces. */
  sid: string;
  /** Route that renders it, relative to the origin. */
  route: string;
  /** CSS selector for the pattern root on that route. */
  selector: string;
  /**
   * Which occurrence(s) to measure, as indexes into `querySelectorAll`.
   *
   * Deliberately explicit. `section` renders at seven different heights, so
   * "the first one" is a choice about which content the component is authored
   * around — not a detail to leave to document order by accident.
   */
  at: number[];
  /** Variant axis values, positionally matched to `at`. */
  axes?: Array<Record<string, string>>;
  /**
   * Pseudo-state to force per occurrence, positionally matched to `at`.
   *
   * Forced through CDP exactly as the component extractor does. Needed because
   * some product patterns hide meaning until hover: a colour swatch captured at
   * rest has its name and hex at `opacity: 0`, so the component would ship with
   * invisible labels and a designer could not read the palette off it.
   */
  pseudo?: Array<'default' | 'hover' | 'active' | 'focus' | 'focus-visible'>;
  /** Which node receives the forced state, relative to the pattern root. */
  pseudoTarget?: string;
  /**
   * Meaningful child roles, keyed SELECTOR -> role — the same direction the
   * component manifest uses, and the direction `roleFor` reads. Written the
   * other way round it produces sids like `.segmented-nav`, which is not a
   * legal sid segment and fails the run loudly.
   */
  roles?: Record<string, string>;
  /** Why this is a pattern and not a raw frame — the promotion evidence. */
  because: string;
}

export const FX_PATTERNS: readonly FxPattern[] = [
  // --- chrome ---------------------------------------------------------------
  {
    key: 'workspace-topbar',
    sid: 'pattern/workspace-topbar',
    route: '/b/brandingos/setup',
    selector: '[data-workspace] > header, .top-nav',
    at: [0],
    roles: {
      '.brand-switcher': 'brand',
      '.segmented-nav': 'nav',
      '.pill-btn': 'actions',
      '.theme-toggle': 'theme',
    },
    because: 'WorkspaceShell has 42 source consumers and is the front door of every Studio screen.',
  },
  {
    key: 'segmented-nav',
    sid: 'pattern/segmented-nav',
    route: '/b/brandingos/setup',
    selector: '.segmented-nav',
    at: [0],
    roles: {
      '.segmented-nav-pill': 'pill',
      '.segmented-nav-item': 'item',
    },
    because: 'Five items plus a measured sliding indicator; the Studio\'s primary navigation.',
  },
  {
    key: 'section-rail',
    sid: 'pattern/section-rail',
    route: '/b/brandingos/setup',
    selector: '.panel',
    at: [0],
    roles: {
      '.panel-heading': 'heading',
      '.panel-list': 'list',
    },
    because: 'Completion-tracking rail; the `.panel` vocabulary is shared with Guideline.',
  },
  {
    key: 'rail-row',
    sid: 'pattern/rail-row',
    route: '/b/brandingos/setup',
    selector: '.panel-item',
    // The first row is complete and has a thumb; the LAST has neither, which is
    // a different cell rather than the same one rendered short.
    at: [0, 6],
    axes: [{ state: 'filled' }, { state: 'empty' }],
    roles: {
      '.panel-item-thumb': 'thumb',
      '.panel-item-name': 'name',
      '.panel-item-sub': 'sub',
      '.status-chip': 'chip',
    },
    because: '7 occurrences here; `.panel-item` is defined in workspace.css and used by Brand Kit and Guideline too.',
  },

  // --- board ----------------------------------------------------------------
  {
    key: 'setup-section',
    sid: 'pattern/setup-section',
    route: '/b/brandingos/setup',
    selector: '.section',
    // Section 1 is the full-width case, section 6 the narrow wrapped one.
    at: [0, 5],
    axes: [{ width: 'full' }, { width: 'narrow' }],
    roles: {
      '.section-header': 'header',
      '.section-spec': 'spec',
      '.section-actions': 'actions',
      '.section-body': 'body',
    },
    because: '7 occurrences at 7 distinct heights — the board\'s unit of content, and it must HUG.',
  },
  {
    key: 'section-add',
    sid: 'pattern/section-add',
    route: '/b/brandingos/setup',
    selector: '.section-add',
    at: [0],
    because: '12 occurrences; the one affordance that adds to any section.',
  },

  // --- content --------------------------------------------------------------
  {
    key: 'brand-field',
    sid: 'pattern/brand-field',
    route: '/b/brandingos/setup',
    selector: '.brand-field',
    at: [0],
    roles: {
      '.brand-field-label': 'label',
      '.brand-field-input': 'input',
      '.brand-field-hint': 'hint',
    },
    because: 'Label + input + optional hint, defined in workspace.css; wraps the DS input contract.',
  },
  {
    key: 'logo-tile',
    sid: 'pattern/logo-tile',
    route: '/b/brandingos/setup',
    selector: '.logo-tile',
    at: [0],
    roles: {
      '.logo-svg': 'art',
      '.logo-tile-name': 'name',
      '.logo-tile-actions': 'actions',
    },
    because: '3 occurrences at one size. NOTE: diverges from the DS `DsLogoTile` — recorded on page 99.',
  },
  {
    key: 'color-swatch',
    sid: 'pattern/color-swatch',
    route: '/b/brandingos/setup',
    selector: '.swatch',
    // The first core swatch carries the primary tag; a neutral does not. Both
    // are captured hovered as well, because at rest the name and the hex are at
    // opacity 0 — a swatch you cannot read is not a palette.
    at: [0, 4, 0, 4],
    axes: [
      { role: 'primary', state: 'default' },
      { role: 'plain', state: 'default' },
      { role: 'primary', state: 'hover' },
      { role: 'plain', state: 'hover' },
    ],
    pseudo: ['default', 'default', 'hover', 'hover'],
    roles: {
      '.swatch-name': 'name',
      '.swatch-hex': 'hex',
      '.swatch-primary-tag': 'tag',
      '.swatch-copy-icon': 'copy',
    },
    because: '34 occurrences — the single most repeated content unit after the icon tile.',
  },
  {
    key: 'colors-group',
    sid: 'pattern/colors-group',
    route: '/b/brandingos/setup',
    selector: '.colors-group',
    at: [0],
    roles: {
      '.colors-group-title': 'title',
      '.colors-row': 'row',
      '.cp-expand': 'expand',
    },
    because: 'Titled, wrapping swatch row; repeats for Core and Neutral.',
  },
  {
    key: 'type-specimen-col',
    sid: 'pattern/type-specimen-col',
    route: '/b/brandingos/setup',
    selector: '.type-col',
    at: [0],
    roles: {
      '.type-name': 'name',
      '.type-glyphs': 'glyphs',
      '.type-list': 'list',
    },
    because: '6 occurrences; one per typeface role.',
  },
  {
    key: 'icon-tile',
    sid: 'pattern/icon-tile',
    route: '/b/brandingos/setup',
    selector: '.icon-tile',
    at: [0],
    roles: {
      '.fi': 'glyph',
    },
    because: '60 occurrences at ONE size — the strongest promotion evidence on the screen.',
  },
  {
    key: 'about-card',
    sid: 'pattern/about-card',
    route: '/b/brandingos/setup',
    selector: '.about-card',
    at: [0],
    roles: {
      '.about-card-title': 'title',
      '.about-card-body': 'body',
    },
    because: '7 occurrences at one size; shared with onboarding-v4.',
  },
  {
    key: 'preview-card',
    sid: 'pattern/preview-card',
    route: '/b/brandingos/setup',
    selector: '.preview-card',
    at: [0],
    because: '3 occurrences; the upload preview unit.',
  },
] as const;
