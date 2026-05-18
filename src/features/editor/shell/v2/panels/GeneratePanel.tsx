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
  Settings2,
} from 'lucide-react';
// Real brand marks from simple-icons via react-icons/si — used for the
// Model dropdown so each entry carries the actual provider's logo.
import {
  SiFlux, SiOpenai, SiHuggingface, SiGooglegemini, SiAdobephotoshop,
} from 'react-icons/si';
import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Layer, Page } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import {
  generateImage,
  type ImageModel,
} from '@/features/editor/ai/generateImage';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Mode = 'image' | 'editable';

// ─── Format presets — one entry per unique aspect ratio. ─────────────
// Names are intentionally generic ("Square" works for posts, avatars,
// logos, icons; "Vertical" works for stories, reels, posters in
// portrait phones). No ratio appears twice — the user picks the shape,
// the prompt provides the use case.
interface FormatPreset {
  id: string;
  ratio: string;
  name: string;
  width: number;
  height: number;
  Icon: typeof SquareIcon;
  promptSuffix: string;
}
const FORMAT_PRESETS: FormatPreset[] = [
  // Auto = follow the active page's current dimensions, no resize.
  // ratio shown as "—" in the trigger because it varies.
  { id: 'auto',        ratio: 'Auto', name: 'Auto',       width: 0,    height: 0,    Icon: ImageIcon,           promptSuffix: '' },
  { id: 'square',      ratio: '1:1',  name: 'Square',     width: 1024, height: 1024, Icon: SquareIcon,          promptSuffix: '' },
  { id: 'portrait',    ratio: '4:5',  name: 'Portrait',   width: 1024, height: 1280, Icon: RectangleVertical,   promptSuffix: '' },
  { id: 'tall',        ratio: '2:3',  name: 'Tall',       width: 1024, height: 1536, Icon: RectangleVertical,   promptSuffix: '' },
  { id: 'vertical',    ratio: '9:16', name: 'Vertical',   width: 1024, height: 1820, Icon: Smartphone,          promptSuffix: ', vertical mobile composition' },
  { id: 'classic',     ratio: '4:3',  name: 'Classic',    width: 1365, height: 1024, Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'landscape',   ratio: '3:2',  name: 'Landscape',  width: 1536, height: 1024, Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'widescreen',  ratio: '16:9', name: 'Widescreen', width: 1820, height: 1024, Icon: RectangleHorizontal, promptSuffix: '' },
  { id: 'cinematic',   ratio: '21:9', name: 'Cinematic',  width: 1920, height: 832,  Icon: MonitorPlay,         promptSuffix: ', cinematic ultrawide composition' },
];

// ─── Model brand marks ───────────────────────────────────────────────
// Where simple-icons ships a brand mark we use it (Flux family,
// OpenAI, Hugging Face, Google Gemini, Adobe). Where it doesn't
// (Midjourney, Ideogram, Recraft, Leonardo, Playground), we render
// a small gradient letter chip — recognizable and matches the panel
// aesthetic.

type ModelBadge = (props: { className?: string }) => JSX.Element;

const FluxBadge: ModelBadge = ({ className }) => (
  <SiFlux className={className} style={{ color: '#E11D48' }} aria-hidden />
);
const FluxKontextBadge: ModelBadge = ({ className }) => (
  <SiFlux className={className} style={{ color: '#3B82F6' }} aria-hidden />
);
const OpenAiBadge: ModelBadge = ({ className }) => (
  <SiOpenai className={className} style={{ color: '#0F8C5F' }} aria-hidden />
);
const DalleBadge: ModelBadge = ({ className }) => (
  <SiOpenai className={className} style={{ color: '#10A37F' }} aria-hidden />
);
const HuggingFaceBadge: ModelBadge = ({ className }) => (
  <SiHuggingface className={className} style={{ color: '#FFCC4D' }} aria-hidden />
);
const GeminiBadge: ModelBadge = ({ className }) => (
  <SiGooglegemini className={className} style={{ color: '#4285F4' }} aria-hidden />
);
const FireflyBadge: ModelBadge = ({ className }) => (
  <SiAdobephotoshop className={className} style={{ color: '#FF0000' }} aria-hidden />
);

function makeLetterBadge(letter: string, bg: string): ModelBadge {
  return ({ className }) => (
    <span
      className={`inline-flex items-center justify-center rounded-sm font-bold text-white ${className ?? ''}`}
      style={{ background: bg, fontSize: '0.5rem', lineHeight: 1 }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
const MidjourneyBadge   = makeLetterBadge('MJ', 'linear-gradient(135deg, #0F0F23, #2D2D4F)');
const IdeogramBadge     = makeLetterBadge('I',  'linear-gradient(135deg, #7C3AED, #DB2777)');
const RecraftBadge      = makeLetterBadge('R',  'linear-gradient(135deg, #000000, #FF4D8D)');
const LeonardoBadge     = makeLetterBadge('L',  'linear-gradient(135deg, #FB923C, #F43F5E)');
const PlaygroundBadge   = makeLetterBadge('P',  'linear-gradient(135deg, #F59E0B, #DC2626)');
const NanoBananaBadge   = makeLetterBadge('🍌',  '#FBBF24');

interface ModelEntry {
  /** ImageModel id when wired (sent to the Edge Function); arbitrary
   *  string for coming-soon entries (never reaches the API). */
  id: string;
  /** Full label — shown in the dropdown menu. */
  label: string;
  /** Compact label — shown in the toolbar trigger. ≤ 7 chars. */
  short: string;
  hint: string;
  Badge: ModelBadge;
  /** False = visible in the menu but greyed-out and disabled. We use
   *  this to signpost the model roadmap without breaking the picker. */
  available: boolean;
}

// Auto-badge — purple sparkle. Sentinel id ('auto') is never sent to
// the API; the panel resolves Auto to a real model right before submit.
const AutoBadge: ModelBadge = ({ className }) => (
  <Sparkles className={className} style={{ color: '#7C3AED' }} aria-hidden />
);

// Available models — wired to Pollinations today via the Edge Function.
// "Auto" is first because it's the friendliest default; Flux remains
// the recommended quality leader behind it.
const AVAILABLE_MODELS: ModelEntry[] = [
  { id: 'auto',     label: 'Auto',      short: 'Auto',  hint: 'Pick the best',  Badge: AutoBadge,    available: true },
  { id: 'flux',     label: 'Flux',      short: 'Flux',  hint: 'Best quality',   Badge: FluxBadge,    available: true },
  { id: 'turbo',    label: 'Flux Turbo',short: 'Turbo', hint: 'Faster',         Badge: FluxBadge,    available: true },
  { id: 'gptimage', label: 'GPT Image', short: 'GPT',   hint: 'Text-aware',     Badge: OpenAiBadge,  available: true },
];

// Coming-soon — render dimmed + disabled so the roadmap is visible
// in the picker. IDs are illustrative; they're never sent to the API.
const COMING_SOON_MODELS: ModelEntry[] = [
  { id: 'dalle3',     label: 'DALL·E 3',         short: 'DALL·E', hint: 'Soon', Badge: DalleBadge,        available: false },
  { id: 'sd35',       label: 'Stable Diffusion 3.5', short: 'SD 3.5', hint: 'Soon', Badge: HuggingFaceBadge, available: false },
  { id: 'sdxl',       label: 'SDXL',             short: 'SDXL',   hint: 'Soon', Badge: HuggingFaceBadge,  available: false },
  { id: 'imagen3',    label: 'Imagen 3',         short: 'Imagen', hint: 'Soon', Badge: GeminiBadge,       available: false },
  { id: 'nanobanana', label: 'Nano Banana',      short: 'Nano',   hint: 'Soon', Badge: NanoBananaBadge,   available: false },
  { id: 'midjourney', label: 'Midjourney v6',    short: 'MJ',     hint: 'Soon', Badge: MidjourneyBadge,   available: false },
  { id: 'ideogram',   label: 'Ideogram 2.0',     short: 'Ideo',   hint: 'Soon', Badge: IdeogramBadge,     available: false },
  { id: 'firefly',    label: 'Adobe Firefly',    short: 'Adobe',  hint: 'Soon', Badge: FireflyBadge,      available: false },
  { id: 'recraft',    label: 'Recraft V3',       short: 'Recraft',hint: 'Soon', Badge: RecraftBadge,      available: false },
  { id: 'leonardo',   label: 'Leonardo AI',      short: 'Leo',    hint: 'Soon', Badge: LeonardoBadge,     available: false },
  { id: 'playground', label: 'Playground v3',    short: 'Play',   hint: 'Soon', Badge: PlaygroundBadge,   available: false },
];

const MODEL_ENTRIES: ModelEntry[] = [...AVAILABLE_MODELS, ...COMING_SOON_MODELS];

const KONTEXT_ENTRY: ModelEntry = {
  id: 'kontext', label: 'Flux Kontext', short: 'Kontext', hint: 'Image-to-image', Badge: FluxKontextBadge, available: true,
};

// ─── Premade prompt presets — adapt to the active brand on click ─────
interface PromptPreset {
  id: string;
  title: string;
  /** Use {brand} as a placeholder; replaced with brand.name at click time. */
  prompt: string;
  formatId: string;
  /** Pollinations preview URL — small thumbnail, cached by URL params. */
  previewSeed: number;
}
const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'football-poster',  title: 'Football Poster',  prompt: 'Epic football stadium aerial shot at golden hour, dramatic lighting, cinematic film grain, {brand} colors',                                formatId: 'tall',       previewSeed: 101 },
  { id: 'cyber-hero',       title: 'Cyber Hero',       prompt: 'Neon cyberpunk hero composition at night, glowing red accents, dramatic mood, ultra-detailed, {brand} aesthetic',                          formatId: 'square',     previewSeed: 202 },
  { id: 'product-clean',    title: 'Clean Product',    prompt: 'Professional product photography, clean white background, soft studio lighting, premium {brand} product on pedestal',                       formatId: 'square',     previewSeed: 303 },
  { id: 'team-mood',        title: 'Team Mood',        prompt: 'Moody locker room with team jerseys, dramatic accent lighting, {brand} colors, cinematic',                                                  formatId: 'widescreen', previewSeed: 404 },
  { id: 'minimal-bg',       title: 'Minimal BG',       prompt: 'Minimalist abstract gradient background, subtle grain, {brand}-colored, leaves space for headline',                                         formatId: 'widescreen', previewSeed: 505 },
  { id: 'event-banner',     title: 'Event Banner',     prompt: 'Wide event banner, bold geometric shapes, energetic composition, {brand} palette, ultra-sharp',                                             formatId: 'cinematic',  previewSeed: 606 },
  { id: 'avatar-portrait',  title: 'Avatar',           prompt: 'Centered avatar portrait, neutral background, premium studio lighting, {brand} mood',                                                       formatId: 'square',     previewSeed: 707 },
  { id: 'logo-mark',        title: 'Logo Mark',        prompt: 'Minimalist logo concept on neutral background, geometric, balanced, contemporary, {brand} essence',                                         formatId: 'square',     previewSeed: 808 },
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
  /** Switch the editor's active page — used after we add a new page
   *  for a fresh generation so the user lands on it immediately. */
  onActivePageChange?: (pageId: string) => void;
}


interface ReferenceImageState {
  url: string;
  fileName: string;
}

export function GeneratePanel({
  adapter, activePageId, doc, brand, agent, getContext, initialPrompt, onApply, onActivePageChange,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [formatId, setFormatId] = useState<string>('auto');
  // Stored as string (not ImageModel) so 'auto' is a first-class
  // selectable value. Resolved to a real ImageModel at submit time.
  const [model, setModel] = useState<string>('auto');

  // The doc pages themselves are the canonical history — every
  // generation appends a page, and the EditorGenerationsStrip
  // (mounted near the canvas) is the user-facing browser. No local
  // history grid in the panel anymore.
  const [reference, setReference] = useState<ReferenceImageState | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ─── Reference image upload ──────────────────────────────────────
  // Routes through the upload-ai-reference Edge Function. The function
  // uses service-role to upload into the (private) brand-assets bucket
  // under an `ai-refs/{userId}/...` path and returns a 1-hour signed
  // URL the AI vendor can fetch. Direct-from-browser uploads can't do
  // this because brand-assets' RLS requires the first path segment to
  // be a brand UUID the user belongs to — which fails for seed brands.
  const handleFileChosen = useCallback(async (file: File) => {
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
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Sign in to upload reference images.');
        return;
      }
      const fileBase64 = await fileToBase64(file);
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/upload-ai-reference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: sessionData?.session?.user?.id ?? `anon-${crypto.randomUUID()}`,
          fileBase64,
          contentType: file.type,
          ext,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status} ${text.slice(0, 140)}`);
      }
      const { url } = await res.json() as { url: string };
      setReference({ url, fileName: file.name });
      toast.success('Reference attached.');
    } catch (err) {
      console.error('[GeneratePanel] reference upload failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not upload reference: ${msg.slice(0, 80)}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const onPickFile = useCallback(() => fileInputRef.current?.click(), []);
  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void handleFileChosen(f);
  }, [handleFileChosen]);
  const clearReference = useCallback(() => setReference(null), []);

  // ─── Generation paths ────────────────────────────────────────────
  // Each Image-mode submit creates a new page in the doc holding the
  // resulting image, and records a history entry the user can revisit
  // from the panel. No clobbering — previous generations stay put.
  const runImage = useCallback(async (text: string) => {
    setError(null);
    setSuggestions([]);
    setBusy(true);

    const docNow = adapter.getDocument();
    const activePage = docNow.pages.find((p) => p.id === activePageId) ?? docNow.pages[0];

    // Resolve format. 'auto' = use the active page's dimensions.
    const formatPreset = FORMAT_PRESETS.find((f) => f.id === formatId) ?? FORMAT_PRESETS[0];
    const isAutoFormat = formatPreset.id === 'auto';
    const targetW = isAutoFormat ? (activePage?.width ?? 1024) : formatPreset.width;
    const targetH = isAutoFormat ? (activePage?.height ?? 1024) : formatPreset.height;

    // Resolve model. 'auto' picks flux (which accepts the image= param
    // on the free endpoint, doubling as img2img when a reference is
    // attached). Other ids pass through.
    const resolvedModel: ImageModel = model === 'auto' ? 'flux' : (model as ImageModel);

    const effectivePrompt = `${text}${formatPreset.promptSuffix}`;

    // Surface the exact format + model in the toast so the user can
    // confirm their selection actually went through to the request.
    const activeModelEntry = MODEL_ENTRIES.find((m) => m.id === model) ?? MODEL_ENTRIES[0];
    const formatLabel = formatPreset.id === 'auto'
      ? `Auto · ${targetW}×${targetH}`
      : `${formatPreset.ratio} ${formatPreset.name}`;
    toast.message(`Generating · ${formatLabel} · ${activeModelEntry.label}${reference ? ' · with reference' : ''}`);

    try {
      const result = await generateImage({
        prompt: effectivePrompt,
        width: targetW,
        height: targetH,
        model: resolvedModel,
        negativePrompt: negativePrompt.trim() || undefined,
        referenceImageUrl: reference?.url,
      });

      // Use the AUTHORITATIVE image dimensions. Source priority:
      //   1. Server-parsed (Edge Function reads JPEG/PNG header from
      //      the raw bytes — always correct, no async).
      //   2. Browser probe via new Image() — fallback when the Edge
      //      Function couldn't parse (e.g. unrecognized format).
      //   3. Requested dims — last-resort fallback.
      // Pollinations frequently downsizes silently (e.g. 1820×1024
      // request → 1023×576 actual). Sizing the page to anything
      // other than the actual image dims causes Fabric's cover-fit
      // to scale and crop the image — what the user sees as stretch.
      let pageW = targetW;
      let pageH = targetH;
      if (typeof result.width === 'number' && typeof result.height === 'number') {
        pageW = result.width;
        pageH = result.height;
      } else {
        try {
          const probed = await probeImageDimensions(result.imageUrl);
          pageW = probed.width;
          pageH = probed.height;
        } catch {
          // keep requested dims
        }
      }

      const newPageId = crypto.randomUUID();
      const newPage: Page = {
        id: newPageId,
        name: text.slice(0, 32) || 'AI generation',
        width: pageW,
        height: pageH,
        background: '#ffffff',
        masterPageId: null,
        layers: [{
          id: crypto.randomUUID(),
          kind: 'image',
          name: 'AI image',
          src: result.imageUrl,
          fit: 'cover',
          transform: { x: 0, y: 0, width: pageW, height: pageH, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1, visible: true, locked: false, brandLocked: false,
        }],
      };
      // Insert the new page directly after the currently-active one so
      // the doc reads chronologically — the GenerationsStrip near the
      // canvas exposes the whole list to flip through.
      const docAtInsert = adapter.getDocument();
      const activeIdx = docAtInsert.pages.findIndex((p) => p.id === activePageId);
      const insertIndex = activeIdx >= 0 ? activeIdx + 1 : docAtInsert.pages.length;
      adapter.batch('AI: new generation', () => {
        adapter.addPage(newPage, insertIndex);
      });
      onActivePageChange?.(newPageId);

      toast.success(
        result.mock
          ? `Image generated (mock) at ${pageW}×${pageH}.`
          : `Generated at ${pageW}×${pageH} with ${activeModelEntry.label}.`
      );
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [adapter, activePageId, formatId, model, negativePrompt, reference, onActivePageChange]);

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

  // Apply a preset — fills the prompt, sets matching format, ready to generate.
  const applyPreset = useCallback((preset: PromptPreset) => {
    const brandName = brand?.name ?? 'your brand';
    setPrompt(preset.prompt.replace(/\{brand\}/g, brandName));
    if (FORMAT_PRESETS.some((f) => f.id === preset.formatId)) {
      setFormatId(preset.formatId);
    }
    setMode('image');
  }, [brand]);

  const activeFormat = FORMAT_PRESETS.find((f) => f.id === formatId) ?? FORMAT_PRESETS[0];
  // Reference attached doesn't force Kontext anymore — Flux on the
  // free Pollinations endpoint accepts the image= param too, so we
  // let the user keep their model selection.
  const activeModelEntry =
    MODEL_ENTRIES.find((m) => m.id === model) ?? MODEL_ENTRIES[0];

  const placeholder =
    mode === 'image'
      ? reference
        ? 'Describe what to generate using this reference as guidance…'
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
          Two side-by-side selects: Format (aspect + use case merged
          into one decision, à la Freepik) and Model. Each cell is
          wider now that we're at 2-col, so values like "Social post"
          and "GPT Image" fit cleanly. */}
      {mode === 'image' ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <TallSelect
              caption="Format"
              icon={<activeFormat.Icon className="h-3.5 w-3.5" aria-hidden />}
              value={formatId}
              valueLabel={activeFormat.id === 'auto' ? 'Auto' : `${activeFormat.ratio} ${activeFormat.name}`}
              onChange={setFormatId}
              disabled={busy}
              title="Format"
              items={FORMAT_PRESETS.map((f) => ({
                value: f.id,
                label: f.name,
                trailing: f.id === 'auto' ? undefined : f.ratio,
                renderIcon: (cn) => <f.Icon className={cn} aria-hidden />,
              }))}
            />
            <TallSelect
              caption="Model"
              icon={<activeModelEntry.Badge className="h-3.5 w-3.5" />}
              value={model}
              valueLabel={activeModelEntry.short}
              onChange={(v) => {
                const entry = MODEL_ENTRIES.find((m) => m.id === v);
                if (entry?.available) setModel(v);
              }}
              disabled={busy}
              title="Model"
              items={MODEL_ENTRIES.map((m) => ({
                value: m.id,
                label: m.label,
                trailing: m.available ? m.hint : undefined,
                renderIcon: (cn) => <m.Badge className={cn} />,
                available: m.available,
              }))}
            />
          </div>

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

      {/* History of generations lives in EditorGenerationsStrip near
          the canvas — see Editor.tsx — so it's "next to the images"
          per user feedback, not under the Generate button. */}

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
  /** When false, the item shows as dimmed + disabled so the user can
   *  see what's on the roadmap without being able to pick it. */
  available?: boolean;
}

function TallSelect({
  caption, icon, value, valueLabel, valueHint, onChange, disabled, title, items,
}: {
  /** Tooltip caption — also shown as the placeholder when there's no value. */
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
        // Compact single-row trigger optimised for 3-col density at
        // 300px panel width: tighter padding/gap and a smaller chevron
        // give the value 100% of the remaining width.
        className="h-8 px-1.5 py-0 text-[11px] gap-1 [&>span]:line-clamp-none [&>svg]:opacity-50 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:shrink-0"
        title={`${title}${valueHint ? ` — ${valueHint}` : ''}`}
        aria-label={`${title}: ${valueLabel}`}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <div className="shrink-0 flex items-center">{icon}</div>
          <span className="font-medium truncate text-left" style={{ color: 'var(--text-primary)' }}>
            {valueLabel}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent data-workspace className="min-w-[240px]">
        {items.map((it) => {
          const disabled = it.available === false;
          return (
            <SelectItem
              key={it.value}
              value={it.value}
              disabled={disabled}
              className={`text-[12px] ${disabled ? 'opacity-45' : ''}`}
            >
              {/* 3-column layout: icon · ratio · name. Trailing slot
                  collapses when no ratio (model entries don't carry
                  one — but coming-soon entries get a "Soon" pill). */}
              <div className="grid grid-cols-[16px_minmax(0,auto)_1fr] items-center gap-2 w-full py-0.5">
                <span className="inline-flex items-center justify-center">
                  {it.renderIcon('h-3.5 w-3.5 shrink-0')}
                </span>
                {it.trailing && !disabled ? (
                  <span className="font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {it.trailing}
                  </span>
                ) : <span />}
                <span
                  className="text-right truncate inline-flex items-center justify-end gap-1"
                  style={{ color: it.trailing && !disabled ? 'var(--text-muted)' : 'var(--text-primary)' }}
                >
                  {it.label}
                  {disabled ? (
                    <span
                      className="rounded-full px-1.5 py-[1px] text-[8.5px] font-medium uppercase tracking-wider"
                      style={{
                        background: 'color-mix(in oklab, var(--text-primary) 8%, transparent)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Soon
                    </span>
                  ) : null}
                </span>
              </div>
            </SelectItem>
          );
        })}
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

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Load an image src and return its natural pixel dimensions. Used to
 * size the page + layer to exactly what the vendor produced — never
 * to what we asked for. Pollinations occasionally returns a different
 * resolution from the request; trusting the request size leads to
 * stretched / cropped output.
 */
function probeImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    // crossOrigin isn't needed for the data:/signed URLs we get from
    // our own Edge Function; setting it would force a preflight that
    // some providers reject.
    img.onload = () => {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (w > 0 && h > 0) resolve({ width: w, height: h });
      else reject(new Error('image has zero dimensions'));
    };
    img.onerror = () => reject(new Error('image failed to load'));
    img.src = src;
  });
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // btoa can't handle very long strings reliably; chunk through it
  // to keep the call stack safe for files up to ~8 MB.
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(bin);
}
