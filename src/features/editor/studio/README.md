# The Design Studio

The editor at `/b/:slug/design/:designSlug`. A full-screen creation
application, not a brand page with a canvas on it.

It replaced `shell/Editor.tsx`, which had grown to a thousand lines of
layout arithmetic and per-frame React state. What that shell got RIGHT —
the renderer registry, the brand engine, the AI pipeline, master pages,
cross-page propagation, variants — is carried over rather than rewritten.

---

## The regions

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR      ← back · brand │ undo redo · name · saved │ ⤴ ⤓ ☾ │
├────┬──────────┬──────────────────────────────────────────────┤
│    │          │ CONTEXT BAR   selection-driven controls      │
│RAIL│  PANEL   ├──────────────────────────────────────────────┤
│ 68 │   296    │                                              │
│    │          │           WORKSPACE (the canvas)             │
├────┴──────────┴──────────────────────────────────────────────┤
│ BOTTOM BAR   pages ·············································· zoom │
└──────────────────────────────────────────────────────────────┘
```

Each region is placed EXPLICITLY on the grid (`grid-column: 1|2|3`). The
panel is absent when closed and out of flow below 900px; with
auto-placement the canvas slid into the panel's zero-width column and
collapsed to nothing the first time anyone closed it.

---

## Rules that bind

**The top bar carries the DOCUMENT.** It used to carry the brand's
section nav (Setup · Brand Kit · Guideline · Design · Tools), added so
"the editor reads as a sibling page in the brand workspace". That is
exactly the impression a design application must not give. If you are
tempted to put product navigation here again, put it behind the back
arrow instead.

**Brand is the first rail entry**, and that ordering is the product's
argument. Canva starts from a blank design and offers a brand kit five
items down; this editor starts from the brand.

**The brand panel ACTS.** Every row does something to the canvas. The
panel it replaced displayed the brand and could not affect the document
at all — clicking a colour copied its hex to the clipboard.

**A new layer is made OF the brand** (`ops/insert.ts`). Colours come from
the kit, type from the kit's typefaces sized by the page's short edge,
corner radius from the kit. Colours are written as LITERALS, not
SlotRefs: the Fabric renderer resolves a SlotRef to placeholder grey
until `applyBrandToDocument` runs, so a brand-bound insert would put a
grey box on the canvas — more correct and visibly worse.
`convertToTemplate` maps literals back to SlotRefs when a design is
saved as a template, so the binding story is unaffected.

**Zoom and pan live in the CANVAS** (`FabricAdapter.enableViewport`),
never in a CSS transform on a wrapper. That is what keeps selection
handles the same size at 5% and 400%, re-rasterizes text crisply when
you zoom in, and makes content past the fit scale reachable at all.
`exportAs` frames the page exactly for the raster and restores the
user's view afterwards.

**Every command is ONE undo step** (`ops/layerOps.ts`). Aligning six
layers must not cost six presses of ⌘Z. Everything that touches more
than one layer runs inside `adapter.batch(...)`.

**The keyboard never steals a key from someone typing**
(`state/useStudioHotkeys.ts`). Inside an input, a textarea, or Fabric's
hidden editing textarea, the browser's own behaviour is what the user
expects — including ⌘Z. `STUDIO_SHORTCUTS` lives in that same file
because a help sheet maintained apart from its handler drifts from it.

**Geometry does not flow through React during a gesture**
(`state/studioStore.ts`). The adapter emits `change` on every pointer
event; `createDocumentSink` coalesces to one store write per animation
frame, and components subscribe to SLICES through `useShallowStudio`.
Reaching for `useStudioStore(s => s.doc)` in a component re-renders it
on every frame of every drag, which is the problem that file exists to
remove.

**Do not import `zustand/react/shallow`.** Vite pre-bundles that entry
point as its own dependency chunk, which loads a second copy of React
and makes every hook inside it throw "Invalid hook call".
`useShallowStudio` is the local equivalent.

**A layerless renderer gets its own surface and nothing else.** A
`template-instance` document (every Brand Kit deliverable, invoices,
letterheads) has zero layers by design, so the rail and the empty state
are both hidden — they would be controls that cannot act and a prompt
whose buttons have nowhere to go.

---

## Where things live

| | |
|---|---|
| `StudioEditor.tsx` | the frame and the wiring, and nothing else |
| `regions/` | top bar, rail, panel host, context bar, canvas, bottom bar |
| `panels/` | brand, elements, text, uploads, layers (templates + AI are the existing panels, reused) |
| `ops/layerOps.ts` | delete, duplicate, clipboard, group, order, nudge, align, distribute |
| `ops/insert.ts` | what a new layer is made of |
| `ops/insertRequest.ts` | one vocabulary for "put this on the canvas" — the drag payload IS this object |
| `ops/documentHealth.ts` | thumbnails, expiring AI image URLs, master-template detection |
| `state/studioStore.ts` | document mirror, selection, viewport, panel state |
| `state/useStudioViewport.ts` | fit, zoom-at-pointer, pan |
| `state/useStudioHotkeys.ts` | the keyboard layer + the shortcut list |
| `components/` | the three controls the DS does not have: icon button, numeric field, swatch — plus an anchored popover |

Adding an insertable is one entry in a panel plus, if it is a new kind,
one case in `buildLayer`. It is draggable for free: the drag payload is
the same `InsertRequest` the click handler sends.

---

## Known limitations

- **Uploads land in the document as data URLs.** The brand Library's own
  upload path does the same; sending them to storage needs an asset-id
  form of `ImageLayer.src` that the renderer does not resolve yet.
- **Editing a layer INSIDE a group is a no-op.** `updateLayer` looks
  only at top-level layers. Group and ungroup work; entering a group
  does not.
- **No optimistic concurrency.** `save_design_checked` and the `version`
  column exist (migration 045) and the client still does a bare upsert,
  so two tabs are last-write-wins.
- **`shell/Editor.tsx` still exists** and is now imported only by its own
  tests. Its e2e flows (brand engine, cross-page propagation, smart
  duplicate, AI modes) are real coverage of the DOMAIN layer mounted
  through a UI, so they are kept until they are ported to mount the
  Studio instead. Nothing a user can reach renders it.
