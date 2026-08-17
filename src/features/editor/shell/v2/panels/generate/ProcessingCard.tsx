// ProcessingCard — the single "we're on it" state while the panel
// compiles (silently) and generates. Uses the DS 9-dot mark loader
// (never a generic ring spinner). Stage text is honest but non-technical:
// the compile step is not surfaced as something to review.

import { useEffect, useState } from 'react';
import { LoadingPill } from '@/shared/ds';
import type { GenStatus } from './useImageGeneration';

interface Props {
  status: GenStatus;
  brandName?: string;
  modelLabel: string;
  count: number;
  kind: 'generate' | 'variation' | 'refine' | 'regenerate' | null;
  /** Present when the run can be stopped. */
  onCancel?: () => void;
}

export function ProcessingCard({ status, brandName, modelLabel, count, kind, onCancel }: Props) {
  // Elapsed time is the honest progress signal: vendors report no percentage,
  // and a fake bar would be worse than a number that is true.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status, kind]);
  const stage = status === 'compiling'
    ? `Tuning your prompt to ${brandName ?? 'your brand'}…`
    : kind === 'variation'
      ? `Making ${count} variations with ${modelLabel}…`
      : kind === 'refine'
        ? `Refining with ${modelLabel}…`
        : `Generating${count > 1 ? ` ${count} images` : ''} with ${modelLabel}…`;
  return (
    <section
      data-generate-processing
      data-generate-status={status}
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-2 rounded-lg border px-3 py-5 text-center"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <LoadingPill label={stage} size={18} />
      <p className="text-[10.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
        {status === 'compiling'
          ? 'Reading the brand palette and style so the result fits.'
          : `${elapsed}s elapsed · usually 10–60s depending on the model.`}
      </p>
      {onCancel ? (
        <button
          type="button"
          data-generate-cancel
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-[10.5px] transition-colors hover:bg-muted"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      ) : null}
    </section>
  );
}
