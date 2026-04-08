# BrandOS v5 — Product Requirements Document
## "All-in-One Brand Maker & Management Platform"

> **Status:** Living document. Drafted 2026-04-08 as the master spec for the
> Frontify + Canva combined upgrade. The IA in `ARCHITECTURE.md` is the
> foundation; this document layers the *new feature surface* and
> *visual direction* on top of it.
>
> **Read order:** REDESIGN-BRIEF → ARCHITECTURE → **THIS** → EXECUTION

---

## 0. North Star

> **BrandOS is the place where a brand is born, lives, and ships.**
> Frontify-grade governance and DAM, Canva-grade creation and templates,
> Linear/Framer-grade craft. One product. One mental model.

If a serious brand designer would not ship the screen to a paying client,
the screen is wrong.

---

## 1. Audience (the five we design for)

| # | Persona | Primary need | Where they live in the product |
|---|---|---|---|
| 1 | **Maya** — solo founder, no design background | "Give me a logo and a one-page brand sheet." | Workspace Home → Brand Wizard → Identity → Share |
| 2 | **Daniel** — in-house designer, 1–2 brands | "Refine assets, export print-ready files fast." | Brand → Identity → Assets → Editor |
| 3 | **Priya** — agency lead, 8–15 client brands | "Switch brands fast. Don't let me edit the wrong one." | Workspace Home → Brand switcher → Brand portal |
| 4 | **Tariq** — branding agency PM | "Co-create with my team and the client. Approvals." | Brand → Collaborators → Comments → Share |
| 5 | **Quinn** — beginner, doesn't know what 'brand' means | "Just let me look around." | Learn → Templates → Brand Wizard |

Primary persona: **Maya** sets the floor. **Daniel** sets the ceiling.

---

## 2. The Three Scopes (foundation)

This is unchanged from `ARCHITECTURE.md` and remains the immutable backbone:

```
WORKSPACE  →  BRAND  →  EDITOR
   /            /b/:slug         /b/:slug/edit/:surface/:id
```

Every screen we ship must belong to exactly one scope and inherit the right
shell. v5 does NOT re-litigate this.

---

## 3. What v5 adds — the feature inventory

The IA already exists. v5 layers in the **Frontify + Canva feature set** that
turns BrandOS from "a brand kit tool" into "a brand operating system."

### 3.1 Brand Portal (Workspace + Public)
*Inspired by Frontify portals.*

Every brand becomes a **portal** — a custom landing page (cover, hero, quick
links, news/updates, contact) that internal teams and external partners see
when they open the brand. Editable inline by editors, read-only for viewers.

**Surfaces:**
- `/b/:slug` — internal portal (Overview, replaces today's bare overview)
- `/b/:slug/showcase` — public portal (was the public showcase, upgraded)

**Phase 5 of execution.**

### 3.2 Universal Search (⌘K)
*Inspired by Frontify natural-language search + Linear command palette.*

A single command palette accessible from anywhere via `⌘K` / `Ctrl+K`. Searches:
- Brands
- Templates
- Assets (DAM items)
- Guidelines pages
- Settings panels
- Quick actions ("Create brand", "New asset", "Switch theme")

Natural-language friendly. Recently used items pinned. Keyboard-first.

**Phase 2 of execution. cmdk is already in package.json.**

### 3.3 Digital Asset Manager (DAM)
*Inspired by Frontify DAM.*

Per-brand asset library with:
- Drag-drop upload (or "Import from URL")
- Categories: Logo, Photography, Icons, Documents, Video, Social, Other
- Tags + free-text metadata
- Filters (type, format, date, tag)
- Grid + list views, hover actions (download, copy URL, rename, archive)
- Download with format/size options for images
- Lightbox preview with metadata sidebar
- Per-asset usage rights field (free / brand-only / restricted)

**Phase 3 of execution.**

### 3.4 Templates 2.0 — the marketplace
*Inspired by Canva templates + Frontify template library.*

Reorganize today's templates page as a real **Canva-style marketplace**:
- Category sidebar (Social, Print, Presentation, Document, Pitch, Branding…)
- Filter chips (color, orientation, industry)
- Large preview cards with hover-zoom
- "Use template" → opens editor with that template loaded
- "Save to my templates" for cross-brand reuse
- Featured templates carousel at the top

**Phase 4 of execution.**

### 3.5 AI Brand Assistant
*Inspired by Frontify Brand Assistant.*

Floating chat surface (bottom-right, openable via `⌘J`). Capabilities:
- Q&A grounded in the brand guidelines (RAG over the brand object)
- "Generate on-brand copy" — taglines, headlines, social posts
- "Find me a logo asset" — semantic search through DAM
- "Check this for brand alignment" — paste copy, get tone feedback

Provider: Anthropic Claude (`@anthropic-ai/sdk` is already installed).
Behind a feature flag; ships with a clean stub provider for users without keys.

**Phase 6 of execution.**

### 3.6 Content Blocks for Guidelines
*Inspired by Frontify content blocks.*

Guidelines editor gets a block-based system. Block types:
- Heading / Paragraph / Quote
- Color swatch (single or palette)
- Type specimen
- Logo card (variant + safe area + don't-do)
- Image / Image grid / Image with caption
- Video embed
- Code embed
- Download button (link to a DAM asset)
- Custom embed (iframe — power-user)

**Stage 8+ of execution. Explicitly out of scope for the v5-launch sprint
described below; documented as the next major roadmap item.**

### 3.7 Collaboration & Comments
*Inspired by Canva + Figma comments.*

- Per-document comments (pin a thread to any element)
- @mentions (resolves to brand collaborators)
- Approval workflow on guideline pages and assets
- Activity feed (unified, brand-scoped)

**Stage 9+ of execution.**

### 3.8 Analytics dashboard
*Inspired by Frontify analytics.*

Per-brand and workspace-level analytics:
- Asset views / downloads (per asset, per category)
- Guideline page traffic
- Top searches
- Empty searches (gaps in DAM)
- Active members

**Stage 10+ of execution.**

### 3.9 Marketplace / Integrations
*Inspired by Frontify marketplace.*

A `/marketplace` surface listing integrations:
- Figma plugin
- Adobe Creative Cloud
- Slack notifications
- Zapier / Make
- Custom Brand SDK

**Stage 11+ — far horizon, scaffolded only.**

---

## 4. Visual direction — "Editorial Dark Premium"

### 4.1 The mood

- **Dark by default**, light theme as opt-in (the new landing-v2 already
  established this. The product follows the landing.)
- **Editorial typographic restraint** — Plus Jakarta Sans display + Inter UI +
  Playfair Display for hero accents. Already in `tailwind.config.ts`.
- **Aurora / gradient accents** used sparingly — only on hero surfaces and
  primary CTAs. Body content stays calm.
- **Card-as-canvas** — thin 1px borders, soft shadows, generous radius (12px),
  hover lift with `translate-y-[-2px]` and `shadow-lg`.
- **Density: comfortable** — not Linear-tight, not Notion-airy. Halfway.

### 4.2 Color system (CSS vars in `index.css`)

Already established by landing-v2 redesign — extend it consistently:

```
--background:        220 13% 6%      (near-black, slight blue)
--foreground:        220 9% 98%      (off-white)
--card:              220 13% 9%      (1 stop brighter than bg)
--card-foreground:   220 9% 98%
--border:            220 10% 16%     (low-contrast hairline)
--muted:             220 12% 12%
--muted-foreground:  220 9% 60%
--primary:           250 95% 70%     (electric violet — the BrandOS accent)
--primary-foreground:220 13% 6%
--accent:            190 95% 65%     (cyan, used sparingly for highlights)
--ring:              250 95% 70%
```

Light mode mirrors with `--background: 0 0% 100%` and a `--primary` shifted
slightly darker for contrast (250 80% 50%).

### 4.3 Surfaces

| Surface | Role |
|---|---|
| **Background** | The void. Pure dark, no patterns. |
| **Card** | The vessel. 1px border, 12px radius, optional inner gradient. |
| **Glass** | For floating overlays (command palette, modals). `bg-card/80 backdrop-blur-xl`. |
| **Aurora** | For hero surfaces only. Animated gradient, low opacity. |

### 4.4 Typography scale

```
display-xl: 64px / 1.05  Plus Jakarta Sans 700  -0.04em
display-lg: 48px / 1.1   Plus Jakarta Sans 700  -0.03em
display-md: 36px / 1.15  Plus Jakarta Sans 700  -0.02em
heading-lg: 24px / 1.3   Plus Jakarta Sans 600  -0.01em
heading-md: 18px / 1.4   Plus Jakarta Sans 600  -0.01em
body-lg:    16px / 1.6   Inter 400
body:       14px / 1.55  Inter 400
caption:    12px / 1.4   Inter 500  +0.02em (uppercase tracking on labels)
```

### 4.5 Motion

Already defined in `tailwind.config.ts`: `fade-in`, `scale-in`, `float`,
`gradient-shift`, `glow`. v5 standardizes their use:

- **Page transitions:** `fade-in` (400ms)
- **Card hover:** `translate-y-[-2px] shadow-glow` (200ms)
- **Modal/Drawer:** `scale-in` (250ms)
- **Background art:** `gradient-shift` only on hero surfaces

---

## 5. The execution roadmap (the "phases")

The v5 sprint is **Phases 1–7** below. Anything later is queued for
follow-up sprints.

### Phase 0 — PRD synthesis ✅ (this document)

### Phase 1 — Workspace Home rebuild
**Goal:** A new `/dashboard` Home that feels like opening Frontify.
**Files:**
- New: `src/features/dashboard/v5/HomeV5.tsx`
- New sections: `ContinueWorkingStrip`, `BrandsGrid`, `RecentAssetsRow`,
  `QuickActionsRail`, `ActivityFeed`
- Wire into `src/pages/dashboard/Index.tsx`

**Done when:** A user lands on `/dashboard`, sees their last-edited brand
in a "Continue working" hero, sees up to 6 brands as cards, sees recent
assets, sees quick actions (Create brand · Browse templates · Open AI
assistant · Universal search), sees an activity feed.

### Phase 2 — Universal Search (⌘K)
**Files:**
- New: `src/shared/search/CommandPalette.tsx`
- New: `src/shared/search/searchIndex.ts` — pulls from brand store,
  template data, guidelines pages, hard-coded routes
- New: `src/shared/search/useCommandPaletteHotkey.ts`
- Mount: in `App.tsx` (or in each shell)

**Done when:** Pressing `⌘K` from anywhere opens a command palette with
fuzzy search across brands / templates / pages / quick actions, keyboard
nav, recently used pinned, ENTER navigates.

### Phase 3 — DAM foundation
**Files:**
- New: `src/features/dam/DamPage.tsx` — mounted at `/b/:slug/dam`
  (Assets section already exists; DAM is a deeper layer under it)
- New: `src/features/dam/components/AssetGrid.tsx`,
  `AssetCard.tsx`, `AssetUploadZone.tsx`, `AssetFiltersBar.tsx`,
  `AssetLightbox.tsx`
- New: `src/shared/store/damStore.ts`
- New: `src/shared/types/asset.ts`

**Done when:** A user can upload an image (stored as data URL in
localStorage for now — backend later), see it in a grid, filter by
category and tag, click to lightbox-preview, download in original format.

**Note:** Real file storage is OUT of scope for the sprint. The DAM uses
localStorage with data URLs as a working stub; a real `AssetStorageService`
contract is registered with a localStorage adapter and a TODO for Supabase.

### Phase 4 — Templates marketplace shell
**Files:**
- Rewrite: `src/pages/dashboard/Templates.tsx` (or wherever templates lives)
- New: `src/features/templates/v5/TemplatesMarketplace.tsx`,
  `TemplateCategorySidebar.tsx`, `TemplateCard.tsx`, `TemplateFiltersBar.tsx`

**Done when:** Templates page has a category sidebar, filter chips, large
preview cards, hover actions, "Use template" wiring (even if it just opens
the existing editor).

### Phase 5 — Brand Portal v2 (public showcase upgrade)
**Files:**
- Rewrite: `src/pages/brand/Showcase.tsx` (or current showcase route)
- New: `src/features/brand-portal/v2/BrandPortalV2.tsx`,
  `PortalHero.tsx`, `PortalQuickLinks.tsx`, `PortalNewsRow.tsx`

**Done when:** A public brand portal renders the brand's logo, color
palette, type specimen, key links (Logo · Colors · Type · Voice · Assets),
and a quick-contact block. Looks Frontify-tier.

### Phase 6 — AI Brand Assistant
**Files:**
- New: `src/features/ai/v5/BrandAssistantDrawer.tsx`,
  `AssistantTrigger.tsx` (FAB), `useBrandAssistant.ts`
- New: `src/features/ai/v5/providers/mockProvider.ts` (default),
  `claudeProvider.ts` (uses `@anthropic-ai/sdk`, gated behind env)
- Mount: in `App.tsx` so it floats over every screen

**Done when:** A floating button bottom-right opens a chat drawer.
Asking "What's my brand voice?" returns a structured answer pulled from
the current brand. Asking "Write a tagline" returns a stubbed but
plausible response. The provider abstraction lets the user later plug in
a real key.

### Phase 7 — Build, fix, commit, push, notify
- `npm run build` clean
- Manually visit `/dashboard`, `/b/raqm/showcase`, hit `⌘K`, open assistant
- Two coherent commits (one for foundation+home+search, one for
  DAM+templates+portal+assistant)
- Push to `main`
- Notify the user with a summary

---

## 6. Out of scope for this sprint (queued)

These are designed-for in v5 but **not** built in this sprint:

- Content Blocks for Guidelines (Phase 8)
- Comments + collaboration (Phase 9)
- Analytics dashboard (Phase 10)
- Marketplace + integrations (Phase 11)
- Real backend storage for DAM (Supabase tables + buckets)
- Real AI provider in production (env-gated; sprint ships the mock)
- Approval workflows
- Multi-language portals
- Permissions / role gates beyond "owner sees admin"

Each gets its own follow-up PRD.

---

## 7. Acceptance criteria for the sprint

The sprint ships when:

1. ✅ This PRD exists, reviewed against the codebase
2. ✅ Workspace Home shows Continue / Brands / Recent / Quick Actions / Activity
3. ✅ ⌘K opens a working command palette anywhere in the app
4. ✅ A brand has a `/b/:slug/dam` route with a real DAM grid + upload
5. ✅ Templates page is reorganized as a marketplace
6. ✅ Public showcase upgraded to Brand Portal v2
7. ✅ AI assistant floats globally with a working mock provider
8. ✅ `npm run build` is clean
9. ✅ Two commits pushed to `main`
10. ✅ User notified with a summary + screenshots

---

*End of PRD v1. Updates tracked in this file's git history.*
