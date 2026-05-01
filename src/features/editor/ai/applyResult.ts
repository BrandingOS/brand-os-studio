// applyResult — dispatch a validated AICommandResult against the editor adapter.
//
// Phase 3.5 commit 6. The single function the prompt bar's onApply
// handler calls. All four real modes (2/3/4 — Mode 1 ships in
// Phase 5) route through this dispatcher because the result shape
// is mode-agnostic at this point — Mode 5 has already validated
// scope, schema, and brand-rebinding.
//
// Behavior per kind:
//   • 'delta'    → wrap every op in adapter.batch(label, ...).
//                  Single undo entry. Same primitive Phase 3 used
//                  for Re-apply, cross-page propagation, smart
//                  duplicate.
//   • 'replace'  → adapter.batch(label, () => replaceDocument(next)).
//                  Per the EditorAdapter contract: replaceDocument
//                  outside a batch produces no undo entry, so the
//                  batch wrap is non-optional.
//   • 'rejected' → no adapter mutation. The prompt bar already
//                  surfaced the rejection inline; nothing to apply.
//
// The function is intentionally synchronous-looking (the underlying
// replaceDocument is async, but the dispatcher fires-and-forgets it
// inside the batch — adapter handles the in-flight render).
//
// Tested at three layers per CLAUDE.md rule:
//   • unit: this file's helpers, in applyResult.test.ts.
//   • adapter integration: each op kind lands as expected adapter
//     mutation. In applyResult.test.ts (uses a real FabricAdapter
//     under jsdom — Fabric is mocked at the jsdom layer per the
//     existing test infrastructure).
//   • browser E2E: prompt-bar-to-canvas flow per mode in
//     EditorAiPromptBar.modeTwo.browser.test.tsx (commit 6),
//     EditorAiPromptBar.modeThree.browser.test.tsx (commit 7),
//     EditorAiPromptBar.modeFour.browser.test.tsx (commit 8).

import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { AICommandResult } from './types';

/**
 * Apply a validated AICommandResult to the adapter. Returns a
 * `{ applied: true | false, kind }` summary the caller can log /
 * surface for telemetry. Never throws — adapter errors during apply
 * propagate via the adapter's existing change-event surface.
 */
export function applyAICommandResult(
  adapter: EditorAdapter,
  result: AICommandResult,
): { applied: boolean; kind: AICommandResult['kind'] } {
  if (result.kind === 'rejected') {
    return { applied: false, kind: 'rejected' };
  }

  if (result.kind === 'replace') {
    adapter.batch(result.label, () => {
      // replaceDocument returns a promise (it has to load Fabric
      // objects from JSON), but the batch wrapper just needs the
      // synchronous "operation queued" signal. Adapter handles the
      // in-flight render; subsequent change events fire when the
      // load completes.
      void adapter.replaceDocument(result.nextDoc);
    });
    return { applied: true, kind: 'replace' };
  }

  // delta — wrap every op in a single labeled batch.
  adapter.batch(result.label, () => {
    for (const op of result.ops) {
      switch (op.op) {
        case 'add-layer':
          adapter.addLayer(op.pageId, op.layer);
          break;
        case 'update-layer':
          adapter.updateLayer(op.pageId, op.layerId, op.patch);
          break;
        case 'remove-layer':
          adapter.removeLayer(op.pageId, op.layerId);
          break;
        case 'add-page': {
          // Mode 5 already assigned a UUID + validated against
          // PageSchema, so op.page is a complete Page.
          // afterPageId becomes an index lookup at the adapter
          // (addPage takes an optional index, not an id).
          let index: number | undefined;
          if (op.afterPageId) {
            const doc = adapter.getDocument();
            const after = doc.pages.findIndex((p) => p.id === op.afterPageId);
            if (after >= 0) index = after + 1;
          }
          adapter.addPage(op.page, index);
          break;
        }
        case 'remove-page':
          adapter.removePage(op.pageId);
          break;
      }
    }
  });
  return { applied: true, kind: 'delta' };
}
