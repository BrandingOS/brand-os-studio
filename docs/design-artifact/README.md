# Design Artifact — experimental third mode on the Design page

Status: **experiment** (2026-08-14). Goal: find out quickly whether
prompt-to-code artifacts are valuable inside BrandingOS. Not production
complete by design.

## What it is

A third mode on `/b/:slug/design` next to **Image** and **Editable design**:
the user describes a design, the AI generates ONE self-contained HTML
document, and it renders live in a sandboxed iframe with
Desktop / Tablet / Mobile preview, follow-up edit instructions, View code,
and Download HTML. Brand colors, typography, logo (inline SVG when
available) and strategy context are injected into the generation prompt.

## Where it lives

```
src/features/design-artifact/
  index.ts              public API
  types.ts              ArtifactEngine boundary + viewport presets
  prompt.ts             system + user prompt builders (brand context injection)
  sanitize.ts           extract → validate → sanitize pipeline + standalone export
  generator.ts          anthropic-proxy engine + dev mock engine (?daMock=1)
  ArtifactPreview.tsx   sandboxed iframe, viewport scaling
  ArtifactWorkspace.tsx the whole mode surface (state, follow-ups, actions)
  design-artifact.css   feature CSS on --ds-* tokens
  __tests__/            unit tests (sanitize, prompt, engine, preview)
```

Integration touch points (deliberately minimal):
- `design-alt/DesignHero.tsx` — third radio + `onArtifact` callback.
- `design-alt/DesignCosmosPage.tsx` — swaps the page body for
  `ArtifactWorkspace` while the mode is active.

The Image and Editable flows are untouched.

## Provider boundary

`ArtifactEngine` (`types.ts`) is the seam: `generate({brand, instruction,
currentHtml?}) → {html}`. The default engine calls the `anthropic-proxy`
Edge Function via `@/shared/ai/anthropicProxy` (tier `sonnet`,
`max_tokens` at the proxy ceiling). Swapping model or engine is a
one-file change in `generator.ts`; the UI only knows the interface.
`?daMock=1` (DEV only) swaps in a deterministic mock engine so the full
UI flow is testable without a deployed Edge Function.

## Security model

- Generated code NEVER runs in the app context. Preview is an
  `<iframe sandbox="allow-scripts" srcDoc=…>` — **no `allow-same-origin`**,
  so the artifact gets an opaque origin: no cookies, no localStorage,
  no auth state, no parent DOM, no top navigation.
- `sanitize.ts` validates the model output (complete `<!doctype>…</html>`
  document; truncation is a hard error), strips model-authored CSP metas
  and `<base>` tags, and injects our own CSP:
  `default-src 'none'` + inline styles/scripts + Google Fonts +
  `img-src data: https:` + `connect-src 'none'` — external scripts and
  API calls from the artifact are blocked even if the model disobeys.
- API keys stay server-side (existing `anthropic-proxy` posture).

## Open CoDesign audit (github.com/OpenCoworkAI/open-codesign)

Audited 2026-08-14 at HEAD. It is an Electron desktop app whose modern
flow is an **agentic tool loop** (model edits `App.jsx` in a real
workspace via `str_replace` tools; vendored React/Babel runtime builds
the preview). That machinery is out of scope here.

**Adapted (concepts, reworded/reimplemented for web):**
- Single-artifact output contract (its legacy `packages/artifacts` path +
  `prompts/sections/output-rules.md`): self-contained document, no
  external scripts, no external API fetches, no hotlinked stock images,
  domain-specific copy (no lorem ipsum), responsive across the three
  preview viewports.
- Revise-prompt framing (`applyComment` in `packages/core/src/index.ts`):
  "minimum coherent change, keep structure/copy/visual system intact."
- Preview mechanics (`apps/desktop/.../PreviewPane.tsx`,
  `packages/runtime`): `sandbox="allow-scripts"` + `srcDoc`, stripping
  model-authored CSP metas, viewport presets 1440×900 / 768×1024 /
  381×818.
- Standalone HTML export with a banner comment
  (`packages/exporters/src/html.ts`).

**Rewritten (different mechanism, ours):** generation through our
`anthropic-proxy` (their `packages/providers` excluded); follow-up edits
as full-document regeneration with the current HTML in the prompt (their
persistent-workspace tool edits excluded); brand context via our
`buildBrandCard`; UI on our `@/shared/ds` components.

**Excluded:** Electron main process + IPC + filesystem workspace, the
agent loop and its tools (scaffold/skills/todos/preview-judge), JSX +
vendored React/Babel runtime, provider settings/OAuth, PDF/PPTX/Markdown
export, comments/pins, tweaks panel, version-history snapshots, i18n.

**License:** MIT (© 2026 OpenCoworkAI Contributors). No code was copied
verbatim; prompt-contract wording is derivative of their prompt sections,
so we carry attribution in `docs/third-party/open-codesign.md`.

## Known limits (accepted for the experiment)

- No streaming (the proxy is single-response); generation shows a
  loading state for its full duration.
- One artifact at a time; closing the workspace discards it (no history).
- Follow-ups resend the full current document — token-hungry but simple.
- If the proxy runs in mock mode (no server API key) generation fails
  with a clear message; use `?daMock=1` to exercise the UI.
