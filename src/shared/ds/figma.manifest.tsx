import React from 'react';
import { DsButton } from './Button';
import { DsMenu, DsMenuItem, DsMenuDivider } from './Menu';
import { ArrowRightIcon, PlusIcon, CloseIcon } from './icons';

/**
 * SEMANTICS ONLY.
 *
 * This file declares what components exist, what their variant axes are, which
 * child nodes carry meaning, and how they should be named and nested in Figma.
 *
 * It must NOT contain a single colour, length, radius, shadow or font name.
 * Every value comes from measuring the rendered product, so there is exactly one
 * source of visual truth and it is the code that ships. `figma.manifest.test.ts`
 * enforces that mechanically — a rule nobody can break by accident beats a rule
 * written in a document.
 *
 * There is deliberately NO `theme` axis. Themes are real Figma variable modes
 * (the account is on a plan that supports them), which roughly halves every
 * component set. A theme axis is permitted only where a theme causes a
 * STRUCTURAL difference — a different node tree, not a different colour — and
 * such a case must be justified in the entry itself.
 *
 * See docs/superpowers/specs/2026-09-03-code-to-figma-design.md §7.
 */

export type Axes = Record<string, readonly string[]>;
export type AxisValues = Record<string, string>;

/** A pseudo-state the extractor forces via CDP, or a real DOM state. */
export type PseudoState =
  | 'default'
  | 'hover'
  | 'active'
  | 'focus-visible'
  | 'disabled';

export interface FxComponent {
  /** Display key, and the component set's name in Figma. */
  key: string;
  /** Root of every sid this component produces. */
  sid: string;
  /** Declared axes. sids embed THESE — never the axes that survive dedup. */
  axes: Axes;
  /** Returns TRUE to KEEP a cell. Named for what it achieves, not what it returns. */
  sparse?: (v: AxisValues) => boolean;
  /** Which pseudo-state this cell needs. `disabled` is a DOM state, not a forced pseudo. */
  pseudo?: (v: AxisValues) => PseudoState;
  /**
   * WHICH node receives the forced pseudo-state, as a selector relative to the
   * subject. Defaults to the subject root.
   *
   * Load-bearing: a component's `:hover` rule often lives on a CHILD. `DsMenu`
   * hovers `.ds-menu-item`, not `.ds-menu`, so forcing hover on the root
   * produced a hover capture byte-identical to default — which deduplication
   * would then have collapsed, silently deleting the state from the output.
   */
  pseudoTarget?: string;
  /** Meaningful child roles, by CSS selector, relative to the component root. */
  roles?: Record<string, string>;
  /** Selectors whose node is structural noise and should be flattened away. */
  flatten?: string[];
  /**
   * Child roles whose PRESENCE is optional, expressed as a Figma boolean
   * property rather than a variant axis.
   *
   * An optional trailing icon is not a different button — it is the same button
   * with one element switched off, which is exactly what a BOOLEAN component
   * property means. Modelling it as an axis doubles the variant count and makes
   * a designer pick from a list where a toggle belongs.
   */
  booleanProps?: Array<{ name: string; role: string; default: boolean }>;
  /** Render one cell. The harness mounts this; the extractor never sees it. */
  render: (v: AxisValues) => React.ReactNode;
}

export const MANIFEST: readonly FxComponent[] = [
  {
    key: 'DsButton',
    sid: 'ds/button',
    axes: {
      tone: ['primary', 'secondary', 'tertiary', 'danger'],
      size: ['md', 'sm'],
      state: ['default', 'hover', 'active', 'focus-visible', 'disabled'],
    },
    // The arrow is always RENDERED so its geometry is measured, then switched
    // off by default through a boolean property.
    booleanProps: [{ name: 'arrow', role: 'icon', default: false }],
    // The cartesian product lies. `.ds-btn--tertiary` has no :active rule, so
    // that cell would ship a variant byte-identical to another under a different
    // name — the "duplicated hacks" failure the quality gate rejects. Measured
    // deduplication catches the rest; this prunes what is knowable in advance.
    sparse: (v) => !(v.tone === 'tertiary' && v.state === 'active'),
    pseudo: (v) => v.state as PseudoState,
    roles: { 'svg': 'icon' },
    render: (v) => (
      <DsButton
        tone={v.tone as 'primary' | 'secondary' | 'tertiary' | 'danger'}
        size={v.size as 'md' | 'sm'}
        arrow
        disabled={v.state === 'disabled'}
      >
        Button
      </DsButton>
    ),
  },

  {
    key: 'DsMenu',
    sid: 'ds/menu',
    // A menu has no closed state to capture — closed means "not rendered".
    // `item` selects which row carries the hover, so the set shows the hover
    // where it actually happens rather than on an arbitrary row.
    axes: {
      state: ['default', 'hover'],
    },
    pseudo: (v) => (v.state === 'hover' ? 'hover' : 'default'),
    // The menu's hover rule is on the ITEM, not the surface.
    pseudoTarget: '.ds-menu-item',
    roles: {
      '.ds-menu-item': 'item',
      '.ds-menu-item svg': 'icon',
      '.ds-menu-item-kbd': 'kbd',
      '.ds-menu-divider': 'divider',
    },
    render: () => (
      <DsMenu>
        <DsMenuItem icon={<PlusIcon />} kbd="⌘N">Add variant</DsMenuItem>
        <DsMenuItem icon={<ArrowRightIcon />}>Open in editor</DsMenuItem>
        <DsMenuDivider />
        <DsMenuItem icon={<CloseIcon />} danger kbd="⌫">Remove</DsMenuItem>
      </DsMenu>
    ),
  },
];

/** Every cell a component declares, after `sparse`, in deterministic order. */
export function cellsFor(component: FxComponent): AxisValues[] {
  const keys = Object.keys(component.axes).sort();
  let cells: AxisValues[] = [{}];
  for (const key of keys) {
    const next: AxisValues[] = [];
    for (const cell of cells) {
      for (const value of component.axes[key]) next.push({ ...cell, [key]: value });
    }
    cells = next;
  }
  return component.sparse ? cells.filter(component.sparse) : cells;
}
