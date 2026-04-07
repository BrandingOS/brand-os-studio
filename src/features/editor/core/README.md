# Editor Core — Unification Status & Adoption Guide

> **Read `docs/ux-redesign/ARCHITECTURE.md` §4 first.** This README is the
> implementation companion: what exists, what's adopted, and how to migrate
> the next editor.

## 1. Why this folder exists

BrandOS has six editor surfaces and they all reinvent the same wheels —
top bars, save semantics, undo, selection, brand-data loading. The result
is a product that feels like six different apps stitched together. This
folder is the home of the **shared editor primitives** that every editor
should eventually adopt, killing that fragmentation.

The unification is intentionally **incremental**. We are not rewriting six
editors in one commit. We add primitives, adopt them in one editor at a
time, and keep the old code paths working until they're replaced.

## 2. What's in here

| File | Status | Purpose |
|---|---|---|
| `EditorChrome.tsx` | **NEW (Stage 12)** | Canonical editor top bar: back button, breadcrumb, title, save indicator, actions slot. Drop-in replacement for any bespoke editor top bar. |
| `useAutoSave.ts` | **NEW (Stage 12)** | Debounced auto-save hook + normalized save-state machine that pairs with `EditorChrome`. The single save model for every future editor. |
| `EditorContext.tsx` | Defined, **zero adoption** | Shared state container for selection, history, view, panels. Built but never wired up — see §3. |
| `EditorToolbar.tsx` | Defined, **zero adoption** | `EditorTopToolbar`, `EditorToolSidebar`, `EditorStatusBar` — slot-based chrome components. |
| `EditorCanvas.tsx` | Defined, **zero adoption** | Generic canvas surface. |

## 3. Editors and their adoption status

| Editor | Location | Tech | Top bar | Save | Adopts core? |
|---|---|---|---|---|---|
| Design Editor | `src/features/editor/components/` | Fabric.js | Bespoke `EditorTopBar.tsx` | localStorage debounce | ❌ Not yet |
| Guidelines Hub | `src/pages/.../guidelines` + `features/guidelines/` | DOM slides | Custom sticky header | Supabase API | ❌ Not yet |
| Brand Guides (EditorWorkspace) | `src/pages/.../brand-guides` | EditorWorkspace | Built-in | **Editable export baseline — OFF-LIMITS** | ❌ Frozen |
| Brand Edit | `src/pages/.../edit.tsx` | Form fields | Sticky header | Per-change `useBrandStore.update` | ❌ Not yet |
| BrandKit Module Editor | `src/features/brandkit/components/editor/` | Fabric.js | Custom toolbar | None | ❌ Not yet |
| Logo Maker | `src/features/logo-maker/` | Custom SVG | Tabbed left panel | None until "Save to Brand" (Stage 4) | ❌ Not yet |

> **`EditorWorkspace` and the editable export pipeline (`stable/editable-export-v1`,
> `src/shared/services/export/vectorize/*`) are off-limits to this work** —
> see `CLAUDE.md` and the project's auto-memory. Any unification touching
> Brand Guides happens around the existing flow, not through it.

## 4. How to migrate an editor to `EditorChrome` + `useAutoSave`

This is the smallest meaningful adoption. You don't need to consume
`EditorContext` or rewrite the canvas; you only replace the top bar and
the save flow.

### Step 1 — Replace the bespoke top bar

```tsx
import { EditorChrome } from '@/features/editor/core';

<EditorChrome
  backTo={`/dashboard/brand/${slug}`}
  breadcrumb={['Acme', 'Identity', 'Logo']}
  title={doc.name}
  saveState={saveState}
  onRetry={retry}
  actions={
    <>
      <Button variant="ghost" size="sm">Preview</Button>
      <Button size="sm">Share</Button>
    </>
  }
/>
```

### Step 2 — Wire up `useAutoSave`

```tsx
import { useAutoSave } from '@/features/editor/core';

const { saveState, markDirty, flush, retry } = useAutoSave({
  value: doc,
  save: async (next) => {
    await api.update(next);
  },
  debounceMs: 1200,
});

// In every change handler:
const handleChange = (patch) => {
  setDoc((prev) => ({ ...prev, ...patch }));
  markDirty();
};

// On Cmd+S or before navigating away:
useEffect(() => {
  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      void flush();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [flush]);
```

That's it. You now have:
- A topbar that visually matches every other editor in BrandOS
- Auto-save with consistent semantics
- A save indicator the user can see
- Retry-on-failure UX
- Cmd+S support

### Step 3 — *(Optional)* Adopt `EditorContext` for selection / history

Larger lift. Only do this when you're ready to swap your selection model
and undo/redo history for the shared one. See `EditorContext.tsx` for
the API. **Not part of the Stage 12 slice.**

## 5. Migration order (recommended)

1. **Logo Maker** — simplest, no entanglement. Best first adopter.
2. **BrandKit Module Editor** — second simplest, similar shape.
3. **Design Editor** — meaningful adoption, has its own top bar to replace.
4. **Brand Edit** — convert from per-change writes to debounced auto-save via `useAutoSave`.
5. **Guidelines Hub** — careful: wraps multiple sub-editors.
6. **EditorWorkspace / Brand Guides** — **frozen**. Do not migrate. Document the gap.

## 6. What's NOT done in Stage 12

Honestly: most of it. Stage 12 in this sprint shipped only the primitives —
no editor consumes them yet. The next stage of unification work needs to:

- Adopt `EditorChrome` + `useAutoSave` in Logo Maker (~1 day)
- Adopt them in BrandKit Module Editor (~1 day)
- Adopt them in Design Editor (~2–3 days, replaces existing top bar + history)
- Migrate Brand Edit save flow (~1 day)
- Wire `EditorContext` consumers (~1 week — selection, history, multi-page)
- Decide policy for `EditorWorkspace` integration without touching the
  editable export pipeline

This is queued in `docs/ux-redesign/EXECUTION.md`.
