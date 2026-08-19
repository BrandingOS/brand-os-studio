// useImageGeneration — the editor Generate panel's image state machine.
//
//   idle ──start(text)──▶ compiling ──▶ generating ──▶ idle
//   any  ──error──▶ error        any ──cancel()──▶ idle
//
// The compile step is invisible: the panel shows one processing state and the
// compiled prompt is recorded on the job, not put in front of the user.
//
// What this owns: the brand-aware compile, reference building, one server call
// per submit, insertion of results as pages in a single undo step, and the
// doc's `metadata.ai` record. What it deliberately does NOT own: cost, credit
// checks, durable storage, provider retries — those are the server's. Asking
// twice can never charge twice because every submit carries a stable
// idempotency key that is reused on retry.

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
import { hasCopy, textSection, type CopyDeck, type DeliverableKind } from '@/features/editor/ai/imagePrompt/artDirection';
import { buildBrandReferences } from '@/features/editor/ai/imagePrompt/brandReferences';
import { findFormat, formatLabel, ratioForSize } from './formats';
import { appendGenerations, generationForPage, type GenerationRecord } from './aiMetadata';

export type GenStatus = 'idle' | 'compiling' | 'generating' | 'error';

export interface GenerationSettings {
  model: string;
  count: number;
  formatId: string;
  negativePrompt: string;
  brandAware: boolean;
  caps: ImageModelCaps;
  /** Storage paths of user-attached references. */
  referencePaths?: string[];
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
  lastResult: {
    pageIds: string[]; model?: string; warnings?: string[];
    charged: number; balance: number;
    /** How many images were ASKED for — `pageIds` is what arrived. */
    requested: number;
  } | null;
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
  const now = useCallback(() => (depsRef.current?.now ?? (() => new Date().toISOString()))(), []);
  const uuid = useCallback(() => (depsRef.current?.uuid ?? (() => crypto.randomUUID()))(), []);

  const [status, setStatus] = useState<GenStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [compiled, setCompiled] = useState<CompiledPrompt | null>(null);
  const [lastResult, setLastResult] = useState<UseImageGeneration['lastResult']>(null);

  const pendingRef = useRef<Pending | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // Guarded IN THE HOOK, not just by a disabled button: a hero auto-start and a
  // manual submit could otherwise race into two concurrent paid runs.
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const jobIdRef = useRef<string | null>(null);
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
      }
    }
    if (!mountedRef.current) return;
    setError(message);
    setErrorHint(hint);
    setErrorCode(code);
    setCanRetry(retryable);
    setStatus('error');
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

  /** Build refs → call the server → insert pages in ONE undo step → record. */
  const run = useCallback(async (
    prompt: string,
    negativePrompt: string | undefined,
    plan: Pending,
    logo: boolean,
    palette: boolean,
    paletteHexes: string[],
  ) => {
    if (!brand?.id) { fail(new Error('Open a brand to generate images.')); return; }
    const s = settingsRef.current;
    const format = findFormat(s.formatId);
    const { aspectRatio } = resolveTarget();
    const count = Math.min(s.caps.maxOutputs, Math.max(1, plan.count ?? s.count));

    if (mountedRef.current) setStatus('generating');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const refs = await buildRefsFn({
        brand,
        caps: s.caps,
        plan: { logo, palette, previousPath: plan.previousPath, previousDataUrl: plan.previousDataUrl },
        paletteHexes,
        userReferencePaths: s.referencePaths,
      });

      const result: GenerateImageResult = await generateFn({
        brandId: brand.id,
        designId: adapter.getDocument().id,
        operation: plan.kind,
        userPrompt: plan.original,
        compiledPrompt: `${prompt}${format.promptSuffix}`,
        negativePrompt,
        model: s.model === AUTO_MODEL_ID ? undefined : s.model,
        aspectRatio,
        count,
        references: refs.references,
        idempotencyKey: plan.idempotencyKey,
      }, { signal: controller.signal });

      jobIdRef.current = result.jobId;
      if (!mountedRef.current) return;

      // One page per output, inserted right after the active page.
      const docNow = adapter.getDocument();
      const activeIdx = docNow.pages.findIndex((p) => p.id === activePageId);
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : docNow.pages.length;
      const batchId = uuid();
      const pages: Page[] = [];
      const records: GenerationRecord[] = [];

      result.images.forEach((img, i) => {
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
          original: plan.original, compiled: prompt, negativePrompt,
          model: result.model, count, seed: img.seed,
          refs: refs.roles, kind: plan.kind, parentPageId: plan.parentPageId,
          createdAt: now(), width: w, height: h, formatId: format.id,
          jobId: result.jobId, storagePath: img.storagePath,
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
      if (mountedRef.current) {
        setLastResult({
          pageIds: pages.map((p) => p.id),
          requested: count,
          model: result.model,
          warnings: result.warnings,
          charged: result.chargedCredits,
          balance: result.balance,
        });
        setStatus('idle');
      }
      pendingRef.current = null;
    } catch (err) {
      fail(err);
    } finally {
      inFlightRef.current = false;
      abortRef.current = null;
    }
  }, [adapter, activePageId, brand, buildRefsFn, fail, generateFn, now, onActivePageChange, resolveTarget, uuid]);

  const compileAndRun = useCallback(async (
    plan: Pending,
    refineOf?: { previousPrompt: string },
  ) => {
    if (inFlightRef.current) return;      // hook-level double-submit guard
    inFlightRef.current = true;
    pendingRef.current = plan;
    if (mountedRef.current) {
      setError(null); setErrorHint(null); setErrorCode(null);
      setStatus('compiling');
    }

    const s = settingsRef.current;
    try {
      const { label } = resolveTarget();
      const out = await compileFn(
        {
          userPrompt: plan.original, brand, formatLabel: label, modelCaps: s.caps, refineOf,
          copy: s.copy, kind: s.kind,
          userReferenceCount: s.referencePaths?.length,
        },
        { deterministicOnly: !s.brandAware },
      );
      if (!s.brandAware) {
        // Raw means "send my words, not the brand's" — it does not mean
        // "throw away the copy I typed". Keep the exact-copy contract; drop
        // only the brand enrichment.
        out.prompt = hasCopy(s.copy)
          ? `${plan.original}\n\n${textSection(out.kind, s.copy, null)}`
          : plan.original;
        out.useLogo = false;
        out.paletteHexes = [];
        out.notes = 'Raw prompt — brand context off.';
      }
      if (mountedRef.current) setCompiled(out);
      await run(
        out.prompt,
        out.negativePrompt ?? (s.negativePrompt || undefined),
        plan, out.useLogo, out.paletteHexes.length > 0, out.paletteHexes,
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
    const jobId = jobIdRef.current;
    inFlightRef.current = false;
    if (mountedRef.current) setStatus('idle');
    if (jobId) {
      // Best effort: releases the reservation so a cancel costs nothing.
      try { await cancelGeneration(jobId); } catch { /* already settled */ }
      jobIdRef.current = null;
    }
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

  const variations = useCallback(async (pageId: string) => {
    if (inFlightRef.current) return;
    const { rec, previousPath, previousDataUrl, name } = previousOf(pageId);
    const prompt = rec?.compiled ?? rec?.original ?? name ?? '';
    if (!prompt) return;
    inFlightRef.current = true;
    pendingRef.current = {
      kind: 'variation', original: rec?.original ?? prompt, parentPageId: pageId,
      previousPath, previousDataUrl, count: 4, idempotencyKey: newIdempotencyKey(),
    };
    await run(prompt, rec?.negativePrompt, pendingRef.current,
      (rec?.refs ?? []).includes('logo'), (rec?.refs ?? []).includes('palette'),
      compiled?.paletteHexes ?? []);
  }, [compiled?.paletteHexes, previousOf, run]);

  const regenerate = useCallback(async (pageId: string) => {
    if (inFlightRef.current) return;
    const { rec, name } = previousOf(pageId);
    const prompt = rec?.compiled ?? rec?.original ?? name;
    if (!prompt) return;
    inFlightRef.current = true;
    pendingRef.current = {
      kind: 'regenerate', original: rec?.original ?? prompt, parentPageId: pageId,
      count: 1, idempotencyKey: newIdempotencyKey(),
    };
    await run(prompt, rec?.negativePrompt, pendingRef.current,
      (rec?.refs ?? []).includes('logo'), (rec?.refs ?? []).includes('palette'),
      compiled?.paletteHexes ?? []);
  }, [compiled?.paletteHexes, previousOf, run]);

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
    pendingKind,
    lastResult,
    start, retry, cancel, variations, refine, regenerate, clearError,
  }), [status, error, errorHint, errorCode, canRetry, compiled, pendingKind, lastResult,
       start, retry, cancel, variations, refine, regenerate, clearError]);
}

export { modelLabel };
