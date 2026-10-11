/**
 * Progress through the owner's decisions.
 *
 * Wears onboarding's own `.steps` vocabulary (cosmos.css) — the same dots the
 * create path uses — rather than a second progress widget. Only the decisions
 * are listed; Read and Build are the product's work, not the owner's, and
 * light up the step they belong to.
 */
import { Fragment } from 'react';
import { RAIL, STEP_META, type StepId } from '../model/steps';

const OWNER: Record<StepId, StepId> = {
  logo: 'logo',
  read: 'logo',
  context: 'context',
  directions: 'directions',
  system: 'system',
  build: 'system',
  package: 'package',
};

export function FlowRail({ current }: { current: StepId }) {
  const at = RAIL.indexOf(OWNER[current]);
  return (
    <div className="steps lf-rail" aria-label="Progress">
      {RAIL.map((id, i) => {
        const state = i === at ? 'is-active' : i < at ? 'is-done' : '';
        return (
          <Fragment key={id}>
            <div className={`step-dot ${state}`} aria-current={i === at ? 'step' : undefined}>
              <span className="step-num">{i + 1}</span>
              <span className="lf-rail-label">{STEP_META[id].label}</span>
            </div>
            {i < RAIL.length - 1 && <span className="step-line" />}
          </Fragment>
        );
      })}
    </div>
  );
}
