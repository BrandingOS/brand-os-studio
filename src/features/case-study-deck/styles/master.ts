/**
 * Master overrides — deck-wide token customization.
 *
 * The 10 templates are starting points; the Master panel lets the user
 * tweak the active template's tokens (header style, font scales,
 * padding, etc.) so the change applies to every slide at once. Like a
 * Master Slide in Keynote / Google Slides, but token-level instead of
 * one-shape-at-a-time.
 *
 * Stored on the deck. Per-slide style overrides BYPASS the master —
 * if you pin a slide to a specific template, that slide gets the raw
 * preset, not the master-tweaked version. Otherwise sliding the pad
 * value on the master would also wreck the slide you intentionally
 * pinned to a different style.
 */

import type { DeckStyle } from './types';
import { STYLES } from './presets';

/** Subset of DeckStyle tokens the user can override deck-wide. */
export interface MasterOverrides {
  // Chrome
  topBar?: DeckStyle['chrome']['topBar'];
  bottomBar?: DeckStyle['chrome']['bottomBar'];
  cornerNumeral?: DeckStyle['chrome']['cornerNumeral'];
  pageRule?: DeckStyle['chrome']['pageRule'];
  // Typography scale
  headingScale?: number;
  bodyScale?: number;
  // Spacing
  pad?: number;
  blockGap?: number;
  columnGap?: number;
}

export const MASTER_DEFAULTS = {
  headingScale: { min: 0.6, max: 1.6, step: 0.05 },
  bodyScale: { min: 0.7, max: 1.4, step: 0.05 },
  pad: { min: 48, max: 240, step: 8 },
  blockGap: { min: 12, max: 96, step: 4 },
  columnGap: { min: 32, max: 160, step: 8 },
} as const;

/** Apply master overrides on top of a base style. Pure — returns a new object. */
export function applyMaster(base: DeckStyle, master?: MasterOverrides): DeckStyle {
  if (!master) return base;
  return {
    ...base,
    typography: {
      ...base.typography,
      headingScale: master.headingScale ?? base.typography.headingScale,
      bodyScale: master.bodyScale ?? base.typography.bodyScale,
    },
    spacing: {
      ...base.spacing,
      pad: master.pad ?? base.spacing.pad,
      blockGap: master.blockGap ?? base.spacing.blockGap,
      columnGap: master.columnGap ?? base.spacing.columnGap,
    },
    chrome: {
      ...base.chrome,
      topBar: master.topBar ?? base.chrome.topBar,
      bottomBar: master.bottomBar ?? base.chrome.bottomBar,
      cornerNumeral: master.cornerNumeral ?? base.chrome.cornerNumeral,
      pageRule: master.pageRule ?? base.chrome.pageRule,
    },
  };
}

/** Resolve the style for a slide. Slides with their own style override skip master entirely. */
export function resolveSlideStyle(
  deckStyleId: keyof typeof STYLES,
  slideStyleOverride: keyof typeof STYLES | undefined,
  master: MasterOverrides | undefined,
): DeckStyle {
  if (slideStyleOverride && STYLES[slideStyleOverride]) {
    // Per-slide override: raw preset, no master.
    return STYLES[slideStyleOverride];
  }
  return applyMaster(STYLES[deckStyleId], master);
}
