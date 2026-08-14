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
    // own work reports in.
    stages.forEach((stage, i) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setIndex(i);
          void Promise.resolve(stage.run()).then((finding) => {
            if (cancelled) return;
            setActive((prev) => (prev.includes(stage.node) ? prev : [...prev, stage.node]));
            if (finding) setFindings((prev) => [...prev, finding]);
          });
        }, i * STAGE_MS),
      );
    });

    void running.then(() => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const sequence = stages.length * STAGE_MS;
      // Never shorter than one clean beat; never longer than the real work
      // plus the sequence still playing.
      const wait = Math.max(MINIMUM_BEAT_MS - elapsed, sequence - elapsed, 0);
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
