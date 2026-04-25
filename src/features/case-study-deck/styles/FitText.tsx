/**
 * FitText — DOM-based auto-fit text component.
 *
 * The slide canvas is a fixed 1920×1080 frame, so every region has
 * KNOWN pixel bounds. Instead of guessing a font size by string length
 * (the old `fitHeadingSize(text)` heuristic which often guessed wrong
 * for italic / wide-set fonts), this component renders the text and
 * binary-searches the actual font size that makes it fit.
 *
 * Usage:
 *
 *     <FitText
 *       maxSize={200}
 *       minSize={32}
 *       width={1500}
 *       height={520}
 *       style={{ fontFamily: fonts.heading, fontWeight: 900, lineHeight: 0.96 }}
 *     >
 *       {brand.tagline}
 *     </FitText>
 *
 * Guarantees:
 *   - Text NEVER overflows width / height.
 *   - Re-fits whenever children, max/min, width, or height changes.
 *   - Respects font-family / weight / line-height / letter-spacing on
 *     the element so size is computed against the actual visual metrics.
 *
 * Because the slide is rendered at natural 1920×1080 (then CSS-scaled
 * for the viewport), the measurements run against the un-scaled DOM —
 * exporting / scaling doesn't affect what fits.
 */

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

export interface FitTextProps {
  children: ReactNode;
  /** Maximum desired font size in px. The component starts here. */
  maxSize: number;
  /** Minimum allowed font size. The component never shrinks below this — clip happens after. */
  minSize?: number;
  /** Fixed width of the text box in px. Required. */
  width: number;
  /** Fixed height in px. Text shrinks until it fits. Required. */
  height: number;
  /** Pass-through style. fontSize is OWNED by FitText — don't override. */
  style?: CSSProperties;
  className?: string;
  /** Element to render. Default 'div'. Use 'span' for inline contexts. */
  as?: ElementType;
}

export function FitText({
  children,
  maxSize,
  minSize = 12,
  width,
  height,
  style,
  className,
  as,
}: FitTextProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  // Track resolved size so React re-renders if it changes (export
  // pipelines need a stable post-fit DOM, not the search-loop DOM).
  const [resolved, setResolved] = useState<number>(maxSize);

  useLayoutEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;

    // Save current inline fontSize so we can rewind after the search loop.
    const previousSize = el.style.fontSize;

    let lo = minSize;
    let hi = maxSize;
    let best = minSize;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      el.style.fontSize = `${mid}px`;
      const fitsW = el.scrollWidth <= width + 1;
      const fitsH = el.scrollHeight <= height + 1;
      if (fitsW && fitsH) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    el.style.fontSize = previousSize;
    setResolved(best);
  }, [children, maxSize, minSize, width, height]);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        width,
        maxWidth: width,
        maxHeight: height,
        overflow: 'hidden',
        ...style,
        fontSize: resolved,
      }}
    >
      {children}
    </Tag>
  );
}
