/**
 * layout — pure geometry for placing icon + wordmark.
 *
 * Output is in normalized canvas units (1.0 wide). Renderers scale.
 *
 * Each layout is a function of `(iconBbox, wordmarkBbox)` plus the
 * preset enum. `'custom'` consults `customLayout` overrides; the other
 * presets are derived sensible defaults.
 *
 * The renderer pads the result by safeArea before drawing.
 */
import type { CustomLayout, Layout } from './types';

export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Placement {
  icon?: Bbox;
  wordmark?: Bbox;
  /** Bounding box of the entire composition before padding. */
  bounds: Bbox;
}

interface LayoutInput {
  hasIcon: boolean;
  hasWordmark: boolean;
  /** Aspect ratio of the icon (w/h). Defaults to 1. */
  iconAspect?: number;
  /** Approximate aspect ratio of the wordmark glyph block (w/h). */
  wordmarkAspect?: number;
}

const ICON_UNIT = 100; // arbitrary unit; renderer scales the placement.

export function computePlacement(
  layout: Layout,
  input: LayoutInput,
  custom?: CustomLayout,
): Placement {
  const iconAspect = input.iconAspect ?? 1;
  const wordmarkAspect = input.wordmarkAspect ?? 4;

  const iconW = ICON_UNIT * iconAspect;
  const iconH = ICON_UNIT;
  const wordmarkH = ICON_UNIT * 0.55;
  const wordmarkW = wordmarkH * wordmarkAspect;
  const gap = ICON_UNIT * 0.35;

  // Icon-only / wordmark-only — let the renderer handle composition; we
  // still report a valid bbox so the canvas sizing is consistent.
  if (input.hasIcon && !input.hasWordmark) {
    return {
      icon: { x: 0, y: 0, width: iconW, height: iconH },
      bounds: { x: 0, y: 0, width: iconW, height: iconH },
    };
  }
  if (!input.hasIcon && input.hasWordmark) {
    return {
      wordmark: { x: 0, y: 0, width: wordmarkW, height: wordmarkH },
      bounds: { x: 0, y: 0, width: wordmarkW, height: wordmarkH },
    };
  }

  if (layout === 'custom' && custom) {
    return computeCustom(custom, iconW, iconH, wordmarkH);
  }

  // Horizontal-style presets
  if (layout === 'horizontal' || layout === 'icon-left') {
    const totalW = iconW + gap + wordmarkW;
    const totalH = Math.max(iconH, wordmarkH);
    return {
      icon: {
        x: 0,
        y: (totalH - iconH) / 2,
        width: iconW,
        height: iconH,
      },
      wordmark: {
        x: iconW + gap,
        y: (totalH - wordmarkH) / 2,
        width: wordmarkW,
        height: wordmarkH,
      },
      bounds: { x: 0, y: 0, width: totalW, height: totalH },
    };
  }

  // Stacked-style presets
  const stackedGap = ICON_UNIT * 0.25;
  const totalW = Math.max(iconW, wordmarkW);
  const totalH = iconH + stackedGap + wordmarkH;
  return {
    icon: {
      x: (totalW - iconW) / 2,
      y: 0,
      width: iconW,
      height: iconH,
    },
    wordmark: {
      x: (totalW - wordmarkW) / 2,
      y: iconH + stackedGap,
      width: wordmarkW,
      height: wordmarkH,
    },
    bounds: { x: 0, y: 0, width: totalW, height: totalH },
  };
}

function computeCustom(
  custom: CustomLayout,
  iconW: number,
  iconH: number,
  wordmarkH: number,
): Placement {
  const scaledIconH = wordmarkH * custom.iconScale;
  const scaledIconW = iconW * (scaledIconH / iconH);
  const gap = wordmarkH * custom.gap;
  const wordmarkW = wordmarkH * 4;

  if (custom.direction === 'horizontal') {
    const totalW = scaledIconW + gap + wordmarkW;
    const totalH = Math.max(scaledIconH, wordmarkH);
    return {
      icon: {
        x: 0,
        y: alignCross(custom.align, totalH, scaledIconH),
        width: scaledIconW,
        height: scaledIconH,
      },
      wordmark: {
        x: scaledIconW + gap,
        y: alignCross(custom.align, totalH, wordmarkH),
        width: wordmarkW,
        height: wordmarkH,
      },
      bounds: { x: 0, y: 0, width: totalW, height: totalH },
    };
  }
  const totalW = Math.max(scaledIconW, wordmarkW);
  const totalH = scaledIconH + gap + wordmarkH;
  return {
    icon: {
      x: alignCross(custom.align, totalW, scaledIconW),
      y: 0,
      width: scaledIconW,
      height: scaledIconH,
    },
    wordmark: {
      x: alignCross(custom.align, totalW, wordmarkW),
      y: scaledIconH + gap,
      width: wordmarkW,
      height: wordmarkH,
    },
    bounds: { x: 0, y: 0, width: totalW, height: totalH },
  };
}

function alignCross(align: CustomLayout['align'], total: number, item: number): number {
  if (align === 'start') return 0;
  if (align === 'end') return total - item;
  return (total - item) / 2;
}
