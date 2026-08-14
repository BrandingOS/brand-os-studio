/**
 * The review's section shell — the retired `.review-group`, kept.
 *
 * Anatomy, unchanged from the page this restores: a surface card with a hairline
 * border, an uppercase section label on the left of the head, a count on the
 * right, the body, and a footer of actions. Only two things changed, both
 * because the original was cramped: a wider container and a more generous
 * vertical rhythm.
 *
 * "Looks right" is a LOOP over the per-value act, never a section-level
 * authority — the caller passes the paths and the loop happens there. It is
 * absent for sections that carry nothing to decide (Links, Brand assets), which
 * is why it is optional rather than disabled.
 */
import type { ReactNode } from 'react';

export interface ReviewCardProps {
  title: string;
  /** Right of the head. A count, or a plain fact like "3 logos". */
  meta?: string;
  /** A head-right affordance, e.g. "Add suggested palettes". */
  headAction?: ReactNode;
  /** Omitted for sections with nothing to confirm. */
  onLooksRight?(): void;
  looksRightDisabled?: boolean;
  /** Actions along the bottom hairline. */
  footer?: ReactNode;
  /** Shown instead of children when the section is empty. */
  empty?: string;
  children?: ReactNode;
}

export function ReviewCard({
  title,
  meta,
  headAction,
  onLooksRight,
  looksRightDisabled,
  footer,
  empty,
  children,
}: ReviewCardProps) {
  const hasBody = children !== undefined && children !== null && children !== false;

  return (
    <article className="onb-rg">
      <header className="onb-rg-h">
        <h2 className="onb-rg-t">{title}</h2>
        <div className="onb-rg-r">
          {/*
            CONTEXTUAL only. It says how much of THIS section is settled so a
            person can see where they are in it. There is deliberately no global
            equivalent, no bar and no percentage anywhere in this flow — leaving
            things unconfirmed is a legitimate outcome, and a completion meter
            would turn it into a debt.
          */}
          {headAction}
          {meta && <span className="onb-count">{meta}</span>}
          {onLooksRight && (
            <button
              type="button"
              className="onb-bulk"
              onClick={onLooksRight}
              disabled={looksRightDisabled}
            >
              Looks right
            </button>
          )}
        </div>
      </header>

      {hasBody ? <div className="onb-rg-b">{children}</div> : empty ? <p className="onb-rg-e">{empty}</p> : null}

      {footer && <div className="onb-rg-f">{footer}</div>}
    </article>
  );
}
