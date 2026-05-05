// Phase 5.2 — AI-powered reflow strategy.
//
// Wires the existing AICommandResult dispatcher (Phase 3.5) to the
// resize-variants pipeline. Calls agent.applyCommand with a
// structured "rebuild this doc for <W>x<H>" command; expects a
// `replace` result whose nextDoc has been semantically reflowed
// (text re-anchored, image crop boxes adjusted, CTAs repositioned).
//
// Quality is the headline of Phase 5 but explicitly out of scope for
// this commit per the user roadmap: "AI quality is a tuning problem —
// ship what the current system prompt produces, don't engineer for
// quality in this phase". This file ships the integration plumbing
// and a minimum-viable prompt; downstream prompt engineering work
// improves results without touching this surface.
//
// Failure modes are handled by FALLING BACK to dumb-clone reflow:
//   • agent throws → catch, fallback
//   • result is `kind: 'rejected'` → fallback
//   • result is `kind: 'delta'` (not replace) → fallback
//   • nextDoc fails BrandOSDocumentSchema parse → fallback
//   • any other surprise → fallback
// The user always gets variants; AI mode is an attempt-then-degrade.
import type { AIAgent, AICommandContext } from '../ai/types';
import { BrandOSDocumentSchema, type BrandOSDocument } from '../schema';
import { dumbCloneReflowFn, type ReflowFn } from './generateResizeVariants';

interface AiReflowFactoryInput {
  agent: AIAgent;
  /**
   * Optional logger for AI-mode telemetry. The button can wire this
   * to console.warn or a toast diagnostic so the user knows when
   * fallback fired. Defaults to no-op.
   */
  onFallback?: (reason: string, error?: unknown) => void;
}

/**
 * Build a ReflowFn that calls the AI agent for semantic-aware
 * resizing. Falls back to dumbCloneReflowFn on any failure.
 *
 * The returned ReflowFn is safe to drop into
 * `generateResizeVariants({ ..., reflowFn })`.
 */
export function createAiReflowFn(input: AiReflowFactoryInput): ReflowFn {
  const { agent, onFallback } = input;

  return async function aiReflow(source, targetWidth, targetHeight) {
    try {
      const command = buildReflowCommand(source, targetWidth, targetHeight);
      const context: AICommandContext = {
        activePageId: source.pages[0]?.id ?? null,
        selection: [],
        // The agent's spec accepts a brand here; the reflow prompt
        // doesn't strictly need it (we want layout reshaping, not
        // brand application — the source is already brand-bound).
        // Leave undefined; the agent code accepts it.
        brand: undefined as never,
      };
      const result = await agent.applyCommand(source, command, context);

      if (result.kind === 'replace') {
        const parsed = BrandOSDocumentSchema.safeParse(result.nextDoc);
        if (parsed.success) {
          // Even if the AI honored the dimension request in the doc body,
          // we re-stamp page width/height defensively so downstream code
          // can rely on it.
          const aligned = forcePageDimensions(parsed.data, targetWidth, targetHeight);
          return aligned;
        }
        onFallback?.('schema_invalid', parsed.error);
        return dumbCloneReflowFn(source, targetWidth, targetHeight);
      }

      onFallback?.(`unexpected_kind_${result.kind}`);
      return dumbCloneReflowFn(source, targetWidth, targetHeight);
    } catch (err) {
      onFallback?.('agent_threw', err);
      return dumbCloneReflowFn(source, targetWidth, targetHeight);
    }
  };
}

/**
 * Compose the user-facing command string sent to the agent. Kept
 * explicit (not a template literal in the factory body) so future
 * prompt engineering work is a focused diff in this one helper.
 */
export function buildReflowCommand(
  source: BrandOSDocument,
  targetWidth: number,
  targetHeight: number,
): string {
  const sourceWidth = source.pages[0]?.width ?? 1080;
  const sourceHeight = source.pages[0]?.height ?? 1080;
  const sourceAR = (sourceWidth / sourceHeight).toFixed(3);
  const targetAR = (targetWidth / targetHeight).toFixed(3);
  const orientation =
    targetWidth > targetHeight
      ? 'landscape'
      : targetWidth < targetHeight
      ? 'portrait'
      : 'square';

  return [
    `Resize this design from ${sourceWidth}×${sourceHeight} (aspect ${sourceAR}) to ${targetWidth}×${targetHeight} (aspect ${targetAR}, ${orientation}).`,
    `Preserve every layer's identity (id, kind, content, brand bindings) — do not add, remove, or rename layers.`,
    `Reflow each layer's transform so the composition reads correctly at the new aspect ratio: don't squash text, keep CTAs visible, re-anchor backgrounds to fill the new canvas, re-position headlines for the new vertical / horizontal balance.`,
    `Return a 'replace' result with the reflowed BrandOSDocument as nextDoc. Set every page's width/height to ${targetWidth}×${targetHeight}.`,
  ].join(' ');
}

function forcePageDimensions(
  doc: BrandOSDocument,
  width: number,
  height: number,
): BrandOSDocument {
  return {
    ...doc,
    pages: doc.pages.map((p) => ({ ...p, width, height })),
  };
}
