// GeneratePanel — the one surface where images are generated.
//
// Four zones, in this order, and the order is the design:
//
//   COMPOSER   prompt · references · the run button        always visible
//   SETTINGS   size · model · count · brand includes       one row at rest
//   RESULTS    pending slots that BECOME the results       grows
//   START FROM presets                                     empty state only
//
// The rule that fixes the worst moment: the composer and the settings stay
// MOUNTED while a batch runs. The panel used to replace itself with a spinner
// card, so at the exact moment the wait was longest the user could not see what
// they had asked for, could not see the settings they had chosen, and could not
// queue an edit. The waiting state now lives in the results grid, in the slots
// the images will actually land in.
//
// The Image / Editable switch is deliberately not rendered (MODE_SWITCH_VISIBLE).
// The Editable path is intact and still reachable through the hero hand-off
// (`?mode=editable` → `initialMode`), which is how every caller reaches it.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Sparkles, Paperclip, Settings2, Layers, Image as ImageIcon, Wand2, Palette, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, ImageLayer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import { AUTO_MODEL_ID, modelLabel } from '@/features/editor/ai/imageModels';
import {
  estimateGeneration,
  uploadReference,
  formatCredits,
  useCreditsForBrand,
  saveGeneratedImageToBrand,
} from '@/features/image-generation';
import { container, SERVICE_KEYS } from '@/core';
import type { IAssetsService } from '@/core/types/services';
import { FORMAT_PRESETS, findFormat, type PromptPreset } from './formats';
import { TallSelect } from './TallSelect';
import { ModelPicker } from './ModelPicker';
import { capsForSelection, useImageCapabilities } from './useImageModelAvailability';
import { CountStepper } from './CountStepper';
import { BrandIncludes } from './BrandIncludes';
import { ResultsStrip, type PendingBatch } from './ResultsStrip';
import { GenerationActions } from './GenerationActions';
import { PresetsGallery } from './PresetsGallery';
import { useGeneratePrefs } from './generatePrefs';
import { useImageGeneration } from './useImageGeneration';
import { inferDeliverable, type CopyDeck, type DeliverableKind } from '@/features/editor/ai/imagePrompt/artDirection';
import { ReferenceStrip, type PanelReference, type ReferenceUse } from './ReferenceStrip';
import { CreditsPill } from './CreditsPill';
import { generationForPage, readAiMetadata } from './aiMetadata';
import { estimateDuration } from './genTiming';

type Mode = 'image' | 'editable';

/**
 * The Image / Editable switch is hidden, not deleted.
 *
 * Flip this to true to bring it back. Everything behind it — `runEditable`,
 * the suggestion chips, `agent.applyCommand` — is untouched, and the hero
 * hand-off still opens the panel in Editable mode via `initialMode`.
 */
const MODE_SWITCH_VISIBLE = false as boolean;

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
  const [references, setReferences] = useState<PanelReference[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  // The words to SET in the design. Never invented on the user's behalf — an
  // empty deck means the image carries no copy but the brand name.
  const [copy, setCopy] = useState<CopyDeck>({});
  const [kindChoice, setKindChoice] = useState<DeliverableKind | 'auto'>('auto');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Which button opened the picker — a file has no idea what it is FOR.
  const pendingUseRef = useRef<ReferenceUse>('subject');

  // Model / count come from persisted prefs; a hero hand-off overrides once.
  useEffect(() => {
    if (initialModel) prefs.setModel(initialModel);
    if (initialCount) prefs.setCount(initialCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capabilities = useImageCapabilities();
  const caps = capsForSelection(capabilities, prefs.model || AUTO_MODEL_ID);
  const maxRefs = caps?.maxReferenceImages ?? 0;

  // The balance is the server's, always. It is shown BEFORE the button that
  // spends it — a generation that fails for want of credits after the fact is
  // a worse experience than one that was never offered.
  const credits = useCreditsForBrand(brand?.id);
  // Resolved at click time, not at mount: the panel renders in surfaces (and
  // tests) where the Library is not part of the container, and a missing
  // service should hide one button, never fail the whole panel.
  const assets = container.has(SERVICE_KEYS.ASSETS)
    ? container.get<IAssetsService>(SERVICE_KEYS.ASSETS)
    : null;

  const gen = useImageGeneration({
    adapter, activePageId, brand, onActivePageChange,
    settings: {
      model: prefs.model || AUTO_MODEL_ID,
      count: prefs.count,
      formatId,
      negativePrompt,
      include: prefs.include,
      caps,
      references: references.length
        ? references.map((r) => ({ path: r.path, use: r.use }))
        : undefined,
      copy,
      kind: kindChoice === 'auto' ? undefined : kindChoice,
    },
  });

  // What will actually be built, shown before the credits are spent.
  const deliverable = inferDeliverable(
    prompt, copy, kindChoice === 'auto' ? undefined : kindChoice,
  );
  const copyCount = [copy.headline, copy.subhead, copy.cta].filter((v) => v?.trim()).length;

  // ─── Pre-flight cost ─────────────────────────────────────────────
  // The server prices the request; the panel only displays it. A batch is one
  // job PER CANDIDATE (see useImageGeneration), and credits round up per job,
  // so the estimate has to price a single image and multiply — quoting the old
  // batch price would under-report what is actually charged.
  const [estimate, setEstimate] = useState<number | null>(null);
  const [costState, setCostState] = useState<'loading' | 'ready' | 'unknown'>('loading');
  const refCount = Math.min(references.length, maxRefs);
  useEffect(() => {
    if (mode !== 'image') { setEstimate(null); setCostState('unknown'); return; }
    let cancelled = false;
    setCostState('loading');
    estimateGeneration({
      model: prefs.model || AUTO_MODEL_ID,
      aspectRatio: findFormat(formatId).ratio === 'auto' ? undefined : findFormat(formatId).ratio as never,
      count: 1,
      referenceCount: refCount,
    })
      .then((r) => {
        if (cancelled) return;
        const per = r.credits ?? null;
        setEstimate(per == null ? null : per * prefs.count);
        setCostState(per == null ? 'unknown' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        // A failed estimate is not a free generation. Say so rather than
        // quietly removing the affordability guard.
        setEstimate(null);
        setCostState('unknown');
      });
    return () => { cancelled = true; };
  }, [mode, prefs.model, prefs.count, formatId, refCount]);

  const balance = credits.account?.balance ?? null;
  const cannotAfford = estimate != null && balance != null && balance < estimate;

  const costTitle = mode !== 'image'
    ? undefined
    : costState === 'loading'
      ? 'Working out the cost…'
      : costState === 'unknown'
        ? 'The cost could not be checked — sign in to see it before generating.'
        : cannotAfford
          ? `This needs ${estimate} credits; you have ${formatCredits(balance ?? 0)}.`
          : `${prefs.count} image${prefs.count > 1 ? 's' : ''} · ${modelLabel(prefs.model || AUTO_MODEL_ID, capabilities.auto)} · ${estimate} credits${balance != null ? ` · you have ${formatCredits(balance)}` : ''}`;

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
    if (typeof r.balance === 'number') credits.applyBalance(r.balance);

    const asked = r.requested ?? r.pageIds.length;
    if (r.pageIds.length < asked) {
      // A partial delivery must never be silent — the user paid for what
      // arrived, and needs to know the rest did not.
      toast.warning(
        `${r.pageIds.length} of ${asked} images came back`
        + (r.charged > 0 ? ` — you were charged for ${r.charged} credits.` : '.'),
      );
    } else if (r.warnings?.includes('refs-unsupported')) {
      toast.message('This model ignores reference images — brand context was sent as text only.');
    } else if (r.warnings?.length) {
      toast.message(r.warnings[0]);
    } else {
      toast.success(
        `${r.pageIds.length > 1 ? `${r.pageIds.length} images added` : 'Image added'}`
        + (r.charged > 0 ? ` · ${r.charged} credits` : ''),
      );
    }
    // The prompt is DELIBERATELY kept. Generating is iterative — the second
    // attempt is nearly always the first with a word changed — and clearing the
    // box made every iteration a retype. Clear is a button now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.lastResult]);

  // ─── Reference images ────────────────────────────────────────────
  // The strip keeps every image the user attached, in send order, each carrying
  // what it is FOR. The server truncates to what the model accepts and says so;
  // the strip shows which ones that leaves out BEFORE the credits are spent.
  const handleFilesChosen = useCallback(async (files: File[], use: ReferenceUse) => {
    setUploading(true);
    try {
      for (const file of files) {
        try {
          const ref = await uploadReference(file);
          setReferences((prev) => [...prev, { ...ref, use }]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg.slice(0, 120));
        }
      }
    } finally {
      setUploading(false);
    }
  }, []);
  const onPickFile = useCallback((use: ReferenceUse) => {
    pendingUseRef.current = use;
    fileInputRef.current?.click();
  }, []);
  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) void handleFilesChosen(files, pendingUseRef.current);
  }, [handleFilesChosen]);
  const removeReference = useCallback((id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }, []);
  const toggleReferenceUse = useCallback((id: string) => {
    setReferences((prev) => prev.map((r) => (
      r.id === id ? { ...r, use: r.use === 'subject' ? 'style' : 'subject' } : r
    )));
  }, []);
  const moveReference = useCallback((id: string, direction: -1 | 1) => {
    setReferences((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

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
    // A preset knows whether it is a composed design or a plain picture; the
    // old ones all read as pictures, which is how "Ad creative" produced a
    // backdrop. Opening the copy fields for a design is the nudge that gets a
    // real headline typed instead of an invented one generated.
    setKindChoice(preset.kind);
    if (preset.kind === 'design') setAdvancedOpen(true);
    setMode('image');
  }, [brand]);

  const activeFormat = findFormat(formatId);
  const activePage = doc.pages.find((p) => p.id === activePageId);
  const activeRecord = generationForPage(doc, activePageId);
  const activeImageSrc = (() => {
    const l = activePage?.layers.find((x) => x.kind === 'image') as ImageLayer | undefined;
    return typeof l?.src === 'string' ? l.src : undefined;
  })();
  const activeModelLabel = modelLabel(prefs.model || AUTO_MODEL_ID, capabilities.auto);
  const aiDoc = readAiMetadata(doc).origin === 'ai-image';

  // The pending batch, described for the results grid. `etaMs` is a MEASURED
  // median for this model at this batch size, or null — never a guess.
  const pending = useMemo<PendingBatch | null>(() => {
    if (mode !== 'image') return null;
    if (gen.status !== 'compiling' && gen.status !== 'generating') return null;
    return {
      status: gen.status,
      count: Math.max(1, gen.pendingCount || prefs.count),
      kind: gen.pendingKind ?? 'generate',
      modelLabel: activeModelLabel,
      brandName: brand?.name,
      startedAt: gen.startedAt ?? Date.now(),
      etaMs: estimateDuration(prefs.model || AUTO_MODEL_ID, Math.max(1, gen.pendingCount || prefs.count)),
      onCancel: () => void gen.cancel(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gen.status, gen.pendingCount, gen.pendingKind, gen.startedAt, prefs.count, prefs.model, activeModelLabel, brand?.name]);

  const hasResults = readAiMetadata(doc).generations.length > 0;
  const showPresets = mode === 'image' && !hasResults && !prompt.trim() && !pending;

  const placeholder = mode === 'image'
    ? references.length ? 'Describe what to generate using these references as guidance…'
      : brand ? `Describe — "${brand.name} hero shot at dusk"` : 'Describe the image…'
    : brand ? 'Edit — "make headline bigger and brand-red"' : 'Describe the edit…';

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2.5 text-[12px]" style={{ color: 'var(--text-primary)' }} data-generate-panel data-ai-doc={aiDoc || undefined}>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFileInputChange} className="hidden" />

      {(MODE_SWITCH_VISIBLE || (mode === 'image' && balance != null)) ? (
        <div className="flex items-center justify-between gap-2">
          {MODE_SWITCH_VISIBLE
            ? <ModeToggle mode={mode} busy={busy} agentAvailable={!!agent} onChange={setMode} />
            : <span />}
          {mode === 'image' && balance != null ? (
            <CreditsPill balance={balance} reserved={credits.account?.reserved} loading={credits.loading} />
          ) : null}
        </div>
      ) : null}

      {/* ─── Composer. Stays mounted while a batch runs. ─── */}
      <section className="flex flex-col gap-1.5">
        <div className="rounded-lg border transition-colors" style={{ borderColor: error ? 'var(--ds-danger, #b4453a)' : 'var(--border)', background: 'var(--surface)' }}>
          <ReferenceStrip
            references={references}
            maxReferences={maxRefs}
            onRemove={removeReference}
            onMove={moveReference}
            onToggleUse={toggleReferenceUse}
            disabled={busy}
          />
          <textarea
            data-generate-prompt
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={busy}
            rows={3}
            className="w-full resize-none bg-transparent px-2.5 pt-2 pb-1 text-[12px] leading-snug focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-1 px-1.5 pb-1 pt-0.5">
            {mode === 'image' ? (
              <div className="flex items-center gap-0.5">
                {/* Two buttons, because they are two different instructions. */}
                <AttachButton
                  onClick={() => onPickFile('subject')}
                  disabled={busy || uploading}
                  icon={<Paperclip className="h-3 w-3" aria-hidden />}
                  label="Reference"
                  testId="data-generate-attach-subject"
                  title={maxRefs === 0 ? 'This model is prompt-only' : 'A real subject or asset to reproduce faithfully'}
                />
                <AttachButton
                  onClick={() => onPickFile('style')}
                  disabled={busy || uploading}
                  icon={<Palette className="h-3 w-3" aria-hidden />}
                  label="Style"
                  testId="data-generate-attach-style"
                  title={maxRefs === 0 ? 'This model is prompt-only' : 'Visual inspiration only — its subject is never copied'}
                />
              </div>
            ) : <span />}
            <div className="flex items-center gap-1">
              {uploading ? <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Uploading…</span> : null}
              {prompt.trim() && !busy ? (
                <button
                  type="button"
                  data-generate-clear
                  onClick={() => { setPrompt(''); setCopy({}); }}
                  aria-label="Clear the prompt"
                  title="Clear the prompt"
                  className="inline-flex items-center rounded p-0.5 transition-colors hover:bg-muted"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <XIcon className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Inline error (+ owner hint for missing keys) */}
      {error ? (
        <div
          data-generate-error
          role="alert"
          className="rounded-md px-2 py-1 text-[11px]"
          style={{ background: 'var(--ds-danger-bg, color-mix(in oklab, #b4453a 8%, transparent))', color: 'var(--ds-danger, #b4453a)' }}
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

      {/* ─── Settings ─── */}
      {mode === 'image' ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <TallSelect
              caption="Size"
              icon={<activeFormat.Icon className="h-3.5 w-3.5" aria-hidden />}
              value={formatId}
              valueLabel={activeFormat.id === 'auto' ? 'Auto' : `${activeFormat.ratio} ${activeFormat.name}`}
              valueHint={activeFormat.name}
              onChange={setFormatId}
              disabled={busy}
              title="Size"
              items={FORMAT_PRESETS.map((f) => ({
                value: f.id, label: f.name, trailing: f.id === 'auto' ? undefined : f.ratio,
                renderIcon: (cn) => <f.Icon className={cn} aria-hidden />,
              }))}
            />
            <ModelPicker state={capabilities} value={prefs.model || AUTO_MODEL_ID} onChange={prefs.setModel} disabled={busy} />
          </div>

          <div className="flex items-center justify-between gap-1.5">
            <CountStepper value={prefs.count} onChange={prefs.setCount} disabled={busy} />
            {prompt.trim() ? (
              <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }} data-generate-deliverable title={deliverable.reason}>
                {deliverable.kind === 'design'
                  ? `Finished ${deliverable.noun}${copyCount ? ` · ${copyCount} line${copyCount > 1 ? 's' : ''} of copy` : ' · no copy'}`
                  : 'Image only'}
              </span>
            ) : null}
          </div>

          <BrandIncludes
            value={prefs.include}
            onChange={(next) => prefs.setInclude(next)}
            disabled={busy}
            brandName={brand?.name}
          />

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
            <div className="flex flex-col gap-1.5" data-generate-options>
              {/* What is being made. The single choice that decides whether a
                  headline and a logo belong in the frame at all. */}
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Make</span>
                <div
                  role="radiogroup"
                  aria-label="What to make"
                  data-generate-kind-group
                  className="inline-flex items-center gap-0.5 rounded-full p-0.5"
                  style={{ background: 'var(--surface-sunken, color-mix(in oklab, currentColor 6%, transparent))' }}
                >
                  <ModeButton active={kindChoice === 'auto'} disabled={busy} onClick={() => setKindChoice('auto')} icon={<Wand2 className="h-3 w-3" aria-hidden />} label="Auto" value="kind-auto" />
                  <ModeButton active={kindChoice === 'design'} disabled={busy} onClick={() => setKindChoice('design')} icon={<Layers className="h-3 w-3" aria-hidden />} label="Finished design" value="kind-design" />
                  <ModeButton active={kindChoice === 'image'} disabled={busy} onClick={() => setKindChoice('image')} icon={<ImageIcon className="h-3 w-3" aria-hidden />} label="Image only" value="kind-image" />
                </div>
              </div>

              {/* The exact words. Anything typed here is set verbatim; anything
                  left empty is NOT invented — that is the whole contract. */}
              {deliverable.kind === 'design' && prefs.include.text ? (
                <div className="flex flex-col gap-1 rounded-md border p-1.5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} data-generate-copy>
                  <CopyField label="Headline" value={copy.headline ?? ''} disabled={busy} onChange={(v) => setCopy((c) => ({ ...c, headline: v }))} name="headline" />
                  <CopyField label="Subhead" value={copy.subhead ?? ''} disabled={busy} onChange={(v) => setCopy((c) => ({ ...c, subhead: v }))} name="subhead" />
                  <CopyField label="Button" value={copy.cta ?? ''} disabled={busy} onChange={(v) => setCopy((c) => ({ ...c, cta: v }))} name="cta" />
                </div>
              ) : null}

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
            </div>
          ) : null}
        </>
      ) : null}

      {/* Generate */}
      <button
        type="button"
        data-generate-submit
        onClick={() => void submit()}
        disabled={busy || !prompt.trim() || (mode === 'editable' && !agent) || cannotAfford}
        title={costTitle}
        data-generate-estimate={mode === 'image' && estimate != null ? estimate : undefined}
        data-generate-cost-state={mode === 'image' ? costState : undefined}
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
            {mode === 'image' ? (
              <span className="text-[11px] font-normal" style={{ opacity: 0.75 }} data-generate-cost>
                · {costState === 'ready' && estimate != null ? `${estimate} credits` : costState === 'loading' ? '…' : '—'}
              </span>
            ) : null}
          </>
        )}
      </button>

      {/* ─── Results — and the slots they are about to land in ─── */}
      {mode === 'image' ? (
        <ResultsStrip
          doc={doc}
          activePageId={activePageId}
          pending={pending}
          critique={gen.critique}
          onSelect={(pageId) => onActivePageChange?.(pageId)}
          onReusePrompt={(text) => setPrompt(text)}
        />
      ) : null}

      {/* Actions for the active AI page */}
      {mode === 'image' && !pending && activeRecord ? (
        <GenerationActions
          record={activeRecord}
          imageSrc={activeImageSrc}
          busy={busy}
          onVariations={() => void gen.variations(activePageId)}
          onRefine={(t) => void gen.refine(activePageId, t)}
          onRegenerate={() => void gen.regenerate(activePageId)}
          onSaveToBrand={brand && assets && activeImageSrc ? async () => {
            await saveGeneratedImageToBrand({
              assets, brand,
              url: activeImageSrc,
              storagePath: activeRecord.storagePath,
              prompt: activeRecord.compiled || activeRecord.original,
              model: activeRecord.model,
              name: activeRecord.original,
            });
          } : undefined}
        />
      ) : null}

      {/* Start from — the way IN, so it belongs to the empty state only. */}
      {showPresets ? <PresetsGallery brand={brand} onApply={applyPreset} /> : null}
    </div>
  );
}

function AttachButton({ onClick, disabled, icon, label, title, testId }: {
  onClick: () => void; disabled?: boolean; icon: React.ReactNode;
  label: string; title: string; testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={`Attach ${label.toLowerCase()} reference`}
      {...{ [testId]: '' }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted disabled:opacity-40"
      style={{ color: 'var(--text-secondary)' }}
    >
      {icon}
      {label}
    </button>
  );
}

function CopyField({ label, value, onChange, disabled, name }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; name: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-[52px] shrink-0 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Set exactly as typed"
        data-generate-copy-field={name}
        aria-label={`${label} text`}
        className="h-6 w-full rounded border bg-transparent px-1.5 text-[11px] focus:outline-none disabled:opacity-60 placeholder:text-muted-foreground/50"
        style={{ borderColor: 'var(--border)' }}
      />
    </label>
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
