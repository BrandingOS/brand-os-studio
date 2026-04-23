/**
 * SlideFrame — a 1920×1080 canvas used by every slide in the case-study deck.
 *
 * The slide always lays out at exact 1920×1080 internally; callers scale it
 * via CSS transform so it fits the viewport. That keeps every composition
 * pixel-exact for export (html2canvas/jsPDF walk the DOM at natural size).
 */

import type { CSSProperties, ReactNode } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from './constants';

interface Props {
  /** Index for data-attribute, used by the exporter to pick slides in order. */
  index: number;
  archetype: string;
  variant: string;
  /** Fill color or CSS gradient/background shorthand. */
  background?: string;
  /** Text / ink color for default children that don't specify their own. */
  ink?: string;
  /** Scale factor — 1 = natural, 0.5 = half, etc. Default: responsive fit. */
  scale?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function SlideFrame({
  index,
  archetype,
  variant,
  background = '#111',
  ink = '#fff',
  scale,
  className,
  style,
  children,
}: Props) {
  const frameStyle: CSSProperties = {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    background,
    color: ink,
    position: 'relative',
    overflow: 'hidden',
    transform: scale ? `scale(${scale})` : undefined,
    transformOrigin: 'top left',
    ...style,
  };

  return (
    <div
      data-case-study-slide
      data-slide-index={index}
      data-archetype={archetype}
      data-variant={variant}
      className={className}
      style={frameStyle}
    >
      {children}
    </div>
  );
}
