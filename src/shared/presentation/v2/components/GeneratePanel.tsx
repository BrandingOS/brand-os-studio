/**
 * GeneratePanel — right-side sheet that drives the script-to-deck flow.
 *
 * UX:
 *   1. User pastes a paragraph-form script (50–2000 chars).
 *   2. Optional template hint biases the layout pacing.
 *   3. Click "Generate" → ~10–30s spinner.
 *   4. Result preview lists every generated slide with section + layout.
 *   5. "Replace current deck" applies; "Discard" closes the sheet.
 *
 * The panel does NOT mutate the deck store directly — it calls
 * `onAccept(deck)` so the parent decides how to install the deck (in
 * Phase 3 that means `useDeckStore.setDeck(deck)`; in Phase 5 it'll
 * mean creating a new deck record under the brand).
 */

import { Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  generateDeckFromScript,
  type GenerateDeckResult,
  type ScriptTemplateHint,
} from '../ai/generateDeckFromScript';
import { getLayoutMeta } from '../layouts/catalog';
import type { Deck } from '../types';
import type { Brand } from '@/shared/types/brand';

const HINT_OPTIONS: Array<{ id: ScriptTemplateHint | 'auto'; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'pitch', label: 'Pitch' },
  { id: 'review', label: 'Quarterly Review' },
  { id: 'launch', label: 'Product Launch' },
  { id: 'case-study', label: 'Case Study' },
  { id: 'brand-identity', label: 'Brand Identity' },
];

const MIN_SCRIPT_CHARS = 50;
const MAX_SCRIPT_CHARS = 2000;

interface Props {
  brand: Brand;
  open: boolean;
  onClose: () => void;
  /** Called after the user accepts the generated deck. */
  onAccept: (deck: Deck) => void;
}

export function GeneratePanel({ brand, open, onClose, onAccept }: Props) {
  const [script, setScript] = useState('');
  const [hint, setHint] = useState<ScriptTemplateHint | 'auto'>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateDeckResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset when the sheet closes so the next open is fresh.
  useEffect(() => {
    if (!open) {
      // Tiny delay so the closing animation doesn't show the wipe.
      const t = setTimeout(() => {
        setScript('');
        setHint('auto');
        setLoading(false);
        setError(null);
        setResult(null);
      }, 350);
      return () => clearTimeout(t);
    }
    // Autofocus on open.
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const charCount = script.trim().length;
  const tooShort = charCount > 0 && charCount < MIN_SCRIPT_CHARS;
  const tooLong = charCount > MAX_SCRIPT_CHARS;
  const canSubmit = !loading && charCount >= MIN_SCRIPT_CHARS && !tooLong;

  async function handleGenerate() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await generateDeckFromScript({
        brand,
        script: script.trim(),
        templateHint: hint === 'auto' ? undefined : hint,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (!result) return;
    onAccept(result.deck);
    onClose();
  }

  function handleDiscard() {
    if (result && !window.confirm('Discard this generated deck? The script will be cleared.')) return;
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] flex flex-col gap-0 p-0"
        onInteractOutside={(e) => { if (loading) e.preventDefault(); }}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4" />
            Generate deck from a script
          </SheetTitle>
          <SheetDescription className="text-xs">
            Paste a paragraph and we'll pick the layouts and copy that fit the script
            and the {brand.name} voice.
          </SheetDescription>
        </SheetHeader>

        {/* Body — scrolls if it gets long */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Script input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="deck-script" className="text-xs font-semibold text-foreground">
              Your script
            </label>
            <Textarea
              id="deck-script"
              ref={textareaRef}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your script — 50–500 words is ideal. The model picks layouts and writes the copy in your brand voice."
              className="min-h-[200px] resize-none text-sm"
              disabled={loading}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {tooShort && <span className="text-amber-600">Need at least {MIN_SCRIPT_CHARS} characters</span>}
                {tooLong && <span className="text-red-600">Over {MAX_SCRIPT_CHARS} characters — trim a little</span>}
                {!tooShort && !tooLong && <span>Tip: focus on what + why + outcome.</span>}
              </span>
              <span className="tabular-nums">{charCount} / {MAX_SCRIPT_CHARS}</span>
            </div>
          </div>

          {/* Template hint */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-foreground">
              Presentation type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HINT_OPTIONS.map((opt) => {
                const active = hint === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHint(opt.id)}
                    disabled={loading}
                    className={[
                      'h-8 px-3 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-foreground border-border hover:bg-muted',
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canSubmit}
            className={[
              'h-11 w-full rounded-lg text-sm font-semibold transition-colors',
              'inline-flex items-center justify-center gap-2',
              canSubmit
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate deck</>
            )}
          </button>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 text-red-800 text-xs px-3 py-2 leading-relaxed"
            >
              <strong className="font-semibold">Could not generate:</strong>
              <div className="mt-0.5 break-words">{error}</div>
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Generated deck
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {result.deck.title}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {result.deck.slides.length} slides · {(result.diagnostics.durationMs / 1000).toFixed(1)}s
                  {result.diagnostics.cached && ' · cached'}
                </span>
              </div>

              {result.diagnostics.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-[11px] px-3 py-2">
                  <strong>Notes:</strong>
                  <ul className="list-disc pl-4 mt-1">
                    {result.diagnostics.warnings.slice(0, 4).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                {result.deck.slides.map((slide, i) => {
                  const meta = getLayoutMeta(slide.layout);
                  const titleBlock = slide.blocks.title ?? slide.blocks.metric ?? slide.blocks.quote;
                  const titleText =
                    titleBlock?.kind === 'text' ? titleBlock.text :
                    titleBlock?.kind === 'quote' ? titleBlock.text :
                    titleBlock?.kind === 'stat' ? `${titleBlock.value} ${titleBlock.label}` :
                    '(empty)';
                  return (
                    <li
                      key={slide.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card"
                    >
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-6">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{titleText || meta?.name || slide.layout}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {slide.section ? `${slide.section} · ` : ''}{meta?.name ?? slide.layout}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-background">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={loading}
            className="h-9 px-4 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5 inline-block mr-1" />
            Discard
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!result || loading}
            className={[
              'h-9 px-4 rounded-md text-xs font-semibold transition-colors',
              result && !loading
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            ].join(' ')}
          >
            Replace current deck
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
