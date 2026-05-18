// GeneratePanel — primary AI surface in the editor sidebar.
//
// Replaces the floating "Ask AI" pill that used to live at the bottom
// of the canvas. The Generate rail entry opens this panel; the panel
// hosts everything the user needs to produce content:
//
//   • Prompt textarea (multi-line, ⌘/Ctrl+Enter to submit)
//   • Mode toggle: Image (default) | Editable design
//   • Image-mode settings (size aspect / style preset / model)
//   • Editable-mode passes through to the AI agent (Claude)
//   • Inline error + suggestion chips from the agent's rejected
//     results, identical UX to the prior prompt bar
//
// The panel is sized for the existing 300-px secondary panel column.
// Everything wraps at narrow widths.
//
// Mounting: rendered by EditorSecondaryPanel when active === 'generate'.
// Auto-opens when the editor mounts with an initialPrompt (user came
// from the Design hero with prompt staged) — see Editor.tsx.

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { Sparkles, Image as ImageIcon, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import { applyAICommandResult } from '@/features/editor/ai/applyResult';
import {
  generateImage,
  IMAGE_MODELS,
  IMAGE_STYLES,
  type ImageModel,
} from '@/features/editor/ai/generateImage';

type Mode = 'image' | 'editable';

interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  hint: string;
}

// Best-practice aspect presets for AI image gen. Pollinations Flux is
// trained at ~1024 base; we keep the long side at 1024–1920.
const SIZE_PRESETS: SizePreset[] = [
  { id: 'square',    label: 'Square',    width: 1024, height: 1024, hint: '1:1 · 1024' },
  { id: 'portrait',  label: 'Portrait',  width: 1024, height: 1280, hint: '4:5 · IG post' },
  { id: 'story',     label: 'Story',     width: 1024, height: 1820, hint: '9:16 · stories' },
  { id: 'landscape', label: 'Landscape', width: 1820, height: 1024, hint: '16:9 · banner' },
];

const MODEL_HINTS: Record<ImageModel, string> = {
  flux:     'Best quality (default)',
  turbo:    'Faster, looser',
  gptimage: 'Better text in images',
};

interface Props {
  adapter: EditorAdapter;
  activePageId: string;
  doc: BrandOSDocument;
  brand?: Brand;
  agent: AIAgent | null;
  getContext: () => AICommandContext;
  initialPrompt?: string;
  onApply: (result: AICommandResult) => void;
}

export function GeneratePanel({
  adapter,
  activePageId,
  doc,
  brand,
  agent,
  getContext,
  initialPrompt,
  onApply,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Image-mode settings
  const [sizeId, setSizeId] = useState<string>('square');
  const [styleId, setStyleId] = useState<string>('none');
  const [model, setModel] = useState<ImageModel>('flux');
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Pre-fill prompt if the editor mounted with a staged prompt from the
  // Design hero. Only on mount — subsequent user edits win.
  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runImage = useCallback(async (text: string) => {
    setError(null);
    setSuggestions([]);
    setBusy(true);
    const size = SIZE_PRESETS.find((s) => s.id === sizeId) ?? SIZE_PRESETS[0];
    try {
      const result = await generateImage({
        prompt: text,
        width: size.width,
        height: size.height,
        model,
        styleId,
      });
      // Place as full-bleed image layer on the active page. We size
      // the layer to the page, not to the requested image dims — the
      // Pollinations image already matches the requested aspect, so
      // cover-fit fills the page perfectly.
      const docNow = adapter.getDocument();
      const page = docNow.pages.find((p) => p.id === activePageId);
      const pageW = page?.width ?? size.width;
      const pageH = page?.height ?? size.height;
      const layer: Layer = {
        id: crypto.randomUUID(),
        kind: 'image',
        name: 'AI image',
        src: result.imageUrl,
        fit: 'cover',
        transform: {
          x: 0, y: 0, width: pageW, height: pageH,
          rotation: 0, scaleX: 1, scaleY: 1,
        },
        opacity: 1, visible: true, locked: false, brandLocked: false,
      };
      adapter.batch('AI: place image', () => {
        adapter.addLayer(activePageId, layer);
      });
      toast.success(result.mock ? 'Image placed (mock mode).' : 'AI image placed on canvas.');
      setPrompt('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Image generation failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [adapter, activePageId, sizeId, styleId, model]);

  const runEditable = useCallback(async (text: string) => {
    if (!agent) {
      setError('AI agent is not available.');
      return;
    }
    setError(null);
    setSuggestions([]);
    setBusy(true);
    try {
      const result = await agent.applyCommand(adapter.getDocument(), text, getContext());
      onApply(result);
      if (result.kind === 'rejected') {
        setError(result.message);
        if (result.suggestions?.length) setSuggestions(result.suggestions);
      } else {
        toast.success(result.message);
        const next: string[] = [...(result.suggestions ?? [])];
        if (result.disambiguation?.mode4_alternative) next.push(result.disambiguation.mode4_alternative);
        if (result.disambiguation?.mode3_alternative) next.push(result.disambiguation.mode3_alternative);
        if (next.length) setSuggestions(next);
        setPrompt('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Unexpected error: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [adapter, agent, getContext, onApply]);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    if (mode === 'image') {
      await runImage(text);
    } else {
      await runEditable(text);
    }
  }, [prompt, busy, mode, runImage, runEditable]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  // Hide brand-aware placeholder when no brand context — keeps the
  // surface usable for unbranded prompts (mock mode / dev / smoke).
  const placeholder =
    mode === 'image'
      ? brand
        ? `Generate an image — e.g. "neon ${brand.name} hero shot at dusk"…`
        : 'Describe the image you want to generate…'
      : brand
        ? `Edit the design — e.g. "make the headline bigger and brand-red"…`
        : 'Describe the edit you want…';

  return (
    <div className="flex flex-col gap-3 px-3 py-3 text-[12.5px]" style={{ color: 'var(--text-primary)' }}>
      {/* Mode toggle */}
      <div
        role="radiogroup"
        aria-label="Generation mode"
        data-generate-mode-group
        className="inline-flex items-center gap-0.5 self-start rounded-full p-0.5"
        style={{ background: 'color-mix(in oklab, currentColor 6%, transparent)' }}
      >
        <ModeButton
          active={mode === 'image'}
          disabled={busy}
          onClick={() => setMode('image')}
          icon={<ImageIcon className="h-3 w-3" aria-hidden />}
          label="Image"
        />
        <ModeButton
          active={mode === 'editable'}
          disabled={busy || !agent}
          onClick={() => setMode('editable')}
          icon={<Layers className="h-3 w-3" aria-hidden />}
          label="Editable"
        />
      </div>

      {/* Prompt */}
      <div
        className="rounded-xl border"
        style={{
          borderColor: error ? 'var(--accent-red, #ef4444)' : 'var(--border)',
          background: 'var(--surface)',
        }}
      >
        <textarea
          data-generate-prompt
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={busy}
          rows={4}
          className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[12.5px] leading-snug focus:outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
        />
        <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
          <span className="text-[10.5px] text-muted-foreground">
            ⌘/Ctrl + Enter
          </span>
          <button
            type="button"
            data-generate-submit
            onClick={() => void submit()}
            disabled={busy || !prompt.trim() || (mode === 'editable' && !agent)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-[11.5px] font-medium transition-all disabled:opacity-50"
            style={{
              background: 'var(--primary, #111)',
              color: 'var(--primary-contrast, #fff)',
            }}
          >
            {busy ? (
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
              </span>
            ) : (
              <>
                <Sparkles className="h-3 w-3" aria-hidden />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline error */}
      {error ? (
        <div
          data-generate-error
          className="rounded-md px-2 py-1.5 text-[11.5px]"
          style={{
            background: 'color-mix(in oklab, var(--accent-red, #ef4444) 8%, transparent)',
            color: 'var(--accent-red, #ef4444)',
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Suggestion chips (after agent's rejected / accepted result) */}
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1" data-generate-suggestions>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setPrompt(s); setSuggestions([]); }}
              className="rounded-full border px-2 py-0.5 text-[10.5px] transition-colors hover:bg-muted"
              style={{ borderColor: 'var(--border)' }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* Settings — only in Image mode */}
      {mode === 'image' ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-generate-settings-toggle
            onClick={() => setSettingsOpen((v) => !v)}
            className="inline-flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            aria-expanded={settingsOpen}
          >
            <span>Image settings</span>
            {settingsOpen ? (
              <ChevronUp className="h-3 w-3" aria-hidden />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden />
            )}
          </button>

          {settingsOpen ? (
            <div className="flex flex-col gap-3">
              {/* Size */}
              <Field label="Size">
                <ChipRow>
                  {SIZE_PRESETS.map((s) => (
                    <Chip
                      key={s.id}
                      active={sizeId === s.id}
                      disabled={busy}
                      onClick={() => setSizeId(s.id)}
                      label={s.label}
                      hint={s.hint}
                    />
                  ))}
                </ChipRow>
              </Field>

              {/* Style */}
              <Field label="Style">
                <ChipRow>
                  {IMAGE_STYLES.map((s) => (
                    <Chip
                      key={s.id}
                      active={styleId === s.id}
                      disabled={busy}
                      onClick={() => setStyleId(s.id)}
                      label={s.label}
                    />
                  ))}
                </ChipRow>
              </Field>

              {/* Model */}
              <Field label="Model">
                <ChipRow>
                  {IMAGE_MODELS.map((m) => (
                    <Chip
                      key={m}
                      active={model === m}
                      disabled={busy}
                      onClick={() => setModel(m)}
                      label={m}
                      hint={MODEL_HINTS[m]}
                    />
                  ))}
                </ChipRow>
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Editable-mode hint */}
      {mode === 'editable' ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {agent
            ? 'AI edits the current design with brand-bound layers — change colors, text, layout, or rebuild the page.'
            : 'Editable mode needs a brand and a configured AI agent. Open a design inside a brand to use this.'}
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {`${doc.pages.length === 1 ? 'Single image' : `${doc.pages.length}-page design`} — image is placed on the active page as a full-bleed layer.`}
        </p>
      )}
    </div>
  );
}

// ─── Small UI primitives (local to this panel) ─────────────────────

function ModeButton({
  active, disabled, onClick, icon, label,
}: { active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-generate-mode={label.toLowerCase()}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
      style={{
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        boxShadow: active ? '0 1px 2px color-mix(in oklab, currentColor 12%, transparent)' : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1">{children}</div>;
}

function Chip({
  active, disabled, onClick, label, hint,
}: { active: boolean; disabled?: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className="inline-flex items-baseline gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors disabled:opacity-50"
      style={{
        background: active ? 'var(--primary, #111)' : 'transparent',
        color: active ? 'var(--primary-contrast, #fff)' : 'var(--text-primary)',
        borderColor: active ? 'var(--primary, #111)' : 'var(--border)',
      }}
    >
      <span className="capitalize">{label}</span>
      {hint && !active ? (
        <span className="text-[10px] text-muted-foreground">· {hint}</span>
      ) : null}
    </button>
  );
}
