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
  clearPlaceholders,
  completedState,
  isUnfinished,
  readOnboardingState,
  resumeStep,
  startedState,
  unfinishedLabel,
  withBrief,
  type OnboardingState,
} from '../onboardingState';

const inProgress: OnboardingState = {
  step: 'setup',
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
    expect(s!.step).toBe('setup');
  });

  it('no brand at all reads as finished rather than throwing', () => {
    expect(readOnboardingState(null)).toBeNull();
    expect(readOnboardingState(undefined)).toBeNull();
  });
});

describe('malformed markers degrade, never throw', () => {
  it('an unknown step falls back to basics', () => {
    const s = readOnboardingState({ onboarding: { ...inProgress, step: 'wat' } as never });
    expect(s!.step).toBe('setup');
  });

  it('a step from the retired vocabulary resumes rather than throwing', () => {
    // Brands recorded under the three-step names ('basics'/'material') predate
    // R1. Degrading to the first step keeps them openable, which is the whole
    // point of tolerating a malformed marker.
    for (const old of ['basics', 'material', 'name', 'profile']) {
      const s = readOnboardingState({ onboarding: { ...inProgress, step: old } as never });
      expect(s!.step).toBe('setup');
    }
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

  it('resume lands on the recorded step, or the first step when unknown', () => {
    expect(resumeStep({ onboarding: inProgress })).toBe('setup');
    expect(resumeStep({ onboarding: { ...inProgress, step: 'review' } })).toBe('review');
    expect(resumeStep({})).toBe('setup');
  });
});

describe('transitions', () => {
  it('starts at the setup step, open', () => {
    const s = startedState();
    expect(s.step).toBe('setup');
    expect(s.completedAt).toBeNull();
  });

  it('records the placeholders the create path had to invent', () => {
    expect(startedState(['colors.primary']).placeholders).toEqual(['colors.primary']);
  });

  it('moving BACKWARDS rewrites the step — where you are, not how far you got', () => {
    const forward = atStep(inProgress, 'review');
    expect(forward.step).toBe('review');
    const back = atStep(forward, 'setup');
    expect(back.step).toBe('setup');
  });

  it('a step change preserves startedAt', () => {
    const next = atStep(inProgress, 'review');
    expect(next.startedAt).toBe(inProgress.startedAt);
  });

  it('completing stamps completedAt and makes the brand read as finished', () => {
    const done = completedState(inProgress);
    expect(done.completedAt).toBeTruthy();
    expect(readOnboardingState({ onboarding: done })).toBeNull();
  });

  it('transitions work from nothing', () => {
    expect(atStep(null, 'setup').step).toBe('setup');
    expect(completedState(null).completedAt).toBeTruthy();
  });
});

describe('unfinishedLabel', () => {
  it('describes a situation, never a deficiency', () => {
    expect(unfinishedLabel({ onboarding: inProgress })).toBe('Still setting up · just started');
    expect(unfinishedLabel({ onboarding: { ...inProgress, step: 'review' } })).toBe(
      'Still setting up · left at Review',
    );
    expect(unfinishedLabel({ onboarding: { ...inProgress, step: 'setup' } })).toBe(
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

describe('marker writes are read-modify-write — the staleness hazard', () => {
  // A real bug, caught in a browser smoke pass: the understanding pass retired
  // both sentinels, then the step change wrote them straight back from a
  // render-time snapshot taken before the clear. The review then rendered a
  // real colour and a real typeface as undecided.
  //
  // These two cases pin the shape of it, so the reason `OnboardingFlow` reads
  // the marker from the store at write time survives anyone tidying that up.
  const withSentinels = startedState(['colors.primary', 'typography.primary']);

  it('stepping from the CLEARED marker keeps it cleared', () => {
    const cleared = clearPlaceholders(withSentinels, ['colors.primary', 'typography.primary'])!;
    expect(atStep(cleared, 'review').placeholders).toBeUndefined();
  });

  it('stepping from a STALE marker resurrects what was cleared', () => {
    const cleared = clearPlaceholders(withSentinels, ['colors.primary', 'typography.primary'])!;
    expect(cleared.placeholders).toBeUndefined();
    // The same write, from the pre-clear snapshot — this is the bug.
    expect(atStep(withSentinels, 'review').placeholders).toEqual([
      'colors.primary',
      'typography.primary',
    ]);
  });

  it('the brief survives a step change', () => {
    const withText = withBrief(withSentinels, 'Industry: Retail');
    expect(atStep(withText, 'review').brief).toBe('Industry: Retail');
  });
});
