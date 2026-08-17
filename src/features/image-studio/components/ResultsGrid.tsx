// ResultsGrid — everything this project has made, newest first.
//
// A generation is not finished when the pixels arrive. Each result carries the
// actions that make it useful: download it, keep it in the brand, iterate on
// it, or take it into the editor. Failures stay in the list too, with the
// reason and a retry — a job that cost nothing and vanished silently is worse
// than one that says what went wrong.

import { useState } from 'react';
import { Download, RefreshCw, Shuffle, Wand2, Bookmark, PenLine, AlertCircle } from 'lucide-react';
import { DsButton, DsSkeleton } from '@/shared/ds';
import type { GenerationJob } from '@/features/image-generation';
import { displayFor } from '@/features/editor/ai/imageModels';

export interface ResultsGridProps {
  jobs: GenerationJob[];
  loading: boolean;
  busy: boolean;
  onVariations: (job: GenerationJob, index: number) => void;
  onRefine: (job: GenerationJob, index: number, instruction: string) => void;
  onRegenerate: (job: GenerationJob) => void;
  onReusePrompt: (job: GenerationJob) => void;
  onSaveToBrand: (job: GenerationJob, index: number) => Promise<void>;
  onOpenInEditor?: (job: GenerationJob, index: number) => void;
  onRetry: () => void;
  savedKeys: Set<string>;
}

export function ResultsGrid(props: ResultsGridProps) {
  const { jobs, loading, busy } = props;

  if (loading && jobs.length === 0) {
    return (
      <div className="is-results" data-results-loading>
        {[0, 1, 2].map((i) => (
          <div key={i} className="is-result-card">
            <DsSkeleton height={220} radius={12} />
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="is-empty" data-results-empty>
        <Wand2 size={22} strokeWidth={1.6} aria-hidden />
        <h2>Nothing generated yet</h2>
        <p>
          Describe what you want above. Pick what the brand should contribute —
          its logo, its colours — and the result lands here.
        </p>
      </div>
    );
  }

  return (
    <div className="is-results" data-results>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} {...props} busy={busy} />
      ))}
    </div>
  );
}

function JobCard({
  job, busy, onVariations, onRefine, onRegenerate, onReusePrompt,
  onSaveToBrand, onOpenInEditor, onRetry, savedKeys,
}: { job: GenerationJob } & Omit<ResultsGridProps, 'jobs' | 'loading'>) {
  const [refineFor, setRefineFor] = useState<number | null>(null);
  const [instruction, setInstruction] = useState('');
  const model = displayFor(job.model)?.label ?? job.model;

  if (job.status !== 'succeeded') {
    return (
      <article className="is-result-card is-result-card--failed" data-job={job.id} data-job-status={job.status}>
        <header className="is-result-head">
          <p className="is-result-prompt" title={job.userPrompt}>{job.userPrompt}</p>
          <span className="is-result-meta">{model}</span>
        </header>
        <div className="is-result-failed" role="alert">
          <AlertCircle size={16} strokeWidth={1.8} aria-hidden />
          <div>
            <strong>{job.status === 'cancelled' ? 'Cancelled' : 'Did not finish'}</strong>
            <p>{job.errorMessage ?? 'The provider did not return an image.'}</p>
            <p className="is-result-note">No credits were charged.</p>
          </div>
        </div>
        <footer className="is-result-actions">
          <DsButton tone="tertiary" size="sm" disabled={busy} onClick={() => onReusePrompt(job)}>
            <PenLine size={13} strokeWidth={1.8} aria-hidden /> Reuse prompt
          </DsButton>
          <DsButton tone="secondary" size="sm" disabled={busy} onClick={onRetry} data-job-retry>
            <RefreshCw size={13} strokeWidth={1.8} aria-hidden /> Try again
          </DsButton>
        </footer>
      </article>
    );
  }

  return (
    <article className="is-result-card" data-job={job.id} data-job-status="succeeded">
      <header className="is-result-head">
        <p className="is-result-prompt" title={job.compiledPrompt ?? job.userPrompt}>{job.userPrompt}</p>
        <span className="is-result-meta">
          {model}
          {job.chargedCredits > 0 ? ` · ${job.chargedCredits} credits` : ' · free'}
          {job.settings.aspectRatio ? ` · ${job.settings.aspectRatio}` : ''}
        </span>
      </header>

      <div className={`is-result-images is-result-images--${Math.min(job.outputs.length, 4)}`}>
        {job.outputs.map((out, i) => (
          <figure key={out.storagePath} className="is-result-image" data-output={i}>
            <img src={out.url} alt={job.userPrompt} loading="lazy" />
            <figcaption className="is-result-overlay">
              <a
                href={out.url}
                download={`${job.userPrompt.slice(0, 40).replace(/[^\w-]+/g, '-') || 'image'}.png`}
                target="_blank"
                rel="noreferrer"
                title="Download"
                data-output-download={i}
              >
                <Download size={14} strokeWidth={1.8} aria-hidden />
              </a>
              <button
                type="button"
                title={savedKeys.has(out.storagePath) ? 'Saved to Brand Assets' : 'Save to Brand Assets'}
                data-output-save={i}
                disabled={busy || savedKeys.has(out.storagePath)}
                onClick={() => void onSaveToBrand(job, i)}
              >
                <Bookmark
                  size={14}
                  strokeWidth={1.8}
                  fill={savedKeys.has(out.storagePath) ? 'currentColor' : 'none'}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                title="4 variations of this image"
                data-output-variations={i}
                disabled={busy}
                onClick={() => onVariations(job, i)}
              >
                <Shuffle size={14} strokeWidth={1.8} aria-hidden />
              </button>
              <button
                type="button"
                title="Refine this image"
                data-output-refine={i}
                disabled={busy}
                onClick={() => { setRefineFor(refineFor === i ? null : i); setInstruction(''); }}
              >
                <Wand2 size={14} strokeWidth={1.8} aria-hidden />
              </button>
              {onOpenInEditor ? (
                <button
                  type="button"
                  title="Open in the design editor"
                  data-output-editor={i}
                  disabled={busy}
                  onClick={() => onOpenInEditor(job, i)}
                >
                  <PenLine size={14} strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>

      {refineFor != null ? (
        <div className="is-refine" data-refine-row>
          <Wand2 size={13} strokeWidth={1.8} aria-hidden />
          <input
            data-refine-input
            autoFocus
            value={instruction}
            disabled={busy}
            placeholder="What should change? — “warmer light, add rain”"
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && instruction.trim()) {
                onRefine(job, refineFor, instruction);
                setRefineFor(null); setInstruction('');
              }
              if (e.key === 'Escape') setRefineFor(null);
            }}
            aria-label="Refinement instruction"
          />
          <DsButton
            tone="secondary" size="sm"
            disabled={busy || !instruction.trim()}
            data-refine-submit
            onClick={() => { onRefine(job, refineFor, instruction); setRefineFor(null); setInstruction(''); }}
          >
            Refine
          </DsButton>
        </div>
      ) : null}

      <footer className="is-result-actions">
        <DsButton tone="tertiary" size="sm" disabled={busy} onClick={() => onReusePrompt(job)} data-job-reuse>
          <PenLine size={13} strokeWidth={1.8} aria-hidden /> Reuse prompt
        </DsButton>
        <DsButton tone="tertiary" size="sm" disabled={busy} onClick={() => onRegenerate(job)} data-job-regenerate>
          <RefreshCw size={13} strokeWidth={1.8} aria-hidden /> Regenerate
        </DsButton>
      </footer>
    </article>
  );
}
