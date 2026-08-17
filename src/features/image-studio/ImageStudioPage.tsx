// Image Studio — the project workspace at /b/:brand/design/:projectId.
//
// One page, one job: describe an image, make it, keep the good ones. The
// composer stays mounted while a generation runs so the prompt, attachments
// and settings are never taken away from the user — a failure leaves them
// exactly where they were, with a retry that costs nothing extra.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Check, PenLine } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { DsBanner, DsButton, LoadingPill } from '@/shared/ds';
import { useService, SERVICE_KEYS } from '@/core';
import type { IAssetsService, IDesignStorage } from '@/core/types/services';
import {
  estimateGeneration,
  renameImageProject,
  resignOutput,
  type AspectRatio,
  type GenerationJob,
  type ImageProject,
} from '@/features/image-generation';
import { AUTO_MODEL_ID } from '@/features/editor/ai/imageModels';
import {
  capsForSelection, useImageCapabilities,
} from '@/features/editor/shell/v2/panels/generate/useImageModelAvailability';
import { PromptComposer, type ComposerValue } from './components/PromptComposer';
import { ResultsGrid } from './components/ResultsGrid';
import { CreditsPill } from './components/CreditsPill';
import { useStudioGeneration } from './useStudioGeneration';
import { useCredits } from './useCredits';
import { uploadReference } from './uploadReference';
import { saveOutputToBrand } from './saveToBrand';
import { openOutputInEditor } from './openInEditor';
import './image-studio.css';

export interface ImageStudioPageProps {
  brand: Brand;
  project: ImageProject;
  /** Prompt typed on the hub. Pre-fills the composer; it never auto-spends. */
  initialPrompt?: string;
}

const DEFAULT_SETTINGS: Omit<ComposerValue, 'prompt' | 'references'> = {
  aspectRatio: '1:1',
  count: 1,
  quality: undefined,
  model: AUTO_MODEL_ID,
  negativePrompt: '',
  brandContext: new Set(['palette']),
};

export function ImageStudioPage({ brand, project, initialPrompt }: ImageStudioPageProps) {
  const navigate = useNavigate();
  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);

  const capabilities = useImageCapabilities();
  const credits = useCredits(project.workspaceId);

  // Composer state, seeded from whatever this project was last using.
  const [value, setValue] = useState<ComposerValue>(() => {
    const saved = project.lastSettings as Record<string, unknown>;
    const ctx = Array.isArray(saved.brandContext) ? (saved.brandContext as string[]) : ['palette'];
    return {
      ...DEFAULT_SETTINGS,
      // Pre-filled, never auto-submitted: money is only ever spent on a click.
      prompt: initialPrompt ?? '',
      references: [],
      model: (saved.model as string) ?? AUTO_MODEL_ID,
      aspectRatio: (saved.aspectRatio as AspectRatio) ?? '1:1',
      count: (saved.count as number) ?? 1,
      quality: (saved.quality as ComposerValue['quality']) ?? undefined,
      negativePrompt: (saved.negativePrompt as string) ?? '',
      brandContext: new Set(ctx as never[]),
    };
  });
  const patch = useCallback((p: Partial<ComposerValue>) => setValue((v) => ({ ...v, ...p })), []);

  const caps = capsForSelection(capabilities, value.model);

  // Snap a setting the newly-chosen model cannot honour, rather than sending it.
  useEffect(() => {
    if (!capabilities.loaded) return;
    const patches: Partial<ComposerValue> = {};
    if (!caps.supportedAspectRatios.includes(value.aspectRatio)) {
      patches.aspectRatio = caps.supportedAspectRatios[0];
    }
    if (value.count > caps.maxOutputs) patches.count = caps.maxOutputs;
    if (caps.supportedQualities.length === 0 && value.quality) patches.quality = undefined;
    if (Object.keys(patches).length) setValue((v) => ({ ...v, ...patches }));
  }, [capabilities.loaded, caps, value.aspectRatio, value.count, value.quality]);

  const gen = useStudioGeneration({
    brand,
    projectId: project.id,
    workspaceId: project.workspaceId,
    caps,
    settings: {
      model: value.model,
      aspectRatio: value.aspectRatio,
      count: value.count,
      quality: value.quality,
      negativePrompt: value.negativePrompt,
      brandContext: value.brandContext,
      referencePaths: value.references.map((r) => r.path),
    },
    onBalance: credits.applyBalance,
  });

  // ── Server-side estimate, debounced on the settings that change price ──────
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  useEffect(() => {
    if (!capabilities.loaded) return;
    let alive = true;
    setEstimating(true);
    const t = setTimeout(() => {
      estimateGeneration({
        model: value.model === AUTO_MODEL_ID ? undefined : value.model,
        aspectRatio: value.aspectRatio,
        quality: value.quality,
        count: value.count,
        referenceCount: value.references.length,
      })
        .then((res) => { if (alive) { setEstimate(res.credits); setEstimating(false); } })
        .catch(() => { if (alive) { setEstimate(null); setEstimating(false); } });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [capabilities.loaded, value.model, value.aspectRatio, value.quality, value.count, value.references.length]);

  // ── Title (mutable; the id in the URL is not) ──────────────────────────────
  const [title, setTitle] = useState(project.title);
  const [renaming, setRenaming] = useState(false);
  const commitTitle = useCallback(async () => {
    setRenaming(false);
    const next = title.trim() || 'Untitled project';
    setTitle(next);
    if (next === project.title) return;
    try { await renameImageProject(project.id, next); } catch { toast.error('Could not rename the project.'); }
  }, [project.id, project.title, title]);

  // ── Attachments ────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const attach = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const ref = await uploadReference(file);
      setValue((v) => ({ ...v, references: [...v.references, ref] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach that image.');
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Result actions ─────────────────────────────────────────────────────────
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const saveToBrand = useCallback(async (job: GenerationJob, index: number) => {
    const out = job.outputs[index];
    if (!out) return;
    try {
      await saveOutputToBrand({ assets, brand, job, output: out });
      setSaved((s) => new Set(s).add(out.storagePath));
      toast.success('Saved to Brand Assets.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save to Brand Assets.');
    }
  }, [assets, brand]);

  const openInEditor = useCallback(async (job: GenerationJob, index: number) => {
    const out = job.outputs[index];
    if (!out) return;
    try {
      // A signed URL is durable, not eternal — re-sign before it is embedded.
      const fresh = (await resignOutput(out.storagePath)) ?? out.url;
      const designId = await openOutputInEditor({
        designStorage, brand, job, output: { ...out, url: fresh },
      });
      navigate(`/b/${brand.slug}/design/${designId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the editor.');
    }
  }, [brand, designStorage, navigate]);

  const reusePrompt = useCallback((job: GenerationJob) => {
    patch({ prompt: job.userPrompt, aspectRatio: (job.settings.aspectRatio as AspectRatio) ?? value.aspectRatio });
    document.querySelector<HTMLTextAreaElement>('[data-composer-prompt]')?.focus();
  }, [patch, value.aspectRatio]);

  const submit = useCallback(() => { void gen.generate(value.prompt); }, [gen, value.prompt]);

  const balance = credits.account?.balance ?? gen.lastBalance;
  const insufficient = gen.error?.code === 'insufficient_credits';

  const stage = useMemo(() => {
    if (gen.status === 'preparing') return `Preparing your prompt…`;
    if (gen.status === 'generating') {
      return `${value.count > 1 ? `Generating ${value.count} images` : 'Generating'} · ${gen.elapsedSeconds}s`;
    }
    return '';
  }, [gen.status, gen.elapsedSeconds, value.count]);

  return (
    <div className="is-page" data-image-studio data-project={project.id}>
      <header className="is-header">
        <div className="is-header-left">
          <button
            type="button"
            className="is-icon-btn"
            onClick={() => navigate(`/b/${brand.slug}/design`)}
            aria-label="Back to Design"
          >
            <ArrowLeft size={15} strokeWidth={1.8} aria-hidden />
          </button>
          {renaming ? (
            <input
              className="is-title-input"
              value={title}
              data-project-title-input
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitTitle();
                if (e.key === 'Escape') { setTitle(project.title); setRenaming(false); }
              }}
              aria-label="Project title"
            />
          ) : (
            <button
              type="button"
              className="is-title"
              data-project-title
              onClick={() => setRenaming(true)}
              title="Rename this project"
            >
              {title}
              <PenLine size={12} strokeWidth={1.8} aria-hidden />
            </button>
          )}
        </div>
        <CreditsPill
          balance={balance}
          reserved={credits.account?.reserved}
          loading={credits.loading}
          onClick={() => void credits.refresh()}
        />
      </header>

      {insufficient ? (
        <DsBanner tone="warning">
          {gen.error?.hint ?? 'Not enough credits for this generation.'} Reduce the number of
          images, pick a free model, or top up to continue.
        </DsBanner>
      ) : null}

      {gen.warnings.length > 0 ? (
        <div className="is-warning" role="status" data-studio-warnings>
          <div>
            {gen.warnings.map((w) => <p key={w}>{w}</p>)}
          </div>
          <DsButton tone="tertiary" size="sm" onClick={gen.dismissWarnings}>Dismiss</DsButton>
        </div>
      ) : null}

      {gen.error && !insufficient ? (
        <div className="is-error" role="alert" data-studio-error>
          <div>
            <strong>{gen.error.message}</strong>
            {gen.error.hint ? <p>{gen.error.hint}</p> : null}
          </div>
          <div className="is-error-actions">
            {gen.error.canRetry ? (
              <DsButton tone="secondary" size="sm" data-studio-retry onClick={() => void gen.retry()}>
                Try again
              </DsButton>
            ) : null}
            <DsButton tone="tertiary" size="sm" onClick={gen.clearError}>Dismiss</DsButton>
          </div>
        </div>
      ) : null}

      <PromptComposer
        brand={brand}
        value={value}
        onChange={patch}
        caps={caps}
        capabilities={capabilities}
        busy={gen.busy}
        estimate={estimate}
        estimating={estimating}
        balance={balance}
        onSubmit={submit}
        onAttach={attach}
        uploading={uploading}
        autoFocus
      />

      {gen.busy ? (
        <div className="is-progress" role="status" aria-live="polite" data-studio-progress>
          <LoadingPill label={stage} size={18} />
          {caps.supportsCancellation ? (
            <DsButton tone="tertiary" size="sm" data-studio-cancel onClick={() => void gen.cancel()}>
              Cancel
            </DsButton>
          ) : null}
        </div>
      ) : null}

      <ResultsGrid
        jobs={gen.jobs}
        loading={gen.historyLoading}
        busy={gen.busy}
        onVariations={(job, i) => void gen.variations(job, i)}
        onRefine={(job, i, text) => void gen.refine(job, i, text)}
        onRegenerate={(job) => void gen.regenerate(job)}
        onReusePrompt={reusePrompt}
        onSaveToBrand={saveToBrand}
        onOpenInEditor={(job, i) => void openInEditor(job, i)}
        onRetry={() => void gen.retry()}
        savedKeys={saved}
      />

      {credits.history.length > 0 ? (
        <details className="is-usage" data-usage-history>
          <summary>Usage</summary>
          <ul>
            {credits.history
              .filter((e) => e.kind === 'settle' || e.kind === 'grant')
              .slice(0, 10)
              .map((e) => (
                <li key={e.id}>
                  <span>{new Date(e.createdAt).toLocaleString()}</span>
                  <span>{e.reason ?? e.kind}</span>
                  <span className={e.amount < 0 ? 'is-usage-spend' : 'is-usage-grant'}>
                    {e.amount > 0 ? '+' : ''}{e.amount}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      ) : null}

      {saved.size > 0 ? (
        <p className="is-saved-note" data-saved-note>
          <Check size={13} strokeWidth={2} aria-hidden /> {saved.size} saved to Brand Assets
        </p>
      ) : null}
    </div>
  );
}

export default ImageStudioPage;
