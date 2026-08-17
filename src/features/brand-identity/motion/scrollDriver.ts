/**
 * One scroll listener for the whole page.
 *
 * ── Why a driver rather than a hook per element ───────────────────────────
 *
 * This page can carry sixty moving elements — a pinned hero, parallax on every
 * specimen, a drifting colour field. Sixty `scroll` listeners each calling
 * `getBoundingClientRect` is sixty forced layouts per frame, and the page janks
 * exactly where it is trying to look expensive. So there is ONE passive
 * listener, one `requestAnimationFrame`, and one pass over the registered
 * elements per frame.
 *
 * ── Why it writes a CSS variable instead of React state ───────────────────
 *
 * Progress changes every frame. Routing that through `setState` re-renders a
 * component tree sixty times a second to move something four pixels. Writing
 * `--bi-p` onto the element leaves the animation entirely to the compositor and
 * React never learns it happened — which is also why nothing here needs to be
 * cleaned up beyond removing the element from the set.
 *
 * ── Reduced motion ───────────────────────────────────────────────────────
 *
 * Nothing registers. The variable is never written and every rule reads
 * `var(--bi-p, 0)`, so the page renders in its resting state — which is the
 * designed state, not a degraded one.
 */

export type ScrollMode =
  /** 0 → 1 across the element's own scroll travel. For a pinned stage. */
  | 'pin'
  /** 0 when the element's top edge reaches the fold, 1 when it leaves the top. */
  | 'travel';

interface Registration {
  mode: ScrollMode;
  /** Last written value, so an unchanged frame costs nothing. */
  last: number;
}

const targets = new Map<HTMLElement, Registration>();
/*
 * Two variables, not one.
 *
 * "Is a frame already booked" and "which frame" have to be separate, because
 * `requestAnimationFrame` returns its handle AFTER the callback has run if the
 * callback runs synchronously. Storing the handle as the flag meant the
 * assignment landed after `tick` had cleared it, the flag stayed set forever,
 * and every subsequent scroll was silently dropped.
 */
let pending = false;
let handle = 0;
let listening = false;

function progressOf(el: HTMLElement, mode: ScrollMode): number {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  if (mode === 'pin') {
    // How far through a stage taller than the viewport we have scrolled.
    const travel = rect.height - vh;
    // A stage no taller than the viewport has no travel of its own: it is at
    // rest until its top edge leaves the screen, and spent thereafter. `< 0`,
    // not `<= 0` — a stage that has only just arrived has not been scrolled.
    if (travel <= 0) return rect.top < 0 ? 1 : 0;
    return clamp(-rect.top / travel);
  }
  // `travel`: the element's whole journey across the viewport.
  return clamp((vh - rect.top) / (vh + rect.height));
}

function clamp(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function tick() {
  pending = false;
  handle = 0;
  for (const [el, reg] of targets) {
    const p = progressOf(el, reg.mode);
    // A repaint for a change nobody can see is still a repaint.
    if (Math.abs(p - reg.last) < 0.0015) continue;
    reg.last = p;
    el.style.setProperty('--bi-p', p.toFixed(4));
  }
}

function schedule() {
  if (pending) return;
  pending = true;
  handle = requestAnimationFrame(tick);
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

/** Register an element. Returns the function that unregisters it. */
export function observeScroll(el: HTMLElement, mode: ScrollMode): () => void {
  targets.set(el, { mode, last: -1 });
  listen();
  // Measure immediately: an element already on screen at mount must not wait
  // for the reader to scroll before it has a value.
  schedule();
  return () => {
    targets.delete(el);
    el.style.removeProperty('--bi-p');
    if (targets.size === 0 && listening) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      listening = false;
      if (handle) cancelAnimationFrame(handle);
      pending = false;
      handle = 0;
    }
  };
}

/** For tests. */
export function _scrollTargetCount(): number {
  return targets.size;
}
