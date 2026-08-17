// aiMetadata — the doc's `metadata.ai` record. Pure helpers, no React.
//
//   metadata.ai = {
//     origin: 'ai-image',            // set by the Design hero / first generation
//     pendingPrompt?: string,        // hero hand-off, cleared once compiled
//     generations: GenerationRecord[] // one per generated PAGE, newest last
//   }
//
// The record is what lets the panel offer Variations / Refine on a page
// after a reload, and what the Design page's Recent row can show later.

import type { BrandOSDocument } from '@/features/editor/schema';
import type { ReferenceRole } from '@/features/editor/ai/generateImage';

export interface GenerationRecord {
  id: string;
  pageId: string;
  /** What the user typed. */
  original: string;
  /** What was actually sent to the model. */
  compiled: string;
  negativePrompt?: string;
  /** Registry id actually used (server-resolved). */
  model: string;
  /** Requested candidate count for the batch this page belongs to. */
  count: number;
  /** Batch id — pages generated together share it. */
  batchId: string;
  seed?: number;
  refs: ReferenceRole[];
  /** 'generate' | 'variation' | 'refine' | 'regenerate' */
  kind: 'generate' | 'variation' | 'refine' | 'regenerate';
  /** Page this one was derived from (variation / refine). */
  parentPageId?: string;
  createdAt: string;
  width?: number;
  height?: number;
  formatId?: string;
}

export interface AiMetadata {
  origin?: 'ai-image';
  pendingPrompt?: string;
  generations: GenerationRecord[];
}

export function readAiMetadata(doc: BrandOSDocument | null | undefined): AiMetadata {
  const raw = (doc?.metadata as Record<string, unknown> | undefined)?.ai as Partial<AiMetadata> | undefined;
  return {
    origin: raw?.origin === 'ai-image' ? 'ai-image' : undefined,
    pendingPrompt: typeof raw?.pendingPrompt === 'string' ? raw.pendingPrompt : undefined,
    generations: Array.isArray(raw?.generations) ? (raw!.generations as GenerationRecord[]) : [],
  };
}

export function isAiImageDoc(doc: BrandOSDocument | null | undefined): boolean {
  return readAiMetadata(doc).origin === 'ai-image';
}

export function generationForPage(doc: BrandOSDocument | null | undefined, pageId: string): GenerationRecord | undefined {
  const gens = readAiMetadata(doc).generations;
  for (let i = gens.length - 1; i >= 0; i--) if (gens[i].pageId === pageId) return gens[i];
  return undefined;
}

export function withAiMetadata(doc: BrandOSDocument, patch: Partial<AiMetadata>): BrandOSDocument {
  const current = readAiMetadata(doc);
  const next: AiMetadata = {
    origin: patch.origin ?? current.origin ?? 'ai-image',
    generations: patch.generations ?? current.generations,
  };
  if ('pendingPrompt' in patch) {
    if (patch.pendingPrompt) next.pendingPrompt = patch.pendingPrompt;
  } else if (current.pendingPrompt) {
    next.pendingPrompt = current.pendingPrompt;
  }
  return { ...doc, metadata: { ...(doc.metadata ?? {}), ai: next } };
}

export function appendGenerations(doc: BrandOSDocument, records: GenerationRecord[]): BrandOSDocument {
  const current = readAiMetadata(doc);
  return withAiMetadata(doc, {
    generations: [...current.generations, ...records],
    pendingPrompt: undefined,
  });
}
