/**
 * =============================================================================
 * High-quality render — path tracing
 * =============================================================================
 *
 * The rasterized preview is a good likeness and it has three hard limits, all of
 * which show on a mark made of clustered shapes:
 *
 *   - **Nothing reflects anything else.** A metal ball reflects the environment
 *     map and never its neighbour, so a cluster of them reads as separate
 *     objects rather than one piece of cast metal.
 *   - **No occlusion.** Light reaches the inside of a neck as easily as the top
 *     of a ball, so the crevices that give a solid its weight are simply absent.
 *   - **Glass cannot refract more than once.** `transmission` is a screen-space
 *     approximation: no caustics, no dispersion, nothing behind the object seen
 *     through two surfaces.
 *
 * Those are not tuning problems. They are what rasterization is, and the answer
 * is to trace paths — which is also, exactly, what the PRD's §12 "final local
 * render" specifies: progressive refinement, a quality setting, sample progress,
 * a time estimate, pause and cancellation.
 *
 * `three-gpu-pathtracer` runs entirely on the device, shares the scene the
 * preview has already built, and is loaded only when a high-quality render is
 * asked for.
 *
 * **A path tracer is lit only by what is in the scene.** With no environment and
 * no emissive geometry it renders black, correctly — the studio's directional
 * lights do not exist to it. The environment map carries the lighting, which is
 * why `environment.ts` paints a real one rather than relying on lights.
 */

import * as THREE from 'three';

export interface PathTraceOptions {
  /** Stop here. Higher is cleaner and slower; noise falls as 1/√samples. */
  targetSamples: number;
  /**
   * Multiplier on the traced resolution. Below 1 trades sharpness for speed and
   * is how a usable preview of the final render is obtained on a weak GPU.
   */
  renderScale?: number;
  /** Bounces per path. More is needed for glass than for metal. */
  bounces?: number;
  /**
   * The raw equirectangular environment to trace against.
   *
   * Required in practice. The scene's own `environment` is the PMREM-prefiltered
   * cube-UV texture the rasterizer needs, and the tracer samples directions
   * itself — handed the prefiltered one it reads past the end of a lookup table
   * and throws `Cannot read properties of undefined`. Installed for the duration
   * of the render and put back afterwards, so the preview is unaffected.
   */
  environment?: THREE.Texture | null;
  onProgress?: (progress: PathTraceProgress) => void;
}

export interface PathTraceProgress {
  samples: number;
  targetSamples: number;
  /** 0..1. */
  fraction: number;
  elapsedMs: number;
  /** Null until enough samples have landed to extrapolate honestly. */
  remainingMs: number | null;
}

export interface PathTraceHandle {
  /** Resolves when the target is reached, or when `cancel` is called. */
  readonly done: Promise<'complete' | 'cancelled'>;
  cancel(): void;
  dispose(): void;
}

/**
 * Start a progressive path-traced render into `renderer`'s canvas.
 *
 * Runs from `requestAnimationFrame` rather than a tight loop on purpose: the
 * tracer keeps its own clock, splits a sample across frames, and — more to the
 * point — a tight loop would lock the tab for the whole render, which for a
 * heavy scene is minutes.
 */
export async function startPathTrace(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: PathTraceOptions,
): Promise<PathTraceHandle> {
  const { WebGLPathTracer } = await import('three-gpu-pathtracer');

  const previousEnvironment = scene.environment;
  if (options.environment) scene.environment = options.environment;

  const tracer = new WebGLPathTracer(renderer);
  // The default waits 100ms of wall clock before the first sample, which is for
  // an interactive viewer deciding whether the user has stopped moving. A render
  // the user explicitly asked for should start immediately.
  tracer.renderDelay = 0;
  tracer.minSamples = 1;
  tracer.renderScale = options.renderScale ?? 1;
  if (options.bounces !== undefined) tracer.bounces = options.bounces;
  tracer.setScene(scene, camera);

  let cancelled = false;
  let frame = 0;
  const started = performance.now();
  let settle: (outcome: 'complete' | 'cancelled') => void = () => {};

  const done = new Promise<'complete' | 'cancelled'>((resolve) => {
    // Held so that `cancel` can settle the promise itself. Cancelling also stops
    // the frame loop, so waiting for the next tick to notice would mean waiting
    // for a tick that is never scheduled — the render stopped and the caller
    // hung for ever.
    let settled = false;
    settle = (outcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const tick = () => {
      if (cancelled) {
        settle('cancelled');
        return;
      }
      tracer.renderSample();

      const samples = tracer.samples;
      const elapsedMs = performance.now() - started;
      const fraction = Math.min(1, samples / options.targetSamples);
      options.onProgress?.({
        samples,
        targetSamples: options.targetSamples,
        fraction,
        elapsedMs,
        // Only once there is enough evidence to extrapolate from. A countdown
        // offered after one sample is a guess dressed as a fact, and it is
        // always wrong in the direction that annoys people.
        remainingMs: samples >= 4 ? (elapsedMs / samples) * (options.targetSamples - samples) : null,
      });

      if (samples >= options.targetSamples) {
        settle('complete');
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });

  return {
    done,
    cancel() {
      cancelled = true;
      cancelAnimationFrame(frame);
      settle('cancelled');
    },
    dispose() {
      cancelled = true;
      cancelAnimationFrame(frame);
      settle('cancelled');
      scene.environment = previousEnvironment;
      (tracer as unknown as { dispose?: () => void }).dispose?.();
    },
  };
}

/**
 * Is a path-traced render worth offering on this device?
 *
 * Two things decide it. WebGL2 with float blending is required outright — the
 * accumulation buffer is float, and without `EXT_float_blend` the tracer either
 * refuses or produces garbage. And a software rasterizer, which reports itself
 * as SwiftShader or llvmpipe, is roughly two hundred times slower than a real
 * GPU here: a render that takes four seconds on hardware takes fifteen minutes,
 * which is not a slow feature but a broken one. Offering it there would be worse
 * than not having it.
 */
export function pathTracingSupport(renderer: THREE.WebGLRenderer): {
  supported: boolean;
  reason?: string;
  gpu?: string;
} {
  const gl = renderer.getContext();
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!isWebGL2) return { supported: false, reason: 'This browser does not support WebGL 2.' };
  if (!gl.getExtension('EXT_float_blend')) {
    return { supported: false, reason: 'This device cannot blend floating-point buffers, which a traced render needs.' };
  }
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : undefined;
  if (gpu && /swiftshader|llvmpipe|software/i.test(gpu)) {
    return {
      supported: false,
      gpu,
      reason: 'This browser is drawing without a graphics card, where a traced render would take hours.',
    };
  }
  return { supported: true, gpu };
}
