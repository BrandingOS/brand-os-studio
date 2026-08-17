// useStudioGeneration — generation state for one image project.
//
// The project's history lives in the database, so this hook loads it, adds to
// it, and never pretends to be the source of truth. A refresh mid-generation
// loses the spinner, not the work: the job row and its outputs are already
// server-side when the request returns, and reload picks them up.
//
// Cost, credit checks and durable storage are the server's. This hook carries
// intent up and results back, keeps one request in flight at a time, and reuses
// the idempotency key on retry so a repeat can never be charged twice.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import {
  runGeneration,
  cancelGeneration,
  newIdempotencyKey,
  listProjectJobs,
  updateProjectSettings,
  ImageGenerationError,
  type AspectRatio,
  type GenerationJob,
  type ImageModelCaps,
  type ImageReferenceInput,
  type JobOperation,
} from '@/features/image-generation';
import { compileImagePrompt } from '@/features/editor/ai/imagePrompt/compileImagePrompt';
import { buildBrandReferences } from '@/features/editor/ai/imagePrompt/brandReferences';
import type { BrandContextKey } from './useBrandAssetPicker';

export type StudioStatus = 'idle' | 'preparing' | 'generating' | 'error';

export interface StudioSettings {
  model: string;
  aspectRatio: AspectRatio;
  count: number;
  quality?: 'low' | 'medium' | 'high';
  negativePrompt: string;
  brandContext: Set<BrandContextKey>;
  /** Storage paths of user-attached references, in the user's order. */
  referencePaths: string[];
}

export interface StudioError {
  code: string | null;
  message: string;
  hint: string | null;
  canRetry: boolean;
  requiredCredits?: number;
  balance?: number;
}

interface PendingRun {
  operation: JobOperation;
  userPrompt: string;
  parentJobId?: string;
  previousPath?: string;
  count: number;
  idempotencyKey: string;
}

export interface UseStudioGeneration {
  status: StudioStatus;
  busy: boolean;
  error: StudioError | null;
  jobs: GenerationJob[];
  historyLoading: boolean;
  /** Credits reported by the last completed job. */
  lastBalance: number | null;
  elapsedSeconds: number;
  generate: (prompt: string) => Promise<void>;
  retry: () => Promise<void>;
  cancel: () => Promise<void>;
  variations: (job: GenerationJob, outputIndex: number) => Promise<void>;
  refine: (job: GenerationJob, outputIndex: number, instruction: string) => Promise<void>;
  regenerate: (job: GenerationJob) => Promise<void>;
  clearError: () => void;
  reloadHistory: () => Promise<void>;
}

export interface UseStudioGenerationArgs {
  brand: Brand | null | undefined;
  projectId: string | null;
  workspaceId?: string | null;
  settings: StudioSettings;
  caps: ImageModelCaps;
  onBalance?: (balance: number) => void;
  deps?: {
    compile?: typeof compileImagePrompt;
    buildRefs?: typeof buildBrandReferences;
    run?: typeof runGeneration;
    listJobs?: typeof listProjectJobs;
  };
}

export function useStudioGeneration(args: UseStudioGenerationArgs): UseStudioGeneration {
  const { brand, projectId, settings, caps, onBalance, deps } = args;

  const depsRef = useRef(deps);
  depsRef.current = deps;
  const compileFn: typeof compileImagePrompt = useCallback(
    (...a) => (depsRef.current?.compile ?? compileImagePrompt)(...a), []);
  const buildRefsFn: typeof buildBrandReferences = useCallback(
    (...a) => (depsRef.current?.buildRefs ?? buildBrandReferences)(...a), []);
  const runFn: typeof runGeneration = useCallback(
    (...a) => (depsRef.current?.run ?? runGeneration)(...a), []);
  const listJobsFn: typeof listProjectJobs = useCallback(
    (...a) => (depsRef.current?.listJobs ?? listProjectJobs)(...a), []);

  const [status, setStatus] = useState<StudioStatus>('idle');
  const [error, setError] = useState<StudioError | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastBalance, setLastBalance] = useState<number | null>(null);
  const [elapsedSeconds, setElapsed] = useState(0);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const capsRef = useRef(caps);
  capsRef.current = caps;
  const pendingRef = useRef<PendingRun | null>(null);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; abortRef.current?.abort(); }, []);

  // ── History ────────────────────────────────────────────────────────────────
  const reloadHistory = useCallback(async () => {
    if (!projectId) { setJobs([]); return; }
    setHistoryLoading(true);
    try {
      const rows = await listJobsFn(projectId);
      if (mountedRef.current) setJobs(rows);
    } catch {
      if (mountedRef.current) setJobs([]);
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  }, [listJobsFn, projectId]);

  useEffect(() => { void reloadHistory(); }, [reloadHistory]);

  // Elapsed timer — the only honest progress signal a vendor gives us.
  useEffect(() => {
    if (status !== 'generating' && status !== 'preparing') { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const fail = useCallback((err: unknown) => {
    if (!mountedRef.current) return;
    if (err instanceof ImageGenerationError) {
      setError({
        code: err.code,
        message: err.message,
        hint:
          err.code === 'insufficient_credits'
            ? `This needs ${err.requiredCredits ?? '?'} credits; you have ${err.balance ?? 0}.`
            : err.code === 'safety_rejection'
              ? 'Rewording the subject usually resolves it.'
              : err.code === 'unsupported_setting'
                ? 'Adjust the settings and try again.'
                : null,
        canRetry: err.retryable,
        requiredCredits: err.requiredCredits,
        balance: err.balance,
      });
    } else {
      setError({
        code: null,
        message: err instanceof Error ? err.message : String(err),
        hint: null,
        canRetry: true,
      });
    }
    setStatus('error');
    inFlightRef.current = false;
  }, []);

  // ── The one path that spends money ─────────────────────────────────────────
  const execute = useCallback(async (plan: PendingRun) => {
    if (!brand?.id) { fail(new Error('Open a brand to generate images.')); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    pendingRef.current = plan;
    if (mountedRef.current) { setError(null); setStatus('preparing'); }

    const s = settingsRef.current;
    const c = capsRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Brand-aware compile. Invisible: the user asked for an image, not a
      // prompt-editing session. Both prompts are stored on the job.
      const wantsBrand = s.brandContext.size > 0;
      const compiled = await compileFn(
        {
          userPrompt: plan.userPrompt,
          brand,
          formatLabel: s.aspectRatio,
          modelCaps: c,
        },
        { deterministicOnly: !wantsBrand },
      );

      // Only what the user explicitly selected is attached.
      const refs = await buildRefsFn({
        brand,
        caps: c,
        plan: {
          logo: s.brandContext.has('logo'),
          palette: s.brandContext.has('palette'),
          previousPath: plan.previousPath,
        },
        paletteHexes: s.brandContext.has('palette') ? compiled.paletteHexes : [],
        userReferencePaths: s.referencePaths,
      });
      const references: ImageReferenceInput[] = refs.references;

      if (mountedRef.current) setStatus('generating');

      const result = await runFn({
        brandId: brand.id,
        projectId: projectId ?? undefined,
        operation: plan.operation,
        userPrompt: plan.userPrompt,
        compiledPrompt: wantsBrand ? compiled.prompt : plan.userPrompt,
        negativePrompt: s.negativePrompt.trim() || undefined,
        model: s.model === 'auto' ? undefined : s.model,
        aspectRatio: s.aspectRatio,
        quality: s.quality,
        count: plan.count,
        references,
        idempotencyKey: plan.idempotencyKey,
      }, { signal: controller.signal });

      jobIdRef.current = result.job.id;
      if (!mountedRef.current) return;

      if (result.job.status !== 'succeeded') {
        throw new ImageGenerationError({
          code: (result.job.errorCode ?? 'unknown') as never,
          message: result.job.errorMessage ?? 'Generation did not complete.',
          jobId: result.job.id,
        });
      }

      // Newest first; a duplicate id (idempotent replay) replaces rather than duplicates.
      setJobs((prev) => [result.job, ...prev.filter((j) => j.id !== result.job.id)]);
      setLastBalance(result.credits.balance);
      onBalance?.(result.credits.balance);
      setStatus('idle');
      pendingRef.current = null;

      // Remember the composer state so the project reopens as it was left.
      if (projectId) {
        void updateProjectSettings(
          projectId,
          {
            model: s.model, aspectRatio: s.aspectRatio, count: s.count,
            quality: s.quality ?? null, negativePrompt: s.negativePrompt,
            brandContext: [...s.brandContext],
          },
          result.job.outputs[0]?.url ?? undefined,
        ).catch(() => { /* cosmetic */ });
      }
    } catch (err) {
      fail(err);
    } finally {
      inFlightRef.current = false;
      abortRef.current = null;
    }
  }, [brand, buildRefsFn, compileFn, fail, onBalance, projectId, runFn]);

  const generate = useCallback(async (prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    await execute({
      operation: 'generate',
      userPrompt: text,
      count: settingsRef.current.count,
      idempotencyKey: newIdempotencyKey(),
    });
  }, [execute]);

  /** Same request, same key — a run that actually landed is returned, not repaid. */
  const retry = useCallback(async () => {
    const plan = pendingRef.current;
    if (!plan) return;
    await execute(plan);
  }, [execute]);

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const jobId = jobIdRef.current;
    inFlightRef.current = false;
    if (mountedRef.current) setStatus('idle');
    if (jobId) {
      try {
        const res = await cancelGeneration(jobId);
        if (mountedRef.current) { setLastBalance(res.credits.balance); onBalance?.(res.credits.balance); }
      } catch { /* already settled */ }
      jobIdRef.current = null;
    }
  }, [onBalance]);

  const variations = useCallback(async (job: GenerationJob, outputIndex: number) => {
    const source = job.outputs[outputIndex];
    await execute({
      operation: 'variation',
      userPrompt: job.userPrompt,
      parentJobId: job.id,
      previousPath: source?.storagePath,
      count: Math.min(4, capsRef.current.maxOutputs),
      idempotencyKey: newIdempotencyKey(),
    });
  }, [execute]);

  const refine = useCallback(async (job: GenerationJob, outputIndex: number, instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    const source = job.outputs[outputIndex];
    await execute({
      operation: 'refine',
      userPrompt: text,
      parentJobId: job.id,
      previousPath: source?.storagePath,
      count: 1,
      idempotencyKey: newIdempotencyKey(),
    });
  }, [execute]);

  const regenerate = useCallback(async (job: GenerationJob) => {
    await execute({
      operation: 'regenerate',
      userPrompt: job.userPrompt,
      parentJobId: job.id,
      count: job.settings.count ?? 1,
      idempotencyKey: newIdempotencyKey(),
    });
  }, [execute]);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((s) => (s === 'error' ? 'idle' : s));
  }, []);

  return useMemo(() => ({
    status,
    busy: status === 'preparing' || status === 'generating',
    error, jobs, historyLoading, lastBalance, elapsedSeconds,
    generate, retry, cancel, variations, refine, regenerate, clearError, reloadHistory,
  }), [status, error, jobs, historyLoading, lastBalance, elapsedSeconds,
       generate, retry, cancel, variations, refine, regenerate, clearError, reloadHistory]);
}
