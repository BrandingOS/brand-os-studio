// Phase 3.5 contract types — AICommandContext, AICommandDelta,
// AICommandResult, AIAgent.
//
// These are the canonical types the editor, the prompt bar UI, and
// the Edge Function all share. The Zod schemas at the bottom enforce
// the same shapes at runtime — Mode 5 (rejection + disambiguation
// handling, commit 3) parses raw AI responses through them and
// rejects schema-invalid emits before they reach the adapter.
//
// Don't add fields here without updating:
//   1. The system prompt (`./systemPrompt.ts` — the AI must know about
//      any new field), AND
//   2. The Zod schema below, AND
//   3. The Mode 5 handler (`./modeFive.ts` — commit 3) if the change
//      affects rejection/validation behavior.

import { z } from 'zod';
import {
  BrandOSDocumentSchema,
  LayerSchema,
  PageSchema,
  type BrandOSDocument,
  type Layer,
  type Page,
} from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

// ─── Context (browser → Edge Function input) ────────────────────────────

/**
 * Active editor state at command-time. Sent from the browser to the
 * Edge Function alongside `(doc, command)`. The Edge Function passes
 * the relevant fields into `buildSystemPrompt(...)`.
 */
export interface AICommandContext {
  /** Active page id at command time. AI scopes additive ops to this page. */
  activePageId: string;
  /** Selected layer ids. Empty = no selection (Mode 2 or 3); non-empty
   *  = potentially Mode 4. */
  selection: string[];
  /** Optional explicit mode override. Set only when the user clicks an
   *  explicit "AI refine" entry (a future floating-toolbar affordance);
   *  ordinary prompt-bar submissions leave this unset and let the parser
   *  infer the mode from `(selection, prompt intent)`. */
  modeHint?: 'mode-2-additive' | 'mode-3-command' | 'mode-4-refine';
  /** Active brand. Required — the AI must always have brand context. */
  brand: Brand;
}

// ─── Delta operations (what the AI emits inside a `kind: 'delta'`) ──────

export type AICommandDelta =
  | { op: 'add-layer'; pageId: string; layer: Omit<Layer, 'id'> & { id?: string } }
  | { op: 'update-layer'; pageId: string; layerId: string; patch: Partial<Layer> }
  | { op: 'remove-layer'; pageId: string; layerId: string }
  | { op: 'add-page'; page: Omit<Page, 'id'> & { id?: string }; afterPageId?: string }
  | { op: 'remove-page'; pageId: string };

// ─── Result variants (AI → browser via Edge Function) ───────────────────

/** Codes the AI returns inside `{ kind: 'rejected', reason: ... }`. */
export type AIRejectionReason =
  | 'no_selection'
  | 'out_of_selection_scope'
  | 'replace_unjustified'
  | 'schema_invalid'
  | 'empty_prompt'
  | 'unsupported'
  | 'agent_error';

/**
 * Disambiguation when both Mode 3 and Mode 4 plausibly apply. The AI
 * picks the better-matching mode and offers the alternative as a
 * one-click follow-up that the prompt bar surfaces as a chip.
 *
 * Phase 3.5 spec Q5 — the field names point at the OPPOSITE mode the
 * AI didn't pick (Mode 3 result → mode4_alternative, Mode 4 result →
 * mode3_alternative).
 */
export interface AIDisambiguation {
  mode4_alternative?: string;
  mode3_alternative?: string;
}

export type AICommandResult =
  | {
      kind: 'delta';
      label: string;
      ops: AICommandDelta[];
      message: string;
      suggestions?: string[];
      disambiguation?: AIDisambiguation;
    }
  | {
      kind: 'replace';
      label: string;
      /** Required for `replace` — Mode 5 rejects unjustified replace
       *  with `reason: 'replace_unjustified'`. See spec Q2. */
      justification: string;
      nextDoc: BrandOSDocument;
      message: string;
      suggestions?: string[];
      disambiguation?: AIDisambiguation;
    }
  | {
      kind: 'rejected';
      reason: AIRejectionReason;
      message: string;
      suggestions?: string[];
    };

// ─── Agent interface (single load-bearing call) ─────────────────────────

export interface AIAgent {
  /**
   * Run a single AI editing turn. The returned result is the canonical
   * `AICommandResult` discriminated union — the adapter calls the
   * matching handler (batch the deltas, replaceDocument the replace,
   * surface the rejection via Sonner).
   */
  applyCommand(
    doc: BrandOSDocument,
    command: string,
    context: AICommandContext,
  ): Promise<AICommandResult>;
}

// ─── Zod schemas (runtime validation of raw AI JSON) ────────────────────
//
// These mirror the TS types above. Mode 5's contract layer does:
//
//   const parsed = AICommandResultSchema.safeParse(rawAiJson);
//   if (!parsed.success) → rejected schema_invalid
//
// Schema parses CATCH the AI emitting fields outside the discriminated
// union, missing required fields, wrong-typed fields, or sneaking
// literal hex strings into a SlotRef property (the inner LayerSchema /
// BrandOSDocumentSchema enforces SlotRef vs literal at the right
// places). This is the Q6 SlotRefs-non-negotiable contract enforcement.

const AIRejectionReasonSchema = z.enum([
  'no_selection',
  'out_of_selection_scope',
  'replace_unjustified',
  'schema_invalid',
  'empty_prompt',
  'unsupported',
  'agent_error',
]);

const AIDisambiguationSchema = z.object({
  mode4_alternative: z.string().optional(),
  mode3_alternative: z.string().optional(),
});

// add-layer: layer.id may be omitted (contract assigns the UUID) so
// we use a partial passthrough on id then validate the rest of the
// layer with LayerSchema.partial-on-id pattern.
const AICommandDeltaSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add-layer'),
    pageId: z.string().uuid(),
    // Pass through `layer` as a record so the contract layer can assign
    // an id then re-validate against LayerSchema. Validating with the
    // full LayerSchema here would reject AI-emitted layers that omit
    // `id` (which is the recommended pattern per the system prompt).
    layer: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal('update-layer'),
    pageId: z.string().uuid(),
    layerId: z.string().uuid(),
    patch: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal('remove-layer'),
    pageId: z.string().uuid(),
    layerId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('add-page'),
    page: z.record(z.string(), z.unknown()),
    afterPageId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('remove-page'),
    pageId: z.string().uuid(),
  }),
]);

export const AICommandResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('delta'),
    label: z.string().min(1),
    ops: z.array(AICommandDeltaSchema).min(1),
    message: z.string().min(1),
    suggestions: z.array(z.string()).optional(),
    disambiguation: AIDisambiguationSchema.optional(),
  }),
  z.object({
    kind: z.literal('replace'),
    label: z.string().min(1),
    justification: z.string().min(10), // ≥10 chars discourages "x" or "see prompt"
    nextDoc: BrandOSDocumentSchema,
    message: z.string().min(1),
    suggestions: z.array(z.string()).optional(),
    disambiguation: AIDisambiguationSchema.optional(),
  }),
  z.object({
    kind: z.literal('rejected'),
    reason: AIRejectionReasonSchema,
    message: z.string().min(1),
    suggestions: z.array(z.string()).optional(),
  }),
]);

/** Re-export for convenience — the inner schemas are what Mode 5's
 *  per-op validation pass uses (after assigning a UUID to add-layer
 *  ops + add-page ops). */
export { LayerSchema, PageSchema };
