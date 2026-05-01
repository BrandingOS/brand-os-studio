# Phase 3.5 — AI Editing Layer

> **Status:** Draft spec, posted 2026-05-01 after Phase 3 shipped. Awaiting review before implementation begins.
> **Source vision:** `docs/brandos-editor-vision.md` §4 ("AI Integration — Four Modes") and §8.5 ("Phase 3 — Shipped").
> **Scope discipline:** Phase 3.5 wires the AI command infrastructure for the unified editor. It is NOT the place to build new AI capabilities (image generation, cross-document workflows, AI resize variants) — those are explicitly Phase 5+. Stay narrow.

---

## 1. Goal

Build the AI Editing Layer that turns the unified editor from a manual-design surface into an AI-native one. After Phase 3.5, every editor session has an always-visible AI prompt bar in the top chrome that drives Modes 2, 3, and 4 from §4 of the vision doc. Mode 1 (zero-state generation) remains deferred to Phase 5 because it depends on Phase 4's template library.

Phase 3.5 is a **plumbing phase**. Its success criterion is not "AI can do impressive things" but "the editor exposes a clean, schema-validated command surface for AI, with deterministic delta application, single-undo semantics, and brand-aware context — so Phases 4–6 can ship rich AI features without reinventing the contract."

The single load-bearing function this phase ships is:

```ts
aiAgent.applyCommand(doc: BrandOSDocument, command: string, context: AICommandContext): Promise<AICommandResult>
```

Everything else is the scaffolding around that function: the prompt bar UI, the four mode integrations, batch undo wrapping, mock-mode fallback, and an Edge Function migration path.

---

## 2. Scope

### In scope (must ship in Phase 3.5)

1. **`aiAgent.applyCommand(doc, command, context)`** — the canonical entry point. Inputs: current `BrandOSDocument`, raw natural-language command string, structured `AICommandContext` (active page id, selection, mode hint, brand). Outputs: `AICommandResult` discriminated union — either a `delta` (list of layer adds/updates/removes targeting specific page+layer ids) or a `replace` (full document swap, for content-type conversions).
2. **Command parser** — natural language → structured `DesignIntent | DesignCommand`. Stays scoped to commands the four modes need; does NOT have to handle every conceivable phrasing.
3. **Delta builder** — turns the AI agent's structured output into a list of adapter mutations. Validates each emitted layer against `LayerSchema` from `@/features/editor/schema` before queuing — schema-invalid emits get rejected loudly, not silently ignored.
4. **Batch undo grouping** — every `applyCommand` invocation lands as a single labeled undo entry via `EditorAdapter.batch(label, fn)`. Label format: `"AI: <short summary>"` (e.g., `"AI: add CTA button"`, `"AI: convert to Arabic"`, `"AI: convert to social posts"`).
5. **Top-chrome AI prompt bar UI** — sibling of the brand picker per vision §3. Always visible on every content type. Includes: text input, send button, optional skill chips (carry-forward from existing AiBar), inline thinking indicator, accept/reject affordance for emitted deltas.
6. **Mode 2 wiring** (additive in-doc) — user types in the prompt bar with no selection → AI receives doc + active page id + null selection → emits a delta of new layers added to the active page.
7. **Mode 3 wiring** (command edit) — user types a command-style prompt → AI receives doc + the command → emits either a small delta (small change) or a `replace` (large transformation). The mode is implicit from the prompt's intent.
8. **Mode 4 wiring** (refine selection) — user selects layer(s) and types in the prompt bar (or opens an "AI refine" entry on the floating toolbar) → AI receives doc + selected layer ids + command → emits a delta scoped to those layers only. Out-of-scope mutations get rejected at the delta builder.
9. **Edge Function migration** — finally move the Anthropic call out of the browser (off `dangerouslyAllowBrowser: true`) and into a Supabase Edge Function. The current path inlines `VITE_ANTHROPIC_API_KEY` into the bundle — listed as a security constraint in CLAUDE.md and tracked at issue #2.
10. **Carve-out absorption** — delete `src/features/design-ai/`, `src/pages/dashboard/brand/[slug]/design-ai.tsx`, and the `/b/:slug/ai-design` + `/b/:slug/design-ai` route mounts once the in-editor prompt bar reaches feature parity. Brings the carve-out list from 4 to 2 (`logo-maker/flow` + `editor/components` remain).
11. **Three-layer test coverage** — for every shipped capability:
    - **Unit:** command parser, delta builder, schema validation, batch label formatting.
    - **Adapter integration:** `applyCommand` end-to-end with a mocked Anthropic response — assert delta lands as one undo entry, brand-locked layers respect locks, schema-invalid emits get rejected.
    - **Browser E2E:** prompt bar → submit → toast → delta visible on canvas → undo reverts in one step. One E2E per mode (2, 3, 4).

### Out of scope (Phase 4+ owns these)

1. **Mode 1 — zero-state generate.** Needs Phase 4's template library to work well. The vision doc explicitly says Mode 1 ships in Phase 5.
2. **AI image generation.** No image emit support in Phase 3.5. The agent can reference existing brand assets but cannot generate new ones.
3. **Resize variants powered by AI.** Phase 6 owns the `generateResizeVariants(doc, targetSizes)` reflow pipeline.
4. **Cross-document AI workflows.** "Convert this presentation into 5 social posts" can be a Mode 3 command if the AI returns a `replace`, but multi-document outputs (e.g., generate 5 separate documents linked by family id) are Phase 6 (Resize Variants Type C).
5. **Real-time collaboration on AI commands.** Two users prompting simultaneously, multi-user accept/reject flows — Phase 7+.
6. **Plugin/extension system for custom AI commands.** Phase 7+ if it ever ships.
7. **AI for the legacy `OptimizedDesignEditor`.** Phase 3.5 wires AI into the unified editor only. Legacy editor stays carve-out.

---

## 3. Inputs Phase 3.5 inherits from Phase 3

These are the contracts already shipped that Phase 3.5 builds on. Don't reinvent.

| Inherited primitive | What it gives Phase 3.5 |
|---|---|
| `EditorAdapter` interface (`@/features/editor/adapter`) | The mutation surface AI deltas land through. Never bypass to Fabric directly. |
| `FabricAdapter` (concrete impl) | The Fabric.js integration that renders the post-delta state. |
| `BrandOSDocument` + `BrandOSDocumentSchema` (`@/features/editor/schema`) | The shape every AI emit must conform to. Pre-validate before queuing. |
| `applyBrandToDocument({ mode: 'preview', respectLocks: true })` | When the AI needs to "see" the brand-resolved doc (literal hexes, resolved fonts) without committing the doc to a brand, run preview mode and pass the resulting `brandResolution` annotation alongside the document. |
| `useBrandKit(brand)` | React-side brand kit derivation. The prompt bar's skill chips read from this for "what colors does this brand use" hints. |
| `EditorAdapter.batch(label, fn)` | Single-undo wrapping for AI deltas. Every `applyCommand` MUST call this. |
| `findSimilarLayers(doc, predicate)` + `applyLayerPatchAcrossPages(doc, predicate, patch)` | Predicate-based propagation. AI emitting "change all headlines on this brand" doesn't manually walk pages — it emits a predicate + patch and the existing primitive handles the spread. |
| `_lockedBindings` recovery | Programmatic / AI overrides on brand-locked layers don't permanently break the binding. The next `applyBrandToDocument({ respectLocks: true })` restores the SlotRef. |
| Production route `/b/:slug/design/:designSlug` | AI-generated docs (Phase 5 Mode 1) get persisted via `IDesignStorage.saveDesign` and land at this route. Phase 3.5 doesn't surface this route in nav (Phase 4.5 does), but the `apply` mode AI commands persist via the `save` callback the route already wires through `IDesignStorage`. |
| Three-layer test rule | Continues to apply. No skipping E2E "because the unit test covers it." |
| Date-stamped absorption notes pattern | Use this on every doc update Phase 3.5 makes. |

---

## 4. Inputs from current state (Step 9 absorption seeds)

`src/features/ai-design/lib/` carries three pre-existing pieces that survived the Step 9 audit and seed Phase 3.5. They get **moved into the editor's adapter / brand boundary**, not deleted; the legacy Lovart-style canvas page is what gets retired.

### `aiAgent.ts` (seed for `aiAgent.applyCommand`)

The current `runAgent({ brand, history, userMessage, skill })` is a one-shot call that returns `{ message, nodes, suggestions }`. Phase 3.5 evolves this into the contract `applyCommand(doc, command, context)`. Concrete migration steps:

- Move from `src/features/ai-design/lib/aiAgent.ts` → `src/features/editor/ai/applyCommand.ts`.
- Replace the `nodes: DesignNode[]` output (custom node union) with `delta: AICommandDelta` (operations on schema-valid `Layer` objects).
- Add a `replace: BrandOSDocument` branch for content-type conversions and other large transformations.
- Keep the model (Claude Opus 4.6 today; latest at impl time per the model-IDs note in the env), max-tokens (start at 2048, raise if needed for replace ops), and the JSON-extraction fallback (markdown fence stripping + brace hunting — that's load-bearing for real-world LLM output).
- Move the API key from `VITE_ANTHROPIC_API_KEY` (browser-inlined) to a Supabase Edge Function call. The browser sends `(doc, command, context)`, the Edge Function calls Anthropic and returns `(delta | replace)`.

### `brandCard.ts` (seed for the AI's brand context)

The current `buildBrandCard(brand)` produces a compact handle-based summary (`@slug.colors.primary`, `@slug.fonts.heading`, etc.) for the system prompt. Phase 3.5 keeps this verbatim — it's the right shape for the LLM to reference brand kit values without us having to re-tokenize on every call. **One enhancement:** include `applyBrandToDocument(doc, kit, { mode: 'preview' }).brandResolution` in the context so the AI sees what the SlotRefs actually resolve to under the current brand, not just the slot identifiers.

### `promptEnhancer.ts` (seed for the system prompt)

The current `buildSystemPrompt(brandCard, skill)` and `enhanceUserPrompt(userMessage, skill)` are reusable as-is for system-prompt assembly. Phase 3.5 extends the system prompt with:

- The `BrandOSDocument` schema in compact form (so the AI knows what shapes it can emit).
- The `AICommandDelta` operation vocabulary (`add-layer`, `update-layer`, `remove-layer`, `add-page`, `remove-page`).
- An explicit "you MUST emit valid JSON matching this schema" instruction with a one-shot example.
- A "stay scoped to selection" clause for Mode 4.

### Things explicitly NOT salvaged

- `TldrawCanvas` and `InfiniteCanvas` (`src/features/ai-design/components/`) — replaced by the unified editor's Fabric canvas.
- `useAiDesignStore` (the in-memory Zustand for the chat panel) — replaced by editor-local state for the prompt bar (the prompt bar is stateless beyond a single in-flight command + last error).
- `ChatPanel`, `EntryOverlay`, `ChatFab`, `BottomToolbar` — the prompt bar UI is much smaller (a single text input + send button in the top chrome). The full chat-panel UX from `/ai-design` does not return.

---

## 5. Outputs

The concrete deliverables Phase 3.5 ships.

### 5.1 The `applyCommand` contract

```ts
// src/features/editor/ai/types.ts

export interface AICommandContext {
  /** Active page id at command time. AI scopes additive ops to this page. */
  activePageId: string;
  /** Selected layer ids. Empty = no selection (Mode 2 or 3); non-empty = Mode 4. */
  selection: string[];
  /** Optional mode hint. If absent, the parser infers from the prompt + selection. */
  modeHint?: 'mode-2-additive' | 'mode-3-command' | 'mode-4-refine';
  /** Active brand. Required — the AI must always have brand context. */
  brand: Brand;
  /** Optional skill chip the user clicked (carry-forward from existing AiBar). */
  skill?: SkillId;
}

export type AICommandDelta =
  | { op: 'add-layer'; pageId: string; layer: Layer }
  | { op: 'update-layer'; pageId: string; layerId: string; patch: Partial<Layer> }
  | { op: 'remove-layer'; pageId: string; layerId: string }
  | { op: 'add-page'; page: Page; afterPageId?: string }
  | { op: 'remove-page'; pageId: string };

export type AICommandResult =
  | {
      kind: 'delta';
      label: string;          // single undo-entry label, e.g. "AI: add CTA button"
      ops: AICommandDelta[];
      message: string;        // user-facing summary the prompt bar shows post-apply
      suggestions?: string[]; // optional follow-up prompt chips
    }
  | {
      kind: 'replace';
      label: string;
      nextDoc: BrandOSDocument;
      message: string;
      suggestions?: string[];
    }
  | {
      kind: 'rejected';
      reason: 'out-of-selection-scope' | 'schema-invalid' | 'empty-prompt' | 'agent-error';
      message: string;
    };

export interface AIAgent {
  applyCommand(
    doc: BrandOSDocument,
    command: string,
    context: AICommandContext,
  ): Promise<AICommandResult>;
}
```

The adapter calls `applyCommand`, then:
- For `kind: 'delta'`: wraps `ops` in `adapter.batch(result.label, () => { for op of ops: adapter.applyOp(op) })`.
- For `kind: 'replace'`: calls `adapter.replaceDocument(result.nextDoc, result.label)` (already a single batched undo entry from Phase 3 — verified in `Editor.browser.test.tsx`).
- For `kind: 'rejected'`: surfaces the rejection reason via Sonner; no document change.

### 5.2 The prompt bar UI

`src/features/editor/shell/v2/EditorAiPromptBar.tsx`. Mounts in the editor's top chrome between the brand picker and Save indicator. Behavior:

- Single text input (`<textarea>` with autoresize, max ~3 lines visible before scroll).
- Send button on the right of the input. Disabled when input is empty or a command is in-flight.
- Skill chips below the input (collapsed by default; expand on focus). Carry-forward from `src/features/ai-design/components/SkillPills.tsx` shape.
- In-flight indicator: animated dots in the send button, prompt input becomes read-only.
- Post-apply: Sonner toast with the `result.message` + suggestion chips that re-fill the prompt input on click.
- Error state: input border tints accent-red, error text below the input, retry available.
- Mock-mode badge ("Demo mode — set `VITE_ANTHROPIC_API_KEY`") visible only when the Edge Function returns a mock-mode flag.

### 5.3 Mode wirings

| Mode | Trigger | Context shape | Expected result kind |
|---|---|---|---|
| Mode 2 — additive | Prompt bar with no selection | `selection: []`, `activePageId: <current>` | `delta` with `op: 'add-layer'` ops scoped to `activePageId` |
| Mode 3 — command | Prompt bar (selection optional, command-style intent) | `selection: <whatever>`, `activePageId: <current>` | `delta` (small) OR `replace` (large transformations like content-type conversion) |
| Mode 4 — refine | Prompt bar with selection (or "AI refine" entry on floating toolbar) | `selection: [layerId, ...]`, `activePageId: <current>` | `delta` with `update-layer` ops scoped to `selection` only — out-of-selection ops get rejected by the delta builder |

The mode is inferred at the parser level from `(selection.length, prompt intent)`. `modeHint` is an override hatch for the prompt bar's "AI refine" entry, which knows it's Mode 4.

### 5.4 Edge Function migration

`supabase/functions/ai-apply-command/index.ts`. Receives `(doc, command, context)`, returns `AICommandResult`. The browser-side `applyCommand` becomes a thin `fetch()` wrapper. Closes the security-constraint debt from CLAUDE.md / issue #2.

### 5.5 Carve-out cleanup commits (sequenced last in Phase 3.5)

Once Mode 2/3/4 are working in the unified editor, ship a single cleanup commit chain:

1. Delete `src/features/ai-design/components/` (the Lovart-style chat panel UI — replaced by the prompt bar).
2. Delete `src/features/ai-design/hooks/useAiDesignStore.ts` (replaced by editor-local state).
3. Move `src/features/ai-design/lib/` → `src/features/editor/ai/`.
4. Delete `src/features/design-ai/` and `src/pages/dashboard/brand/[slug]/design-ai.tsx`.
5. Remove the `/b/:slug/ai-design` and `/b/:slug/design-ai` route mounts from `src/App.tsx`.
6. Repoint the Design launchpad's "AI Design agent" + "Design with AI" cards to `/b/:slug/design/<new-blank-design-id>` (or whatever the post-Phase-4.5 entry point is — coordinate with Phase 4.5 timing).
7. Update CLAUDE.md carve-out list (4 → 2).
8. Update vision doc Phase 3.5 absorption note: mark complete.

---

## 6. Non-goals

In addition to the "out of scope" list in §2, these are explicitly rejected for Phase 3.5 to keep it disciplined:

- **A "smart selection" feature** (AI infers what the user means by "this thing"). Selection is whatever the user manually selected. No inference.
- **AI-driven layer naming or layer-tree restructuring.** AI emits flat layers; group/restructure is manual.
- **Multi-turn conversation memory beyond the current document.** The prompt bar is stateless across submits; if a user wants to refine, they look at the doc and write a new prompt. Future phases may add multi-turn — not now.
- **Auto-apply.** Every AI delta is reviewable: the user sees the post-apply state, can undo (Cmd+Z reverts the entire delta as one step), and can accept implicitly by continuing to work. There is no "preview before apply" hop in Phase 3.5 — that's Phase 4 AI design polish if it's needed.
- **Streaming responses.** First version is request → wait → apply. Streaming the delta as it generates is a Phase 4+ UX polish.
- **Per-layer "AI history" annotation.** No tracking of "this layer was added by AI on this date." If we need provenance later, that's a metadata pass.
- **AI for brand-kit editing.** The Identity section is the only place brand kit data is edited (vision §7). AI does not write to brand kit fields.
- **Test fixtures with real Anthropic calls.** Every test uses a mocked agent. CI never hits the real API.

---

## 7. Open questions — please decide before implementation

These are the calls I want from you before I start writing code. None block the audit-and-plan work, but several block the structure of the implementation.

### Q1 — Mock mode vs real API in dev

The current `aiAgent.ts` falls back to a deterministic mock when `VITE_ANTHROPIC_API_KEY` is unset, and Step 9's live testing confirmed that's all that runs in dev today. After moving to the Edge Function, the mock-mode behavior becomes:

(a) **Edge Function checks for an env flag and returns a mock response.** Dev experience matches prod's contract; no key leaks into the bundle.
(b) **Dev mode hits a special `mock://` URL handler in the browser-side `applyCommand`.** No Edge Function call at all in dev when no key is set.

I lean **(a)** — keeps the contract surface honest. (b) means the Edge Function path is silently dev-untested.

### Q2 — Replace vs delta threshold

Some Mode 3 commands ("convert this presentation into 5 social posts") clearly need a `replace`. Some ("change the headline color to brand accent") clearly need a `delta`. The middle ("make this design more minimalist") could go either way. Two options:

(a) **Let the AI decide** which kind it returns based on its own judgment. We trust it.
(b) **Enforce a delta-first preference** in the system prompt, with `replace` only when explicitly justified by the AI in a `reason` field. We enforce.

(a) is simpler. (b) is safer (replaces are more disruptive for undo). I lean (b) but it's a real trade-off.

### Q3 — Prompt bar location on small viewports

The vision doc shows the prompt bar in the top chrome. On a 1024×768 laptop with a brand picker + doc title + save indicator + share + export, the top chrome is already crowded. Three options:

(a) **Always in top chrome**, breakpoint-aware (icon-only collapsed below 1280px, expanded above).
(b) **Floating bottom-center pill** (Lovart-style — matches the existing `/design-ai` AiBar shape, which users already learned).
(c) **Both — top chrome on desktop, bottom-floating on mobile.**

(c) is most flexible but doubles the UI to maintain. I lean (a) — top chrome only, with a sensible collapsed state on small viewports. The vision doc is unambiguous about the location.

### Q4 — Skill chips: keep, drop, or rework?

The existing AiBar has skill chips (Design / Branding / Illustration / Social Post / Ad Creative / Video). These don't map cleanly to Modes 2/3/4 — they were a Lovart-style content-class hint for Mode-1 generation. Three options:

(a) **Drop them entirely.** The mode + content type already pin most of the context.
(b) **Keep them but rework as command-shape hints** ("rephrase", "simplify", "translate", "make bolder") that bias the system prompt toward a delta operation rather than a content class.
(c) **Defer to Phase 5** when Mode 1 lands — chips make more sense for zero-state generation.

I lean (c) for simplicity, with (b) as a follow-up if user testing surfaces a need.

### Q5 — Mode 4 entry point — prompt bar or floating toolbar?

The vision doc says Mode 4 triggers from "AI tools drawer or right-click → AI refine". Two concrete shapes:

(a) **Prompt bar handles all four modes.** When user has a selection, the prompt bar's `context.selection` is non-empty and the parser routes to Mode 4. Single entry point, simpler UX.
(b) **Prompt bar handles Modes 2/3, floating toolbar adds an "AI" entry that opens a scoped Mode-4 mini-prompt.** Two entry points, but the Mode-4 mini-prompt can have a different placeholder ("Refine this layer…") and pre-set the prompt context.

I lean (a) initially; (b) is a polish iteration.

### Q6 — `replace` and brand resolution

When the AI returns a `replace` (a full new doc), should the result be:

(a) **A doc with SlotRefs preserved** (brand-agnostic, like a template). The editor's existing brand engine resolves them on render.
(b) **A doc with literal hexes/fonts already applied** for the current brand. AI commits to the brand at emit time.

(a) preserves the brand-engine pattern but requires the AI to emit SlotRefs (which it can be instructed to do). (b) is simpler for the AI but loses the brand-bound recovery on a future brand switch. I lean (a) — Phase 3 is about brand-bound documents, and AI should respect that contract.

### Q7 — Streaming UI (deferred or stubbed)

§6 says streaming is non-goal for Phase 3.5. But the prompt bar UI shape benefits from being streaming-ready (e.g., the in-flight indicator can become a token-stream display later). Should the prompt bar:

(a) **Be fully request → wait → apply** with no streaming hooks. Cleaner now; refactor later if needed.
(b) **Be stub-streaming-ready** — the in-flight state is implemented as a "subscribable" that current impl just toggles on/off, future impl streams tokens through.

(a) is simpler. (b) is mild over-engineering. I lean (a).

---

## 8. Implementation order (proposed, pending review)

Once you greenlight the spec + answer the open questions, the proposed commit chain is:

1. **Spec + types** — land the `AICommandContext` / `AICommandDelta` / `AICommandResult` types and the `AIAgent` interface in `src/features/editor/ai/types.ts`. No implementation yet.
2. **Move + adapt seeds** — `src/features/ai-design/lib/{aiAgent,brandCard,promptEnhancer}.ts` → `src/features/editor/ai/`. Adapt `runAgent` → `applyCommand`, swap node-union output for delta output. Unit + adapter integration tests.
3. **Edge Function** — `supabase/functions/ai-apply-command/index.ts`. Browser-side becomes a `fetch()` wrapper. Removes `dangerouslyAllowBrowser`. Issue #2 closes.
4. **Prompt bar UI** — `src/features/editor/shell/v2/EditorAiPromptBar.tsx`. Mounts in top chrome. Wired to `applyCommand` via the editor adapter.
5. **Mode 2 wiring + E2E** — additive in-doc.
6. **Mode 3 wiring + E2E** — command edit (delta + replace branches).
7. **Mode 4 wiring + E2E** — refine selection.
8. **Carve-out cleanup chain** — per §5.5 above. Carve-out list 4 → 2.
9. **Doc updates** — vision doc Phase 3.5 → "Shipped" section, CLAUDE.md carve-out list update, issue #2 closed.

Estimated total: ~2 weeks of focused work, depending on how the Edge Function migration shakes out (if Supabase project setup adds friction, Step 3 alone could be a multi-day distraction).

---

*End of spec. Posted for review 2026-05-01.*
