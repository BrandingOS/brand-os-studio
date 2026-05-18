// GeneratePanel — dense AI surface inspired by Freepik / Hexfield / Lovart.
//
// Layout (top → bottom):
//   • Mode pills (Image | Editable)
//   • Prompt textarea — paperclip attaches a reference inline
//   • Toolbar: Aspect ▾ · Type ▾ · Model ▾  (every dropdown item shows
//     its icon next to the label — square for 1:1, smartphone for 9:16,
//     etc.)
//   • Advanced (collapsed): Negative prompt only
//   • Generate (full-width)
//   • Presets gallery — premade prompts with image previews that adapt
//     to the active brand on click.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Sparkles, Image as ImageIcon, Layers, X as XIcon, Paperclip,
  Square as SquareIcon, RectangleHorizontal, RectangleVertical, Smartphone, MonitorPlay,
  Settings2, UserCircle, Mountain, Megaphone, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import {
  generateImage,
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

// ─── Aspect presets ──────────────────────────────────────────────────
interface AspectPreset {
  id: string;
  label: string;
  short: string;
  width: number;
  height: number;
  Icon: typeof SquareIcon;
}
const ASPECT_PRESETS: AspectPreset[] = [
  { id: 'square',    label: 'Square',    short: '1:1',  width: 1024, height: 1024, Icon: SquareIcon },
  { id: 'portrait',  label: 'Portrait',  short: '4:5',  width: 1024, height: 1280, Icon: RectangleVertical },
  { id: 'story',     label: 'Story',     short: '9:16', width: 1024, height: 1820, Icon: Smartphone },
  { id: 'landscape', label: 'Landscape', short: '16:9', width: 1820, height: 1024, Icon: RectangleHorizontal },
  { id: 'wide',      label: 'Wide',      short: '21:9', width: 1920, height: 832,  Icon: MonitorPlay },
];

// ─── Content types — replaces "Style" per user request ───────────────
interface ContentType {
  id: string;
  label: string;
  Icon: typeof SquareIcon;
  /** Suffix appended to the user's prompt for context, browser-side. */
  promptSuffix: string;
  /** Default aspect when this type is picked. */
  defaultAspect: string;
}
const CONTENT_TYPES: ContentType[] = [
  { id: 'image',       label: 'Image',         Icon: ImageIcon,           promptSuffix: '', defaultAspect: 'square' },
  { id: 'social-post', label: 'Social post',   Icon: SquareIcon,          promptSuffix: ', social media post composition', defaultAspect: 'square' },
  { id: 'story',       label: 'Story',         Icon: Smartphone,          promptSuffix: ', vertical mobile story layout', defaultAspect: 'story' },
  { id: 'banner',      label: 'Banner',        Icon: Megaphone,           promptSuffix: ', wide web banner composition', defaultAspect: 'landscape' },
  { id: 'poster',      label: 'Poster',        Icon: RectangleVertical,   promptSuffix: ', movie-poster style, bold typography space', defaultAspect: 'portrait' },
  { id: 'avatar',      label: 'Avatar',        Icon: UserCircle,          promptSuffix: ', centered avatar portrait', defaultAspect: 'square' },
  { id: 'background',  label: 'Background',    Icon: Mountain,            promptSuffix: ', clean abstract background, leaves room for overlay', defaultAspect: 'landscape' },
  { id: 'logo',        label: 'Logo concept',  Icon: Award,               promptSuffix: ', minimalist logo concept on neutral background', defaultAspect: 'square' },
];

// ─── Model brand badges — small inline SVGs unique to each model. ────
// Lucide is for generic UI icons; models have their own brand and a
// recognizable mark beats a generic Sparkles/Zap for picking at a glance.

function FluxBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <defs>
        <linearGradient id="fluxg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="55%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M8 1.2c1.6 2.4 3.1 4.2 3.1 6.6 0 3.4-2.4 6-3.1 7-0.7-1-3.1-3.6-3.1-7 0-2.4 1.5-4.2 3.1-6.6z"
        fill="url(#fluxg)"
      />
    </svg>
  );
}

function TurboBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <defs>
        <linearGradient id="turbog" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <path
        d="M9.6 1.4 4 9.2h3.4L6.4 14.6 12 6.8H8.6l1-5.4z"
        fill="url(#turbog)"
      />
    </svg>
  );
}

function GptImageBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <defs>
        <linearGradient id="gptg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="8" cy="8" r="6.5" stroke="url(#gptg)" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="2.2" fill="url(#gptg)" />
    </svg>
  );
}

function KontextBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <defs>
        <linearGradient id="kontextg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="8" height="8" rx="1.5" stroke="url(#kontextg)" strokeWidth="1.4" fill="none" />
      <rect x="6" y="2" width="8" height="8" rx="1.5" fill="url(#kontextg)" />
    </svg>
  );
}

type ModelBadge = (props: { className?: string }) => JSX.Element;

interface ModelEntry {
  id: ImageModel | 'kontext';
  label: string;
  hint: string;
  Badge: ModelBadge;
}
const MODEL_ENTRIES: ModelEntry[] = [
  { id: 'flux',     label: 'Flux',     hint: 'Best quality',  Badge: FluxBadge },
  { id: 'turbo',    label: 'Turbo',    hint: 'Faster',        Badge: TurboBadge },
  { id: 'gptimage', label: 'GPT Image',hint: 'Text in images',Badge: GptImageBadge },
];
const KONTEXT_ENTRY: ModelEntry = {
  id: 'kontext', label: 'Kontext', hint: 'Image-to-image', Badge: KontextBadge,
};

// ─── Premade prompt presets — adapt to the active brand on click ─────
interface PromptPreset {
  id: string;
  title: string;
  /** Use {brand} as a placeholder; replaced with brand.name at click time. */
  prompt: string;
  typeId: string;
  /** Pollinations preview URL — small thumbnail, cached by URL params. */
  previewSeed: number;
}
const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'football-poster',  title: 'Football Poster',  prompt: 'Epic football stadium aerial shot at golden hour, dramatic lighting, cinematic film grain, {brand} colors',                                typeId: 'poster',      previewSeed: 101 },
  { id: 'cyber-hero',       title: 'Cyber Hero',       prompt: 'Neon cyberpunk hero composition at night, glowing red accents, dramatic mood, ultra-detailed, {brand} aesthetic',                          typeId: 'social-post', previewSeed: 202 },
  { id: 'product-clean',    title: 'Clean Product',    prompt: 'Professional product photography, clean white background, soft studio lighting, premium {brand} product on pedestal',                       typeId: 'social-post', previewSeed: 303 },
  { id: 'team-mood',        title: 'Team Mood',        prompt: 'Moody locker room with team jerseys, dramatic accent lighting, {brand} colors, cinematic',                                                  typeId: 'banner',      previewSeed: 404 },
  { id: 'minimal-bg',       title: 'Minimal BG',       prompt: 'Minimalist abstract gradient background, subtle grain, {brand}-colored, leaves space for headline',                                         typeId: 'background',  previewSeed: 505 },
  { id: 'event-banner',     title: 'Event Banner',     prompt: 'Wide event banner, bold geometric shapes, energetic composition, {brand} palette, ultra-sharp',                                             typeId: 'banner',      previewSeed: 606 },
  { id: 'avatar-portrait',  title: 'Avatar',           prompt: 'Centered avatar portrait, neutral background, premium studio lighting, {brand} mood',                                                       typeId: 'avatar',      previewSeed: 707 },
  { id: 'logo-mark',        title: 'Logo Mark',        prompt: 'Minimalist logo concept on neutral background, geometric, balanced, contemporary, {brand} essence',                                         typeId: 'logo',        previewSeed: 808 },
];

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
  adapter, activePageId, doc, brand, agent, getContext, initialPrompt, onApply,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [aspectId, setAspectId] = useState<string>('square');
  const [typeId, setTypeId] = useState<string>('image');
  const [model, setModel] = useState<ImageModel>('flux');
  const [reference, setReference] = useState<ReferenceImageState | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storage = useRef<StorageService>(new StorageService());

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Type → default aspect (only if user hasn't set aspect explicitly).
  // Simple: every type-change updates aspect to the type's default.
  // The user can override afterward.
  const onTypeChange = useCallback((nextTypeId: string) => {
    setTypeId(nextTypeId);
    const t = CONTENT_TYPES.find((c) => c.id === nextTypeId);
    if (t) setAspectId(t.defaultAspect);
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
      toast.error('Reference must be smaller than 8 MB.');
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
  const clearReference = useCallback(() => setReference(null), []);

  // ─── Generation paths ────────────────────────────────────────────
  const runImage = useCallback(async (text: string) => {
    setError(null);
    setSuggestions([]);
    setBusy(true);
    const aspect = ASPECT_PRESETS.find((s) => s.id === aspectId) ?? ASPECT_PRESETS[0];
    const type = CONTENT_TYPES.find((c) => c.id === typeId) ?? CONTENT_TYPES[0];
    const effectivePrompt = `${text}${type.promptSuffix}`;
    try {
      const result = await generateImage({
        prompt: effectivePrompt,
        width: aspect.width,
        height: aspect.height,
        model,
        negativePrompt: negativePrompt.trim() || undefined,
        referenceImageUrl: reference?.url,
      });
      const docNow = adapter.getDocument();
      const page = docNow.pages.find((p) => p.id === activePageId);
      const pageW = page?.width ?? aspect.width;
      const pageH = page?.height ?? aspect.height;
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
  }, [adapter, activePageId, aspectId, typeId, model, negativePrompt, reference]);

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

  // Apply a preset — fills the prompt, sets type/aspect, ready to generate.
  const applyPreset = useCallback((preset: PromptPreset) => {
    const brandName = brand?.name ?? 'your brand';
    setPrompt(preset.prompt.replace(/\{brand\}/g, brandName));
    onTypeChange(preset.typeId);
    setMode('image');
  }, [brand, onTypeChange]);

  const activeAspect = ASPECT_PRESETS.find((s) => s.id === aspectId) ?? ASPECT_PRESETS[0];
  const activeType = CONTENT_TYPES.find((c) => c.id === typeId) ?? CONTENT_TYPES[0];
  const activeModelEntry = reference
    ? KONTEXT_ENTRY
    : (MODEL_ENTRIES.find((m) => m.id === model) ?? MODEL_ENTRIES[0]);

  const placeholder =
    mode === 'image'
      ? reference
        ? 'Describe how to transform the reference…'
        : brand
          ? `Describe — "neon ${brand.name} hero shot at dusk"`
          : 'Describe the image…'
      : brand
        ? `Edit — "make headline bigger and brand-red"`
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

      {/* Prompt block (textarea + inline reference chip + paperclip) */}
      <section className="flex flex-col gap-1.5">
        <div
          className="rounded-lg border transition-colors"
          style={{
            borderColor: error ? 'var(--accent-red, #ef4444)' : 'var(--border)',
            background: 'var(--surface)',
          }}
        >
          {/* Reference chip — only when attached */}
          {reference ? (
            <div className="px-2 pt-2">
              <div
                className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10.5px]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken, transparent)' }}
              >
                <img
                  src={reference.url}
                  alt="Reference"
                  className="h-5 w-5 rounded object-cover"
                />
                <span className="max-w-[120px] truncate" title={reference.fileName}>
                  {reference.fileName}
                </span>
                <button
                  type="button"
                  onClick={clearReference}
                  aria-label="Remove reference"
                  className="rounded p-0.5 hover:bg-muted"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <XIcon className="h-2.5 w-2.5" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

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
          <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5">
            {mode === 'image' ? (
              <button
                type="button"
                onClick={onPickFile}
                disabled={busy || uploading || !!reference}
                title={reference ? 'Reference attached' : 'Attach reference image'}
                aria-label="Attach reference"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted disabled:opacity-40"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Paperclip className="h-3 w-3" aria-hidden />
                {uploading ? 'Uploading…' : reference ? 'Attached' : 'Reference'}
              </button>
            ) : <span />}
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

      {/* Toolbar — only in Image mode.
          Layout: 2-col row for Aspect + Type (compact), then Model on
          its own full-width row (longer labels deserve more space and
          a clearer badge). Each trigger is h-11 with icon top-left,
          short caption + value below, chevron right. */}
      {mode === 'image' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <TallSelect
              caption="Aspect"
              icon={<activeAspect.Icon className="h-3.5 w-3.5" aria-hidden />}
              value={aspectId}
              valueLabel={activeAspect.short}
              onChange={setAspectId}
              disabled={busy}
              title="Aspect ratio"
              items={ASPECT_PRESETS.map((s) => ({
                value: s.id,
                label: s.label,
                trailing: s.short,
                renderIcon: (cn) => <s.Icon className={cn} aria-hidden />,
              }))}
            />
            <TallSelect
              caption="Type"
              icon={<activeType.Icon className="h-3.5 w-3.5" aria-hidden />}
              value={typeId}
              valueLabel={activeType.id === 'image' ? 'Default' : activeType.label}
              onChange={onTypeChange}
              disabled={busy}
              title="Content type"
              items={CONTENT_TYPES.map((c) => ({
                value: c.id,
                label: c.label,
                renderIcon: (cn) => <c.Icon className={cn} aria-hidden />,
              }))}
            />
          </div>
          <TallSelect
            caption="Model"
            icon={<activeModelEntry.Badge className="h-3.5 w-3.5" />}
            value={reference ? 'kontext' : model}
            valueLabel={activeModelEntry.label}
            valueHint={activeModelEntry.hint}
            onChange={(v) => setModel(v as ImageModel)}
            disabled={busy || !!reference}
            title="Model"
            items={
              reference
                ? [{
                    value: 'kontext',
                    label: KONTEXT_ENTRY.label,
                    trailing: KONTEXT_ENTRY.hint,
                    renderIcon: (cn) => <KONTEXT_ENTRY.Badge className={cn} />,
                  }]
                : MODEL_ENTRIES.map((m) => ({
                    value: m.id as string,
                    label: m.label,
                    trailing: m.hint,
                    renderIcon: (cn) => <m.Badge className={cn} />,
                  }))
            }
          />

          {/* Advanced — Negative prompt only */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="inline-flex items-center gap-1 self-start rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted"
            style={{ color: 'var(--text-muted)' }}
            aria-expanded={advancedOpen}
          >
            <Settings2 className="h-3 w-3" aria-hidden />
            {advancedOpen ? 'Hide negative' : 'Negative prompt'}
          </button>
          {advancedOpen ? (
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid — blurry, low quality, text…"
              rows={2}
              disabled={busy}
              className="w-full resize-none rounded-md border px-2 py-1 text-[11px] focus:outline-none disabled:opacity-60"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            />
          ) : null}
        </>
      ) : null}

      {/* Generate */}
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

      {/* Presets gallery — pre-made prompts with image previews,
          adapt to the active brand on click. */}
      {mode === 'image' ? (
        <PresetsGallery brand={brand} onApply={applyPreset} />
      ) : null}
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

interface TallSelectItem {
  value: string;
  label: string;
  trailing?: string;
  renderIcon: (className: string) => React.ReactNode;
}

function TallSelect({
  caption, icon, value, valueLabel, valueHint, onChange, disabled, title, items,
}: {
  caption: string;
  icon: React.ReactNode;
  value: string;
  valueLabel: string;
  valueHint?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  title: string;
  items: TallSelectItem[];
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        // Override the default h-10 padding so the trigger has room
        // for caption above + value below, with breathing room and
        // chevron offset from the right edge.
        className="h-11 px-2.5 py-1 text-[12px] gap-1.5 [&>span]:line-clamp-none [&>svg]:opacity-60"
        title={title}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0">{icon}</div>
          <div className="flex flex-col items-start min-w-0 leading-tight">
            <span className="text-[9.5px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {caption}
            </span>
            <span className="text-[11.5px] font-medium truncate w-full text-left" style={{ color: 'var(--text-primary)' }}>
              {valueLabel}{valueHint ? <span className="font-normal" style={{ color: 'var(--text-muted)' }}> · {valueHint}</span> : null}
            </span>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent data-workspace className="min-w-[220px]">
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value} className="text-[12px]">
            <div className="flex items-center justify-between gap-3 w-full py-0.5">
              <span className="inline-flex items-center gap-2">
                {it.renderIcon('h-3.5 w-3.5 shrink-0')}
                {it.label}
              </span>
              {it.trailing ? (
                <span className="text-[10.5px] shrink-0" style={{ color: 'var(--text-muted)' }}>{it.trailing}</span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Presets gallery ────────────────────────────────────────────────

function PresetsGallery({
  brand, onApply,
}: { brand?: Brand; onApply: (p: PromptPreset) => void }) {
  // Build preview URLs once per (brand, preset). Pollinations caches
  // by URL params, so identical URLs return identical images — a fresh
  // browser fetches once and the result is shared.
  const previews = useMemo(() => {
    const brandName = brand?.name ?? 'modern brand';
    return PROMPT_PRESETS.map((p) => {
      const text = p.prompt.replace(/\{brand\}/g, brandName);
      const enc = encodeURIComponent(text).slice(0, 1200);
      const params = new URLSearchParams({
        width: '512', height: '512', nologo: 'true', enhance: 'true',
        model: 'flux', referrer: 'brandos-preview', seed: String(p.previewSeed),
      });
      return {
        ...p,
        previewUrl: `https://image.pollinations.ai/prompt/${enc}?${params.toString()}`,
        fullPrompt: text,
      };
    });
  }, [brand?.name]);

  return (
    <section className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          Premade designs
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {brand ? `On ${brand.name}` : 'Generic'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {previews.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            title={p.fullPrompt}
            className="group flex flex-col gap-0.5 rounded-lg border overflow-hidden text-left transition-transform hover:-translate-y-0.5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div className="aspect-square w-full overflow-hidden" style={{ background: 'var(--surface-sunken)' }}>
              <img
                src={p.previewUrl}
                alt={p.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="px-1.5 py-1">
              <div className="text-[10.5px] font-medium truncate">{p.title}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
