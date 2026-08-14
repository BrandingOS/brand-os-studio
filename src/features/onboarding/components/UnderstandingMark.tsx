/**
 * The mark, assembling.
 *
 * Composes `BrandMark` rather than re-declaring its nine paths — the geometry
 * exists in exactly one place in this codebase, and two copies would drift the
 * first time the logo is touched. What this component owns is what the nodes
 * MEAN here: one per stage of real work, lighting as that work completes, with
 * a spoke drawn inward to the core.
 *
 * The core is alive from the first frame. The brand exists — it was created at
 * the naming screen — and what is being assembled around it is everything we
 * have worked out about it.
 *
 * Motion is subtle and token-driven, and stops entirely under
 * `prefers-reduced-motion`: the nodes still light, they simply do not ease.
 */
import { BrandMark } from '@/shared/ds';

export interface UnderstandingMarkProps {
  /** Node indices lit so far, 0–7 clockwise from top-left. */
  active: readonly number[];
  size?: number;
}

export function UnderstandingMark({ active, size = 168 }: UnderstandingMarkProps) {
  return (
    <div className="onb-mark" aria-hidden="true">
      <BrandMark size={size} activeNodes={active} showSpokes className="onb-mark-svg" />
    </div>
  );
}
