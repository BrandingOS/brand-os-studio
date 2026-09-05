/**
 * The processing moment — a transition, not a screen.
 *
 * It has no form, no input and no step number. The user pressed Continue on the
 * profile screen and arrives at the review; this is what happens on the way.
 *
 * Three rules, and each is enforced structurally rather than by discipline:
 *
 *  - **Only real work is narrated.** The stages come from `planStages`, which
 *    builds a stage only when the work it names is scheduled. Copy for work
 *    that will not happen is unrepresentable here.
 *  - **Findings are real or absent.** `run()` returns what the work produced,
 *    or `null`. Nothing is invented to fill the space.
 *  - **The 1.2s beat is a FLOOR on the screen, never a delay in the work.** The
 *    understanding pass is started immediately and awaited; the beat only
 *    governs how long this stays visible once that has resolved. Work that
 *    takes four seconds is shown for four seconds.
 *  - **The animation never delays completion.** When the work finishes before
 *    the pacing has shown every stage, the rest run out at a quick beat and the
 *    moment ends. Eight stages at the readable pace would be six seconds; a
 *    two-second scan is shown for about two.
 *
 * No percentage, no progress bar, no sparkles.
 */
import { useEffect, useRef, useState } from 'react';
import type { Finding, Stage } from '../understanding/stages';
import { MINIMUM_BEAT_MS } from '../understanding/stages';
import { UnderstandingMark } from '../components/UnderstandingMark';

export interface UnderstandingStageProps {
  brandName: string;
  stages: Stage[];
  /** The real understanding pass. Started immediately; the beat waits on it. */
  work: () => Promise<void>;
  onDone(): void;
}

/**
 * How long each stage holds before the next, when the work outpaces the screen.
 *
 * Slower than it needs to be, on purpose: the spoke draws, then the node lands,
 * then its ring expands — roughly 700ms of motion per stage. At 520ms the beats
 * overlapped and the thing read as a flicker rather than an assembly.
 */
const STAGE_MS = 760;

/**
 * The cadence once the work has FINISHED and stages are still queued.
 *
 * The animation explains progress; it is never the critical path. When the
 * real work outruns the pacing, whatever has not been shown yet is shown at
 * this quicker beat and the moment ends — the user is never kept waiting so
 * that a sequence can complete at its leisurely pace.
 */
const FAST_MS = 160;

export function UnderstandingStage({ brandName, stages, work, onDone }: UnderstandingStageProps) {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<number[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const startedAt = Date.now();

    // The work starts NOW. Nothing below delays it — the sequence below only
    // decides what is on screen while it runs.
    const running = work().catch(() => {
      /* the caller reports failure; the transition still completes */
    });

    // Walk the stages at a readable pace, lighting each node as its stage's
    // own work reports in. `shown` is what fast-forward consults.
    const shown = new Set<number>();
    const labelTimers: number[] = [];
    const show = (i: number) => {
      if (cancelled || shown.has(i)) return;
      shown.add(i);
      const stage = stages[i];
      setIndex(i);
      void Promise.resolve(stage.run()).then((finding) => {
        if (cancelled) return;
        setActive((prev) => (prev.includes(stage.node) ? prev : [...prev, stage.node]));
        if (finding) setFindings((prev) => [...prev, finding]);
      });
    };
    stages.forEach((_, i) => {
      const t = window.setTimeout(() => show(i), i * STAGE_MS);
      labelTimers.push(t);
      timers.push(t);
    });

    void running.then(() => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      // The work is done. Whatever the pacing has not reached is shown now at
      // the quick beat, then the moment ends — never held for the sequence.
      labelTimers.forEach((t) => window.clearTimeout(t));
      const pending = stages.map((_, i) => i).filter((i) => !shown.has(i));
      pending.forEach((i, k) => timers.push(window.setTimeout(() => show(i), k * FAST_MS)));
      const settle = pending.length ? pending.length * FAST_MS + 240 : 0;
      // Never shorter than one clean beat; never longer than the quick run-out.
      const wait = Math.max(MINIMUM_BEAT_MS - elapsed, settle, 0);
      timers.push(
        window.setTimeout(() => {
          if (cancelled || finished.current) return;
          finished.current = true;
          setActive(stages.map((s) => s.node));
          onDone();
        }, wait),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
    // Runs once per mount. Re-running would restart the work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = stages[Math.min(index, stages.length - 1)];

  return (
    <div className="onb-proc" role="status" aria-live="polite">
      <UnderstandingMark active={active} />

      <div className="onb-proc-copy">
        {/* Keyed so each stage's copy animates in rather than swapping text
            inside a static node. */}
        <p className="onb-proc-line" key={current?.id ?? 'idle'}>
          {current?.label ?? 'Preparing your brand system'}
        </p>
        <p className="onb-proc-sub">{brandName}</p>
      </div>

      {findings.length > 0 && (
        <div className="onb-finds">
          {findings.map((f, i) => (
            <span className="onb-find" key={`${f.label}-${i}`}>
              {f.label} · <b>{f.value}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
