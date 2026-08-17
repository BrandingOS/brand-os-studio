// GeneratePanel — the editor's AI surface (Freepik / Lovart-style).
//
// Layout (top → bottom):
//   • Mode pills (Image | Editable)
//   • Prompt textarea — paperclip attaches a user reference inline
//   • Image toolbar: Format ▾ · Model ▾ · Count 1–4 · Brand-aware / Raw
//   • Advanced (collapsed): negative prompt
//   • Generate → (Image) silent brand-aware compile → vendor → pages,
//                one ProcessingCard the whole way (owner: no review step)
//                (Editable) agent.applyCommand → onApply
//   • GenerationActions when the active page is an AI generation
//   • Presets gallery
//
// Image-mode state lives in `useImageGeneration`; this file is
// composition + the Editable path (unchanged behaviour). Test hooks
// (`data-generate-*`) are preserved for the existing browser e2e suites.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Sparkles, Image as ImageIcon, Layers, X as XIcon, Paperclip, Settings2, Wand2, Type } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, ImageLayer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { AUTO_MODEL_ID, modelLabel } from '@/features/editor/ai/imageModels';
import { FORMAT_PRESETS, findFormat, formatLabel, type PromptPreset } from './formats';
import { TallSelect } from './TallSelect';
import { ModelPicker } from './ModelPicker';
import { capsForSelection, useImageCapabilities } from './useImageModelAvailability';
import { CountChip } from './CountChip';
import { ProcessingCard } from './ProcessingCard';
import { GenerationActions } from './GenerationActions';
import { PresetsGallery } from './PresetsGallery';
import { useGeneratePrefs } from './generatePrefs';
import { useImageGeneration } from './useImageGeneration';
import { generationForPage, readAiMetadata } from './aiMetadata';

type Mode = 'image' | 'editable';

export interface GeneratePanelProps {
  adapter: EditorAdapter;
  activePageId: string;
  doc: BrandOSDocument;
  brand?: Brand;
  agent: AIAgent | null;
  getContext: () => AICommandContext;
  initialPrompt?: string;
  /** From the Design hero hand-off: which pill to open with. */
  initialMode?: Mode;
  initialModel?: string;
  initialFormatId?: string;
  initialCount?: number;
  /** Auto-start the Image flow with `initialPrompt` on mount (hero hand-off). */
  autoStart?: boolean;
  onApply: (result: AICommandResult) => void;
  onActivePageChange?: (pageId: string) => void;
}

interface ReferenceImageState { url: string; path: string; fileName: string }

export function GeneratePanel({
  adapter, activePageId, doc, brand, agent, getContext,
  initialPrompt, initialMode, initialModel, initialFormatId, initialCount, autoStart,
  onApply, onActivePageChange,
}: GeneratePanelProps) {
  const prefs = useGeneratePrefs();
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [mode, setMode] = useState<Mode>(initialMode ?? 'image');
  const [editableBusy, setEditableBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editableError, setEditableError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [formatId, setFormatId] = useState<string>(initialFormatId && FORMAT_PRESETS.some((f) => f.id === initialFormatId) ? initialFormatId : 'auto');
  const [reference, setReference] = useState<ReferenceImageState | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Model / count come from persisted prefs; a hero hand-off overrides once.
  useEffect(() => {
    if (initialModel) prefs.setModel(initialModel);
    if (initialCount) prefs.setCount(initialCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capabilities = useImageCapabilities();
  const caps = capsForSelection(capabilities, prefs.model || AUTO_MODEL_ID);

  const gen = useImageGeneration({
    adapter, activePageId, brand, onActivePageChange,
    settings: {
      model: prefs.model || AUTO_MODEL_ID,
      count: prefs.count,
      formatId,
      negativePrompt,
      brandAware: prefs.brandAware,
      caps,
      referencePaths: reference?.path ? [reference.path] : undefined,
    },
  });

  // Hero hand-off: the prompt arrives via URL, we start immediately.
  // The panel can mount before the adapter has loaded the document, so
  // wait (briefly) for it — the hook reads page dims from the adapter.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || !initialPrompt || autoStarted.current || mode !== 'image') return;
    // Refresh-safe: the hero stores the prompt as `metadata.ai.pendingPrompt`
    // and the first generation clears it — a reload with the same URL must
    // not fire again.
    if (!readAiMetadata(doc).pendingPrompt) return;
    let cancelled = false;
    const deadline = Date.now() + 5000;
    const tick = () => {
      if (cancelled || autoStarted.current) return;
      let ready = false;
      try { adapter.getDocument(); ready = true; } catch { ready = false; }
      // Mark started only when we actually fire — StrictMode's mount →
      // cleanup → mount must not swallow the hand-off.
      if (ready) { autoStarted.current = true; void gen.start(initialPrompt); return; }
      if (Date.now() < deadline) setTimeout(tick, 50);
    };
    tick();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialPrompt]);

  // Surface result toasts (mock / warnings) once per batch.
  const lastToastFor = useRef<string | null>(null);
  useEffect(() => {
    const r = gen.lastResult;
    if (!r) return;
    const key = r.pageIds.join(',');
    if (lastToastFor.current === key) return;
    lastToastFor.current = key;
    if (r.warnings?.includes('refs-unsupported')) toast.message('This model ignores reference images — brand context was sent as text only.');
    else if (r.warnings?.length) toast.message(r.warnings[0]);
    else {
      toast.success(
        `${r.pageIds.length > 1 ? `${r.pageIds.length} images added` : 'Image added'}`
        + (r.charged > 0 ? ` · ${r.charged} credits` : ''),
      );
    }
    setPrompt('');
  }, [gen.lastResult]);

  // ─── Reference image upload (unchanged: upload-ai-reference) ─────
  const handleFileChosen = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Reference must be an image.'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Reference must be smaller than 8 MB.'); return; }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { toast.error('Sign in to upload reference images.'); return; }
      const fileBase64 = await fileToBase64(file);
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/upload-ai-reference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          sessionId: sessionData?.session?.user?.id ?? `anon-${crypto.randomUUID()}`,
          fileBase64, contentType: file.type, ext,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status} ${text.slice(0, 140)}`);
      }
      const { url, path } = await res.json() as { url: string; path: string };
      setReference({ url, path, fileName: file.name });
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

  // ─── Editable path (unchanged) ───────────────────────────────────
  const runEditable = useCallback(async (text: string) => {
    if (!agent) { setEditableError('AI agent is not available.'); return; }
    setEditableError(null);
    setSuggestions([]);
    setEditableBusy(true);
    try {
      const result = await agent.applyCommand(adapter.getDocument(), text, getContext());
      onApply(result);
      if (result.kind === 'rejected') {
        setEditableError(result.message);
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
      setEditableError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditableBusy(false);
    }
  }, [adapter, agent, getContext, onApply]);

  const busy = mode === 'image' ? gen.busy : editableBusy;
  const error = mode === 'image' ? gen.error : editableError;

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    if (mode === 'image') await gen.start(text);
    else await runEditable(text);
  }, [prompt, busy, mode, gen, runEditable]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
  }, [submit]);

  const applyPreset = useCallback((preset: PromptPreset) => {
    setPrompt(preset.prompt.replace(/\{brand\}/g, brand?.name ?? 'your brand'));
    if (FORMAT_PRESETS.some((f) => f.id === preset.formatId)) setFormatId(preset.formatId);
    setMode('image');
  }, [brand]);

  const activeFormat = findFormat(formatId);
  const activePage = doc.pages.find((p) => p.id === activePageId);
  const activeRecord = generationForPage(doc, activePageId);
  const activeImageSrc = (() => {
    const l = activePage?.layers.find((x) => x.kind === 'image') as ImageLayer | undefined;
    return typeof l?.src === 'string' ? l.src : undefined;
  })();
  const inReview = mode === 'image' && (gen.status === 'compiling' || gen.status === 'generating');
  const activeModelLabel = modelLabel(prefs.model || AUTO_MODEL_ID, capabilities.auto);
  const aiDoc = readAiMetadata(doc).origin === 'ai-image';

  const placeholder = mode === 'image'
    ? reference ? 'Describe what to generate using this reference as guidance…'
      : brand ? `Describe — "${brand.name} hero shot at dusk"` : 'Describe the image…'
    : brand ? 'Edit — "make headline bigger and brand-red"' : 'Describe the edit…';

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2.5 text-[12px]" style={{ color: 'var(--text-primary)' }} data-generate-panel data-ai-doc={aiDoc || undefined}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInputChange} className="hidden" />

      <ModeToggle mode={mode} busy={busy} agentAvailable={!!agent} onChange={setMode} />

      {/* Prompt block */}
      {!inReview ? (
        <section className="flex flex-col gap-1.5">
          <div className="rounded-lg border transition-colors" style={{ borderColor: error ? 'var(--accent-red, #ef4444)' : 'var(--border)', background: 'var(--surface)' }}>
            {reference ? (
              <div className="px-2 pt-2">
                <div className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10.5px]" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken, transparent)' }}>
                  <img src={reference.url} alt="Reference" className="h-5 w-5 rounded object-cover" />
                  <span className="max-w-[120px] truncate" title={reference.fileName}>{reference.fileName}</span>
                  <button type="button" onClick={clearReference} aria-label="Remove reference" className="rounded p-0.5 hover:bg-muted" style={{ color: 'var(--text-secondary)' }}>
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
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>⌘/Ctrl + Enter</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Inline error (+ owner hint for missing keys) */}
      {error ? (
        <div
          data-generate-error
          role="alert"
          className="rounded-md px-2 py-1 text-[11px]"
          style={{ background: 'color-mix(in oklab, var(--accent-red, #ef4444) 8%, transparent)', color: 'var(--accent-red, #ef4444)' }}
        >
          {error}
          {mode === 'image' && gen.errorHint ? (
            <div className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>{gen.errorHint}</div>
          ) : null}
          {mode === 'image' && gen.canRetry ? (
            <button
              type="button"
              data-generate-retry
              onClick={() => void gen.retry()}
              disabled={busy}
              className="mt-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
              style={{ borderColor: 'currentColor' }}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === 'editable' && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1" data-generate-suggestions>
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => { setPrompt(s); setSuggestions([]); }} className="rounded-full border px-2 py-0.5 text-[10.5px] transition-colors hover:bg-muted" style={{ borderColor: 'var(--border)' }}>
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* Image toolbar */}
      {mode === 'image' && !inReview ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <TallSelect
              caption="Format"
              icon={<activeFormat.Icon className="h-3.5 w-3.5" aria-hidden />}
              value={formatId}
              valueLabel={activeFormat.id === 'auto' ? 'Auto' : `${activeFormat.ratio} ${activeFormat.name}`}
              valueHint={activeFormat.name}
              onChange={setFormatId}
              disabled={busy}
              title="Format"
              items={FORMAT_PRESETS.map((f) => ({
                value: f.id, label: f.name, trailing: f.id === 'auto' ? undefined : f.ratio,
                renderIcon: (cn) => <f.Icon className={cn} aria-hidden />,
              }))}
            />
            <ModelPicker state={capabilities} value={prefs.model || AUTO_MODEL_ID} onChange={prefs.setModel} disabled={busy} />
          </div>
          <div className="flex items-center justify-between gap-1.5">
            <CountChip value={prefs.count} onChange={prefs.setCount} disabled={busy} />
            <div
              role="radiogroup"
              aria-label="Prompt mode"
              data-generate-brand-aware
              className="inline-flex items-center gap-0.5 rounded-full p-0.5"
              style={{ background: 'var(--surface-sunken, color-mix(in oklab, currentColor 6%, transparent))' }}
              title="Brand-aware compiles your prompt with the brand's palette and style; Raw sends your exact words"
            >
              <ModeButton active={prefs.brandAware} disabled={busy} onClick={() => prefs.setBrandAware(true)} icon={<Wand2 className="h-3 w-3" aria-hidden />} label="On-brand" value="brand" />
              <ModeButton active={!prefs.brandAware} disabled={busy} onClick={() => prefs.setBrandAware(false)} icon={<Type className="h-3 w-3" aria-hidden />} label="Raw" value="raw" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted"
              style={{ color: 'var(--text-muted)' }}
              aria-expanded={advancedOpen}
            >
              <Settings2 className="h-3 w-3" aria-hidden />
              {advancedOpen ? 'Hide options' : 'Options'}
            </button>
          </div>
          {advancedOpen ? (
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid — blurry, low quality, text…"
              rows={2}
              disabled={busy}
              className="w-full resize-none rounded-md border px-2 py-1 text-[11px] focus:outline-none disabled:opacity-60"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              data-generate-negative
            />
          ) : null}
        </>
      ) : null}

      {/* Processing state — compile + generate shown as one step */}
      {inReview ? (
        <ProcessingCard
          status={gen.status}
          brandName={brand?.name}
          modelLabel={activeModelLabel}
          count={gen.pendingKind === 'variation' ? 4 : prefs.count}
          kind={gen.pendingKind}
          onCancel={mode === 'image' ? () => void gen.cancel() : undefined}
        />
      ) : null}

      {/* Generate */}
      {!inReview ? (
        <button
          type="button"
          data-generate-submit
          onClick={() => void submit()}
          disabled={busy || !prompt.trim() || (mode === 'editable' && !agent)}
          className="mt-0.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', boxShadow: busy ? 'none' : '0 1px 0 color-mix(in oklab, var(--accent) 20%, transparent)' }}
        >
          {busy ? (
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor' }} />
              <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'currentColor', animationDelay: '300ms' }} />
            </span>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {mode === 'image' ? `Generate${prefs.count > 1 ? ` ×${prefs.count}` : ''}` : 'Apply'}
            </>
          )}
        </button>
      ) : null}

      {/* Actions for the active AI page */}
      {mode === 'image' && !inReview && activeRecord ? (
        <GenerationActions
          record={activeRecord}
          imageSrc={activeImageSrc}
          busy={busy}
          onVariations={() => void gen.variations(activePageId)}
          onRefine={(t) => void gen.refine(activePageId, t)}
          onRegenerate={() => void gen.regenerate(activePageId)}
        />
      ) : null}

      {mode === 'image' && !inReview ? <PresetsGallery brand={brand} onApply={applyPreset} /> : null}
    </div>
  );
}

// ─── Local primitives ────────────────────────────────────────────────

function ModeToggle({ mode, busy, agentAvailable, onChange }: { mode: Mode; busy: boolean; agentAvailable: boolean; onChange: (m: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="Generation mode" data-generate-mode-group className="inline-flex items-center gap-0.5 self-start rounded-full p-0.5" style={{ background: 'var(--surface-sunken, color-mix(in oklab, currentColor 6%, transparent))' }}>
      <ModeButton active={mode === 'image'} disabled={busy} onClick={() => onChange('image')} icon={<ImageIcon className="h-3 w-3" aria-hidden />} label="Image" />
      <ModeButton active={mode === 'editable'} disabled={busy || !agentAvailable} onClick={() => onChange('editable')} icon={<Layers className="h-3 w-3" aria-hidden />} label="Editable" />
    </div>
  );
}

function ModeButton({ active, disabled, onClick, icon, label, value }: { active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string; value?: string }) {
  return (
    <button
      type="button" role="radio" aria-checked={active} data-generate-mode={value ?? label.toLowerCase()} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
      style={{ background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent-contrast)' : 'var(--text-secondary)' }}
    >
      {icon}
      {label}
    </button>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(bin);
}
