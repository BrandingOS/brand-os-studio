// ResultsStrip — the results, and the slots they are about to land in.
//
// The panel used to answer "what is happening?" with a card that replaced the
// whole form: the prompt disappeared, the toolbar disappeared, and a spinner
// sat where none of the results would appear. Then the images arrived on the
// canvas and the sidebar showed nothing at all, so the prompt that made a
// given image was lost the moment it was generated.
//
// Both problems are the same problem — there was no result slot. There is one
// now, and it is where BOTH states live: while a batch runs it holds one
// pending tile per requested image, and those tiles become the results.
//
// Honesty rules for the waiting state:
//   • the status names the stage in plain words, and elapsed time is real
//   • a remaining estimate appears ONLY when this browser has actually timed
//     this model at this batch size before (see genTiming.ts); otherwise the
//     tile says the usual range and nothing more
//   • past the estimate it says "taking longer than usual" rather than
//     counting down into negative numbers or freezing at 1s

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, CornerUpLeft, ImageOff } from 'lucide-react';
import { LoadingPill } from '@/shared/ds';
import type { BrandOSDocument, ImageLayer } from '@/features/editor/schema';
import { readAiMetadata, type GenerationRecord } from './aiMetadata';
import type { GenStatus } from './useImageGeneration';

export interface PendingBatch {
  status: Extract<GenStatus, 'compiling' | 'generating'>;
  /** How many tiles to hold open. */
  count: number;
  kind: GenerationRecord['kind'];
  modelLabel: string;
  brandName?: string;
  /** epoch ms */
  startedAt: number;
  /** Median observed duration for this model + count, or null. */
  etaMs: number | null;
  onCancel?: () => void;
}

interface ResultTile {
  record: GenerationRecord;
  pageId: string;
  src?: string;
}

const MAX_SHOWN = 12;

/** What the critic said about a delivered page. Absent when it could not look. */
export interface PageCritique {
  overall: number;
  note: string;
  hardFailures: string[];
}

export function ResultsStrip({
  doc, activePageId, pending, critique, onSelect, onReusePrompt,
}: {
  doc: BrandOSDocument;
  activePageId: string;
  pending: PendingBatch | null;
  critique?: Record<string, PageCritique>;
  onSelect: (pageId: string) => void;
  onReusePrompt: (text: string) => void;
}) {
  const tiles = useMemo<ResultTile[]>(() => {
    const gens = readAiMetadata(doc).generations;
    const byPage = new Map(doc.pages.map((p) => [p.id, p]));
    const seen = new Set<string>();
    const out: ResultTile[] = [];
    // Newest first, one tile per page even if a page was generated twice.
    for (let i = gens.length - 1; i >= 0 && out.length < MAX_SHOWN; i--) {
      const rec = gens[i];
      if (seen.has(rec.pageId)) continue;
      const page = byPage.get(rec.pageId);
      if (!page) continue;          // the page was deleted or undone
      seen.add(rec.pageId);
      const layer = page.layers.find((l) => l.kind === 'image') as ImageLayer | undefined;
      out.push({
        record: rec,
        pageId: rec.pageId,
        src: typeof layer?.src === 'string' ? layer.src : undefined,
      });
    }
    return out;
  }, [doc]);

  if (!pending && tiles.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-1.5"
      data-generate-results
      // `data-generate-processing` marks "a run is in flight" — it moved here
      // from the card that used to replace the whole form.
      data-generate-processing={pending ? '' : undefined}
      data-generate-status={pending?.status}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          Results
        </span>
        {pending ? <PendingStatus pending={pending} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {pending
          ? Array.from({ length: pending.count }, (_, i) => (
            <PendingSlot key={`pending-${i}`} pending={pending} index={i} />
          ))
          : null}
        {tiles.map((t) => (
          <ResultCard
            key={t.pageId}
            tile={t}
            active={t.pageId === activePageId}
            critique={critique?.[t.pageId]}
            onSelect={() => onSelect(t.pageId)}
            onReusePrompt={onReusePrompt}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Waiting ─────────────────────────────────────────────────────────────────

/** One second of wall clock, shared by every tile in the batch. */
function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return Math.max(0, Math.round((now - startedAt) / 1000));
}

function PendingStatus({ pending }: { pending: PendingBatch }) {
  const elapsed = useElapsed(pending.startedAt);
  const etaS = pending.etaMs != null ? Math.round(pending.etaMs / 1000) : null;
  const left = etaS != null ? etaS - elapsed : null;

  const timing = left != null
    ? left > 0
      ? `${elapsed}s · ~${left}s left`
      : `${elapsed}s · taking longer than usual`
    : `${elapsed}s · usually 10–60s`;

  return (
    <span className="flex items-center gap-1.5 text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }} data-generate-timing>
      {timing}
      {pending.onCancel ? (
        <button
          type="button"
          data-generate-cancel
          onClick={pending.onCancel}
          className="rounded px-1 py-0.5 transition-colors hover:bg-muted"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      ) : null}
    </span>
  );
}

function PendingSlot({ pending, index }: { pending: PendingBatch; index: number }) {
  // The stage line is honest but not technical: the compile is our business,
  // not a step the user is asked to review.
  const stage = pending.status === 'compiling'
    ? `Art-directing to ${pending.brandName ?? 'your brand'}`
    : pending.kind === 'variation'
      ? `Variation with ${pending.modelLabel}`
      : pending.kind === 'refine'
        ? `Refining with ${pending.modelLabel}`
        : `Drawing with ${pending.modelLabel}`;

  return (
    <figure
      className="m-0 flex flex-col gap-1"
      data-generate-pending-slot={index}
      data-generate-status={pending.status}
      role="status"
      aria-live={index === 0 ? 'polite' : 'off'}
    >
      <div
        className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface-sunken, var(--surface))',
        }}
      >
        {index === 0
          ? <LoadingPill label="" size={16} />
          : <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{index + 1}</span>}
      </div>
      <figcaption className="truncate text-[9.5px]" style={{ color: 'var(--text-muted)' }}>
        {index === 0 ? stage : 'Queued'}
      </figcaption>
    </figure>
  );
}

// ─── A finished result ───────────────────────────────────────────────────────

function ResultCard({ tile, active, critique, onSelect, onReusePrompt }: {
  tile: ResultTile;
  active: boolean;
  critique?: PageCritique;
  onSelect: () => void;
  onReusePrompt: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  // What the USER wrote, not the assembled brief: a 400-word art-direction
  // document is not something anyone wants pasted back into a prompt box.
  const prompt = tile.record.original || tile.record.compiled;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard denied — the reuse button still works */ }
  };

  return (
    <figure className="m-0 flex flex-col gap-1" data-generate-result={tile.pageId}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open “${prompt.slice(0, 60)}”`}
        aria-current={active || undefined}
        className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border transition-colors"
        style={{
          borderColor: active ? 'var(--accent)' : 'var(--border)',
          boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
          background: 'var(--surface-sunken, var(--surface))',
        }}
      >
        {tile.src
          ? <img src={tile.src} alt="" className="h-full w-full object-cover" />
          : <ImageOff className="h-4 w-4" style={{ color: 'var(--text-muted)' }} aria-hidden />}
      </button>

      {/* Only ever shown when something is actually wrong. A score badge on
          every result would be noise; a flag on a broken one is information. */}
      {critique && critique.hardFailures.length ? (
        <span
          data-generate-result-flag
          title={critique.note || critique.hardFailures.join(', ')}
          className="inline-flex items-center gap-0.5 self-start rounded px-1 text-[9px] font-medium"
          style={{ background: 'var(--ds-danger-bg, color-mix(in oklab, #b4453a 10%, transparent))', color: 'var(--ds-danger, #b4453a)' }}
        >
          <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
          {critique.hardFailures[0].replace(/-/g, ' ')}
        </span>
      ) : null}

      <figcaption className="flex items-start gap-0.5">
        <span
          className="min-w-0 flex-1 text-[9.5px] leading-[1.35]"
          style={{
            color: 'var(--text-muted)',
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
          }}
          title={prompt}
          data-generate-result-prompt
        >
          {prompt}
        </span>
        <TileAction
          label={copied ? 'Prompt copied' : 'Copy this prompt'}
          onClick={() => void copy()}
          data-generate-result-copy
        >
          {copied
            ? <Check className="h-3 w-3" aria-hidden />
            : <Copy className="h-3 w-3" aria-hidden />}
        </TileAction>
        <TileAction
          label="Use this prompt again"
          onClick={() => onReusePrompt(prompt)}
          data-generate-result-reuse
        >
          <CornerUpLeft className="h-3 w-3" aria-hidden />
        </TileAction>
      </figcaption>
    </figure>
  );
}

function TileAction({ children, label, onClick, ...rest }: {
  children: React.ReactNode; label: string; onClick: () => void;
  [k: `data-${string}`]: unknown;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="shrink-0 rounded p-0.5 transition-colors hover:bg-muted"
      style={{ color: 'var(--text-secondary)' }}
      {...rest}
    >
      {children}
    </button>
  );
}
