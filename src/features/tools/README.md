# Tools Platform

A platform for building **brand-aware creative tools** that work in two
modes from one codebase:

1. **In-app mode** — mounted inside a brand scope, auto-saves to the
   brand, no gates.
2. **Public mode** — standalone landing pages reachable from search,
   anonymous sessions persisted to localStorage, output gated behind
   signup, work claimed into a real brand on signup.

## Folder shape

```
src/features/tools/
├── core/                          # the platform itself — shared by every tool
│   ├── ToolShell.tsx              # three-pane editor shell (left/center/right slots)
│   ├── ToolLanding.tsx            # public landing hero + upload card
│   ├── ToolGate.tsx               # <Gate feature="export-svg" mode={mode}>...</Gate>
│   ├── useToolSession.ts          # anon-session persistence + claim hook
│   ├── toolRegistry.ts            # metadata + slug routing
│   ├── claim.ts                   # anon → brand materialization on signup
│   └── types.ts
│
├── variant-studio/                # the first tool: Logo Variant Studio
│   ├── engine/                    # pure transforms (no React)
│   ├── render/                    # SVG + canvas + export pipelines
│   ├── components/                # React UI
│   ├── public/                    # public landing
│   ├── routes.tsx                 # in-app + public route entry
│   └── index.ts
│
└── (future tools follow the same shape)
```

## Adding a new tool

1. Create `tools/<slug>/` with `engine/`, `components/`, `index.ts`.
2. Register the tool in `core/toolRegistry.ts`.
3. Add routes for `/tools/<slug>` (public) and `/b/:slug/tools/<slug>`
   (in-app) in `App.tsx`.
4. Use `ToolShell` for the studio body and `ToolGate` for any gated
   feature. Use `useToolSession` for state persistence.

The platform handles: anonymous sessions, the gate modal, claim flow,
and the public landing template. You write only the engine and the
tool-specific UI.

## Hard constraints

- **Do not import from `src/shared/services/export/vectorize/*` and do
  not modify `EditorWorkspace`.** Those are tagged
  `stable/editable-export-v1` and frozen. Tools ship their own renderer
  and exporter modules.
- **Engines must be pure TypeScript** — no React, no Zustand, no DOM
  outside of the dedicated `render/` subfolder. This is enforced by
  convention; PRs that import `react` from an `engine/` file should be
  rejected.
- **All export filenames must come from the tool's naming module**, so
  the user can change the convention once and have it apply everywhere.
