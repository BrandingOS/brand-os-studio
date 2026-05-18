// EditorAiPromptBar — top-chrome AI prompt bar (Phase 3.5 commit 5).
//
// Always-visible AI entry point per vision §3 + §4. Single text
// input + send button. Two display modes (Q3 — top chrome with
// collapsed-on-narrow-viewports state):
//
//   • Wide  (≥1024px): expanded inline form, ~360px wide.
//   • Narrow (<1024px): sparkle icon button; click opens an inline
//     popover that contains the same form.
//
// Behavior:
//   • Submit calls `agent.applyCommand(doc, command, context)`.
//   • In-flight: input becomes read-only, send button shows a
//     pulsing dots indicator.
//   • Result lands via the `onApply` callback. The bar itself
//     surfaces the result.message via Sonner toast plus optional
//     suggestion chips (which re-fill the input on click).
//   • Disambiguation chips appear under the result toast for one
//     interaction window so the user can switch to the alternative
//     mode interpretation in one click.
//   • Errors (rejected variants) tint the input border accent-red
//     and surface the message inline.
//
// The bar is intentionally stateless about the document. It accepts
// `getDoc()` + `getContext()` callbacks the editor wires to its
// adapter — that way the bar reads fresh state per submit without
// re-rendering on every doc change. Phase 3.5 spec §5.2.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, Image as ImageIcon, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  AIAgent,
  AICommandContext,
  AICommandResult,
} from '@/features/editor/ai/types';
import type { BrandOSDocument } from '@/features/editor/schema';
import { generateImage } from '@/features/editor/ai/generateImage';

interface Props {
  /** AI agent (production: createEdgeFunctionAgent; test: stub). */
  agent: AIAgent;
  /** Lazy doc accessor — read fresh on every submit, no re-render churn. */
  getDoc: () => BrandOSDocument;
  /** Lazy context accessor — same reason. Editor produces this from
   *  the active page id + current selection + current brand. */
  getContext: () => AICommandContext;
  /** Called with every successful AICommandResult. The editor wires
   *  this to the modes' delta/replace/rejected handlers (commits 6/7/8). */
  onApply: (result: AICommandResult) => void;
  /** Optional placeholder override. Defaults to a brand-aware string. */
  placeholder?: string;
  /** Pre-filled prompt text. Used when the user typed a prompt in the
   *  Design page hero before navigating to the editor — they expect the
   *  text to land in the prompt bar so they can tweak + submit. */
  initialValue?: string;
  /** Image-mode handler — when the user picks Image and submits, the
   *  bar calls ai-generate-image and invokes this with the resulting
   *  image URL + dimensions. The editor wires this to place an image
   *  layer on the active page. When absent, the Image mode toggle is
   *  hidden and only the layered path is available. */
  onPlaceImage?: (imageUrl: string, dims: { width: number; height: number }) => void;
}

type Mode = 'image' | 'editable';

const PLACEHOLDER_DEFAULT = 'Ask the AI to edit your design…';
const NARROW_BREAKPOINT_PX = 1024;

export function EditorAiPromptBar({
  agent,
  getDoc,
  getContext,
  onApply,
  placeholder = PLACEHOLDER_DEFAULT,
  initialValue,
  onPlaceImage,
}: Props) {
  const [value, setValue] = useState(initialValue ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => isNarrowViewport());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Image as default when the parent wires onPlaceImage — mirrors the
  // Design hero's UX. When onPlaceImage is absent, force Editable.
  const [mode, setMode] = useState<Mode>(onPlaceImage ? 'image' : 'editable');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Track viewport width — switches between expanded inline form and
  // collapsed icon mode. Listens to resize.
  useEffect(() => {
    const onResize = () => setCollapsed(isNarrowViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // When the popover opens, focus the input.
  useEffect(() => {
    if (popoverOpen) inputRef.current?.focus();
  }, [popoverOpen]);

  // If the bar mounted with a pre-filled prompt (user typed in the
  // Design hero before navigating here), auto-open the popover on
  // narrow viewports so the staged text is visible immediately.
  useEffect(() => {
    if (initialValue && collapsed) setPopoverOpen(true);
    // Run only on mount / when collapsed flips. Subsequent value
    // changes shouldn't re-open the popover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const submit = useCallback(async () => {
    const command = value.trim();
    if (!command || busy) return;
    setBusy(true);
    setError(null);
    setSuggestions([]);

    // Image mode — generate a flat image via ai-generate-image and
    // hand it to the editor for canvas placement. Bypasses the
    // layered-edit path entirely.
    if (mode === 'image' && onPlaceImage) {
      try {
        const doc = getDoc();
        const activePage = doc.pages.find((p) => p.id === getContext().activePageId) ?? doc.pages[0];
        const w = activePage?.width ?? 1024;
        const h = activePage?.height ?? 1024;
        const result = await generateImage({ prompt: command, width: w, height: h });
        onPlaceImage(result.imageUrl, { width: w, height: h });
        toast.success(result.mock ? 'Image placed (mock mode).' : 'AI image placed on canvas.');
        setValue('');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Image generation failed: ${message}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const result = await agent.applyCommand(getDoc(), command, getContext());
      onApply(result);
      // UX surfacing per result kind. Sonner is mounted globally at
      // App.tsx — we just call toast.* here.
      if (result.kind === 'rejected') {
        setError(result.message);
        if (result.suggestions?.length) {
          setSuggestions(result.suggestions);
        }
      } else {
        // Delta or replace — surface the message + optional
        // suggestions + optional disambiguation alternative.
        toast.success(result.message);
        const next: string[] = [...(result.suggestions ?? [])];
        if (result.disambiguation?.mode4_alternative) {
          next.push(result.disambiguation.mode4_alternative);
        }
        if (result.disambiguation?.mode3_alternative) {
          next.push(result.disambiguation.mode3_alternative);
        }
        if (next.length) setSuggestions(next);
        // Clear the input after a successful apply — the user has
        // moved on to refining via suggestions or a fresh prompt.
        setValue('');
      }
    } catch (err) {
      // applyCommand should never throw (Mode 5 wraps everything),
      // but defend against accidental adapter throws.
      const message = err instanceof Error ? err.message : String(err);
      setError(`Unexpected error: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [agent, busy, getContext, getDoc, mode, onApply, onPlaceImage, value]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  const fillFromSuggestion = useCallback((s: string) => {
    setValue(s);
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  // ─── Form (shared by expanded + popover) ───────────────────────────

  const form = (
    <div data-ai-prompt-form className="flex flex-col gap-1.5 w-full">
      {onPlaceImage ? (
        <div
          data-ai-prompt-mode-group
          role="radiogroup"
          aria-label="Generation mode"
          className="inline-flex items-center gap-0.5 self-start rounded-full p-0.5"
          style={{ background: 'color-mix(in oklab, var(--foreground) 5%, transparent)' }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'image'}
            data-ai-prompt-mode="image"
            onClick={() => setMode('image')}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50',
              mode === 'image' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ImageIcon className="h-3 w-3" aria-hidden /> Image
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'editable'}
            data-ai-prompt-mode="editable"
            onClick={() => setMode('editable')}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50',
              mode === 'editable' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Layers className="h-3 w-3" aria-hidden /> Editable
          </button>
        </div>
      ) : null}
      <div
        className="flex items-stretch gap-1.5 rounded-xl border bg-background"
        data-ai-prompt-input-wrap
        style={{
          borderColor: error ? 'var(--accent-red, #ef4444)' : 'var(--border)',
          padding: '4px 4px 4px 10px',
        }}
      >
        <Sparkles
          className="h-4 w-4 shrink-0 self-center text-primary"
          aria-hidden
        />
        <textarea
          ref={inputRef}
          data-ai-prompt-input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            onPlaceImage && mode === 'image'
              ? 'Describe an image to generate and place on the canvas…'
              : placeholder
          }
          disabled={busy}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-snug py-1.5 focus:outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
          style={{ minHeight: 28, maxHeight: 96 }}
        />
        <button
          type="button"
          data-ai-prompt-send
          onClick={() => void submit()}
          disabled={busy || value.trim().length === 0}
          className={cn(
            'flex items-center justify-center rounded-lg transition-all shrink-0',
            busy || value.trim().length === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
          style={{ width: 32, height: 32 }}
          aria-label="Send to AI"
        >
          {busy ? (
            <span data-ai-prompt-thinking className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <div
          data-ai-prompt-error
          className="text-xs px-2"
          style={{ color: 'var(--accent-red, #ef4444)' }}
        >
          {error}
        </div>
      ) : null}
      {suggestions.length > 0 ? (
        <div
          data-ai-prompt-suggestions
          className="flex flex-wrap gap-1 px-1 pt-0.5"
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              data-ai-prompt-suggestion
              onClick={() => fillFromSuggestion(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  // ─── Wide layout ───────────────────────────────────────────────────

  if (!collapsed) {
    return (
      <div
        data-ai-prompt-bar
        data-ai-prompt-bar-mode="expanded"
        className="flex flex-col"
        style={{ width: 360, maxWidth: '40vw' }}
      >
        {form}
      </div>
    );
  }

  // ─── Narrow layout — icon trigger + popover ────────────────────────

  return (
    <div data-ai-prompt-bar data-ai-prompt-bar-mode="collapsed" className="relative">
      <button
        type="button"
        data-ai-prompt-trigger
        onClick={() => setPopoverOpen((v) => !v)}
        aria-label={popoverOpen ? 'Close AI prompt' : 'Open AI prompt'}
        aria-expanded={popoverOpen}
        className={cn(
          'flex items-center justify-center rounded-xl transition-colors',
          popoverOpen
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/40 text-foreground hover:bg-muted',
        )}
        style={{ width: 36, height: 36 }}
      >
        {popoverOpen ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </button>

      {popoverOpen ? (
        <div
          data-ai-prompt-popover
          className="absolute right-0 top-full mt-2 z-50 rounded-xl border bg-background shadow-xl"
          style={{
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            borderColor: 'var(--border)',
            padding: 8,
          }}
          role="dialog"
          aria-label="AI prompt"
        >
          {form}
        </div>
      ) : null}
    </div>
  );
}

function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < NARROW_BREAKPOINT_PX;
}
