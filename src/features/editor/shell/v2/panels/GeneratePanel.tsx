// GeneratePanel — the canonical AI surface in the editor sidebar.
//
// Best-practice AI image generation, in the spirit of Hexfield /
// Lovart / Freepik / Stitch:
//
//   • Mode toggle: Image (default) | Editable
//   • Prompt textarea, ⌘/Ctrl+Enter to submit
//   • Reference image — drag/drop or click to upload; uploads to the
//     brand-assets bucket and routes the request through Pollinations
//     Kontext (image-to-image) automatically.
//   • Aspect ratio · Style · Model — proper Radix dropdowns so the
//     surface scales as we add presets / vendors / templates.
//   • Editable mode = Claude agent (existing layered-edit path).
//
// Token notes:
//   • Use --accent / --accent-contrast for primary surfaces. The
//     workspace doesn't define --primary; the previous chip styling
//     resolved that to a generic Tailwind default and produced a
//     white-on-white selected state.
//   • Radix dropdown content is portaled outside the workspace root
//     so we set data-workspace on the Select Content to keep tokens.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Sparkles, Image as ImageIcon, Layers, Upload, X as XIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import {
  generateImage,
  IMAGE_MODELS,
  IMAGE_STYLES,
  type ImageModel,
} from '@/features/editor/ai/generateImage';
import { StorageService } from '@/shared/services/storage.supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Mode = 'image' | 'editable';

interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  hint: string;
}

const SIZE_PRESETS: SizePreset[] = [
  { id: 'square',    label: 'Square',    width: 1024, height: 1024, hint: '1:1 · 1024' },
  { id: 'portrait',  label: 'Portrait',  width: 1024, height: 1280, hint: '4:5 · IG post' },
  { id: 'story',     label: 'Story',     width: 1024, height: 1820, hint: '9:16 · stories' },
  { id: 'landscape', label: 'Landscape', width: 1820, height: 1024, hint: '16:9 · banner' },
  { id: 'wide',      label: 'Wide',      width: 1920, height: 832,  hint: '21:9 · cinematic' },
];

const MODEL_HINTS: Record<ImageModel, string> = {
  flux:     'Best quality — default',
  turbo:    'Faster, looser detail',
  gptimage: 'Better at text in images',
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

interface ReferenceImageState {
  url: string;
  fileName: string;
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Image-mode settings
  const [sizeId, setSizeId] = useState<string>('square');
  const [styleId, setStyleId] = useState<string>('none');
  const [model, setModel] = useState<ImageModel>('flux');
  const [reference, setReference] = useState<ReferenceImageState | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seedText, setSeedText] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storage = useRef<StorageService>(new StorageService());

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Reference image upload ──────────────────────────────────────
  const handleFileChosen = useCallback(async (file: File) => {
    if (!brand) {
      toast.error('Reference uploads need a brand. Open a brand-scoped design first.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Reference must be an image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Reference image must be smaller than 8 MB.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const safeName = `ai-references/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { url } = await storage.current.uploadAsset(brand.id, file, safeName);
      setReference({ url, fileName: file.name });
      toast.success('Reference image attached.');
    } catch (err) {
      console.error('[GeneratePanel] reference upload failed:', err);
      toast.error('Could not upload reference image.');
    } finally {
      setUploading(false);
    }
  }, [brand]);

  const onPickFile = useCallback(() => fileInputRef.current?.click(), []);
  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (f) void handleFileChosen(f);
  }, [handleFileChosen]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFileChosen(f);
  }, [handleFileChosen]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearReference = useCallback(() => setReference(null), []);

  // ─── Generation paths ────────────────────────────────────────────
  const runImage = useCallback(async (text: string) => {
    setError(null);
    setSuggestions([]);
    setBusy(true);
    const size = SIZE_PRESETS.find((s) => s.id === sizeId) ?? SIZE_PRESETS[0];
    const seed = (() => {
      const n = parseInt(seedText, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })();
    try {
      const result = await generateImage({
        prompt: text,
        width: size.width,
        height: size.height,
        model,
        styleId,
        seed,
        negativePrompt: negativePrompt.trim() || undefined,
        referenceImageUrl: reference?.url,
      });
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
  }, [adapter, activePageId, sizeId, styleId, model, seedText, negativePrompt, reference]);

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

  const placeholder =
    mode === 'image'
      ? reference
        ? 'Describe how to transform the reference — e.g. "make it cyberpunk neon"…'
        : brand
          ? `Generate an image — e.g. "neon ${brand.name} hero shot at dusk"…`
          : 'Describe the image you want to generate…'
      : brand
        ? `Edit the design — e.g. "make the headline bigger and brand-red"…`
        : 'Describe the edit you want…';

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 px-3 py-3 text-[12.5px]" style={{ color: 'var(--text-primary)' }}>
      {/* Mode toggle */}
      <ModeToggle mode={mode} busy={busy} agentAvailable={!!agent} onChange={setMode} />

      {/* Prompt */}
      <div
        className="rounded-xl border transition-colors"
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
          <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
            ⌘/Ctrl + Enter
          </span>
          <button
            type="button"
            data-generate-submit
            onClick={() => void submit()}
            disabled={busy || !prompt.trim() || (mode === 'editable' && !agent)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition-all disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              boxShadow: busy ? 'none' : '0 1px 0 color-mix(in oklab, var(--accent) 20%, transparent)',
            }}
          >
            {busy ? (
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '0ms' }} />
                <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '150ms' }} />
                <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '300ms' }} />
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

      {/* Suggestion chips */}
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

      {/* Image-only sections */}
      {mode === 'image' ? (
        <>
          {/* Reference image */}
          <Field label="Reference image" hint={reference ? 'Kontext (img2img)' : 'Optional'}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileInputChange}
              className="hidden"
            />
            {reference ? (
              <div
                className="flex items-center gap-2 rounded-lg border p-1.5"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-md overflow-hidden border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <img src={reference.url} alt="Reference" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] truncate" title={reference.fileName}>
                    {reference.fileName}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Auto-routed to Kontext model
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearReference}
                  aria-label="Remove reference"
                  className="rounded-md p-1 transition-colors hover:bg-muted"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <XIcon className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={onPickFile}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPickFile(); }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-3 px-2 text-center transition-colors hover:bg-muted/30 cursor-pointer"
                style={{ borderColor: 'var(--border)', background: 'transparent' }}
              >
                <Upload className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} aria-hidden />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {uploading ? 'Uploading…' : 'Drop image or click to attach'}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Use as Omni-style reference
                </span>
              </div>
            )}
          </Field>

          {/* Aspect ratio */}
          <Field label="Aspect ratio">
            <Select value={sizeId} onValueChange={setSizeId} disabled={busy}>
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-workspace>
                {SIZE_PRESETS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span>{s.label}</span>
                      <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{s.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Style */}
          <Field label="Style">
            <Select value={styleId} onValueChange={setStyleId} disabled={busy}>
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-workspace>
                {IMAGE_STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Model — locked to kontext when reference is set */}
          <Field label="Model" hint={reference ? 'Locked: Kontext (img2img)' : undefined}>
            <Select
              value={reference ? 'kontext' : model}
              onValueChange={(v) => setModel(v as ImageModel)}
              disabled={busy || !!reference}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-workspace>
                {reference ? (
                  <SelectItem value="kontext" className="text-[12px]">
                    Kontext · image-to-image
                  </SelectItem>
                ) : (
                  IMAGE_MODELS.map((m) => (
                    <SelectItem key={m} value={m} className="text-[12px]">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="capitalize">{m}</span>
                        <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{MODEL_HINTS[m]}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>

          {/* Advanced */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="inline-flex items-center justify-between text-[10.5px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
              aria-expanded={advancedOpen}
            >
              <span>Advanced</span>
              {advancedOpen ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
            </button>
            {advancedOpen ? (
              <div className="flex flex-col gap-3">
                <Field label="Negative prompt" hint="What to avoid">
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g. blurry, low quality, text artifacts"
                    rows={2}
                    disabled={busy}
                    className="w-full resize-none rounded-md border px-2 py-1 text-[11.5px] focus:outline-none disabled:opacity-60"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  />
                </Field>
                <Field label="Seed" hint="Empty = random">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={seedText}
                    onChange={(e) => setSeedText(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="random"
                    disabled={busy}
                    className="w-full rounded-md border px-2 py-1 text-[11.5px] focus:outline-none disabled:opacity-60"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Mode-specific helper text */}
      <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
        {mode === 'image'
          ? `${reference ? 'Reference-guided' : 'Text-to-image'} — placed full-bleed on the active page.`
          : agent
            ? 'AI edits the current design with brand-bound layers.'
            : 'Editable mode needs a brand context.'}
      </p>
    </div>
  );
}

// ─── Local primitives ────────────────────────────────────────────────

function ModeToggle({
  mode, busy, agentAvailable, onChange,
}: { mode: Mode; busy: boolean; agentAvailable: boolean; onChange: (m: Mode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Generation mode"
      data-generate-mode-group
      className="inline-flex items-center gap-0.5 self-start rounded-full p-0.5"
      style={{ background: 'var(--surface-sunken, color-mix(in oklab, currentColor 6%, transparent))' }}
    >
      <ModeButton
        active={mode === 'image'}
        disabled={busy}
        onClick={() => onChange('image')}
        icon={<ImageIcon className="h-3 w-3" aria-hidden />}
        label="Image"
      />
      <ModeButton
        active={mode === 'editable'}
        disabled={busy || !agentAvailable}
        onClick={() => onChange('editable')}
        icon={<Layers className="h-3 w-3" aria-hidden />}
        label="Editable"
      />
    </div>
  );
}

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
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent-contrast)' : 'var(--text-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {hint ? (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
