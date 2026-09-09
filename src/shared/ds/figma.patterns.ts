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
   * Descendants that are themselves patterns, as selector -> pattern key.
   *
   * Such a descendant is recorded as a REFERENCE and rendered as an instance.
   * Capturing it inline instead produces a container holding a flattened
   * stranger: editing the swatch would not change the palette that is made of
   * swatches, which is the whole point of having a system rather than a folder
   * of pictures. It also stops the same subtree travelling twice in the
   * payload.
   *
   * The referenced pattern must be BUILT FIRST — `FX_PATTERNS` is ordered so
   * that contained patterns precede their containers, and a missing reference
   * fails loudly with a named placeholder rather than closing the gap.
   */
  contains?: Record<string, string>;
  /**
   * How to tell which VARIANT a referenced occurrence is, without measuring it.
   *
   * Declared on the CONTAINED pattern, so every container that references it
   * gets the right variant for free. Keyed by axis: the FIRST rule whose
   * selector matches wins, and `else` is the value when none do.
   *
   * A selector is tested against the element ITSELF and against its
   * descendants: a logo tile says which variant it is with its own class
   * (`.is-dark`), while a rail row says it with a child (`.panel-item-thumb`).
   *
   * Without this, all seven rail rows became instances of the default variant
   * and the rail read "Website" seven times — structurally correct, and a
   * picture of something the product never shows.
   */
  variantBy?: Record<string, { when: Array<{ selector: string; value: string }>; else: string }>;
  /**
   * Meaningful child roles, keyed SELECTOR -> role — the same direction the
   * component manifest uses, and the direction `roleFor` reads. Written the
   * other way round it produces sids like `.segmented-nav`, which is not a
   * legal sid segment and fails the run loudly.
   */
  roles?: Record<string, string>;
  /** Why this is a pattern and not a raw frame — the promotion evidence. */
  because: string;
  /**
   * A SCREEN, not a component.
   *
   * A product screen is assembled FROM components rather than being one, so it
   * is rendered as a top-level FRAME and never combined into a variant set.
   * Modelling a screen as a component is what makes a Figma file look
   * systematic while being unusable: a screen cannot be placed inside anything,
   * and a set of screens-as-variants means nothing.
   */
  frame?: boolean;
  /** Which Figma page this belongs on. Patterns default to 04. */
  page?: string;
  /**
   * Subtrees to leave out entirely.
   *
   * Setup mounts its upload and preview modals in the DOM even while closed, so
   * they are measured as full-size overlays. They are SCREEN STATES — sibling
   * frames of their own — not part of the default screen, and including them
   * would put two invisible 1440x1200 sheets on top of the page.
   */
  exclude?: string[];
}

/**
 * SCREENS — the product's own pages, assembled from the patterns above.
 *
 * `contains` maps a selector to the pattern that should REPLACE that subtree
 * with an instance. The containers deliberately reference the OUTERMOST unit:
 * `.colors-group` rather than `.swatch`, because the colours group already
 * instances its swatches, and `.panel` rather than `.panel-item` for the same
 * reason. Referencing both would be redundant — the collector stops descending
 * at a reference, so an inner one is unreachable anyway.
 *
 * What stays a raw frame is deliberate and is listed in
 * docs/code-to-figma/SETUP-COMPOSITION-MAP.md §2: the shell, the board wrapper,
 * the board head and the per-section containers are single-use structural
 * grouping with no independent meaning.
 */
export const FX_SCREENS: readonly FxPattern[] = [
  {
    key: 'Setup — Desktop 1440 — Light',
    sid: 'screen/setup-desktop-light',
    route: '/b/brandingos/setup',
    selector: '[data-workspace]',
    at: [0],
    frame: true,
    page: '10',
    contains: {
      '[data-workspace] > header': 'pattern/workspace-topbar',
      '.panel': 'pattern/section-rail',
      '.brand-field': 'pattern/brand-field',
      '.logo-tile': 'pattern/logo-tile',
      // The SWATCH, not the group. Core holds 2 swatches and Neutral holds 32,
      // and a component's children are fixed — instancing the group painted the
      // 32-step neutral ramp as a copy of Core's two. Child count that comes
      // from data is not a variant; the repeated unit is what may be a
      // component, and the row around it is layout. `pattern/colors-group`
      // stays in the library as the Core row it was measured from.
      '.swatch': 'pattern/color-swatch',
      '.type-col': 'pattern/type-specimen-col',
      '.icon-tile': 'pattern/icon-tile',
      '.about-card': 'pattern/about-card',
      '.section-add': 'pattern/section-add',
    },
    exclude: ['.upload-modal-backdrop', '.preview-backdrop'],
    because: 'The pilot screen. Setup is what the whole architecture is being proved against.',
  },
  {
    key: 'Brand Kit — Desktop 1440 — Light',
    sid: 'screen/brand-kit-desktop-light',
    route: '/b/brandingos/brand-kit',
    selector: '[data-workspace]',
    at: [0],
    frame: true,
    page: '11',
    contains: {
      // The chrome is the SAME chrome. A second workspace top bar built from
      // this route would be a duplicate of a component that already exists and
      // already matches — the whole point of a library.
      '[data-workspace] > header': 'pattern/workspace-topbar',
      '.section-add': 'pattern/section-add',
      // The repeated units this screen contributes. `.panel` and `.bk-grid` are
      // deliberately NOT here: the rail holds 38 rows in 5 groups and the five
      // grids hold 6, 8, 8, 5 and 10 cards, so their child count is data and a
      // component cannot vary it.
      '.bk-card': 'pattern/bk-card',
      '.panel-item': 'pattern/bk-nav-row',
    },
    exclude: ['.upload-modal-backdrop', '.preview-backdrop'],
    because: 'The kit is the product\'s centre of gravity — 37 deliverable cards over one rail.',
  },
  {
    key: 'Design — Desktop 1440 — Light',
    sid: 'screen/design-desktop-light',
    route: '/b/brandingos/design',
    selector: '[data-workspace]',
    at: [0],
    frame: true,
    page: '13',
    contains: {
      '[data-workspace] > header': 'pattern/workspace-topbar',
      '.dh-tpl': 'pattern/design-template-card',
      '.dh-cat-chip': 'pattern/design-cat-chip',
      '.dh-chip': 'pattern/design-chip',
    },
    because: 'The launchpad: one hero, twelve template cards, two chip families.',
  },
] as const;

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
    contains: { '.segmented-nav': 'pattern/segmented-nav' },
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
    contains: { '.panel-item': 'pattern/rail-row' },
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
    // A row with a thumbnail is a section that has content; one without is empty.
    variantBy: {
      state: { when: [{ selector: '.panel-item-thumb', value: 'filled' }], else: 'empty' },
    },
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
    // Three genuinely different tiles, not one tile three times: a light tile,
    // a dark tile whose artwork is the light cut, and an empty dashed slot.
    at: [0, 1, 2],
    axes: [{ state: 'primary' }, { state: 'dark' }, { state: 'empty' }],
    variantBy: {
      state: {
        when: [
          { selector: '.is-dark', value: 'dark' },
          { selector: '.is-empty', value: 'empty' },
        ],
        else: 'primary',
      },
    },
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
    // Only `role` can be read from the markup. `state` is a pseudo-class, which
    // a static page cannot be in, so every placed swatch is the resting one.
    variantBy: {
      role: { when: [{ selector: '.is-primary', value: 'primary' }], else: 'plain' },
      state: { when: [], else: 'default' },
    },
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
    contains: { '.swatch': 'pattern/color-swatch' },
    because:
      'Titled swatch row, captured at Core. LIBRARY ONLY — the Setup screen does not '
      + 'instance it, because Neutral holds 32 swatches to Core\'s 2 and a component '
      + 'cannot vary its child count. See the screen manifest.',
  },
  {
    key: 'type-specimen-col',
    sid: 'pattern/type-specimen-col',
    route: '/b/brandingos/setup',
    selector: '.type-col',
    // THREE columns, not one repeated three times. They share `.type-col` and
    // nothing else: the identity column sets its second line in the specimen
    // typeface at 48px, the weight and example columns set theirs at 13. Built
    // as one component, the two of them inherited the specimen's display size
    // and "The professional standard" was drawn at 48px and clipped.
    at: [0, 1, 2],
    axes: [{ role: 'identity' }, { role: 'weights' }, { role: 'examples' }],
    variantBy: {
      role: {
        when: [
          { selector: '.type-col--weights', value: 'weights' },
          { selector: '.type-col--examples', value: 'examples' },
        ],
        else: 'identity',
      },
    },
    roles: {
      '.type-name': 'name',
      '.type-glyphs': 'glyphs',
      '.type-list': 'list',
    },
    because: '6 occurrences — 2 each of 3 genuinely different columns.',
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

  // --- brand kit ------------------------------------------------------------
  {
    key: 'bk-card',
    sid: 'pattern/bk-card',
    route: '/b/brandingos/brand-kit',
    selector: '.bk-card',
    // All 37 are 335 x 238 and all carry the bare class `bk-card`; what differs
    // is what the COVER draws. 23 have no cover art at all, 8 render a scaled
    // stage, and 6 draw one-off artwork (a logo, a swatch pair, a type
    // specimen, an icon, a pull quote, an empty note).
    at: [14, 6, 0],
    axes: [{ cover: 'none' }, { cover: 'stage' }, { cover: 'art' }],
    variantBy: {
      cover: {
        when: [
          { selector: '.bk-cover-stage', value: 'stage' },
          { selector: '.bk-cover-art', value: 'art' },
        ],
        else: 'none',
      },
    },
    roles: {
      '.bk-card-label': 'label',
      '.bk-card-cover': 'cover',
      '.bk-card-actions': 'actions',
    },
    because:
      '37 occurrences at ONE size — the most repeated unit in the product after '
      + 'the icon tile. Known limit: the six one-off cover artworks all resolve to '
      + 'the `art` variant and therefore share one cover; carrying six different '
      + 'drawings needs an INSTANCE_SWAP property, not a variant.',
  },
  {
    key: 'bk-nav-row',
    sid: 'pattern/bk-nav-row',
    route: '/b/brandingos/brand-kit',
    selector: '.panel-item',
    at: [0, 1],
    axes: [{ state: 'active' }, { state: 'default' }],
    variantBy: {
      state: { when: [{ selector: '.is-active', value: 'active' }], else: 'default' },
    },
    roles: {
      '.panel-item-thumb': 'thumb',
      '.panel-item-name': 'name',
      '.status-chip': 'status',
    },
    because:
      '38 occurrences. Deliberately NOT `pattern/rail-row`, though both are '
      + '`.panel-item` from workspace.css: Setup\'s row reports how complete a brand '
      + 'SECTION is and carries a name, a subtitle and a completion check; this one '
      + 'reports the lifecycle status of a DELIVERABLE and carries a name and a '
      + 'status chip. Same box, different content model — shared markup is not '
      + 'shared meaning.',
  },

  // --- design launchpad -----------------------------------------------------
  {
    key: 'design-template-card',
    sid: 'pattern/design-template-card',
    route: '/b/brandingos/design',
    selector: '.dh-tpl',
    at: [0],
    roles: {
      '.dh-tpl-thumb': 'thumb',
      '.dh-tpl-name': 'name',
      '.dh-tpl-mood': 'mood',
    },
    because:
      '12 occurrences sharing one class. Three heights (270, 326, 172) because the '
      + 'thumbnail carries the template\'s own aspect ratio as an inline style, which '
      + 'no selector can read — so this is ONE component and the height travels as a '
      + 'per-instance size override.',
  },
  {
    key: 'design-cat-chip',
    sid: 'pattern/design-cat-chip',
    route: '/b/brandingos/design',
    selector: '.dh-cat-chip',
    at: [0, 1],
    axes: [{ state: 'active' }, { state: 'default' }],
    variantBy: {
      state: {
        when: [{ selector: '.dh-cat-chip--active', value: 'active' }],
        else: 'default',
      },
    },
    because: '12 occurrences; the category filter row, one of which is always selected.',
  },
  {
    key: 'design-chip',
    sid: 'pattern/design-chip',
    route: '/b/brandingos/design',
    selector: '.dh-chip',
    at: [0],
    because: '6 occurrences; the prompt suggestions under the hero.',
  },
] as const;
