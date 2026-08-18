// GenerationActions — shown when the ACTIVE page was AI-generated:
// Variations ×4 · Refine (instruction) · Regenerate · Download · Save to brand.

import { useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { BookmarkPlus, Check, Download, RefreshCw, Shuffle, Wand2 } from 'lucide-react';
import type { GenerationRecord } from './aiMetadata';
import { displayFor } from '@/features/editor/ai/imageModels';

interface Props {
  record: GenerationRecord;
  imageSrc?: string;
  busy: boolean;
  onVariations: () => void;
  onRefine: (instruction: string) => void;
  onRegenerate: () => void;
  /** Absent when there is no brand to save into. */
  onSaveToBrand?: () => Promise<void>;
}

export function GenerationActions({ record, imageSrc, busy, onVariations, onRefine, onRegenerate, onSaveToBrand }: Props) {
  const [instruction, setInstruction] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const model = displayFor(record.model);
  const submitRefine = () => {
    const t = instruction.trim();
    if (!t || busy) return;
    onRefine(t);
    setInstruction('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submitRefine(); }
  };
  // Saving is an intent, not a copy — the bytes are already durable. It is
  // one-way on purpose: a second click would file the same image twice.
  const save = async () => {
    if (!onSaveToBrand || saveState !== 'idle') return;
    setSaveState('saving');
    try {
      await onSaveToBrand();
      setSaveState('saved');
      toast.success('Saved to Brand Assets.');
    } catch (err) {
      console.error('[GenerationActions] save to brand failed:', err);
      setSaveState('idle');
      toast.error('Could not save to Brand Assets.');
    }
  };

  const download = () => {
    if (!imageSrc) return;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `${record.original.slice(0, 40).replace(/[^\w-]+/g, '-') || 'ai-image'}.png`;
    a.click();
  };

  return (
    <section
      data-generate-actions
      className="flex flex-col gap-1.5 rounded-lg border p-2"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          This image
        </span>
        <span className="text-[10px] truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }} title={record.compiled}>
          {model?.label ?? (record.model === 'auto' ? 'Auto' : record.model)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <ActionButton icon={<Shuffle className="h-3 w-3" aria-hidden />} label="Variations" hint="4 more like this" disabled={busy} onClick={onVariations} data-generate-variations />
        <ActionButton icon={<RefreshCw className="h-3 w-3" aria-hidden />} label="Regenerate" hint="Same prompt, new take" disabled={busy} onClick={onRegenerate} data-generate-regenerate />
        <ActionButton icon={<Download className="h-3 w-3" aria-hidden />} label="Download" hint="PNG" disabled={!imageSrc} onClick={download} data-generate-download />
      </div>
      {onSaveToBrand ? (
        <ActionButton
          icon={saveState === 'saved'
            ? <Check className="h-3 w-3" aria-hidden />
            : <BookmarkPlus className="h-3 w-3" aria-hidden />}
          label={saveState === 'saved' ? 'Saved to Brand Assets' : saveState === 'saving' ? 'Saving…' : 'Save to Brand Assets'}
          hint="File this image in the brand's Library with its prompt and model"
          disabled={busy || saveState !== 'idle'}
          onClick={() => void save()}
          data-generate-save-to-brand
          data-saved={saveState === 'saved' || undefined}
        />
      ) : null}
      <div className="flex items-center gap-1 rounded-md border px-1.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken, transparent)' }}>
        <Wand2 className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
        <input
          data-generate-refine
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          placeholder="Refine — “warmer light, add rain”"
          className="h-7 w-full bg-transparent text-[11px] focus:outline-none disabled:opacity-60 placeholder:text-muted-foreground/60"
          aria-label="Refine this image"
        />
        <button
          type="button"
          onClick={submitRefine}
          disabled={busy || !instruction.trim()}
          className="rounded px-1.5 py-0.5 text-[10.5px] font-medium disabled:opacity-40"
          style={{ color: 'var(--accent)' }}
          data-generate-refine-submit
        >
          Go
        </button>
      </div>
    </section>
  );
}

function ActionButton({ icon, label, hint, disabled, onClick, ...rest }: {
  icon: React.ReactNode; label: string; hint: string; disabled?: boolean; onClick: () => void; [k: `data-${string}`]: unknown;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className="inline-flex h-8 items-center justify-center gap-1 rounded-md border text-[10.5px] font-medium transition-colors hover:bg-muted disabled:opacity-40"
      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      {...rest}
    >
      {icon}
      {label}
    </button>
  );
}
