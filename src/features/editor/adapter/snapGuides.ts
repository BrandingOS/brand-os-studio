// Smart-snap math for the editor canvas.
//
// During drag, the moving object's edges and center are compared to
// every other object's edges and center. When two are within
// SNAP_THRESHOLD_PX, a guide is emitted. The adapter snaps the moving
// object's position to the matched line and renders a thin guide line
// for visual feedback.
//
// Pure math, no Fabric dep — keeps it cheap to unit test.

export const SNAP_THRESHOLD_PX = 5;

export interface BBox {
  /** Top-left x. */
  x: number;
  /** Top-left y. */
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  /** 'x' = vertical guide line at a given x; 'y' = horizontal at given y. */
  axis: 'x' | 'y';
  /** Canvas-coordinate position of the guide. */
  position: number;
}

export interface SnapResult {
  /** Suggested adjusted position for the moving object, or null if no snap. */
  snappedX: number | null;
  snappedY: number | null;
  /** Guide lines to render. May contain duplicates if multiple targets align — caller may dedupe. */
  guides: SnapGuide[];
}

/**
 * Compute snap adjustments for a moving bbox against a set of static
 * bboxes. Returns the snapped position (or null per axis if no snap)
 * and the guide lines to draw.
 *
 * Edges checked: left/center/right (x axis) and top/middle/bottom (y axis).
 * Picks the closest-matching edge per axis to avoid jitter when several
 * candidates are within the threshold.
 */
export function computeSnap(
  moving: BBox,
  others: BBox[],
  threshold: number = SNAP_THRESHOLD_PX,
): SnapResult {
  const movingX = {
    left: moving.x,
    center: moving.x + moving.width / 2,
    right: moving.x + moving.width,
  };
  const movingY = {
    top: moving.y,
    middle: moving.y + moving.height / 2,
    bottom: moving.y + moving.height,
  };

  let bestX: { delta: number; line: number; movingEdge: number } | null = null;
  let bestY: { delta: number; line: number; movingEdge: number } | null = null;

  for (const o of others) {
    const otherX = [o.x, o.x + o.width / 2, o.x + o.width];
    const otherY = [o.y, o.y + o.height / 2, o.y + o.height];

    for (const me of [movingX.left, movingX.center, movingX.right]) {
      for (const ox of otherX) {
        const delta = Math.abs(me - ox);
        if (delta < threshold && (bestX == null || delta < bestX.delta)) {
          bestX = { delta, line: ox, movingEdge: me };
        }
      }
    }
    for (const me of [movingY.top, movingY.middle, movingY.bottom]) {
      for (const oy of otherY) {
        const delta = Math.abs(me - oy);
        if (delta < threshold && (bestY == null || delta < bestY.delta)) {
          bestY = { delta, line: oy, movingEdge: me };
        }
      }
    }
  }

  const guides: SnapGuide[] = [];
  let snappedX: number | null = null;
  let snappedY: number | null = null;

  if (bestX) {
    snappedX = moving.x + (bestX.line - bestX.movingEdge);
    guides.push({ axis: 'x', position: bestX.line });
  }
  if (bestY) {
    snappedY = moving.y + (bestY.line - bestY.movingEdge);
    guides.push({ axis: 'y', position: bestY.line });
  }

  return { snappedX, snappedY, guides };
}
