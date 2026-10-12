# BuildIntent: Local Product Workspace Prototype

An independent developer-facing prototype inside the BrandingOS repository.
It does not change customer routes, onboarding, backend data or brand assets.

## Run

From the repository root with existing dependencies installed:

```sh
npx vite --config tools/build-intent/vite.config.ts
npx vitest run --config tools/build-intent/vite.config.ts
npx vite build --config tools/build-intent/vite.config.ts
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

- Create, search and filter requests; edit intent and record corrections.
- View a curated interactive prototype for BI-001. New requests have no
  automatically fabricated interpretation or prototype.
- Approve an outcome and export a Markdown handoff for the existing AI tool.
- Add acceptance criteria, record external implementation evidence, manually
  check criteria, then close a request. No automated test claims are made.
- Maintain local activity history and export all workspace records as JSON.
- Zod validates stored data. Invalid records revert to the seed; storage write
  failures display a warning and leave in-memory state exportable.
- All records and uploaded pictures are browser-local. No two-user sync,
  identity authorization, provider connection, GitHub sync or automatic code
  execution is implemented. Reviewer names are labels, not authenticated users.
- Codex subscription-based integration must be separately verified against
  the installed CLI/app-server; Claude subscription support needs its own
  official verification. No paid API dependency has been added.

## Next Implementation Boundary

Keep the developer workspace independent of customer branding workflows.
Introduce a local provider service for the existing signed-in coding tools,
structured request interpretation, generated preview artifacts, revision-bound
execution and real repository evidence. Add shared storage and authenticated
reviewers for collaboration. Never treat provider output as an approved user
decision, nor use a checked box as automated test evidence.
