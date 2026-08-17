// useImageGeneration — the Generate panel's Image-mode state machine.
//
//   idle ──start(text)──▶ compiling ──▶ review ──confirm()──▶ generating ──▶ idle
//                                          │  (prefs.review==='auto' skips
//                                          │   the wait but still shows it)
//                                          └──back()──▶ idle
//   any ──error──▶ error (inline, never a spinner left behind)
//
// Owns: compile (brand-aware, editable result), reference building
// (logo / palette / previous), the vendor call, page insertion (ONE
// undo step per batch) and the doc's `metadata.ai` record. Variations /
// Refine / Regenerate reuse the same `generate()` core with a plan.

import { useCallback, useMemo, useRef, useState } from 'react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Page, ImageLayer } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import {
  generateImage, GenerateImageError,
  type GenerateImageResult, type ImageReference,
} from '@/features/editor/ai/generateImage';
import { AUTO_MODEL_ID, capsFor, findImageModelInfo } from '@/features/editor/ai/imageModels';
import { compileImagePrompt, type CompiledPrompt } from '@/features/editor/ai/imagePrompt/compileImagePrompt';
import { buildBrandReferences } from '@/features/editor/ai/imagePrompt/brandReferences';
import { findFormat, formatLabel, type FormatPreset } from './formats';
import { appendGenerations, generationForPage, type GenerationRecord } from './aiMetadata';

export type GenStatus = 'idle' | 'compiling' | 'review' | 'generating' | 'error';

export interface GenerationSettings {
  model: string;           // registry id or 'auto'
  count: number;           // 1–4
  formatId: string;
  negativePrompt: string;
  brandAware: boolean;
  /** 'review' waits for confirm; 'auto' generates right after compile. */
  review: 'review' | 'auto';
  userReferenceUrl?: string;
}

interface Pending {
  kind: GenerationRecord['kind'];
  original: string;
  parentPageId?: string;
  previousUrl?: string;
  /** Count override (Variations = 4). */
  count?: number;
}

export interface UseImageGenerationArgs {
  adapter: EditorAdapter;
  activePageId: string;
  brand?: Brand;
  settings: GenerationSettings;
  onActivePageChange?: (pageId: string) => void;
  /** Test hooks. */
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
  compiled: CompiledPrompt | null;
  /** The editable text the user will actually send. */
  draft: string;
  setDraft: (s: string) => void;
  includeLogo: boolean;
  setIncludeLogo: (b: boolean) => void;
  includePalette: boolean;
  setIncludePalette: (b: boolean) => void;
  pendingKind: GenerationRecord['kind'] | null;
  lastResult: { pageIds: string[]; model?: string; warnings?: string[]; mock: boolean } | null;
  start: (text: string) => Promise<void>;
  confirm: () => Promise<void>;
  useRaw: () => Promise<void>;
  back: () => void;
  variations: (pageId: string) => Promise<void>;
  refine: (pageId: string, instruction: string) => Promise<void>;
  regenerate: (pageId: string) => Promise<void>;
  clearError: () => void;
}

function firstImageSrc(page: Page | undefined): string | undefined {
  const layer = page?.layers.find((l) => l.kind === 'image') as ImageLayer | undefined;
  const src = layer?.src;
  return typeof src === 'string' ? src : undefined;
}

export function useImageGeneration(args: UseImageGenerationArgs): UseImageGeneration {
  const { adapter, activePageId, brand, settings, onActivePageChange, deps } = args;
  const compileFn = deps?.compile ?? compileImagePrompt;
  const buildRefsFn = deps?.buildRefs ?? buildBrandReferences;
  const generateFn = deps?.generate ?? generateImage;
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const now = useCallback(() => (depsRef.current?.now ?? (() => new Date().toISOString()))(), []);
  const uuid = useCallback(() => (depsRef.current?.uuid ?? (() => crypto.randomUUID()))(), []);

  const [status, setStatus] = useState<GenStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [compiled, setCompiled] = useState<CompiledPrompt | null>(null);
  const [draft, setDraft] = useState('');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [includePalette, setIncludePalette] = useState(true);
  const [lastResult, setLastResult] = useState<UseImageGeneration['lastResult']>(null);
  const pendingRef = useRef<Pending | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const fail = useCallback((err: unknown) => {
    let msg = err instanceof Error ? err.message : String(err);
    let hint: string | null = null;
    if (err instanceof GenerateImageError) {
      if (err.code === 'model-unavailable') {
        const info = findImageModelInfo(err.model);
        msg = `${info?.label ?? err.model} isn't enabled yet.`;
        hint = err.keyEnv ? `Set ${err.keyEnv} as a Supabase secret, then redeploy ai-generate-image.` : null;
      } else if (err.status === 429) {
        msg = 'Rate limit reached — try again in a few minutes.';
      }
    }
    setError(msg);
    setErrorHint(hint);
    setStatus('error');
  }, []);

  const resolveTarget = useCallback((): { format: FormatPreset; width: number; height: number } => {
    const doc = adapter.getDocument();
    const page = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
    const format = findFormat(settingsRef.current.formatId);
    const isAuto = format.id === 'auto';
    return {
      format,
      width: isAuto ? (page?.width ?? 1024) : format.width,
      height: isAuto ? (page?.height ?? 1024) : format.height,
    };
  }, [adapter, activePageId]);

  /** Core: build refs → call the vendor → insert pages (one undo step) → record metadata. */
  const generateWith = useCallback(async (
    prompt: string, negativePrompt: string | undefined, plan: Pending,
    logo: boolean, palette: boolean, paletteHexes: string[],
  ) => {
    setIncludeLogo(logo);
    setIncludePalette(palette);
    setCompiled((c) => c ? { ...c, paletteHexes } : c);
    // Delegate to the shared core with the flags baked into a temporary closure.
    setStatus('generating');
    const s = settingsRef.current;
    const { format, width, height } = resolveTarget();
    const count = Math.min(4, Math.max(1, plan.count ?? s.count));
    const caps = capsFor(s.model);
    try {
      const refs = await buildRefsFn({
        brand, caps,
        plan: { logo, palette, previousUrl: plan.previousUrl },
        paletteHexes,
        userReferenceUrl: s.userReferenceUrl,
      });
      const result = await generateFn({
        prompt: `${prompt}${format.promptSuffix}`,
        negativePrompt, width, height, count,
        model: s.model === AUTO_MODEL_ID ? 'auto' : s.model,
        references: refs.references,
      });
      const docNow = adapter.getDocument();
      const activeIdx = docNow.pages.findIndex((p) => p.id === activePageId);
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : docNow.pages.length;
      const batchId = uuid();
      const pages: Page[] = [];
      const records: GenerationRecord[] = [];
      result.images.forEach((img, i) => {
        const w = img.width ?? width;
        const h = img.height ?? height;
        const pageId = uuid();
        pages.push({
          id: pageId,
          name: `${plan.original.slice(0, 28) || 'AI image'}${count > 1 ? ` ${i + 1}` : ''}`,
          width: w, height: h, background: '#ffffff', masterPageId: null,
          layers: [{
            id: uuid(), kind: 'image', name: 'AI image', src: img.imageUrl, fit: 'cover',
            transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
          } as ImageLayer],
        });
        records.push({
          id: uuid(), pageId, batchId, original: plan.original, compiled: prompt, negativePrompt,
          model: result.model ?? s.model, count, seed: img.seed, refs: refs.roles, kind: plan.kind,
          parentPageId: plan.parentPageId, createdAt: now(), width: w, height: h, formatId: format.id,
        });
      });
      const nextPages = [...docNow.pages.slice(0, insertAt), ...pages, ...docNow.pages.slice(insertAt)];
      const nextDoc: BrandOSDocument = appendGenerations({ ...docNow, pages: nextPages }, records);
      adapter.batch(`AI: ${plan.kind} ×${pages.length}`, () => { void adapter.replaceDocument(nextDoc); });
      onActivePageChange?.(pages[0].id);
      setLastResult({ pageIds: pages.map((p) => p.id), model: result.model, warnings: result.warnings, mock: result.mock });
      setStatus('idle');
      pendingRef.current = null;
    } catch (err) {
      fail(err);
    }
  }, [adapter, activePageId, brand, buildRefsFn, fail, generateFn, now, onActivePageChange, resolveTarget, uuid]);

  const compileAndMaybeRun = useCallback(async (plan: Pending, refineOf?: { previousPrompt: string }) => {
    pendingRef.current = plan;
    setError(null);
    setErrorHint(null);
    setStatus('compiling');
    const s = settingsRef.current;
    const { format, width, height } = resolveTarget();
    try {
      const out = await compileFn(
        {
          userPrompt: plan.original, brand,
          formatLabel: formatLabel(format, width, height),
          modelCaps: capsFor(s.model),
          refineOf,
        },
        { deterministicOnly: !s.brandAware },
      );
      if (!s.brandAware) {
        // Raw mode: the user's words, untouched.
        out.prompt = plan.original;
        out.useLogo = false;
        out.paletteHexes = [];
        out.notes = 'Raw prompt — brand context off.';
      }
      setCompiled(out);
      setDraft(out.prompt);
      setIncludeLogo(out.useLogo);
      setIncludePalette(out.paletteHexes.length > 0);
      if (s.review === 'auto' || !s.brandAware) {
        // Fire with the compiled values directly — state may not have flushed.
        await generateWith(out.prompt, out.negativePrompt, plan, out.useLogo, out.paletteHexes.length > 0, out.paletteHexes);
      } else {
        setStatus('review');
      }
    } catch (err) {
      fail(err);
    }
  }, [brand, compileFn, fail, generateWith, resolveTarget]);

  /** Core with the CURRENT chip state (review → confirm path). */
  const generate = useCallback(async (prompt: string, negativePrompt: string | undefined, plan: Pending) => {
    await generateWith(prompt, negativePrompt, plan, includeLogo, includePalette, compiled?.paletteHexes ?? []);
  }, [compiled?.paletteHexes, generateWith, includeLogo, includePalette]);

  const start = useCallback(async (text: string) => {
    const original = text.trim();
    if (!original) return;
    await compileAndMaybeRun({ kind: 'generate', original });
  }, [compileAndMaybeRun]);

  const confirm = useCallback(async () => {
    const plan = pendingRef.current;
    if (!plan || !draft.trim()) return;
    await generate(draft.trim(), compiled?.negativePrompt, plan);
  }, [compiled?.negativePrompt, draft, generate]);

  const useRaw = useCallback(async () => {
    const plan = pendingRef.current;
    if (!plan) return;
    await generateWith(plan.original, settingsRef.current.negativePrompt || undefined, plan, false, false, []);
  }, [generateWith]);

  const back = useCallback(() => {
    pendingRef.current = null;
    setStatus('idle');
    setCompiled(null);
    setDraft('');
  }, []);

  const variations = useCallback(async (pageId: string) => {
    const doc = adapter.getDocument();
    const page = doc.pages.find((p) => p.id === pageId);
    const rec = generationForPage(doc, pageId);
    const previousUrl = firstImageSrc(page);
    const prompt = rec?.compiled ?? rec?.original ?? page?.name ?? '';
    if (!prompt) return;
    await generateWith(prompt, rec?.negativePrompt, {
      kind: 'variation', original: rec?.original ?? prompt, parentPageId: pageId, previousUrl, count: 4,
    }, (rec?.refs ?? []).includes('logo'), (rec?.refs ?? []).includes('palette'), compiled?.paletteHexes ?? []);
  }, [adapter, compiled?.paletteHexes, generateWith]);

  const regenerate = useCallback(async (pageId: string) => {
    const doc = adapter.getDocument();
    const rec = generationForPage(doc, pageId);
    const prompt = rec?.compiled ?? rec?.original;
    if (!prompt) return;
    await generateWith(prompt, rec?.negativePrompt, {
      kind: 'regenerate', original: rec?.original ?? prompt, parentPageId: pageId, count: 1,
    }, (rec?.refs ?? []).includes('logo'), (rec?.refs ?? []).includes('palette'), compiled?.paletteHexes ?? []);
  }, [adapter, compiled?.paletteHexes, generateWith]);

  const refine = useCallback(async (pageId: string, instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    const doc = adapter.getDocument();
    const page = doc.pages.find((p) => p.id === pageId);
    const rec = generationForPage(doc, pageId);
    const previousUrl = firstImageSrc(page);
    await compileAndMaybeRun(
      { kind: 'refine', original: text, parentPageId: pageId, previousUrl, count: 1 },
      { previousPrompt: rec?.compiled ?? rec?.original ?? page?.name ?? '' },
    );
  }, [adapter, compileAndMaybeRun]);

  const clearError = useCallback(() => { setError(null); setErrorHint(null); if (status === 'error') setStatus('idle'); }, [status]);

  return useMemo(() => ({
    status,
    busy: status === 'compiling' || status === 'generating',
    error, errorHint, compiled, draft, setDraft,
    includeLogo, setIncludeLogo, includePalette, setIncludePalette,
    pendingKind: pendingRef.current?.kind ?? null,
    lastResult,
    start, confirm, useRaw, back, variations, refine, regenerate, clearError,
  }), [status, error, errorHint, compiled, draft, includeLogo, includePalette, lastResult, start, confirm, useRaw, back, variations, refine, regenerate, clearError]);
}
