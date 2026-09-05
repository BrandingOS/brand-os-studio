/**
 * A scripted scan, in the shape the processing moment already consumes.
 *
 * `UnderstandingStage` takes a list of `Stage`s and one `work()` promise. Each
 * stage's `run()` resolves when ITS event fires — the node lights on a real
 * (scripted) event, never on a timer of its own. The screen's own pacing still
 * applies, so nothing here can make the moment flash past.
 *
 * DISPOSABLE — Gate 2 only.
 */
import type { Finding, Stage } from '@/features/onboarding/understanding/stages';
import { SCAN_STAGES, type ScanScript, type ScanStageId } from './fixtures';

interface Deferred {
  promise: Promise<Finding | null>;
  resolve: (f: Finding | null) => void;
}

function deferred(): Deferred {
  let resolve!: (f: Finding | null) => void;
  const promise = new Promise<Finding | null>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export interface ScriptedScan {
  stages: Stage[];
  /** Starts the clock. Resolves when the script ends. */
  work: () => Promise<void>;
  cancel: () => void;
}

export function scriptedScan(script: ScanScript): ScriptedScan {
  const waits = new Map<ScanStageId, Deferred>();
  const timers: number[] = [];

  const stages: Stage[] = script.stages.map((id) => {
    const def = SCAN_STAGES.find((s) => s.id === id);
    const node = SCAN_STAGES.findIndex((s) => s.id === id);
    const d = deferred();
    waits.set(id, d);
    return {
      id,
      label: def?.label ?? id,
      node,
      run: () => d.promise,
    };
  });

  const work = () =>
    new Promise<void>((resolve) => {
      for (const ev of script.events) {
        timers.push(
          window.setTimeout(() => {
            waits.get(ev.stage)?.resolve(ev.finding ?? null);
          }, ev.at),
        );
      }
      timers.push(
        window.setTimeout(() => {
          // Anything the script never reached resolves silently, so a stage
          // whose phase failed still ends — the node lights because the work
          // ended, and it carries no finding because there is none.
          for (const d of waits.values()) d.resolve(null);
          resolve();
        }, script.endAt),
      );
    });

  const cancel = () => timers.forEach((t) => window.clearTimeout(t));

  return { stages, work, cancel };
}
