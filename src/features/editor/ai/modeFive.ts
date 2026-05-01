// Mode 5 — rejection + disambiguation handling layer (Phase 3.5 commit 3).
//
// Mode 5 is not a "real" mode — it's the safety gate ALL FOUR real
// modes route through after the AI responds. Every byte of mutation
// the editor accepts from the AI passes through `validateAICommandResult`.
//
// What it catches (in order):
//
//  1. Top-level schema parse failure
//     The AI returned non-JSON, missing fields, wrong-typed fields,
//     replace without justification (≥10 chars), unknown rejection
//     reason code, etc. All caught by AICommandResultSchema in
//     `./types.ts`. → rejected schema_invalid.
//
//  2. Per-op layer/page schema validation (delta variant)
//     `add-layer` and `add-page` ops carry user-content payloads that
//     Zod's top-level schema can't fully validate (we accept them as
//     records there so the AI can omit `id`). This layer assigns a
//     fresh UUID and re-validates against LayerSchema / PageSchema.
//     → rejected schema_invalid on failure.
//
//  3. Mode 4 scope clamp (delta variant, when context.selection non-empty)
//     If the AI returned a delta whose update/remove ops touch any
//     layer NOT in context.selection, that's an "out of selection
//     scope" violation — Mode 4 must stay scoped. → rejected
//     out_of_selection_scope.
//
//  4. Brand-rebinding guard (replace variant)
//     The AI is forbidden from changing the doc's brand via a replace.
//     If nextDoc.brandId differs from context.brand.id (and both are
//     non-null), → rejected schema_invalid with a brand-rebinding
//     message. Standalone-editor docs (brandId === null) are exempt.
//
//  5. Pass-through
//     If everything checks out, return the parsed AICommandResult
//     (with UUIDs filled in for add-layer / add-page ops) ready for
//     the adapter to apply.
//
// What it does NOT catch:
//   - Bad design choices that pass schema (e.g., a layer at x=-9000).
//     The user's responsibility, like any other adapter mutation.
//   - The AI emitting valid JSON that doesn't actually do what the
//     user asked. Detected only at the user-feedback layer.
//
// Test coverage: src/features/editor/ai/modeFive.test.ts asserts
// every catch above PLUS the happy-path pass-through. Negative-path
// tests are non-negotiable per CLAUDE.md three-layer rule.

import {
  AICommandResultSchema,
  LayerSchema,
  PageSchema,
  type AICommandContext,
  type AICommandResult,
} from './types';
import type { BrandOSDocument, Layer, Page } from '@/features/editor/schema';

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Validate a raw AI response against the contract. Returns a
 * canonical AICommandResult — either the parsed input (with UUIDs
 * assigned to add-layer/add-page ops) OR a `kind: 'rejected'`
 * variant with a structured reason if any guard tripped.
 *
 * The function NEVER throws — every failure mode resolves to a
 * `rejected` variant the prompt bar can display.
 */
export function validateAICommandResult(
  rawResult: unknown,
  doc: BrandOSDocument,
  context: AICommandContext,
): AICommandResult {
  // Guard 1 — top-level shape.
  const parsed = AICommandResultSchema.safeParse(rawResult);
  if (!parsed.success) {
    return {
      kind: 'rejected',
      reason: 'schema_invalid',
      message: `The AI's response didn't match the contract: ${formatZodIssues(parsed.error.issues)}`,
    };
  }
  const result = parsed.data;

  // Pass-through — rejected variant doesn't need further checks.
  if (result.kind === 'rejected') {
    return result;
  }

  // Guard 4 — brand-rebinding for replace.
  if (result.kind === 'replace') {
    const ctxBrandId = context.brand.id;
    const nextBrandId = result.nextDoc.brandId;
    // Standalone-editor docs (brandId === null) are exempt.
    if (ctxBrandId && nextBrandId && nextBrandId !== ctxBrandId) {
      return {
        kind: 'rejected',
        reason: 'schema_invalid',
        message:
          'The AI tried to rebind the document to a different brand. Brand changes go through the brand picker, not AI.',
      };
    }
    return result;
  }

  // Delta variant — Guard 2 (per-op layer/page validation) +
  // Guard 3 (Mode 4 scope clamp).

  // Build the selection set once for fast contains() checks.
  const selectionSet = new Set(context.selection);
  const isMode4 = selectionSet.size > 0;

  // Walk every op. For schema validation, mutate the op array in
  // place to add UUIDs (the contract assigns them — see system
  // prompt §7).
  const opsClean: typeof result.ops = [];
  for (const op of result.ops) {
    switch (op.op) {
      case 'add-layer': {
        // Assign a fresh UUID and validate the full layer.
        const candidate = { ...op.layer, id: op.layer.id ?? newUuid() };
        const layerCheck = LayerSchema.safeParse(candidate);
        if (!layerCheck.success) {
          return {
            kind: 'rejected',
            reason: 'schema_invalid',
            message: `add-layer op produced an invalid layer: ${formatZodIssues(layerCheck.error.issues)}`,
          };
        }
        opsClean.push({
          op: 'add-layer',
          pageId: op.pageId,
          layer: layerCheck.data as unknown as Layer,
        });
        break;
      }

      case 'update-layer': {
        // Mode 4 scope clamp — update ops must target a selected layer.
        if (isMode4 && !selectionSet.has(op.layerId)) {
          return {
            kind: 'rejected',
            reason: 'out_of_selection_scope',
            message: `The command refines the selection but the AI tried to update layer ${op.layerId} which isn't selected.`,
          };
        }
        opsClean.push({
          op: 'update-layer',
          pageId: op.pageId,
          layerId: op.layerId,
          patch: op.patch as Partial<Layer>,
        });
        break;
      }

      case 'remove-layer': {
        // Mode 4 scope clamp — same as update.
        if (isMode4 && !selectionSet.has(op.layerId)) {
          return {
            kind: 'rejected',
            reason: 'out_of_selection_scope',
            message: `The command refines the selection but the AI tried to remove layer ${op.layerId} which isn't selected.`,
          };
        }
        opsClean.push(op);
        break;
      }

      case 'add-page': {
        const candidate = { ...op.page, id: (op.page as { id?: string }).id ?? newUuid() };
        const pageCheck = PageSchema.safeParse(candidate);
        if (!pageCheck.success) {
          return {
            kind: 'rejected',
            reason: 'schema_invalid',
            message: `add-page op produced an invalid page: ${formatZodIssues(pageCheck.error.issues)}`,
          };
        }
        opsClean.push({
          op: 'add-page',
          page: pageCheck.data as Page,
          afterPageId: op.afterPageId,
        });
        break;
      }

      case 'remove-page': {
        // Mode 4 doesn't constrain page-level ops (selection is per-layer
        // not per-page). Pass through.
        opsClean.push(op);
        break;
      }
    }
  }

  // Sanity guard for the doc parameter — if the AI emitted ops
  // referencing pages that don't exist on the live doc, that's a
  // schema_invalid because the adapter would crash on apply. (This
  // catches the "AI hallucinated a page id" failure mode.)
  for (const op of opsClean) {
    if (op.op === 'add-layer' || op.op === 'update-layer' || op.op === 'remove-layer') {
      const pageExists = doc.pages.some((p) => p.id === op.pageId);
      if (!pageExists) {
        return {
          kind: 'rejected',
          reason: 'schema_invalid',
          message: `The AI referenced a page id (${op.pageId}) that isn't in the document.`,
        };
      }
    }
    if (op.op === 'update-layer' || op.op === 'remove-layer') {
      const page = doc.pages.find((p) => p.id === op.pageId);
      const layerExists = page?.layers.some((l) => l.id === op.layerId);
      if (!layerExists) {
        return {
          kind: 'rejected',
          reason: 'schema_invalid',
          message: `The AI referenced a layer id (${op.layerId}) that isn't on page ${op.pageId}.`,
        };
      }
    }
  }

  return {
    kind: 'delta',
    label: result.label,
    ops: opsClean,
    message: result.message,
    suggestions: result.suggestions,
    disambiguation: result.disambiguation,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function newUuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

interface ZodIssueLike {
  path: (string | number)[];
  message: string;
}

function formatZodIssues(issues: ZodIssueLike[]): string {
  if (issues.length === 0) return 'unknown shape';
  const first = issues[0];
  const path = first.path.join('.') || '<root>';
  const more = issues.length > 1 ? ` (+${issues.length - 1} more)` : '';
  return `${path}: ${first.message}${more}`;
}
