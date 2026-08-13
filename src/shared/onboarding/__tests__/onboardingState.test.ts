/**
 * The marker's meaning table, pinned.
 *
 * The two claims that matter: absent reads as FINISHED (so no pre-002 brand is
 * dragged back into the flow), and a malformed marker never throws (so a brand
 * stays openable no matter what is in the column).
 */
import { describe, it, expect } from 'vitest';
import {
  atStep,
  completedState,
  isUnfinished,
  readOnboardingState,
  resumeStep,
  startedState,
  unfinishedLabel,
  type OnboardingState,
} from '../onboardingState';

const inProgress: OnboardingState = {
  step: 'material',
  branch: 'existing',
  startedAt: '2026-08-14T00:00:00.000Z',
  completedAt: null,
};

describe('readOnboardingState — the meaning table', () => {
  it('absent column reads as finished', () => {
    expect(readOnboardingState({})).toBeNull();
    expect(readOnboardingState({ onboarding: undefined })).toBeNull();
  });

  it('null marker reads as finished — a brand not created by onboarding', () => {
    expect(readOnboardingState({ onboarding: null as never })).toBeNull();
  });

  it('a completed marker reads as finished', () => {
    expect(
      readOnboardingState({ onboarding: { ...inProgress, completedAt: '2026-08-14T01:00:00.000Z' } }),
    ).toBeNull();
  });

  it('an in-progress marker reads as unfinished, at its step', () => {
    const s = readOnboardingState({ onboarding: inProgress });
    expect(s).not.toBeNull();
    expect(s!.step).toBe('material');
    expect(s!.branch).toBe('existing');
  });

  it('no brand at all reads as finished rather than throwing', () => {
    expect(readOnboardingState(null)).toBeNull();
    expect(readOnboardingState(undefined)).toBeNull();
  });
});

describe('malformed markers degrade, never throw', () => {
  it('an unknown step falls back to basics', () => {
    const s = readOnboardingState({ onboarding: { ...inProgress, step: 'wat' } as never });
    expect(s!.step).toBe('basics');
  });

  it('an unknown branch falls back to existing', () => {
    const s = readOnboardingState({ onboarding: { ...inProgress, branch: 'nope' } as never });
    expect(s!.branch).toBe('existing');
  });

  it('a missing startedAt is filled rather than left undefined', () => {
    const s = readOnboardingState({ onboarding: { step: 'review', completedAt: null } as never });
    expect(typeof s!.startedAt).toBe('string');
    expect(s!.startedAt.length).toBeGreaterThan(0);
  });

  it('a non-object marker reads as finished', () => {
    expect(readOnboardingState({ onboarding: 'in-progress' as never })).toBeNull();
    expect(readOnboardingState({ onboarding: 42 as never })).toBeNull();
  });

  it('an empty completedAt string does not count as finished', () => {
    // '' is falsy but IS a string — the guard must check both.
    const s = readOnboardingState({ onboarding: { ...inProgress, completedAt: '' } });
    expect(s).not.toBeNull();
  });
});

describe('isUnfinished / resumeStep', () => {
  it('unfinished only while a marker is open', () => {
    expect(isUnfinished({ onboarding: inProgress })).toBe(true);
    expect(isUnfinished({})).toBe(false);
    expect(isUnfinished({ onboarding: { ...inProgress, completedAt: 'x' } })).toBe(false);
  });

  it('resume lands on the recorded step, or basics when unknown', () => {
    expect(resumeStep({ onboarding: inProgress })).toBe('material');
    expect(resumeStep({ onboarding: { ...inProgress, step: 'review' } })).toBe('review');
    expect(resumeStep({})).toBe('basics');
  });
});

describe('transitions', () => {
  it('starts at basics, open', () => {
    const s = startedState();
    expect(s.step).toBe('basics');
    expect(s.completedAt).toBeNull();
    expect(s.branch).toBe('existing');
  });

  it('records the branch when the user takes the help-me-start path', () => {
    expect(startedState('new').branch).toBe('new');
  });

  it('moving BACKWARDS rewrites the step — where you are, not how far you got', () => {
    const forward = atStep(inProgress, 'review');
    expect(forward.step).toBe('review');
    const back = atStep(forward, 'material');
    expect(back.step).toBe('material');
  });

  it('a step change preserves branch and startedAt', () => {
    const next = atStep(inProgress, 'review');
    expect(next.branch).toBe(inProgress.branch);
    expect(next.startedAt).toBe(inProgress.startedAt);
  });

  it('completing stamps completedAt and makes the brand read as finished', () => {
    const done = completedState(inProgress);
    expect(done.completedAt).toBeTruthy();
    expect(readOnboardingState({ onboarding: done })).toBeNull();
  });

  it('transitions work from nothing', () => {
    expect(atStep(null, 'material').step).toBe('material');
    expect(completedState(null).completedAt).toBeTruthy();
  });
});

describe('unfinishedLabel', () => {
  it('describes a situation, never a deficiency', () => {
    expect(unfinishedLabel({ onboarding: inProgress })).toBe('Still setting up · left at your files');
    expect(unfinishedLabel({ onboarding: { ...inProgress, step: 'review' } })).toBe(
      'Still setting up · left at Review',
    );
    expect(unfinishedLabel({ onboarding: { ...inProgress, step: 'basics' } })).toBe(
      'Still setting up · just started',
    );
  });

  it('never says incomplete, draft, or unfinished', () => {
    const label = unfinishedLabel({ onboarding: inProgress })!;
    expect(label.toLowerCase()).not.toMatch(/incomplete|draft|unfinished|failed/);
  });

  it('is null for a finished brand', () => {
    expect(unfinishedLabel({})).toBeNull();
  });
});
