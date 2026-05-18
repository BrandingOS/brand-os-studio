// GeneratePanel — dense, Freepik-inspired AI surface in the sidebar.
//
// Density-first layout: the prompt is the hero, everything else is
// compact chrome packed into a bottom toolbar + reference card row.
// No giant LABEL FIELD stacks. Sections are 6–8 px apart, dropdowns
// are 28 px tall, buttons are 28 px tall, and the whole panel fits
// inside the 300 px secondary panel without scrolling at zero refs.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Sparkles, Image as ImageIcon, Layers, Plus, X as XIcon,
  Square as SquareIcon, RectangleHorizontal, RectangleVertical, Smartphone, MonitorPlay,
  Settings2, Palette, Cpu, Star,
} from 'lucide-react';
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
  short: string;
  width: number;
  height: number;
  Icon: typeof SquareIcon;
}

const SIZE_PRESETS: SizePreset[] = [
  { id: 'square',    label: 'Square',    short: '1:1',  width: 1024, height: 1024, Icon: SquareIcon },
  { id: 'portrait',  label: 'Portrait',  short: '4:5',  width: 1024, height: 1280, Icon: RectangleVertical },
  { id: 'story',     label: 'Story',     short: '9:16', width: 1024, height: 1820, Icon: Smartphone },
  { id: 'landscape', label: 'Landscape', short: '16:9', width: 1820, height: 1024, Icon: RectangleHorizontal },
  { id: 'wide',      label: 'Wide',      short: '21:9', width: 1920, height: 832,  Icon: MonitorPlay },
];

const MODEL_HINTS: Record<ImageModel, string> = {
  flux:     'Best quality',
  turbo:    'Faster',
  gptimage: 'Text-aware',
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

const REFERENCE_LIMIT = 3;

export function GeneratePanel({
  adapter, activePageId, doc, brand, agent, getContext, initialPrompt, onApply,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
      toast.error('Reference uploads need a brand context.');
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
      toast.success('Reference attached.');
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
    e.target.value = '';
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
        transform: { x: 0, y: 0, width: pageW, height: pageH, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, visible: true, locked: false, brandLocked: false,
      };
      adapter.batch('AI: place image', () => { adapter.addLayer(activePageId, layer); });
      toast.success(result.mock ? 'Image placed (mock).' : 'AI image placed.');
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
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

  const activeSize = SIZE_PRESETS.find((s) => s.id === sizeId) ?? SIZE_PRESETS[0];
  const activeStyle = IMAGE_STYLES.find((s) => s.id === styleId) ?? IMAGE_STYLES[0];
  const refCount = reference ? 1 : 0;

  const placeholder =
    mode === 'image'
      ? reference
        ? 'Describe how to transform the reference…'
        : brand
          ? `Describe an image — "neon ${brand.name} hero at dusk"`
          : 'Describe the image…'
      : brand
        ? `Edit the design — "make headline bigger and brand-red"`
        : 'Describe the edit…';

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2.5 text-[12px]" style={{ color: 'var(--text-primary)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Mode pills */}
      <ModeToggle mode={mode} busy={busy} agentAvailable={!!agent} onChange={setMode} />

      {/* References — only in Image mode */}
      {mode === 'image' ? (
        <section className="flex flex-col gap-1.5">
          <Caption text="References" trailing={`${refCount}/${REFERENCE_LIMIT}`} />
          <div className="grid grid-cols-3 gap-1.5">
            {reference ? (
              <ReferenceFilledSlot
                kind="Style"
                Icon={Star}
                src={reference.url}
                onRemove={clearReference}
              />
            ) : (
              <ReferenceEmptySlot
                kind="Style"
                Icon={Star}
                onClick={onPickFile}
                onDrop={onDrop}
                onDragOver={onDragOver}
                uploading={uploading}
              />
            )}
            <ReferenceComingSoon Icon={Palette} label="Brand" />
            <ReferenceAddMore Icon={Plus} onClick={onPickFile} disabled={!!reference || uploading} />
          </div>
        </section>
      ) : null}

      {/* Prompt — the hero */}
      <section className="flex flex-col gap-1.5">
        <Caption text="Prompt" />
        <div
          className="rounded-lg border transition-colors focus-within:ring-1"
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
            className="w-full resize-none bg-transparent px-2.5 pt-2 pb-1 text-[12px] leading-snug focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              ⌘/Ctrl + Enter
            </span>
          </div>
        </div>
      </section>

      {/* Inline error */}
      {error ? (
        <div
          data-generate-error
          className="rounded-md px-2 py-1 text-[11px]"
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

      {/* Toolbar — only in Image mode */}
      {mode === 'image' ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <ToolbarSelect
              icon={<activeSize.Icon className="h-3 w-3" aria-hidden />}
              value={sizeId}
              onChange={setSizeId}
              disabled={busy}
              title="Aspect ratio"
              shortLabel={activeSize.short}
              items={SIZE_PRESETS.map((s) => ({
                value: s.id,
                label: s.label,
                trailing: s.short,
              }))}
            />
            <ToolbarSelect
              icon={<Palette className="h-3 w-3" aria-hidden />}
              value={styleId}
              onChange={setStyleId}
              disabled={busy}
              title="Style"
              shortLabel={activeStyle.id === 'none' ? 'Style' : activeStyle.label}
              items={IMAGE_STYLES.map((s) => ({ value: s.id, label: s.label }))}
            />
            <ToolbarSelect
              icon={<Cpu className="h-3 w-3" aria-hidden />}
              value={reference ? 'kontext' : model}
              onChange={(v) => setModel(v as ImageModel)}
              disabled={busy || !!reference}
              title="Model"
              shortLabel={reference ? 'Kontext' : (model.charAt(0).toUpperCase() + model.slice(1))}
              items={
                reference
                  ? [{ value: 'kontext', label: 'Kontext', trailing: 'img2img' }]
                  : IMAGE_MODELS.map((m) => ({
                      value: m,
                      label: m.charAt(0).toUpperCase() + m.slice(1),
                      trailing: MODEL_HINTS[m],
                    }))
              }
            />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="inline-flex items-center gap-1 self-start rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted"
            style={{ color: 'var(--text-muted)' }}
            aria-expanded={advancedOpen}
          >
            <Settings2 className="h-3 w-3" aria-hidden />
            {advancedOpen ? 'Hide advanced' : 'Advanced'}
          </button>

          {advancedOpen ? (
            <div className="flex flex-col gap-2">
              <Field label="Negative prompt">
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="blurry, low quality, text"
                  rows={2}
                  disabled={busy}
                  className="w-full resize-none rounded-md border px-2 py-1 text-[11px] focus:outline-none disabled:opacity-60"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                />
              </Field>
              <Field label="Seed (empty = random)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={seedText}
                  onChange={(e) => setSeedText(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="random"
                  disabled={busy}
                  className="w-full rounded-md border px-2 py-1 text-[11px] focus:outline-none disabled:opacity-60"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                />
              </Field>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Generate button — full width, primary */}
      <button
        type="button"
        data-generate-submit
        onClick={() => void submit()}
        disabled={busy || !prompt.trim() || (mode === 'editable' && !agent)}
        className="mt-0.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-all disabled:opacity-50"
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
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate
          </>
        )}
      </button>
    </div>
  );
}

// ─── Local primitives ────────────────────────────────────────────────

function Caption({ text, trailing }: { text: string; trailing?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
        {text}
      </span>
      {trailing ? (
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{trailing}</span>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Caption text={label} />
      {children}
    </div>
  );
}

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

interface ToolbarSelectItem {
  value: string;
  label: string;
  trailing?: string;
}

function ToolbarSelect({
  icon, value, onChange, disabled, title, shortLabel, items,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  title: string;
  shortLabel: string;
  items: ToolbarSelectItem[];
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className="h-7 px-2 text-[11px] [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-50"
        title={title}
      >
        <span className="inline-flex items-center gap-1 min-w-0 truncate">
          {icon}
          <span className="truncate">{shortLabel}</span>
        </span>
      </SelectTrigger>
      <SelectContent data-workspace className="min-w-[180px]">
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value} className="text-[12px]">
            <div className="flex items-center justify-between gap-3 w-full">
              <span>{it.label}</span>
              {it.trailing ? (
                <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{it.trailing}</span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Reference slot cards ────────────────────────────────────────────

function ReferenceFilledSlot({
  kind, Icon, src, onRemove,
}: { kind: string; Icon: typeof Star; src: string; onRemove: () => void }) {
  return (
    <div
      className="relative aspect-square rounded-lg border overflow-hidden group"
      style={{ borderColor: 'var(--border)' }}
    >
      <img src={src} alt={kind} className="h-full w-full object-cover" />
      <div
        className="absolute inset-x-0 bottom-0 px-1 py-0.5 flex items-center justify-between"
        style={{ background: 'color-mix(in oklab, #000 60%, transparent)', color: '#fff' }}
      >
        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-medium">
          <Icon className="h-2.5 w-2.5" aria-hidden /> {kind}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove reference"
        className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full transition-opacity opacity-0 group-hover:opacity-100"
        style={{ background: 'color-mix(in oklab, #000 70%, transparent)', color: '#fff' }}
      >
        <XIcon className="h-2.5 w-2.5" aria-hidden />
      </button>
    </div>
  );
}

function ReferenceEmptySlot({
  kind, Icon, onClick, onDrop, onDragOver, uploading,
}: {
  kind: string;
  Icon: typeof Star;
  onClick: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  uploading: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="aspect-square rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors hover:bg-muted/30"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="text-[10px] font-medium">
        {uploading ? '…' : kind}
      </span>
    </div>
  );
}

function ReferenceComingSoon({ Icon, label }: { Icon: typeof Star; label: string }) {
  return (
    <div
      className="aspect-square rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 opacity-40 cursor-not-allowed"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      title="Coming soon"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

function ReferenceAddMore({
  Icon, onClick, disabled,
}: { Icon: typeof Star; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="aspect-square rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="text-[10px] font-medium">Add</span>
    </button>
  );
}
