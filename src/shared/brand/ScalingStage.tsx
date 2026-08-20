/**
 * Shows a brand-kit renderer at any size, without re-authoring it.
 *
 * Every renderer in this codebase is drawn in ABSOLUTE pixels — `text-[4.5px]`,
 * `text-[18px]`, `inset-[8%]` — sized for the ~260px drilldown card they were
 * designed against. Mount one in a 900px frame and the layout is correct while
 * every glyph is starved to illegibility; re-author it for the larger frame and
 * the 260px card breaks instead.
 *
 * So the subtree is rendered at its native width and TRANSFORM-SCALED to fill
 * the host. The designer's pixel ratios survive at every size, and one set of
 * designs serves a thumbnail, an editor preview, a full-bleed presentation and
 * a 4× export.
 *
 * Promoted out of `BrandKitCardEditor`, where it was private, when the Brand
 * Identity page needed the same contract. There must be exactly one of these:
 * a second implementation would be a second opinion about how big a design is.
 *
 * NOTE the number. `BASE_WIDTH` is 260 — the editor's own docstring and
 * `brand-kit.css` both say 360, and both are wrong; the code has always said
 * 260 and the renderers agree with the code.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
// The `.bk-preview-*` / `.bk-editor-preview-frame` rules this component's
// host relies on — moved here (2026-08-20) from `brand-kit.css` so they
// travel with `<ScalingStage>` into every consumer, not just the Brand Kit
// pages that happened to import that stylesheet. See ScalingStage.css's
// own header for why.
import './ScalingStage.css';

/** The width every renderer in this codebase was drawn against. */
export const RENDERER_BASE_WIDTH = 260;

export interface ScalingStageProps {
  /** Width ÷ height of the design. 1 for a post, 9/16 for a story. */
  aspect: number;
  children: ReactNode;
  /** Overrides the preview typeface, via `--bk-preview-font`. */
  fontFamily?: string | null;
  /** Hides logo images — used by the editor's "no logo" toggle. */
  hideLogo?: boolean;
  className?: string;
  /** Merged last, so callers own their own layout. */
  style?: React.CSSProperties;
}

export function ScalingStage({
  aspect,
  children,
  fontFamily = null,
  hideLogo = false,
  className,
  style,
}: ScalingStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const baseHeight = RENDERER_BASE_WIDTH / aspect;

  useLayoutEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) return;
    const update = () => {
      // Measured from the HOST, so the scale follows whatever layout the
      // caller put the stage in — a grid cell, a full-bleed band, a modal.
      stage.style.transform = `scale(${host.clientWidth / RENDERER_BASE_WIDTH})`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const hostStyle: React.CSSProperties = { aspectRatio: `${aspect} / 1`, ...style };
  if (fontFamily) {
    (hostStyle as Record<string, string>)['--bk-preview-font'] = fontFamily;
  }

  return (
    <div
      ref={hostRef}
      className={className ? `bk-preview-host ${className}` : 'bk-preview-host'}
      data-font-override={fontFamily ? '' : undefined}
      data-hide-logo={hideLogo ? '' : undefined}
      style={hostStyle}
    >
      <div
        ref={stageRef}
        className="bk-preview-stage"
        style={{ width: RENDERER_BASE_WIDTH, height: baseHeight }}
      >
        {children}
      </div>
    </div>
  );
}

export default ScalingStage;
