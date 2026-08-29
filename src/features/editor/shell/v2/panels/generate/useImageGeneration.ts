// useImageGeneration — the editor Generate panel's image state machine.
//
//   idle ──start(text)──▶ compiling ──▶ generating ──▶ [critiquing] ──▶ idle
//   any  ──error──▶ error        any ──cancel()──▶ idle
//
// The compile step is invisible: the panel shows one processing state and the
// compiled prompt is recorded on the job, not put in front of the user.
//
// What this owns: the brand-aware compile, reference building, the batch plan,
// insertion of results as pages in a single undo step, the doc's `metadata.ai`
// record, and the post-delivery critique. What it deliberately does NOT own:
// cost, credit checks, durable storage, provider retries — those are the
// server's. Asking twice can never charge twice because every submit carries a
// stable idempotency key that is reused on retry.
//
// ONE JOB PER CANDIDATE, and why
// ──────────────────────────────
// A batch used to be one job with `count: N`, which meant one prompt — and
// every production model Auto can route to declares `supportsSeed: false`, so
// the seed never varied either. Four candidates were four samples of one
// conditioning. They are now four PLANNED explorations (see variants.ts), which
// means four prompts, which the deployed server can only accept as four jobs.
//
// That costs a little more, because credits round up per job: four Nano Banana
// Pro images are 54 credits as one job and 56 as four. The pre-flight estimate
// prices the real jobs, so the number on the button stays the number charged.
// A server that accepted `prompts: string[]` would remove the difference; that
// change is written but not deployed, because this Supabase project also serves
// production.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Page, ImageLayer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import {
  generateImage,
  newIdempotencyKey,
  ImageGenerationError,
  type GenerateImageResult,
} from '@/features/editor/ai/generateImage';
import { cancelGeneration, type AspectRatio, type ImageModelCaps } from '@/features/image-generation';
import { AUTO_MODEL_ID, modelLabel } from '@/features/editor/ai/imageModels';
import { compileImagePrompt, type CompiledPrompt } from '@/features/editor/ai/imagePrompt/compileImagePrompt';
import {
  ALL_BRAND_INCLUDED,
  type BrandInclusions,
  type CopyDeck,
  type DeliverableKind,
} from '@/features/editor/ai/imagePrompt/artDirection';
import { buildBrandReferences, type UserReference } from '@/features/editor/ai/imagePrompt/brandReferences';
import { critiqueBatch, noCritique, type CritiqueResult } from '@/features/editor/ai/imagePrompt/critique';
import { findFormat, formatLabel, ratioForSize } from './formats';
import { appendGenerations, generationForPage, type GenerationRecord } from './aiMetadata';
import { recordDuration } from './genTiming';

export type GenStatus = 'idle' | 'compiling' | 'generating' | 'critiquing' | 'error';

export interface GenerationSettings {
  model: string;
  count: number;
  formatId: string;
  negativePrompt: string;
  /** Which parts of the brand may enter the frame. */
  include: BrandInclusions;
  caps: ImageModelCaps;
  /** User-attached references, in send order, each with its purpose. */
  references?: UserReference[];
  /** Exact words the user wants set. Never invented on their behalf. */
  copy?: CopyDeck;
  /** Finished design vs plain image. Undefined → inferred from the request. */
  kind?: DeliverableKind;
}

interface Pending {
  kind: GenerationRecord['kind'];
  original: string;
  parentPageId?: string;
  previousPath?: string;
  previousDataUrl?: string;
  count?: number;
  /** Stable across retries of the same logical request. */
  idempotencyKey: string;
}

export interface UseImageGenerationArgs {
  adapter: EditorAdapter;
  activePageId: string;
  brand?: Brand;
  settings: GenerationSettings;
  onActivePageChange?: (pageId: string) => void;
  deps?: {
    compile?: typeof compileImagePrompt;
    buildRefs?: typeof buildBrandReferences;
    generate?: typeof generateImage;
    critique?: typeof critiqueBatch;
    now?: () => string;
    uuid?: () => string;
  };
}

export interface UseImageGeneration {
  status: GenStatus;
  busy: boolean;
  error: string | null;
  errorHint: string | null;
  errorCode: string | null;
  /** True when the same request can simply be sent again. */
  canRetry: boolean;
  compiled: CompiledPrompt | null;
  pendingKind: GenerationRecord['kind'] | null;
  /** How many images this run is waiting on — drives the pending slots. */
  pendingCount: number;
  /** epoch ms the current run began, or null. Counts the compile too. */
  startedAt: number | null;
  lastResult: {
    pageIds: string[]; model?: string; warnings?: string[];
    charged: number; balance: number;
    /** How many images were ASKED for — `pageIds` is what arrived. */
    requested: number;
  } | null;
  /** Scores for the last batch, keyed by page id. Empty when unavailable. */
  critique: Record<string, { overall: number; note: string; hardFailures: string[] }>;
  start: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  cancel: () => Promise<void>;
  variations: (pageId: string) => Promise<void>;
  refine: (pageId: string, instruction: string) => Promise<void>;
  regenerate: (pageId: string) => Promise<void>;
  clearError: () => void;
}

function firstImageLayer(page: Page | undefined): ImageLayer | undefined {
  return page?.layers.find((l) => l.kind === 'image') as ImageLayer | undefined;
}

export function useImageGeneration(args: UseImageGenerationArgs): UseImageGeneration {
  const { adapter, activePageId, brand, settings, onActivePageChange, deps } = args;

  const depsRef = useRef(deps);
  depsRef.current = deps;
  const compileFn: typeof compileImagePrompt = useCallback(
    (...a) => (depsRef.current?.compile ?? compileImagePrompt)(...a), []);
  const buildRefsFn: typeof buildBrandReferences = useCallback(
    (...a) => (depsRef.current?.buildRefs ?? buildBrandReferences)(...a), []);
  const generateFn: typeof generateImage = useCallback(
    (...a) => (depsRef.current?.generate ?? generateImage)(...a), []);
  const critiqueFn: typeof critiqueBatch = useCallback(
    (...a) => (depsRef.current?.critique ?? critiqueBatch)(...a), []);
  const now = useCallback(() => (depsRef.current?.now ?? (() => new Date().toISOString()))(), []);
  const uuid = useCallback(() => (depsRef.current?.uuid ?? (() => crypto.randomUUID()))(), []);

  const [status, setStatus] = useState<GenStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [compiled, setCompiled] = useState<CompiledPrompt | null>(null);
  const [lastResult, setLastResult] = useState<UseImageGeneration['lastResult']>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [critique, setCritique] = useState<UseImageGeneration['critique']>({});

  const pendingRef = useRef<Pending | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // Guarded IN THE HOOK, not just by a disabled button: a hero auto-start and a
  // manual submit could otherwise race into two concurrent paid runs.
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const jobIdsRef = useRef<string[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; abortRef.current?.abort(); }, []);

  const fail = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    let hint: string | null = null;
    let code: string | null = null;
    let retryable = true;

    if (err instanceof ImageGenerationError) {
      code = err.code;
      retryable = err.retryable;
      if (err.code === 'insufficient_credits') {
        hint = err.requiredCredits != null
          ? `This needs ${err.requiredCredits} credits; you have ${err.balance ?? 0}.`
          : null;
      } else if (err.code === 'unsupported_setting' || err.code === 'invalid_input') {
        hint = 'Adjust the settings and try again.';
      } else if (err.code === 'safety_rejection') {
        hint = 'Rewording the subject usually resolves it.';
      } else if (err.code === 'rate_limited') {
        hint = 'Too many requests at once — wait a moment and try again.';
      } else if (err.code === 'timeout' || err.code === 'provider_unavailable') {
        hint = 'The image service did not answer. Nothing was charged.';
      }
    }
    if (!mountedRef.current) return;
    setError(message);
    setErrorHint(hint);
    setErrorCode(code);
    setCanRetry(retryable);
    setStatus('error');
    setPendingCount(0);
    setStartedAt(null);
  }, []);

  /** Resolve the target shape from the active page + the chosen format. */
  const resolveTarget = useCallback((): { aspectRatio: AspectRatio; label: string } => {
    const doc = adapter.getDocument();
    const page = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
    const format = findFormat(settingsRef.current.formatId);
    const allowed = settingsRef.current.caps.supportedAspectRatios;
    const aspectRatio = format.ratio === 'auto'
      ? ratioForSize(page?.width ?? 1024, page?.height ?? 1024, allowed)
      : (format.ratio as AspectRatio);
    return { aspectRatio, label: formatLabel(format, aspectRatio) };
  }, [adapter, activePageId]);

  /** Build refs → one job per candidate → insert in ONE undo step → record. */
  const run = useCallback(async (
    prompts: string[],
    negativePrompt: string | undefined,
    plan: Pending,
    logo: boolean,
    palette: boolean,
    paletteHexes: string[],
    compiledMeta: CompiledPrompt | null,
  ) => {
    if (!brand?.id) { fail(new Error('Open a brand to generate images.')); return; }
    const s = settingsRef.current;
    const format = findFormat(s.formatId);
    const { aspectRatio } = resolveTarget();
    const count = Math.max(1, Math.min(s.caps.maxOutputs, prompts.length));
    const briefs = prompts.slice(0, count);
    const began = Date.now();

    if (mountedRef.current) { setStatus('generating'); setPendingCount(count); }
    const controller = new AbortController();
    abortRef.current = controller;
    jobIdsRef.current = [];

    try {
      const refs = await buildRefsFn({
        brand,
        caps: s.caps,
        plan: { logo, palette, previousPath: plan.previousPath, previousDataUrl: plan.previousDataUrl },
        paletteHexes,
        userReferences: s.references,
      });

      // One job per candidate, concurrently. A candidate that fails loses only
      // itself — the old single-job batch lost all four.
      const settled = await Promise.allSettled(briefs.map((brief, i) => generateFn({
        brandId: brand.id,
        designId: adapter.getDocument().id,
        operation: plan.kind,
        userPrompt: plan.original,
        compiledPrompt: `${brief}${format.promptSuffix}`,
        negativePrompt,
        model: s.model === AUTO_MODEL_ID ? undefined : s.model,
        aspectRatio,
        count: 1,
        references: refs.references,
        // Per candidate, so a retry of the batch re-uses each one exactly.
        idempotencyKey: `${plan.idempotencyKey}#${i}`,
      }, { signal: controller.signal })));

      const ok = settled
        .map((r, i) => ({ r, i }))
        .filter((x): x is { r: PromiseFulfilledResult<GenerateImageResult>; i: number } =>
          x.r.status === 'fulfilled');

      if (!ok.length) {
        // Every candidate failed — surface the first real reason, not a summary.
        const first = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        throw first?.reason ?? new Error('No images were returned.');
      }
      if (!mountedRef.current) return;

      jobIdsRef.current = ok.map((x) => x.r.value.jobId).filter(Boolean) as string[];

      // One page per output, inserted right after the active page.
      const docNow = adapter.getDocument();
      const activeIdx = docNow.pages.findIndex((p) => p.id === activePageId);
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : docNow.pages.length;
      const batchId = uuid();
      const pages: Page[] = [];
      const records: GenerationRecord[] = [];
      let charged = 0;
      let balance = 0;
      const warnings: string[] = [];
      let model: string | undefined;

      ok.forEach(({ r, i }) => {
        const result = r.value;
        charged += result.chargedCredits ?? 0;
        balance = result.balance ?? balance;
        model = model ?? result.model;
        for (const w of result.warnings ?? []) if (!warnings.includes(w)) warnings.push(w);

        result.images.forEach((img) => {
          const w = img.width ?? 1024;
          const h = img.height ?? 1024;
          const pageId = uuid();
          pages.push({
            id: pageId,
            name: `${plan.original.slice(0, 28) || 'AI image'}${count > 1 ? ` ${i + 1}` : ''}`,
            width: w, height: h, background: '#ffffff', masterPageId: null,
            layers: [{
              id: uuid(), kind: 'image', name: 'AI image', src: img.url, fit: 'cover',
              transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: true, locked: false, brandLocked: false,
            } as ImageLayer],
          });
          records.push({
            id: uuid(), pageId, batchId,
            original: plan.original, compiled: briefs[i], negativePrompt,
            model: result.model, count, seed: img.seed,
            refs: refs.roles, kind: plan.kind, parentPageId: plan.parentPageId,
            createdAt: now(), width: w, height: h, formatId: format.id,
            jobId: result.jobId, storagePath: img.storagePath,
          });
        });
      });

      const nextPages = [...docNow.pages.slice(0, insertAt), ...pages, ...docNow.pages.slice(insertAt)];
      const nextDoc: BrandOSDocument = appendGenerations({ ...docNow, pages: nextPages }, records);

      // replaceDocument is async inside a synchronous batch (history requires
      // that shape). Catch its rejection explicitly — reporting success for a
      // document that never changed is worse than reporting the failure.
      let replaceFailed: unknown = null;
      adapter.batch(`AI: ${plan.kind} ×${pages.length}`, () => {
        void adapter.replaceDocument(nextDoc).catch((e) => { replaceFailed = e; });
      });
      await Promise.resolve();
      if (replaceFailed) throw replaceFailed;

      onActivePageChange?.(pages[0].id);

      // Only a delivered run is a timing sample. A failure or a cancel would
      // teach the estimate to lie.
      recordDuration(model ?? s.model, count, Date.now() - began);

      if (mountedRef.current) {
        setLastResult({
          pageIds: pages.map((p) => p.id),
          requested: count,
          model,
          warnings,
          charged,
          balance,
        });
        setPendingCount(0);
        setStatus('idle');
        setStartedAt(null);
      }
      pendingRef.current = null;

      // The critique runs AFTER the pages are on the canvas, never before.
      // Nothing about it may delay delivery, and it cannot fail the run.
      void (async () => {
        if (!pages.length) return;
        if (mountedRef.current) setStatus('critiquing');
        const images = pages.map((p) => {
          const layer = firstImageLayer(p);
          return typeof layer?.src === 'string' ? layer.src : '';
        }).filter(Boolean);
        let result: CritiqueResult;
        try {
          result = images.length
            ? await critiqueFn({
              images,
              userPrompt: plan.original,
              copy: s.copy,
              kind: compiledMeta?.kind ?? 'design',
              deliverable: compiledMeta?.deliverable ?? 'design',
              logoExpected: logo,
              paletteHexes,
            })
            : noCritique(0);
        } catch {
          result = noCritique(images.length);
        }
        if (!mountedRef.current) return;
        setStatus((cur) => (cur === 'critiquing' ? 'idle' : cur));
        if (result.unavailable) return;
        const byPage: UseImageGeneration['critique'] = {};
        result.candidates.forEach((c) => {
          const page = pages[c.index];
          if (page) byPage[page.id] = { overall: c.overall, note: c.note, hardFailures: c.hardFailures };
        });
        setCritique((prev) => ({ ...prev, ...byPage }));
      })();
    } catch (err) {
      fail(err);
    } finally {
      inFlightRef.current = false;
      abortRef.current = null;
    }
  }, [adapter, activePageId, brand, buildRefsFn, critiqueFn, fail, generateFn, now, onActivePageChange, resolveTarget, uuid]);

  const compileAndRun = useCallback(async (
    plan: Pending,
    refineOf?: { previousPrompt: string },
  ) => {
    if (inFlightRef.current) return;      // hook-level double-submit guard
    inFlightRef.current = true;
    pendingRef.current = plan;
    const s = settingsRef.current;
    const wanted = Math.max(1, Math.min(s.caps.maxOutputs, plan.count ?? s.count));
    if (mountedRef.current) {
      setError(null); setErrorHint(null); setErrorCode(null);
      setStatus('compiling');
      setPendingCount(wanted);
      setStartedAt(Date.now());
    }

    const include = s.include ?? ALL_BRAND_INCLUDED;
    try {
      const { label } = resolveTarget();
      const out = await compileFn({
        userPrompt: plan.original,
        brand,
        formatLabel: label,
        modelCaps: s.caps,
        refineOf,
        // A piece with no text cannot carry a copy deck.
        copy: include.text ? s.copy : undefined,
        kind: s.kind,
        include,
        count: wanted,
        userReferences: {
          style: (s.references ?? []).filter((r) => r.use === 'style').length,
          subject: (s.references ?? []).filter((r) => r.use === 'subject').length,
        },
      });
      if (mountedRef.current) setCompiled(out);

      // Defence in depth. The compiler was told about the exclusions and the
      // brief drops the sections — but a reference IMAGE is the one instruction
      // a model cannot politely ignore, so the hook refuses to build one too.
      await run(
        out.prompts.length ? out.prompts : [out.prompt],
        out.negativePrompt ?? (s.negativePrompt || undefined),
        plan,
        include.logo && out.useLogo,
        include.colours && out.paletteHexes.length > 0,
        include.colours ? out.paletteHexes : [],
        out,
      );
    } catch (err) {
      inFlightRef.current = false;
      fail(err);
    }
  }, [brand, compileFn, fail, resolveTarget, run]);

  const start = useCallback(async (text: string) => {
    const original = text.trim();
    if (!original) return;
    await compileAndRun({ kind: 'generate', original, idempotencyKey: newIdempotencyKey() });
  }, [compileAndRun]);

  /** Re-send the SAME request. The idempotency key is reused, so a run that
   *  did succeed server-side returns that job instead of being paid for twice. */
  const retry = useCallback(async () => {
    const plan = pendingRef.current;
    if (!plan || inFlightRef.current) return;
    if (mountedRef.current) { setError(null); setErrorCode(null); }
    await compileAndRun(plan);
  }, [compileAndRun]);

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const ids = jobIdsRef.current;
    inFlightRef.current = false;
    if (mountedRef.current) {
      setStatus('idle');
      setPendingCount(0);
      setStartedAt(null);
    }
    // Best effort: releases each reservation so a cancel costs nothing.
    await Promise.allSettled(ids.map((id) => cancelGeneration(id)));
    jobIdsRef.current = [];
  }, []);

  const previousOf = useCallback((pageId: string) => {
    const doc = adapter.getDocument();
    const page = doc.pages.find((p) => p.id === pageId);
    const rec = generationForPage(doc, pageId);
    const layer = firstImageLayer(page);
    const src = typeof layer?.src === 'string' ? layer.src : undefined;
    return {
      rec,
      previousPath: rec?.storagePath,
      previousDataUrl: src?.startsWith('data:') ? src : undefined,
      name: page?.name,
    };
  }, [adapter]);

  /**
   * Variations re-COMPILE rather than resending the recorded brief.
   *
   * Resending it verbatim reproduced the batch's diversity problem exactly: the
   * recorded prompt already carries one variant's reading, so four "variations"
   * were four samples of that one reading. A compile costs a fraction of a cent
   * against four paid images.
   */
  const variations = useCallback(async (pageId: string) => {
    const { rec, previousPath, previousDataUrl, name } = previousOf(pageId);
    const original = rec?.original ?? name ?? '';
    if (!original) return;
    await compileAndRun({
      kind: 'variation', original, parentPageId: pageId,
      previousPath, previousDataUrl, count: 4, idempotencyKey: newIdempotencyKey(),
    });
  }, [compileAndRun, previousOf]);

  const regenerate = useCallback(async (pageId: string) => {
    const { rec, name } = previousOf(pageId);
    const original = rec?.original ?? name ?? '';
    if (!original) return;
    await compileAndRun({
      kind: 'regenerate', original, parentPageId: pageId,
      count: 1, idempotencyKey: newIdempotencyKey(),
    });
  }, [compileAndRun, previousOf]);

  const refine = useCallback(async (pageId: string, instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    const { rec, previousPath, previousDataUrl, name } = previousOf(pageId);
    await compileAndRun(
      {
        kind: 'refine', original: text, parentPageId: pageId,
        previousPath, previousDataUrl, count: 1, idempotencyKey: newIdempotencyKey(),
      },
      { previousPrompt: rec?.compiled ?? rec?.original ?? name ?? '' },
    );
  }, [compileAndRun, previousOf]);

  const clearError = useCallback(() => {
    setError(null); setErrorHint(null); setErrorCode(null);
    setStatus((s) => (s === 'error' ? 'idle' : s));
  }, []);

  const pendingKind = pendingRef.current?.kind ?? null;

  return useMemo(() => ({
    status,
    busy: status === 'compiling' || status === 'generating',
    error, errorHint, errorCode, canRetry, compiled,
    pendingKind, pendingCount, startedAt, critique,
    lastResult,
    start, retry, cancel, variations, refine, regenerate, clearError,
  }), [status, error, errorHint, errorCode, canRetry, compiled, pendingKind, pendingCount,
       startedAt, critique, lastResult,
       start, retry, cancel, variations, refine, regenerate, clearError]);
}

export { modelLabel };
