/**
 * =============================================================================
 * Animation
 * =============================================================================
 *
 * A pure function from a timestamp to a pose. That is the whole design, and it
 * is the requirement the PRD states twice: *"evaluate animation at explicit
 * timeline timestamps"* and *"preview and export evaluate the same scene at the
 * same timestamps, regardless of rendering speed"*.
 *
 * Which means: nothing here accumulates. There is no "advance by delta", no
 * stored angle, no dependence on how often it is called. A preview running at 60
 * frames a second and an export writing one frame every four seconds ask the
 * same question of the same function and get the same answer — so a rendered
 * video cannot drift from what the user watched, however slow the render was.
 *
 * The pose is a **delta**, applied on top of the user's own transform rather
 * than replacing it. Spinning a logo the user has deliberately tilted must keep
 * the tilt, and stopping the spin must leave it exactly where they put it.
 */

import type { AnimationState } from './document';

export interface AnimationPose {
  /** Radians, added to the base rotation. */
  rotation: [number, number, number];
  /** Added to the base position, in the renderer's normalized units. */
  position: [number, number, number];
  /** Multiplied into the base scale. */
  scale: number;
  /** Radians of camera orbit — used by the `orbit` preset, which moves the
   *  viewer rather than the object. */
  cameraOrbit: number;
}

export const IDENTITY_POSE: AnimationPose = {
  rotation: [0, 0, 0],
  position: [0, 0, 0],
  scale: 1,
  cameraOrbit: 0,
};

/** Does this state actually move anything? */
export function isAnimated(state: AnimationState): boolean {
  return state.preset !== 'static' && state.speed !== 0;
}

const AXIS_INDEX: Record<AnimationState['axis'], 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

/**
 * The pose at `seconds` on the timeline.
 *
 * `seconds` is absolute time from the start of the animation, not a delta.
 */
export function evaluateAnimation(state: AnimationState, seconds: number): AnimationPose {
  if (!isAnimated(state) || !Number.isFinite(seconds)) return IDENTITY_POSE;

  const duration = Math.max(0.05, state.durationSeconds);
  const direction = state.reverse ? -1 : 1;
  // Phase in turns. Speed scales time rather than the result, so doubling it
  // halves the period instead of doubling the amplitude.
  const turns = (seconds * state.speed * direction) / duration;

  const pose: AnimationPose = {
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    scale: 1,
    cameraOrbit: 0,
  };
  const axis = AXIS_INDEX[state.axis];

  switch (state.preset) {
    case 'spin':
      // Continuous rotation, and deliberately un-eased: easing the phase of
      // something that never returns to a rest position makes it speed up and
      // slow down once per turn, which reads as a stutter rather than as
      // motion. `ease` shapes the presets that *do* come back.
      pose.rotation[axis] = turns * Math.PI * 2;
      break;

    case 'turntable':
      // Always about the upright axis — that is what makes it a turntable
      // rather than a spin, and it is why both exist.
      pose.rotation[1] = turns * Math.PI * 2;
      break;

    case 'orbit':
      pose.cameraOrbit = turns * Math.PI * 2;
      break;

    case 'oscillate': {
      const phase = shape(cycle(turns), state.ease);
      // A swing of ±25°, which reads as inspection rather than as a wobble.
      pose.rotation[axis] = Math.sin(phase * Math.PI * 2) * (Math.PI / 7.2);
      break;
    }

    case 'float': {
      const phase = shape(cycle(turns), state.ease);
      // A tenth of the object's own size: enough to read, small enough not to
      // fight the framing.
      pose.position[1] = Math.sin(phase * Math.PI * 2) * 0.1;
      break;
    }

    case 'pulse': {
      const phase = shape(cycle(turns), state.ease);
      pose.scale = 1 + Math.sin(phase * Math.PI * 2) * 0.06;
      break;
    }

    case 'wobble': {
      const phase = shape(cycle(turns), state.ease);
      // Two axes at different rates, so the motion never repeats a pose within
      // a cycle and reads as a physical wobble rather than a rocking.
      pose.rotation[0] = Math.sin(phase * Math.PI * 2) * (Math.PI / 18);
      pose.rotation[1] = Math.sin(phase * Math.PI * 4 + 1.1) * (Math.PI / 14);
      break;
    }

    default:
      break;
  }

  return pose;
}

/** Fractional part, correct for negative input — `%` alone returns a negative
 *  remainder, which would make a reversed animation jump at every cycle. */
function cycle(turns: number): number {
  return turns - Math.floor(turns);
}

/**
 * Ease the phase of a cyclic animation.
 *
 * Applied to the *phase*, not the output, so the motion still passes through
 * exactly the same poses and only the timing changes — and it is periodic by
 * construction, so a loop cannot jolt where it joins.
 */
function shape(phase: number, ease: AnimationState['ease']): number {
  if (ease === 'linear') return phase;
  // Smootherstep over each half of the cycle, mirrored, which keeps the
  // endpoints and the midpoint fixed and only redistributes the time between.
  const half = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  const eased = half * half * half * (half * (half * 6 - 15) + 10);
  return phase < 0.5 ? eased / 2 : 1 - eased / 2;
}

/**
 * The exact timestamps of an exported animation.
 *
 * Frames are numbered rather than accumulated so the last one lands exactly on
 * the duration, and so a dropped or slow frame during an export cannot shift
 * every timestamp after it.
 */
export function animationTimeline(state: AnimationState): number[] {
  const duration = Math.max(0.05, state.durationSeconds);
  const fps = Math.max(1, Math.round(state.fps));
  const count = Math.max(1, Math.round(duration * fps));
  return Array.from({ length: count }, (_, i) => (i * duration) / count);
}
