# BuildIntent: Local Product Workspace Prototype

An independent developer-facing prototype inside the BrandingOS repository.
It does not change customer routes, onboarding, backend data or brand assets.

The interface imports the canonical `src/shared/ds` tokens, component styles,
buttons, inputs, text areas, segmented controls, switches, checkboxes, tabs,
badges, toast and modal. Local CSS owns the workspace layout, not a new palette
or control system. The product font is Plus Jakarta Sans, loaded the same way
as the main application's HTML entry point.

The header switches between Arabic (RTL) and English (LTR); the preference
persists in `build-intent.locale`. UI labels and the curated BI-001 example
have translations. Switching languages does not rewrite request records,
change revisions or invalidate approvals. User-authored text remains in its
original language; this prototype does not offer automatic translation.

## Run

From the repository root with existing dependencies installed:

```sh
npx vite --config tools/build-intent/vite.config.ts
npx vitest run --config tools/build-intent/vite.config.ts
npx vite build --config tools/build-intent/vite.config.ts
node tools/build-intent/browser-check.mjs
node tools/build-intent/assistant-workflow-check.mjs
# One live request through the installed ChatGPT-authenticated Codex:
node tools/build-intent/live-assistant-check.mjs
```

The local URL is printed by Vite (port 5190 preferred). Build output is
`dist-build-intent/`, separate from the BrandingOS application build.

## Product Contract

- Start with one product workspace and an outcome for each change request.
- Delegate routine decisions; ask only about ambiguity that materially changes
  the outcome, not every implementation detail.
- Match the work plan to a feature, fix or small change. The current prototype
  uses explicit types; automatic scope/risk assessment is future work.
- Review a tangible prototype before approving the implementation direction.
- Bind approval to the current revision. Corrections, prototype choices or
  acceptance changes invalidate approval and previous verification.
- Separate an approved direction, a handoff, external implementation evidence,
  manual verification and completed work. Downloading a handoff does not run AI.

## First Case

BI-001 represents the owner's stated problem: people should choose and build
their identity rather than receive a finished kit on registration. The source
is the owner's conversation and `#Logo to Branding`; the code reference is
`e91853c4` and `src/features/onboarding-logo/README.md`. Current implementation
is reference material, not evidence the owner has accepted its behavior.

The prototype includes three curated direction images from existing project
assets, palette changes, type style, pattern, logo background and a raster
upload. These show the choice-driven interaction, not a functioning AI brand
generator. Logo display is not structural logo variation generation. Owner
choices are included in the implementation handoff.

## Functional Scope and Limits

- Create, search and filter requests. New requests need only the idea; the title
  is optional. The selected request survives reloads.
- Each request has a conversation, direct editing of its title, original brief,
  intended outcome, type and criteria, plus undo for up to ten prior drafts
  (older snapshots are trimmed if they exceed the local size budget).
- View the curated BI-001 prototype, or an AI-generated interactive prototype.
  New requests automatically start interpretation when Codex is connected.
  Follow-up messages update the intended outcome, criteria and prototype
  together. Routine changes are applied immediately and can be undone.
- Conversations survive reloads and compose drafts survive request switching.
  Invalid output, provider failures and cancellation preserve the existing
  request. A response based on an obsolete revision is not applied.
- Generated prototypes run in a sandboxed iframe without same-origin access.
  CSP blocks network connections, external forms and resources. The preview
  can be expanded; its interactions are demonstration state, not saved brand
  records. A stale prototype is marked and cannot be approved.
- Approve an outcome and export a Markdown handoff for the existing AI tool.
- Add acceptance criteria, record external implementation evidence, manually
  check criteria, then close a request. No automated test claims are made.
- Maintain local activity history and export all workspace records as JSON.
- Zod validates stored data. Invalid records revert to the seed; storage write
  failures display a warning and leave in-memory state exportable.
- All records and uploaded pictures are browser-local. No two-user sync,
  identity authorization, GitHub sync or automatic production code changes
  are implemented. Reviewer names are labels, not authenticated users.
- A dev-only Vite bridge runs the installed Codex CLI with its existing
  ChatGPT login. It requires that login, removes API-key environment variables,
  forces ChatGPT authentication, uses the read-only sandbox and validates the
  final structured response. There is no paid API fallback. A status endpoint
  reports availability. Only same-origin local protocol requests can invoke it.
- The bridge prepares product drafts and previews; it cannot apply changes to
  BrandingOS source files. Production static builds do not include this bridge.
  Claude is not connected. Each person needs their own local tool sign-in.

## Next Implementation Boundary

Keep the developer workspace independent of customer branding workflows.
Extend the current local drafting bridge with revision-bound production
implementation and real repository evidence. Add shared storage and authenticated
reviewers for collaboration. Never treat provider output as an approved user
decision, nor use a checked box as automated test evidence.
