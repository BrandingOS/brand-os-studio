/**
 * The composition screens 1 and 2 share.
 *
 * Per the owner's reference: the mark large and vertically centred on the left,
 * everything the user does on the right, and one continuous background across
 * both halves. There is deliberately **no divider rule and no tonal panel** —
 * a bordered left half reads as a sidebar, which is what made an earlier pass
 * feel like a dashboard rather than a threshold.
 *
 * Built once and used by both screens rather than written twice, so the two
 * cannot drift apart.
 *
 * The mark's `nodes` is how the flow's one continuous object advances: core
 * only while the brand is just a name, more nodes as detail arrives, completing
 * during the processing transition. It is the same `BrandMark` throughout —
 * the geometry exists in exactly one place.
 */
import type { ReactNode } from 'react';
import { BrandMark } from '@/shared/ds';

export interface SplitShellProps {
  /** Ring dots lit, 0–7 clockwise from top-left. Empty = core only. */
  nodes?: readonly number[];
  /** 1-based, for the quiet step ticks. */
  step: number;
  total: number;
  onExit?: () => void;
  children: ReactNode;
}

export function SplitShell({ nodes = [], step, total, onExit, children }: SplitShellProps) {
  return (
    <div className="onb-split">
      <div className="onb-split-mark">
        <BrandMark size={236} activeNodes={nodes} showSpokes className="onb-bigmark" />
        <p className="onb-split-word">BrandingOS</p>
      </div>

      <div className="onb-split-body">
        <div className="onb-split-form">
          <div className="onb-split-steps" role="presentation">
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={i < step ? 'is-on' : undefined} />
            ))}
          </div>
          {children}
        </div>
        {onExit && (
          <button type="button" className="onb-exit onb-split-exit" onClick={onExit}>
            Exit
          </button>
        )}
      </div>
    </div>
  );
}
