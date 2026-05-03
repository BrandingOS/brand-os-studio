// Phase 4.3 — Mode 1 wiring (forward-pulled from Phase 3.5 spec).
//
// Triggers a zero-state AI generation: user types a prompt with no
// active document; AI returns a complete BrandOSDocument via the
// kind:'replace' path. We seed a blank "scaffolding" doc for the
// chosen content type so the AI has dimensions + contentType to
// anchor its layout decisions.

import type { Brand } from '@/shared/types/brand';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { AIAgent } from '@/features/editor/ai/types';
import { CONTENT_TYPES } from '@/features/editor/content-types';

export interface GenerateFromPromptResult {
  /** True when the agent returned a usable doc; false when rejected. */
  ok: boolean;
  /** Resolved doc (only set when ok). */
  doc?: BrandOSDocument;
  /** User-facing message (toast). */
  message: string;
}

/**
 * Build a minimal scaffolding doc for the chosen content type and
 * call the agent. The agent should respond with kind:'replace'
 * (justified as "Mode 1 — zero-state generation").
 */
export async function generateFromPrompt(args: {
  agent: AIAgent;
  brand: Brand;
  brandKit: BrandKit | null;
  prompt: string;
  contentTypeId: string;
}): Promise<GenerateFromPromptResult> {
  const cfg = CONTENT_TYPES[args.contentTypeId];
  if (!cfg) {
    return { ok: false, message: `Unknown content type "${args.contentTypeId}"` };
  }
  const blank = buildBlankDoc(args.brand.id, cfg.id, cfg.defaultDimensions.width, cfg.defaultDimensions.height);
  const result = await args.agent.applyCommand(blank, args.prompt, {
    activePageId: blank.pages[0].id,
    selection: [],
    brand: args.brand,
  });
  if (result.kind === 'rejected') {
    return { ok: false, message: result.message };
  }
  if (result.kind === 'delta') {
    // The AI emitted a delta against the blank doc instead of a
    // full replace. Apply the delta in memory + return the resulting
    // doc — it's still a valid doc the user can open.
    const next = applyDeltaInMemory(blank, result.ops);
    return { ok: true, doc: next, message: result.message };
  }
  return { ok: true, doc: result.nextDoc, message: result.message };
}

function buildBlankDoc(brandId: string, contentType: string, width: number, height: number): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    contentType,
    brandId,
    masterPages: [],
    pages: [{
      id: crypto.randomUUID(),
      name: 'Page 1',
      width, height,
      background: '#ffffff',
      masterPageId: null,
      layers: [],
    }],
    metadata: {},
  };
}

function applyDeltaInMemory(
  doc: BrandOSDocument,
  ops: Array<{ op: string; pageId?: string; layerId?: string; layer?: unknown; patch?: unknown; page?: unknown; afterPageId?: string }>,
): BrandOSDocument {
  // Minimal in-memory applier — same shape as applyResult.ts but
  // operates on doc snapshots (no adapter). Used only when the AI
  // returns a delta against the blank Mode-1 scaffold.
  let next: BrandOSDocument = JSON.parse(JSON.stringify(doc));
  for (const op of ops) {
    if (op.op === 'add-layer' && op.pageId && op.layer) {
      next = {
        ...next,
        pages: next.pages.map((p) =>
          p.id === op.pageId ? { ...p, layers: [...p.layers, op.layer as never] } : p,
        ),
      };
    } else if (op.op === 'update-layer' && op.pageId && op.layerId && op.patch) {
      next = {
        ...next,
        pages: next.pages.map((p) =>
          p.id === op.pageId
            ? { ...p, layers: p.layers.map((l) => l.id === op.layerId ? { ...l, ...(op.patch as object) } : l) }
            : p,
        ),
      };
    } else if (op.op === 'remove-layer' && op.pageId && op.layerId) {
      next = {
        ...next,
        pages: next.pages.map((p) =>
          p.id === op.pageId ? { ...p, layers: p.layers.filter((l) => l.id !== op.layerId) } : p,
        ),
      };
    } else if (op.op === 'add-page' && op.page) {
      const newPage = op.page as never;
      const idx = op.afterPageId ? next.pages.findIndex((p) => p.id === op.afterPageId) : -1;
      const insertAt = idx >= 0 ? idx + 1 : next.pages.length;
      next = { ...next, pages: [...next.pages.slice(0, insertAt), newPage, ...next.pages.slice(insertAt)] };
    } else if (op.op === 'remove-page' && op.pageId) {
      next = { ...next, pages: next.pages.filter((p) => p.id !== op.pageId) };
    }
  }
  return next;
}
