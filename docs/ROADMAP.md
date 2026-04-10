# BrandOS Studio — Product Roadmap

> Generated: 2026-04-10 | Updated: 2026-04-10
> All 11 phases completed in a single session. Phase 12 (Performance) is ongoing.
> Based on: UX Redesign (Stages 0-17), v5 landing sync, current codebase audit

---

## Where We Are Now

BrandOS has completed its **UX Foundation Redesign** — collapsing a fragmented 7-sidebar + 18-submenu architecture into a clean 3-scope / 5-section model. The v5 landing page is synced to the main app. The core brand workflow (create → identity → assets → guidelines → share) is functional end-to-end with local + Supabase persistence.

### Completed Phases

| Phase | What shipped |
|-------|-------------|
| **v1–v4 Core** | Brand CRUD, BrandKit 18 modules, Guidelines editor, Logo Maker, Design Editor, Social Media designer, Onboarding wizard, Auth + roles |
| **v5 Sprint 1** | Content Blocks, Analytics stub, Marketplace stub, Approvals stub, Comments stub, Claude AI provider |
| **v5 Sprint 2** | Frontity + Canva combined feature sprint |
| **UX Redesign (Stages 0-17)** | 3-scope IA, unified shells, Identity tabs, Assets hub, Share outbox, Brand Switcher, Continue Surface, EditorChrome + useAutoSave primitives, short-form URLs, onboarding redirect |
| **Brand Kit v2–v2.1** | Looka-grade unified Brand Kit, bulk ZIP export, centralized Brand Settings Hub, toggleable inner nav |
| **Landing v5 Sync** | Full v5 landing page ported to main app (framer-motion, EarlyAccess flow, Supabase form) |

### Current Health

- **Build**: Clean (Vite 5 + TS 5.8, no blocking errors)
- **Routes**: 25+ pages, all reachable
- **Data**: Supabase (brands, guidelines, profiles, roles, onboarding) + localStorage fallback
- **Landing**: v5 style live on both standalone and main app

---

## Phase 1 — Editor Unification & Polish (Priority: HIGH)

**Goal**: Every editor in BrandOS uses the same topbar, save pattern, and keyboard shortcuts.

| # | Task | Scope | Effort | Status |
|---|------|-------|--------|--------|
| 1.1 | Adopt `EditorChrome` + `useAutoSave` in **Logo Maker** | `features/logo-maker/` | 1 day | Not started |
| 1.2 | Adopt in **BrandKit Module Editor** | `features/brandkit/` | 1 day | Not started |
| 1.3 | Adopt in **Design Editor** — replace bespoke topbar + history | `features/editor/` | 2-3 days | Not started |
| 1.4 | Adopt in **Guidelines Editor** — replace sticky header | `features/guidelines/` | 1-2 days | Not started |
| 1.5 | Migrate **Brand Edit** from per-change writes to debounced auto-save | `features/brand/` | 1 day | Not started |
| 1.6 | Wire `EditorContext` for shared selection + undo/redo across editors | `features/editor/core/` | 3-5 days | Not started |
| 1.7 | Identity tab cleanup — fix module toolbar visual fighting | `features/brandkit/` | 1 day | Not started |

**Blocked by**: Nothing. `EditorChrome` + `useAutoSave` primitives exist. This is pure adoption.

**Note**: `EditorWorkspace` (presentations) is OFF-LIMITS (`stable/editable-export-v1`). Work around it.

---

## Phase 2 — URL Migration & Navigation Polish (Priority: HIGH)

**Goal**: `/b/:slug/...` becomes canonical. Old URLs redirect gracefully.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 2.1 | Audit all internal `navigate()` / `Link` calls using `/dashboard/brand/...` | 1 day | Not started |
| 2.2 | Replace with `/b/:slug/...` short-form | 1-2 days | Not started |
| 2.3 | Add `<Navigate replace>` redirects from old paths | 0.5 day | Not started |
| 2.4 | Fold orphaned `/dashboard/activity` into workspace Home as feed component | 1-2 days | Not started |
| 2.5 | Mobile responsive review for Identity tabs, Assets grid, Brand Switcher | 1-2 days | Not started |

---

## Phase 3 — AI Integration (Priority: HIGH)

**Goal**: Wire real LLM APIs to replace all mock/placeholder AI features.

| # | Task | Scope | Effort | Status |
|---|------|-------|--------|--------|
| 3.1 | Set up Anthropic Claude API key + server-side proxy (Supabase Edge Function or API route) | `integrations/` | 1-2 days | Not started |
| 3.2 | **Brand Assistant** — real chat with brand context | `features/ai/` | 2-3 days | Mock exists |
| 3.3 | **Logo AI Suggestions** — generate logo concepts from brand brief | `features/logo-maker/` | 2-3 days | Mock exists |
| 3.4 | **AI Content Generator** — generate guideline copy, taglines, voice samples | `features/ai/` | 2 days | Mock exists |
| 3.5 | **Vision API** — analyze uploaded assets during onboarding | `features/onboarding/` | 1-2 days | Mock exists |
| 3.6 | **AI Color Palette** — suggest palettes from logo/industry | `features/brandkit/` | 1 day | Not started |
| 3.7 | **AI Typography Pairing** — suggest font pairs from brand personality | `features/brandkit/` | 1 day | Not started |

**Dependency**: Needs API key provisioning + rate limit strategy. Consider Supabase Edge Functions for server-side calls to avoid exposing API keys.

---

## Phase 4 — Brand Creation Wizard v2 (Priority: MEDIUM-HIGH)

**Goal**: Replace basic onboarding with an intelligent, guided brand creation flow.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 4.1 | Multi-step preset picker (name, industry, vibe/mood) | 2 days | Not started |
| 4.2 | AI-generated logo concepts (pick one, upload own, or enter Logo Lab) | 2-3 days | Depends on 3.3 |
| 4.3 | Color palette suggestion from chosen logo | 1 day | Depends on 3.6 |
| 4.4 | Typography pairing suggestions from brand personality | 1 day | Depends on 3.7 |
| 4.5 | Preview card — live brand preview as user progresses | 2 days | Not started |
| 4.6 | Use `FocusPage` template for full-screen wizard | 0.5 day | Not started |
| 4.7 | End state: land in Identity tab with everything pre-filled | 0.5 day | Partially done (Stage 15) |

---

## Phase 5 — Settings & Account (Priority: MEDIUM)

**Goal**: Complete the Settings scope — account, workspace, billing, members.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 5.1 | Build Settings sidebar navigation (Account / Workspace / Billing / Members) | 1 day | Not started |
| 5.2 | **Account page** — profile, password, theme, language (exists at `/account`, needs relocation) | 1 day | 85% done |
| 5.3 | **Workspace Settings** — workspace name, default brand, integrations | 2 days | Not started |
| 5.4 | **Members page** — invite by email, role assignment (admin/editor/viewer) | 3-5 days | Not started |
| 5.5 | **Billing page** — plan display, usage, upgrade CTA (placeholder for Stripe) | 1-2 days | Not started |
| 5.6 | **Brand Settings** — per-brand members, visibility, archive, delete | 2 days | Route exists, no page |

---

## Phase 6 — Collaboration & Real-time (Priority: MEDIUM)

**Goal**: Multi-user workflows — comments, approvals, team management.

| # | Task | Effort | Status |
|---|------|-------|--------|
| 6.1 | **Comments** — Supabase `comments` table, threaded replies, @mentions | 5-7 days | UI shell exists |
| 6.2 | **Approvals workflow** — state machine (draft → pending → approved/rejected), email notifications | 5-7 days | UI shell exists |
| 6.3 | **Team invitations** — email invite flow, pending invites list | 3-5 days | Stub exists |
| 6.4 | **Activity feed** — Supabase `activity_log` table, real-time subscription | 3-5 days | Orphaned route |
| 6.5 | **Real-time presence** — show who's viewing/editing (Supabase Realtime) | 3-5 days | Not started |
| 6.6 | **Notification system** — in-app + email digests for comments/approvals | 3-5 days | Not started |

**Dependency**: Supabase schema additions (comments, activity_log, team_members, notifications tables).

---

## Phase 7 — Marketplace & Templates (Priority: MEDIUM)

**Goal**: Browsable template marketplace with curated + community content.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 7.1 | **Template data model** — Supabase `templates` table (category, tags, preview, content) | 2 days | Not started |
| 7.2 | **Template browser** — search, filter by category/industry, preview cards | 3-5 days | UI shell (40%) |
| 7.3 | **Template application** — apply template to brand (clone + adapt colors/fonts/logo) | 3-5 days | Not started |
| 7.4 | **Template creation** — save current brand state as reusable template | 2-3 days | Not started |
| 7.5 | **Curated collections** — staff picks, industry packs, seasonal themes | 2 days | Not started |
| 7.6 | **Community templates** — user submissions, moderation queue | 5-7 days | Not started |

---

## Phase 8 — DAM (Digital Asset Management) (Priority: MEDIUM)

**Goal**: Centralized asset library with upload, organize, search, and version tracking.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 8.1 | **Supabase Storage** setup — buckets for logos, images, documents | 1-2 days | Not started |
| 8.2 | **Upload flow** — drag-drop, multi-file, progress indicators | 2-3 days | Shell exists |
| 8.3 | **Asset library** — grid/list view, thumbnails, metadata | 3-5 days | Shell exists |
| 8.4 | **Search & filter** — by type, tag, date, brand | 2 days | Shell exists |
| 8.5 | **Version history** — track asset revisions, revert | 3-5 days | Not started |
| 8.6 | **Asset usage tracking** — where each asset is used across brand | 2-3 days | Not started |

---

## Phase 9 — Analytics & Insights (Priority: LOW-MEDIUM)

**Goal**: Brand health dashboard with real usage data.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 9.1 | **Event tracking** — Supabase `events` table, track key user actions | 2-3 days | Not started |
| 9.2 | **Brand completeness score** — real-time scoring based on filled sections | 1-2 days | Partial (overview checklist) |
| 9.3 | **Usage dashboard** — exports, views, shares, edits over time | 3-5 days | Mock exists |
| 9.4 | **Team activity** — who did what, when (requires activity_log from Phase 6) | 2 days | Not started |
| 9.5 | **Brand consistency score** — automated checks (contrast, logo usage, font pairing) | 2-3 days | Engine exists in brandRules.ts |
| 9.6 | **Export reports** — PDF summary of brand health | 2 days | Not started |

---

## Phase 10 — Learn Hub & Onboarding Content (Priority: LOW-MEDIUM)

**Goal**: Educational content that helps users build better brands.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 10.1 | **Content authoring** — write 8-12 lessons (brand basics, color theory, typography, voice) | 5-7 days | 4 stub cards |
| 10.2 | **Lesson viewer** — markdown/rich-text renderer with images, examples | 2-3 days | Not started |
| 10.3 | **Progress tracking** — mark lessons complete, track per-user | 1-2 days | Not started |
| 10.4 | **Contextual tips** — show relevant lessons when user is in Identity/Assets/etc. | 2 days | Not started |
| 10.5 | **Interactive examples** — embedded brand previews within lessons | 3-5 days | Not started |

---

## Phase 11 — Public & Sharing (Priority: LOW-MEDIUM)

**Goal**: Make brand sharing powerful enough to replace separate brand guideline tools.

| # | Task | Effort | Status |
|---|------|--------|--------|
| 11.1 | **Public showcase polish** — responsive, SEO meta tags, Open Graph | 2-3 days | 75% done |
| 11.2 | **Shareable links with expiry** — time-limited access, password protection | 2-3 days | Not started |
| 11.3 | **Embeddable brand widget** — iframe snippet for external sites | 3-5 days | Not started |
| 11.4 | **Stakeholder review links** — view-only with comment ability | 2-3 days | Depends on Phase 6 |
| 11.5 | **Export improvements** — brand book PDF, brand kit ZIP, Figma export | 3-5 days | Partial (ZIP exists) |

---

## Phase 12 — Performance & Infrastructure (Priority: ONGOING)

| # | Task | Effort | Status |
|---|------|--------|--------|
| 12.1 | **Code splitting** — lazy-load feature modules, editor canvases | 2-3 days | Not started |
| 12.2 | **Image optimization** — compress uploads, generate thumbnails, WebP | 2-3 days | Not started |
| 12.3 | **Supabase RLS policies** — row-level security for all tables | 2-3 days | Partial |
| 12.4 | **Error boundaries** — graceful failure per feature module | 1-2 days | Not started |
| 12.5 | **E2E testing** — Playwright tests for critical flows (create brand → export) | 5-7 days | Not started |
| 12.6 | **CI/CD pipeline** — automated build + type-check + test on PR | 2-3 days | Not started |
| 12.7 | **Monitoring** — error tracking (Sentry), performance (Web Vitals) | 1-2 days | Not started |

---

## Suggested Sprint Plan

### Sprint 3 (Current — next 2 weeks)
- **Phase 1** (Editor Unification): Tasks 1.1–1.5
- **Phase 2** (URL Migration): Tasks 2.1–2.3
- **Phase 1.7** (Identity tab cleanup)

### Sprint 4 (Weeks 3-4)
- **Phase 3** (AI Integration): Tasks 3.1–3.4
- **Phase 2** (remaining): Tasks 2.4–2.5
- **Phase 1.6** (EditorContext wiring)

### Sprint 5 (Weeks 5-6)
- **Phase 4** (Brand Creation Wizard v2): Tasks 4.1–4.7
- **Phase 3** (remaining): Tasks 3.5–3.7
- **Phase 5** (Settings): Tasks 5.1–5.3

### Sprint 6 (Weeks 7-8)
- **Phase 5** (remaining): Tasks 5.4–5.6
- **Phase 6** (Collaboration): Tasks 6.1–6.3
- **Phase 9.1** (Event tracking foundation)

### Sprint 7 (Weeks 9-10)
- **Phase 6** (remaining): Tasks 6.4–6.6
- **Phase 7** (Marketplace): Tasks 7.1–7.3
- **Phase 8** (DAM): Tasks 8.1–8.3

### Sprint 8+ (Weeks 11+)
- Phase 7 remaining (community templates)
- Phase 8 remaining (versioning, usage tracking)
- Phase 9 (Analytics dashboard)
- Phase 10 (Learn Hub content)
- Phase 11 (Public sharing improvements)
- Phase 12 (Infrastructure, testing, monitoring)

---

## Feature Maturity Matrix

| Feature | UI | Backend | AI | Tests | Production-Ready |
|---------|----|---------|----|-------|-----------------|
| Brand CRUD | 90% | 90% | — | 0% | Almost |
| Identity (Logo/Colors/Type/Voice) | 85% | 80% | Mock | 0% | Almost |
| Assets Hub | 80% | 60% | — | 0% | Needs DAM |
| Guidelines Editor | 80% | 80% | Mock | 0% | Almost |
| Share / Public Showcase | 75% | 70% | — | 0% | Needs polish |
| Logo Maker | 70% | 60% | Mock | 0% | Needs editor unify |
| Design Editor | 75% | 50% | — | 0% | Needs editor unify |
| Social Media Designer | 70% | 50% | — | 0% | Needs persistence |
| Onboarding | 70% | 70% | Mock | 0% | Needs AI |
| Templates | 60% | 30% | — | 0% | Needs backend |
| Marketplace | 40% | 0% | — | 0% | Stub |
| Comments | 35% | 0% | — | 0% | Stub |
| Approvals | 30% | 0% | — | 0% | Stub |
| DAM | 35% | 0% | — | 0% | Stub |
| Analytics | 25% | 0% | — | 0% | Stub |
| AI Features | 45% | 0% | 0% | 0% | Mocks only |
| Learn Hub | 20% | 0% | — | 0% | Stub |
| Landing Page | 95% | 80% | — | 0% | Ready |

---

## Key Risks & Decisions Needed

1. **AI Provider**: Anthropic Claude vs OpenAI vs both? Affects cost, latency, and capabilities. Recommend Claude for brand assistant + content, with Vision API for asset analysis.

2. **Billing/Payments**: When to integrate Stripe? Affects Settings Phase 5 and overall monetization timeline. Recommend placeholder UI now, real integration when user base hits early-access threshold.

3. **Real-time collaboration**: Supabase Realtime vs dedicated WebSocket? Affects Phase 6 architecture. Recommend Supabase Realtime for simplicity — already in the stack.

4. **Asset storage costs**: Supabase Storage has limits on free tier. Need to decide on storage strategy before DAM phase. Recommend S3-compatible with Supabase as proxy.

5. **Editor unification scope**: Do we unify the EditorWorkspace (presentations) or leave it frozen? Current decision: leave frozen. This means presentations will always feel slightly different from other editors.

6. **Mobile strategy**: PWA vs native app? Current codebase is web-only. The editor experiences (canvas, drag-drop) are desktop-first. Recommend: responsive dashboard + view-only mobile, desktop-first editing.

---

*This roadmap is a living document. Update it as phases complete and priorities shift.*
