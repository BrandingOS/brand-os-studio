// CompiledPromptCard — the review step. Shows what the brand-aware
// compiler produced (editable), which brand references will ride along
// (Logo / Palette chips — toggleable), one line of notes, and the
// Generate ×N / Use raw / Back actions. Also renders the compiling and
// generating states so the panel never leaves a bare spinner.

import { useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { DsChip } from '@/shared/ds';
import type { CompiledPrompt } from '@/features/editor/ai/imagePrompt/compileImagePrompt';
import type { GenStatus } from './useImageGeneration';

interface Props {
  status: GenStatus;
  brandName?: string;
  compiled: CompiledPrompt | null;
  draft: string;
  onDraft: (s: string) => void;
  includeLogo: boolean;
  onIncludeLogo: (b: boolean) => void;
  includePalette: boolean;
  onIncludePalette: (b: boolean) => void;
  /** Whether the chosen model can take reference images at all. */
  refsSupported: boolean;
  count: number;
  onConfirm: () => void;
  onUseRaw: () => void;
  onBack: () => void;
  kindLabel?: string;
}

export function CompiledPromptCard({
  status, brandName, compiled, draft, onDraft, includeLogo, onIncludeLogo,
  includePalette, onIncludePalette, refsSupported, count, onConfirm, onUseRaw, onBack, kindLabel,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (status === 'review') taRef.current?.focus();
  }, [status]);

  const paletteCount = compiled?.paletteHexes.length ?? 0;
  const generating = status === 'generating';
  const compiling = status === 'compiling';

  return (
    <section
      data-generate-review
      data-generate-status={status}
      className="flex flex-col gap-2 rounded-lg border p-2"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      aria-busy={compiling || generating}
    >
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          <Wand2 className="h-3 w-3" aria-hidden />
          {compiling ? `Tuning to ${brandName ?? 'your brand'}…` : kindLabel ?? 'Compiled prompt'}
        </span>
        {compiled ? (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {compiled.source === 'claude' ? 'Brand-aware' : 'Brand clause'}
          </span>
        ) : null}
      </header>

      {compiling ? (
        <div className="flex flex-col gap-1.5" aria-hidden>
          <div className="h-2.5 w-full rounded animate-pulse" style={{ background: 'color-mix(in oklab, var(--text-primary) 8%, transparent)' }} />
          <div className="h-2.5 w-11/12 rounded animate-pulse" style={{ background: 'color-mix(in oklab, var(--text-primary) 8%, transparent)' }} />
          <div className="h-2.5 w-2/3 rounded animate-pulse" style={{ background: 'color-mix(in oklab, var(--text-primary) 8%, transparent)' }} />
        </div>
      ) : (
        <textarea
          ref={taRef}
          data-generate-compiled
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          disabled={generating}
          rows={5}
          className="w-full resize-y rounded-md border px-2 py-1.5 text-[11.5px] leading-snug focus:outline-none disabled:opacity-60"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken, transparent)', color: 'var(--text-primary)' }}
          aria-label="Compiled prompt — edit before generating"
        />
      )}

      {compiled && !compiling ? (
        <>
          <div className="flex flex-wrap items-center gap-1" data-generate-refs>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Attach:</span>
            <DsChip
              active={includeLogo}
              disabled={generating || !refsSupported}
              onClick={() => onIncludeLogo(!includeLogo)}
              data-generate-ref="logo"
              title={refsSupported ? (includeLogo ? 'Logo reference will be sent' : 'Send the brand logo as a reference') : 'This model cannot take reference images'}
              style={{ fontSize: 10.5, height: 22, padding: '0 8px' }}
            >
              Logo
            </DsChip>
            <DsChip
              active={includePalette && paletteCount > 0}
              disabled={generating || !refsSupported || paletteCount === 0}
              onClick={() => onIncludePalette(!includePalette)}
              data-generate-ref="palette"
              title={paletteCount === 0 ? 'No brand colors chosen for this prompt' : `Palette swatch (${paletteCount})`}
              style={{ fontSize: 10.5, height: 22, padding: '0 8px' }}
            >
              Palette{paletteCount ? ` ${paletteCount}` : ''}
            </DsChip>
            {!refsSupported ? (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>· prompt-only model</span>
            ) : null}
          </div>
          {compiled.notes ? (
            <p data-generate-notes className="text-[10.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {compiled.notes}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onBack}
          disabled={generating}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] transition-colors hover:bg-muted disabled:opacity-40"
          style={{ color: 'var(--text-secondary)' }}
          data-generate-back
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> Back
        </button>
        <button
          type="button"
          onClick={onUseRaw}
          disabled={generating || compiling}
          className="inline-flex h-8 items-center rounded-md px-2 text-[11px] transition-colors hover:bg-muted disabled:opacity-40"
          style={{ color: 'var(--text-secondary)' }}
          title="Send your exact words with no brand context"
          data-generate-use-raw
        >
          Use raw
        </button>
        <button
          type="button"
          data-generate-confirm
          onClick={onConfirm}
          disabled={generating || compiling || !draft.trim()}
          className="ml-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          {generating ? (
            <span className="flex gap-0.5" aria-label="Generating">
              <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor' }} />
              <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '300ms' }} />
            </span>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Generate{count > 1 ? ` ×${count}` : ''}
            </>
          )}
        </button>
      </div>
    </section>
  );
}
