/**
 * The animation evaluator.
 *
 * The property that matters most is the dull one: **the pose depends only on
 * the timestamp**. Everything else in the PRD's animation section rests on it —
 * an export that writes one frame every four seconds must produce the motion the
 * user watched at sixty frames a second, and the only way that holds is if
 * nothing accumulates.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_ANIMATION, type AnimationState } from '../document';
import { evaluateAnimation, isAnimated, animationTimeline, IDENTITY_POSE } from '../animation';

const state = (patch: Partial<AnimationState> = {}): AnimationState => ({
  ...DEFAULT_ANIMATION,
  ...patch,
});

describe('nothing accumulates', () => {
  it('the same timestamp always gives the same pose', () => {
    const s = state({ preset: 'spin', speed: 1.7 });
    const a = evaluateAnimation(s, 3.21);
    // asked a hundred times in between, and out of order
    for (const t of [0, 9, 1.5, 100, -4]) evaluateAnimation(s, t);
    expect(evaluateAnimation(s, 3.21)).toEqual(a);
  });

  it('sampling coarsely lands on the same poses as sampling finely', () => {
    // This is the export case: one frame every four seconds must trace the same
    // motion as sixty frames a second.
    const s = state({ preset: 'turntable', speed: 1 });
    for (const t of [0, 1, 2, 3, 4, 5]) {
      expect(evaluateAnimation(s, t).rotation[1]).toBeCloseTo(
        evaluateAnimation(s, t).rotation[1], 12,
      );
    }
    const coarse = [0, 2.5, 5].map((t) => evaluateAnimation(s, t).rotation[1]);
    const fine = [0, 2.5, 5].map((t) => {
      for (let i = 0; i < 200; i++) evaluateAnimation(s, i * 0.01);
      return evaluateAnimation(s, t).rotation[1];
    });
    expect(fine).toEqual(coarse);
  });
});

describe('static and disabled states', () => {
  it('static is the identity', () => {
    expect(evaluateAnimation(state({ preset: 'static' }), 12)).toEqual(IDENTITY_POSE);
  });
  it('zero speed is the identity, whatever the preset', () => {
    expect(evaluateAnimation(state({ preset: 'spin', speed: 0 }), 12)).toEqual(IDENTITY_POSE);
    expect(isAnimated(state({ preset: 'spin', speed: 0 }))).toBe(false);
  });
  it('a nonsense timestamp does not produce a nonsense pose', () => {
    expect(evaluateAnimation(state({ preset: 'spin' }), NaN)).toEqual(IDENTITY_POSE);
    expect(evaluateAnimation(state({ preset: 'spin' }), Infinity)).toEqual(IDENTITY_POSE);
  });
});

describe('spin and turntable', () => {
  it('a spin completes exactly one turn per duration', () => {
    const s = state({ preset: 'spin', axis: 'y', durationSeconds: 4, speed: 1 });
    expect(evaluateAnimation(s, 0).rotation[1]).toBeCloseTo(0, 9);
    expect(evaluateAnimation(s, 2).rotation[1]).toBeCloseTo(Math.PI, 9);
    expect(evaluateAnimation(s, 4).rotation[1]).toBeCloseTo(Math.PI * 2, 9);
  });

  it('speed scales time, so double speed halves the period', () => {
    const slow = state({ preset: 'spin', durationSeconds: 4, speed: 1 });
    const fast = state({ preset: 'spin', durationSeconds: 4, speed: 2 });
    expect(evaluateAnimation(fast, 2).rotation[1]).toBeCloseTo(
      evaluateAnimation(slow, 4).rotation[1], 9,
    );
  });

  it('reverse mirrors it exactly', () => {
    const f = state({ preset: 'spin', speed: 1 });
    const r = state({ preset: 'spin', speed: 1, reverse: true });
    expect(evaluateAnimation(r, 3).rotation[1]).toBeCloseTo(-evaluateAnimation(f, 3).rotation[1], 9);
  });

  it('the axis control chooses the axis, and leaves the others alone', () => {
    for (const [axis, index] of [['x', 0], ['y', 1], ['z', 2]] as const) {
      const pose = evaluateAnimation(state({ preset: 'spin', axis, speed: 1 }), 1);
      expect(pose.rotation[index], axis).not.toBe(0);
      for (const other of [0, 1, 2]) {
        if (other !== index) expect(pose.rotation[other], `${axis}/${other}`).toBe(0);
      }
    }
  });

  it('a turntable is always upright, whatever the axis control says', () => {
    // That is the difference between the two presets, and the reason both exist.
    const pose = evaluateAnimation(state({ preset: 'turntable', axis: 'x', speed: 1 }), 1);
    expect(pose.rotation[1]).not.toBe(0);
    expect(pose.rotation[0]).toBe(0);
    expect(pose.rotation[2]).toBe(0);
  });

  it('a spin is smooth across the loop point, in both directions', () => {
    for (const reverse of [false, true]) {
      const s = state({ preset: 'spin', durationSeconds: 2, speed: 1, reverse });
      const before = evaluateAnimation(s, 1.999).rotation[1];
      const after = evaluateAnimation(s, 2.001).rotation[1];
      // continuous: the angle keeps climbing rather than snapping back
      expect(Math.abs(after - before), `reverse=${reverse}`).toBeLessThan(0.05);
    }
  });
});

describe('the cyclic presets return to where they started', () => {
  it.each(['oscillate', 'float', 'pulse', 'wobble'] as const)('%s is periodic', (preset) => {
    const s = state({ preset, durationSeconds: 3, speed: 1 });
    const start = evaluateAnimation(s, 0);
    const later = evaluateAnimation(s, 3);
    expect(later.rotation.map((v) => +v.toFixed(9))).toEqual(start.rotation.map((v) => +v.toFixed(9)));
    expect(+later.position[1].toFixed(9)).toBe(+start.position[1].toFixed(9));
    expect(+later.scale.toFixed(9)).toBe(+start.scale.toFixed(9));
  });

  it.each(['oscillate', 'float', 'pulse', 'wobble'] as const)('%s does not jolt at the loop', (preset) => {
    const s = state({ preset, durationSeconds: 2, speed: 1 });
    const before = evaluateAnimation(s, 1.99);
    const after = evaluateAnimation(s, 2.01);
    const delta = Math.abs(after.rotation[0] - before.rotation[0])
      + Math.abs(after.rotation[1] - before.rotation[1])
      + Math.abs(after.position[1] - before.position[1])
      + Math.abs(after.scale - before.scale);
    expect(delta).toBeLessThan(0.05);
  });

  it('a reversed cycle does not jump — negative time wraps correctly', () => {
    // `%` returns a negative remainder, which would put a discontinuity at every
    // cycle boundary of a reversed animation.
    const s = state({ preset: 'float', durationSeconds: 2, speed: 1, reverse: true });
    let previous = evaluateAnimation(s, 0).position[1];
    for (let t = 0; t < 6; t += 0.02) {
      const v = evaluateAnimation(s, t).position[1];
      expect(Math.abs(v - previous), `t=${t.toFixed(2)}`).toBeLessThan(0.02);
      previous = v;
    }
  });

  it('float moves only vertically, and pulse only scales', () => {
    const f = evaluateAnimation(state({ preset: 'float', speed: 1 }), 0.7);
    expect(f.position[0]).toBe(0);
    expect(f.position[2]).toBe(0);
    expect(f.rotation).toEqual([0, 0, 0]);

    const p = evaluateAnimation(state({ preset: 'pulse', speed: 1 }), 0.7);
    expect(p.scale).not.toBe(1);
    expect(p.position).toEqual([0, 0, 0]);
  });

  it('the amplitudes stay modest, so the framing survives', () => {
    for (let t = 0; t < 6; t += 0.05) {
      expect(Math.abs(evaluateAnimation(state({ preset: 'float', speed: 1 }), t).position[1])).toBeLessThan(0.15);
      const scale = evaluateAnimation(state({ preset: 'pulse', speed: 1 }), t).scale;
      expect(scale).toBeGreaterThan(0.9);
      expect(scale).toBeLessThan(1.1);
      expect(Math.abs(evaluateAnimation(state({ preset: 'oscillate', speed: 1 }), t).rotation[1]))
        .toBeLessThan(Math.PI / 6);
    }
  });
});

describe('easing', () => {
  it('changes the timing without changing the poses it passes through', () => {
    const linear = state({ preset: 'oscillate', ease: 'linear', speed: 1 });
    const eased = state({ preset: 'oscillate', ease: 'inOut', speed: 1 });
    // same extremes
    const range = (s: AnimationState) => {
      let lo = Infinity, hi = -Infinity;
      for (let t = 0; t < 5; t += 0.001) {
        const v = evaluateAnimation(s, t).rotation[1];
        lo = Math.min(lo, v); hi = Math.max(hi, v);
      }
      return [lo, hi];
    };
    const [lo1, hi1] = range(linear);
    const [lo2, hi2] = range(eased);
    expect(lo2).toBeCloseTo(lo1, 3);
    expect(hi2).toBeCloseTo(hi1, 3);
    // but a different value partway through
    expect(evaluateAnimation(eased, 0.6).rotation[1])
      .not.toBeCloseTo(evaluateAnimation(linear, 0.6).rotation[1], 3);
  });

  it('leaves a continuous spin alone, because easing one would make it stutter', () => {
    const a = evaluateAnimation(state({ preset: 'spin', ease: 'linear', speed: 1 }), 1.3);
    const b = evaluateAnimation(state({ preset: 'spin', ease: 'inOut', speed: 1 }), 1.3);
    expect(b.rotation[1]).toBeCloseTo(a.rotation[1], 12);
  });
});

describe('orbit moves the camera, not the object', () => {
  it('reports an angle and leaves the object still', () => {
    const pose = evaluateAnimation(state({ preset: 'orbit', speed: 1, durationSeconds: 4 }), 2);
    expect(pose.cameraOrbit).toBeCloseTo(Math.PI, 9);
    expect(pose.rotation).toEqual([0, 0, 0]);
    expect(pose.position).toEqual([0, 0, 0]);
  });
});

describe('animationTimeline', () => {
  it('has duration x fps frames, starting at zero', () => {
    const frames = animationTimeline(state({ durationSeconds: 5, fps: 30 }));
    expect(frames).toHaveLength(150);
    expect(frames[0]).toBe(0);
  });

  it('never repeats the first frame at the end, so a loop does not stutter', () => {
    const frames = animationTimeline(state({ durationSeconds: 2, fps: 10 }));
    expect(frames[frames.length - 1]).toBeCloseTo(1.9, 9);
  });

  it('is exact at every frame rather than accumulated', () => {
    // A dropped or slow frame during an export must not shift every timestamp
    // after it.
    const frames = animationTimeline(state({ durationSeconds: 3, fps: 24 }));
    frames.forEach((t, i) => expect(t).toBeCloseTo((i * 3) / 72, 12));
  });

  it('survives nonsense settings', () => {
    expect(animationTimeline(state({ durationSeconds: 0, fps: 0 })).length).toBeGreaterThan(0);
  });
});
