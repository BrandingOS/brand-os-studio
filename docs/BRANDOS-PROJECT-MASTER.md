# BrandOS Project Master Document

> **The Operating System for Modern Brands**
> Single source of truth for development, strategy, and execution.

| Field | Value |
|---|---|
| **Project** | BrandOS Studio |
| **Version** | 2.0 |
| **Date** | 2026-03-31 |
| **Status** | Pre-Launch / Active Development |
| **Stack** | Vite + React 18 + TypeScript + Tailwind CSS + Zustand + Supabase |
| **BRD Feature Completion** | ~25% |
| **Documentation Completeness** | ~45% |
| **Critical Security Issues** | 5 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [Current State Assessment](#3-current-state-assessment)
4. [Gap Analysis](#4-gap-analysis)
5. [Product Backlog (Epics & User Stories)](#5-product-backlog-epics--user-stories)
6. [Sprint Planning Recommendation](#6-sprint-planning-recommendation)
7. [Technical Architecture Decisions](#7-technical-architecture-decisions)
8. [KPIs & Success Metrics](#8-kpis--success-metrics)
9. [Risk Register](#9-risk-register)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### Vision
BrandOS is an AI-powered SaaS platform that enables designers, agencies, and startups to create, manage, and export complete brand systems from a single unified platform. It covers the full brand lifecycle: **Create -> Systemize -> Apply -> Maintain**.

### Current State
The project has solid UI foundations — a polished landing page, working auth (Supabase), a comprehensive 7-step onboarding wizard, a basic dashboard, and a slide-based guidelines editor. However, the core value-generating features (AI assistance, exports, collaboration, WCAG color logic, brand applications) are **entirely unbuilt**. Only ~25% of BRD features are implemented.

### Critical Issues Requiring Immediate Action
1. **Security vulnerabilities** — `.env` committed to git, hardcoded admin credentials, hardcoded Supabase keys
2. **Architectural debt** — 3 competing service layers, duplicate components, dead routes
3. **Zero AI integration** — the core differentiator does not exist yet
4. **No export capability** — users cannot produce any tangible output
5. **No collaboration** — single-user only

### Strategic Position
BrandOS occupies a genuine market gap: no existing tool covers the full brand lifecycle from AI-assisted creation through dynamic guidelines to ongoing management at accessible pricing. The competitive window is real but narrowing as Canva and Figma add AI branding features.

| Competitor | Threat Level | Why |
|---|---|---|
| Canva Brand Kit | **HIGH** | 250M+ templates, massive reach, Free/$15/mo |
| Figma | **MEDIUM** | Adding AI brand features, industry standard |
| Looka/Brandmark | **MEDIUM** | Quick AI logos, shallow depth |
| Frontify/Bynder | **LOW** | Enterprise-only, $450+/mo, no creation tools |
| brand.ai | **LOW** | Fortune 500 compliance auditing, different market |

---

## 2. Product Vision & Strategy

### Mission Statement
Enable anyone to build, systemize, and scale professional brand systems effortlessly — powered by AI, accessible by design.

### Value Proposition
BrandOS is the **only platform** that combines:
- AI-assisted brand **creation** (not just logos — full strategy, voice, colors, typography)
- Dynamic, rule-based **guidelines** (living systems, not static PDFs)
- Instant brand **applications** (business cards, social kits, mockups)
- Ongoing brand **maintenance** (one change updates everything)

### Target Market (Phased)

| Phase | Segment | Pain Point | Revenue Potential |
|---|---|---|---|
| **Year 1** | Solo designers, freelancers, small agencies | Manual systems, scattered files, repetitive work | High adoption, lower ARPU |
| **Year 2** | SMEs, startups, creators | Brand breaks instantly, costly agency dependency | Higher ARPU, volume growth |
| **Year 3** | Mid-market, enterprise | Need for brand governance at scale | Enterprise deals, custom pricing |

### Pricing Model (Canonical — aligned across all docs)

| Plan | Price | Brands | Roles | AI | Exports | Public Showcase | Custom Domain |
|---|---|---|---|---|---|---|---|
| **Free** | $0 | 1 | Owner only | Limited (3/day) | PDF only | No | No |
| **Pro** | $19/mo | Up to 5 | Owner + Editor | Full | PDF + ZIP | Yes | No |
| **Agency** | $49/mo | Unlimited | Full Team (4 roles) | Full + Priority | Full | Yes | Yes |

### Competitive Differentiation Strategy

```
                        CREATION CAPABILITY
                              HIGH
                               |
                    BrandOS*    |
                   (target)     |
          Looka  *              |
        Brandmark *             |
                               |
  LOW ─────────────────────────┼──────────────────────── HIGH
  MANAGEMENT                   |                    MANAGEMENT
  CAPABILITY                   |                    CAPABILITY
                               |
                  Canva *      |        * Frontify
                               |        * Bynder
                  Figma *      |
                               |
                              LOW
                        CREATION CAPABILITY
```

**Moat Strategy:**
1. **AI-first creation** — not retrofitted AI on old tools
2. **Dynamic rule engine** — guidelines that validate and enforce, not just display
3. **Full lifecycle lock-in** — Create+Systemize+Apply+Maintain in one platform
4. **Accessible pricing** — undercut enterprise tools by 10x

---

## 3. Current State Assessment

### 3.1 What's Built (Honest Status)

| Component | Status | Details |
|---|---|---|
| Landing Page | **Complete** | Hero, pain points, product modules, stats, CTA, pricing section |
| Auth System | **Functional** | Supabase: email/password, Google, Facebook OAuth, password reset, guest mode |
| Onboarding Wizard | **Complete** | 7 steps: Company Basics, Target Audience, Brand Personality, Business Goals, Market Position, Style & Values, Logo Assets |
| Dashboard | **Partial** | Brand listing, stats overview (fake multiplied numbers), admin panel. 8+ sidebar links are dead (404) |
| Brand CRUD | **Partial** | Create/read/update/delete. localStorage for guests, Supabase for auth users — but editor bypasses Supabase |
| Brand Editor | **Partial** | Color palette tool, logo tool. No fonts editor, no brand info editor in context |
| Guidelines Editor | **Partial** | Slide-based editor, preview canvas, customizer panel. Only "Minimal" template renders; Corporate/Creative/Modern fallback to Minimal |
| Theme System | **Stub** | Dark mode CSS variables defined, no toggle UI |
| Brand Kit Hub | **Stub** | Module listing (business cards, letterhead, social, etc.) — all open empty editor shells |
| Settings | **Stub** | Route exists, placeholder text only |

### 3.2 Tech Stack (Actual)

| Layer | Technology | Notes |
|---|---|---|
| Build Tool | Vite | NOT Next.js (despite some folder conventions) |
| Framework | React 18 | SPA with react-router-dom |
| Language | TypeScript | Heavy `any` usage in some areas |
| Styling | Tailwind CSS + Radix UI + shadcn/ui | ~50 shadcn primitives installed |
| State | Zustand | 3 stores: session, brand, onboarding. Some use persist (localStorage) |
| Data Fetching | TanStack React Query | Defined but underutilized |
| Backend | Supabase | Auth + PostgreSQL + Storage (bucket exists, unused) |
| Routing | react-router-dom v6 | Manual route definitions in App.tsx |

### 3.3 Security Debt (Priority Order)

| # | Issue | Severity | File |
|---|---|---|---|
| S1 | `.env` committed to git, not in `.gitignore` | **CRITICAL** | `.env` |
| S2 | Hardcoded admin auto-creation (`admin@brandos.com / admin123`) runs on every app start | **CRITICAL** | `createAdminUser.ts` |
| S3 | Supabase URL + key hardcoded in source (ignoring env vars) | **CRITICAL** | `src/integrations/supabase/client.ts` |
| S4 | Admin panel gated by hardcoded personal email (`hamza2007ezzat@gmail.com`) | **HIGH** | `DashboardNavbar.tsx:21`, `AdminPanel.tsx:14`, `DashboardSidebar.tsx:89` |
| S5 | No input sanitization on any user input (colors, brand names, SVG uploads) | **HIGH** | Multiple files |
| S6 | No file type/size validation on logo uploads (UI says 10MB, nothing enforces) | **MEDIUM** | Logo upload components |
| S7 | No CSRF protection on auth forms | **MEDIUM** | Auth components |
| S8 | No rate limiting on login/register | **MEDIUM** | Auth components |
| S9 | `URL.createObjectURL()` for logos — memory leaks, lost on refresh | **MEDIUM** | Logo tool |

### 3.4 Code Quality Debt

| # | Issue | Impact |
|---|---|---|
| Q1 | 3 competing service layers (brandService.ts, brands.supabase.ts, brands.local.ts, registry.ts) | Data inconsistency — editor uses localStorage even for auth users |
| Q2 | 8+ dead sidebar routes (all 404) | Broken UX |
| Q3 | Duplicate components: Button (2x), landing page (2x), toast hook (2x) | Maintenance burden |
| Q4 | `App.css` Vite boilerplate sets `#root` max-width: 1280px | Breaks full-width layouts |
| Q5 | `require()` in ES module (`brands.local.ts:21`) | Will fail in production |
| Q6 | Demo data pre-filled as default onboarding state | Every new user sees fake data |
| Q7 | Mixed routing directories (`src/pages/` + `src/app/`) | Confusing structure |
| Q8 | No code splitting / lazy loading | Larger initial bundle than needed |
| Q9 | Guidelines templates: Corporate/Creative/Modern all fallback to Minimal | 3 of 4 templates are broken |

### 3.5 Data Layer Gaps

**Existing tables (2):**
- `brands` — name, colors, fonts, tone, audience
- `onboarding_answers` — JSONB blob per user

**Missing tables (9):**
- `brand_assets` — logos, fonts, color palettes, tone info
- `guideline_sections` — per-section content, editable and styled
- `brand_permissions` — role assignments per user per brand
- `exports` — export logs (PDF, ZIP)
- `plans` — pricing tiers and feature flags
- `public_links` — URLs for public showcases
- `custom_domains` — agency-branded domains
- `ai_prompts` — AI prompt templates and user suggestions
- `mockups` — branded mockups with logo placement

---

## 4. Gap Analysis

### 4.1 Feature Gap Matrix

| Feature | BRD Required | Built | Gap |
|---|---|---|---|
| User Authentication | Yes | Yes (Supabase) | Partial — no MFA, no profile editing |
| Multi-brand Dashboard | Yes | Yes | Partial — fake stats, dead nav links |
| Brand Kit Editor (Logo) | Yes | Partial | Blob URLs only, no cloud storage |
| Brand Kit Editor (Fonts) | Yes | No | **Full gap** |
| Brand Kit Editor (Colors) | Yes | Partial | Basic picker, no WCAG |
| Brand Kit Editor (Brand Info) | Yes | Partial | Onboarding captures it, no editor |
| Guideline Builder | Yes | Partial | Only Minimal template works |
| Theme System | Yes | Stub | CSS vars only, no UI toggle |
| Color Logic Engine (WCAG) | Yes | No | **Full gap** — named differentiator |
| Brand Applications | Yes | Stubs | **Full gap** — empty editor shells |
| PDF Export | Yes | No | **Full gap** — "Coming Soon" |
| ZIP Export | Yes | No | **Full gap** |
| Public Showcase | Yes | No | **Full gap** |
| Collaboration (Roles) | Yes | No | **Full gap** — single-user only |
| AI Assistance | Yes | No | **Full gap** — THE differentiator |
| Plans & Billing | Yes | UI only | **Full gap** — no Stripe, no gating |
| Custom Domains | Yes | No | **Full gap** — Agency plan only |

### 4.2 Documentation Gaps

| Area | Coverage | Action Needed |
|---|---|---|
| API Specification | 0% | Define all endpoints (OpenAPI) |
| Error Handling | 0% | Define error states for all flows |
| Security Requirements | 5% | Auth mechanism, input validation, file upload policy |
| Data Privacy / GDPR | 0% | Retention, deletion, consent management |
| Performance / SLAs | 0% | Load targets, response times, asset limits |
| Testing Strategy | 0% | Unit, integration, E2E plan |
| Deployment Strategy | 0% | Hosting, CDN, CI/CD |
| Monitoring / Logging | 0% | Error tracking, uptime, alerting |

---

## 5. Product Backlog (Epics & User Stories)

### Epic 0: Foundation & Security (P0 — Do First)

**Business Value:** Eliminate critical security vulnerabilities and architectural debt that block safe development.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E0-1 | As a developer, I want `.env` removed from git history and added to `.gitignore` so that credentials are never exposed | `.env` in `.gitignore`, removed from tracked files, git history cleaned | S |
| E0-2 | As a developer, I want Supabase credentials read from environment variables so that keys aren't hardcoded in source | `client.ts` reads from `import.meta.env`, no hardcoded URLs/keys | S |
| E0-3 | As a developer, I want the hardcoded admin user creation removed so that weak credentials aren't auto-created | `createAdminUser.ts` deleted, admin role uses proper Supabase roles/metadata | S |
| E0-4 | As a developer, I want admin authorization based on Supabase roles (not hardcoded email) so that admin access is secure | All `hamza2007ezzat@gmail.com` checks replaced with role-based checks | M |
| E0-5 | As a developer, I want a single consolidated service layer so that data flows consistently | Remove competing services, single factory: `brandService.ts` handles both guest/auth modes for all features | L |
| E0-6 | As a developer, I want dead sidebar routes removed or implemented so that users don't hit 404s | All sidebar links either navigate to real pages or are hidden/disabled | M |
| E0-7 | As a developer, I want duplicate components consolidated so that there's one source of truth per UI element | Remove duplicate Button, landing page, toast hook. Single import path per component | M |
| E0-8 | As a developer, I want `App.css` Vite boilerplate removed so that layouts aren't constrained | Remove `.logo`, `.read-the-docs`, `#root` max-width styles | S |
| E0-9 | As a developer, I want `require()` replaced with ES imports so that production builds work | `brands.local.ts:21` converted to dynamic `import()` or static import | S |
| E0-10 | As a developer, I want demo data removed from default state so that new users start with a blank slate | `onboardingStore` defaults to empty answers, demo data available only via explicit action | S |
| E0-11 | As a developer, I want input sanitization on all user inputs so that XSS/injection is prevented | Color values, brand names, SVG uploads validated and sanitized before storage/render | M |
| E0-12 | As a developer, I want file upload validation so that only valid files under size limits are accepted | Logo uploads: type whitelist (SVG, PNG, JPG), max 5MB enforced server-side | M |

**Total Estimated Size: ~6-8 dev days**

---

### Epic 1: Core Platform Stabilization (P0)

**Business Value:** Make existing features production-ready by fixing data persistence and completing partial implementations.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E1-1 | As a user, I want my brand data saved to the cloud so that it persists across devices and sessions | All brand CRUD operations go through Supabase for authenticated users. localStorage used only for guest mode preview | L |
| E1-2 | As a user, I want my logo uploaded to cloud storage so that it's always accessible | Logos uploaded to Supabase Storage bucket, URL stored in brand record, displayed from CDN | M |
| E1-3 | As a user, I want to edit brand fonts in the brand kit editor so that typography is part of my brand system | Font selector with Google Fonts integration, primary/secondary/body font selection, preview | L |
| E1-4 | As a user, I want to edit brand info (vision, mission, tone, values) from the editor so that I can refine my brand strategy | Brand info editor panel in the brand kit, saves to Supabase | M |
| E1-5 | As a user, I want all 4 guideline templates to render correctly so that I can choose my preferred style | Corporate, Creative, Modern templates produce distinct visual outputs (not falling back to Minimal) | L |
| E1-6 | As a user, I want the dashboard to show real statistics so that I can track my brand activity | Stats derived from actual data (brands count, exports count, etc.) — no fake multipliers | M |
| E1-7 | As a user, I want a working dark mode toggle so that I can use my preferred theme | Theme toggle in settings/navbar, persisted to localStorage, properly styled across all pages | M |
| E1-8 | As a user, I want functional navigation in the sidebar so that I can access all sections | Every sidebar link leads to a real page with at minimum a coming-soon state | M |

**Total Estimated Size: ~12-15 dev days**

---

### Epic 2: AI Integration (P0 — Core Differentiator)

**Business Value:** THE primary differentiator. AI transforms BrandOS from "another brand tool" to "the AI operating system for brands." Without this, the product has no competitive moat.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E2-1 | As a user, I want AI to suggest a brand vision statement based on my inputs so that I get professional copy instantly | AI generates 2-3 vision options based on onboarding data. User can accept, edit, or regenerate | L |
| E2-2 | As a user, I want AI to suggest brand mission, values, and tone so that my brand strategy is comprehensive | Per-section AI button in editor. Uses brand context to generate relevant suggestions | L |
| E2-3 | As a user, I want AI to suggest color palettes based on my industry and personality so that my colors are strategic | AI recommends 3 palette options with rationale. Considers industry conventions and brand personality | L |
| E2-4 | As a user, I want AI to suggest typography pairings so that my fonts complement each other | AI recommends 3 font pairings (heading + body) with design rationale | M |
| E2-5 | As a user, I want AI to generate brand voice guidelines so that my team writes consistently | AI produces tone/voice guide with do's, don'ts, and examples based on brand personality | M |
| E2-6 | As a developer, I want a reusable AI service layer so that AI features are consistent and maintainable | Centralized AI service with prompt templates, rate limiting, error handling, usage tracking | L |
| E2-7 | As a user, I want my AI usage tracked against my plan limits so that I know when I'm approaching limits | Usage counter per user per day/month, enforcement based on plan tier | M |

**Total Estimated Size: ~15-20 dev days**

---

### Epic 3: Export Engine (P0 — Core Value Delivery)

**Business Value:** Exports make the product tangible. Without exports, users cannot share or use their brand system outside BrandOS. Every competitor can produce output.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E3-1 | As a user, I want to export my brand guidelines as a PDF so that I can share them with clients/team | Multi-page PDF with cover, all guideline sections, styled per selected template. Download triggers immediately | XL |
| E3-2 | As a user, I want to export my brand assets as a ZIP file so that I have organized files for production | ZIP contains: /logos (SVG, PNG), /colors (palette.json, swatches), /fonts (font files or links), /guidelines (PDF) | L |
| E3-3 | As a user, I want to choose export quality/format options so that I get files suited for my use case | PDF: screen/print quality. Images: SVG/PNG/JPG. Color format: HEX/RGB/CMYK/Pantone | M |
| E3-4 | As a user, I want export history logged so that I can re-download previous exports | `exports` table tracks: user, brand, type, date, file URL. Dashboard shows recent exports | M |
| E3-5 | As a user, I want exports gated by my plan so that the pricing model is enforced | Free: PDF only. Pro: PDF + ZIP. Agency: All formats + custom templates | S |

**Total Estimated Size: ~12-15 dev days**

---

### Epic 4: WCAG Color Logic Engine (P1 — Named Differentiator)

**Business Value:** A named differentiator in the pitch deck. Smart contrast validation adds professional credibility and solves a real pain point for designers ensuring accessibility.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E4-1 | As a user, I want my brand colors automatically checked for WCAG 2.1 AA contrast so that my brand is accessible | Real-time contrast ratio calculation between foreground/background pairs. Pass/fail indicator with ratio displayed | M |
| E4-2 | As a user, I want auto-suggested color adjustments when contrast fails so that I can fix issues easily | System suggests nearest accessible alternative (lighter/darker) that maintains brand feel | M |
| E4-3 | As a user, I want a color accessibility report for my full palette so that I know all safe combinations | Matrix showing all color pair combinations with pass/fail status and ratios | L |
| E4-4 | As a user, I want foreground/background auto-selection in guidelines so that text is always readable | Dynamic text color selection based on background luminance for all guideline slides | M |

**Total Estimated Size: ~8-10 dev days**

---

### Epic 5: Collaboration & Permissions (P1 — Table Stakes)

**Business Value:** Every competitor has multi-user collaboration. Essential for agency use case and Pro/Agency plan value.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E5-1 | As a brand owner, I want to invite team members by email so that we can collaborate | Email invitation flow, accept/decline, role assignment. Invitation stored in `brand_permissions` | L |
| E5-2 | As a brand owner, I want to assign roles (Editor, Exporter, Viewer) to team members so that access is controlled | Role selection on invite, role displayed in team panel, role changeable by owner | M |
| E5-3 | As an editor, I want to modify brand assets and guidelines (but not settings) so that I can do my job within bounds | Feature-level permission checks: editors can edit content, not manage team or billing | L |
| E5-4 | As an exporter, I want to download brand assets without editing them so that I can use approved materials | Read-only brand view + export buttons. No edit controls visible | M |
| E5-5 | As a viewer, I want read-only access to brand guidelines so that I can reference the brand system | Full guideline view, no edit controls, no export buttons | S |
| E5-6 | As a brand owner, I want to see who's on my team and manage their roles so that I maintain control | Team management panel: list members, change roles, remove members | M |
| E5-7 | As a developer, I want RLS policies enforcing role-based access so that permissions are server-side secure | Supabase RLS policies check `brand_permissions` table for every data access | L |

**Total Estimated Size: ~15-18 dev days**

---

### Epic 6: Brand Applications (P1 — Value Delivery)

**Business Value:** Transforms brand system from abstract guidelines into usable, tangible brand materials. High-value for agencies billing clients for deliverables.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E6-1 | As a user, I want to generate a business card design from my brand so that I have print-ready materials | Business card template auto-populated with brand logo, colors, fonts. Front + back. PDF export | L |
| E6-2 | As a user, I want to generate branded letterhead so that my documents look professional | Letterhead template with logo placement, brand colors, typography. Word/PDF export | L |
| E6-3 | As a user, I want to generate social media profile kits so that my online presence is consistent | Templates for profile pictures, cover images, post templates across major platforms (IG, LinkedIn, X, Facebook) | XL |
| E6-4 | As a user, I want to preview brand mockups so that I can see my brand in context | Logo on common mockups (signage, packaging, screens, stationery). Read-only preview | L |

**Total Estimated Size: ~15-20 dev days**

---

### Epic 7: Public Showcase & Custom Domains (P2)

**Business Value:** Differentiator for agency plan. Creates viral loop (agencies share brand pages publicly). No competitor below enterprise tier offers this.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E7-1 | As a user, I want to publish my brand guidelines to a public URL so that anyone can view them | Toggle to enable/disable. Public page renders full guideline (read-only). Unique URL per brand | L |
| E7-2 | As a user, I want to share my brand page via a custom shareable link so that I can send it to stakeholders | Short URL (e.g., brandos.app/b/my-brand). Copy-to-clipboard. No auth required to view | M |
| E7-3 | As an agency user, I want to connect a custom domain to my brand showcase so that it's white-labeled | Custom domain configuration (CNAME). SSL provisioning. Agency plan only | XL |

**Total Estimated Size: ~10-12 dev days**

---

### Epic 8: Plans & Billing (P1)

**Business Value:** Monetization. Without billing, there's no revenue. Feature gating creates upgrade incentive.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E8-1 | As a user, I want to subscribe to Pro or Agency plan so that I access premium features | Stripe Checkout integration. Plan selection page. Successful payment activates plan | L |
| E8-2 | As a user, I want to manage my subscription (upgrade, downgrade, cancel) so that I control my billing | Stripe Customer Portal link. Plan changes take effect at next billing cycle | M |
| E8-3 | As a developer, I want feature gating enforced by plan tier so that free users can't access paid features | Middleware/utility checking user plan before rendering gated features. Upgrade CTA shown for locked features | L |
| E8-4 | As a user, I want to see my current plan and usage so that I know what I'm paying for | Settings page showing: current plan, brands used/allowed, AI usage, next billing date | M |
| E8-5 | As a developer, I want Stripe webhooks handling subscription lifecycle so that plan status stays in sync | Webhook handler for: checkout.session.completed, customer.subscription.updated/deleted | L |

**Total Estimated Size: ~12-15 dev days**

---

### Epic 9: Templates & Content Library (P2)

**Business Value:** Growth driver. More templates = more reasons to use BrandOS. Foundation for future marketplace.

| ID | User Story | Acceptance Criteria | Size |
|---|---|---|---|
| E9-1 | As a user, I want 8+ guideline template styles so that my brand guidelines match my brand personality | Templates: Minimal, Corporate, Creative, Modern, Playful, Elegant, Bold, Classic — all rendering correctly | XL |
| E9-2 | As a user, I want business card template variations so that I can choose my preferred layout | At least 3 business card layouts per style | L |
| E9-3 | As a user, I want social media template variations so that my content looks varied but consistent | At least 5 post templates, 3 story templates per platform | XL |
| E9-4 | As a developer, I want a template engine that separates data from layout so that templates are easy to create | Template system: brand data injected into layout components. Adding a template = adding a layout file | L |

**Total Estimated Size: ~15-20 dev days**

---

## 6. Sprint Planning Recommendation

### Cadence
- **Sprint length:** 2 weeks
- **Ceremonies:** Sprint planning (Day 1), daily standups, sprint review + retro (Day 10)
- **Team:** 1-2 full-stack developers + 1 designer (part-time)

### MVP Definition (Minimum Viable Product)

The MVP is what's needed to launch publicly and start acquiring users:

**Must-have (Epics 0 + 1 + 2 + 3):**
- Security fixes (Epic 0)
- Stable data persistence (Epic 1)
- AI-assisted brand creation (Epic 2) — at minimum vision/mission/tone generation
- PDF export (Epic 3) — at minimum single-format PDF guideline

**Nice-to-have for MVP:**
- WCAG color checking (Epic 4)
- Basic plan gating (Epic 8 partial)

### Sprint Roadmap (First 3 Months)

| Sprint | Duration | Epic | Focus | Key Deliverables |
|---|---|---|---|---|
| **Sprint 1** | Weeks 1-2 | Epic 0 | Security & Foundation | .env fixed, credentials removed, service layer consolidated, dead routes fixed |
| **Sprint 2** | Weeks 3-4 | Epic 1 (part 1) | Data Stabilization | Full Supabase migration, cloud logo storage, brand info editor |
| **Sprint 3** | Weeks 5-6 | Epic 1 (part 2) + Epic 4 | Platform Polish + WCAG | Font editor, template fixes, WCAG contrast engine, real dashboard stats |
| **Sprint 4** | Weeks 7-8 | Epic 2 | AI Integration | AI service layer, vision/mission/tone/color AI suggestions |
| **Sprint 5** | Weeks 9-10 | Epic 3 | Export Engine | PDF guideline export, ZIP asset export, export history |
| **Sprint 6** | Weeks 11-12 | Epic 5 + Epic 8 (partial) | Collaboration + Billing Foundation | Team invites, role-based access, Stripe checkout |

### Post-MVP (Months 4-6)
- Sprint 7-8: Epic 6 (Brand Applications — business cards, letterhead)
- Sprint 9-10: Epic 7 (Public Showcase), Epic 8 completion (billing management)
- Sprint 11-12: Epic 9 (Templates), performance optimization, launch prep

---

## 7. Technical Architecture Decisions

### 7.1 Confirmed Stack

| Decision | Choice | Rationale |
|---|---|---|
| Build tool | **Vite** (keep) | Fast, modern, working well |
| Framework | **React 18 SPA** (keep) | Good ecosystem, team familiar |
| Language | **TypeScript** (keep, enforce strict) | Enable `strict: true` in tsconfig, eliminate `any` types |
| Styling | **Tailwind CSS + shadcn/ui** (keep) | Consistent, composable |
| State | **Zustand** (keep, consolidate) | Lightweight, effective. Consolidate to well-defined stores |
| Backend | **Supabase** (keep, expand) | Auth + PostgreSQL + Storage + Realtime. Expand to all data model tables |
| AI Provider | **Anthropic Claude API** (new) | Best-in-class for structured creative writing. Use for all brand content generation |
| Export | **@react-pdf/renderer + JSZip** (new) | React-native PDF generation + ZIP bundling |
| Payments | **Stripe** (new) | Industry standard for SaaS billing |

### 7.2 Service Layer Consolidation Plan

**Current state:** 3 competing services — `brandService.ts`, `brands.supabase.ts`, `brands.local.ts` + `registry.ts` wrapper

**Target state:**
```
src/shared/services/
  brandService.ts        ← Single factory: returns Supabase or localStorage adapter
  adapters/
    supabase.adapter.ts  ← All Supabase operations
    local.adapter.ts     ← Guest mode (localStorage) operations
  aiService.ts           ← AI integration (Anthropic Claude)
  exportService.ts       ← PDF/ZIP generation
  billingService.ts      ← Stripe integration
```

**Rules:**
- All components import from `brandService.ts` only
- Adapter selection is automatic based on auth state
- No direct Supabase calls from components

### 7.3 Database Schema Evolution

**Phase 1 (Sprint 1-2): Expand core tables**
```sql
-- Enhance existing brands table
ALTER TABLE brands ADD COLUMN fonts JSONB;
ALTER TABLE brands ADD COLUMN brand_info JSONB;  -- vision, mission, values, tone
ALTER TABLE brands ADD COLUMN logo_url TEXT;
ALTER TABLE brands ADD COLUMN plan TEXT DEFAULT 'free';

-- New tables
CREATE TABLE brand_assets (...);
CREATE TABLE guideline_sections (...);
CREATE TABLE exports (...);
```

**Phase 2 (Sprint 5-6): Collaboration + billing tables**
```sql
CREATE TABLE brand_permissions (...);
CREATE TABLE plans (...);
```

**Phase 3 (Sprint 9-10): Showcase tables**
```sql
CREATE TABLE public_links (...);
CREATE TABLE custom_domains (...);
```

### 7.4 Security Hardening Checklist

- [ ] Add `.env` to `.gitignore`, remove from git history (`git filter-branch` or `BFG`)
- [ ] Move Supabase credentials to `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [ ] Delete `createAdminUser.ts` entirely
- [ ] Replace hardcoded email admin checks with Supabase user metadata `role: 'admin'`
- [ ] Add input sanitization middleware (DOMPurify for text, file type validation for uploads)
- [ ] Implement file upload validation: type whitelist + size limit (server-side)
- [ ] Add rate limiting on auth endpoints (Supabase handles this, but verify configuration)
- [ ] Implement CSP headers
- [ ] Add CORS configuration for production domain
- [ ] Enable Supabase RLS on all new tables
- [ ] Rotate any credentials that were committed to git

---

## 8. KPIs & Success Metrics

### Product Metrics

| Metric | MVP Target (Month 3) | Growth Target (Month 6) |
|---|---|---|
| Brands created | 100 | 1,000 |
| Guidelines generated | 50 | 500 |
| PDF exports completed | 30 | 300 |
| AI suggestions used | 200 | 5,000 |
| Avg. session duration | 8 min | 12 min |
| Onboarding completion rate | 60% | 75% |

### Quality Metrics

| Metric | Current | Target |
|---|---|---|
| Security score | 3/10 | 8/10 |
| Accessibility score | 3/10 | 7/10 |
| Test coverage | 0% | 60% |
| Lighthouse Performance | Unknown | 90+ |
| TypeScript strict mode | Off | On (0 `any` types) |

### Business Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Registered users | 200 | 1,000 | 5,000 |
| Free → Pro conversion | 5% | 8% | 12% |
| MRR | $0 | $500 | $5,000 |
| Churn rate | -- | <10% | <8% |

---

## 9. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Canva/Figma adds full brand creation features** before BrandOS launches | Medium | High | Speed to market. Focus on depth of brand system (lifecycle) vs breadth of design tools |
| R2 | **Security breach** due to committed credentials | High (if not fixed) | Critical | Epic 0 Sprint 1 — fix immediately before any public launch |
| R3 | **AI costs exceed budget** at scale | Medium | Medium | Implement rate limiting, caching, and tiered access. Use smaller models for simple suggestions |
| R4 | **Single developer bottleneck** | High | High | Document architecture decisions, keep code simple, prioritize ruthlessly |
| R5 | **User data loss** from localStorage dependency | High | High | Sprint 2: migrate all data to Supabase. Implement backup strategy |
| R6 | **PDF export quality** doesn't meet professional standards | Medium | Medium | Use `@react-pdf/renderer` for native PDF generation rather than html2canvas screenshots |
| R7 | **Scope creep** — building too many features before launching | Medium | Medium | Strict MVP definition. Launch after Sprint 4-5. Iterate based on user feedback |
| R8 | **Low adoption** at launch | Medium | Medium | Build in public. Leverage designer/agency network. Offer generous free tier |

---

## 10. Appendices

### 10.1 Competitive Feature Matrix (Detailed)

| Capability | BrandOS (Target) | Canva | Figma | Frontify | Looka | Bynder |
|---|---|---|---|---|---|---|
| AI brand strategy generation | Yes | No | No | No | Logo only | No |
| AI color suggestions | Yes | Limited | No | No | Basic | No |
| AI typography pairing | Yes | No | No | No | Basic | No |
| AI voice/tone generation | Yes | No | No | No | No | No |
| Dynamic guidelines | Yes | No | No | Yes | No | Basic |
| WCAG contrast engine | Yes | No | No | No | No | No |
| PDF guideline export | Yes | Yes (design) | Yes (manual) | Yes | Static | Yes |
| ZIP asset bundle | Yes | No | No | Yes | Yes | Yes |
| Business card generator | Yes | Templates | Manual | Templates | Yes | No |
| Social media kits | Yes | Templates | Manual | Templates | Yes | No |
| Role-based collaboration | Yes (4 roles) | Teams plan | Yes | Yes | No | Yes |
| Public brand showcase | Yes | No | No | Portals | No | Portals |
| Custom domains | Yes (Agency) | No | No | Yes | No | Yes |
| Template marketplace | Planned | 250M+ | Community | Yes | 300+ | Yes |
| Integrations | Planned | 100+ | Plugins | 30+ | None | 145+ |
| Entry price | Free | Free | Free | Custom ($$$) | $20 | $450/mo |

### 10.2 Key Files Reference Map

| File/Directory | Purpose |
|---|---|
| `src/App.tsx` | Root component, all route definitions |
| `src/features/auth/` | Authentication (login, signup, reset, guest mode) |
| `src/features/onboarding/` | 7-step onboarding wizard |
| `src/features/dashboard/` | Dashboard, brand listing, admin panel, sidebar |
| `src/features/brand/` | Brand editor, brand kit hub, editor tools |
| `src/features/guidelines/` | Guidelines editor, slides, preview canvas, templates |
| `src/shared/store/` | Zustand stores (session, brand, onboarding, guidelines) |
| `src/shared/services/` | Service layer (brand CRUD, Supabase/localStorage adapters) |
| `src/shared/types/brand.ts` | Core brand type definitions (comprehensive) |
| `src/integrations/supabase/` | Supabase client configuration |
| `src/components/ui/` | shadcn/ui primitives (~50 components) |
| `src/shared/components/` | Custom shared components (duplicates exist here) |
| `supabase/migrations/` | Database migration files |
| `docs/` | BRD PDF, Pitch Deck, this master document |

### 10.3 Glossary

| Term | Definition |
|---|---|
| **Brand Kit** | Complete set of brand assets: logo, colors, fonts, tone, voice, values |
| **Brand System** | The rules and structure governing how brand assets are used consistently |
| **Guidelines** | Visual documentation of brand rules, exported as interactive pages or PDF |
| **Color Logic Engine** | Smart system that validates color combinations against WCAG 2.1 AA accessibility standards |
| **Slide** | A single section/page within the guidelines editor (cover, logo, colors, typography, etc.) |
| **Template** | A visual layout style applied to guidelines or brand applications |
| **Public Showcase** | Publicly accessible brand guideline page with unique URL |
| **Brand Application** | Tangible brand material generated from the brand system (business card, letterhead, social post) |
| **Vibe Coding** | The development methodology used for building BrandOS (rapid, AI-assisted development) |

---

> **Next Action:** Begin Sprint 1 (Epic 0 — Foundation & Security). The first commit should fix the `.env` exposure and remove hardcoded credentials.

---

*Generated 2026-03-31 by BrandOS Multi-Agent Analysis System*
*Agents: Documentation Auditor, Codebase Auditor, Competitive Intelligence, Senior PM*

---

## 11. Step-by-Step Execution Plan

A practical, ordered checklist for the development team to follow from today through launch and beyond.

---

### Phase 1: Security & Cleanup (Week 1)

> **Do these FIRST — they are critical blockers. No new features until these are resolved.**

- [ ] **1.1 Fix `.env` exposure**
  - Add `.env` to `.gitignore`
  - Remove it from git tracking (`git rm --cached .env`)
  - Rotate Supabase keys (they've been in git history)

- [ ] **1.2 Remove hardcoded credentials**
  - Delete `createAdminUser.ts` entirely
  - Update `src/integrations/supabase/client.ts` to read from `import.meta.env`
  - Replace all `hamza2007ezzat@gmail.com` admin checks with Supabase role-based checks

- [ ] **1.3 Clean up architecture**
  - Consolidate the 3 competing service layers into one
  - Remove or disable the 8+ dead sidebar links
  - Delete duplicate components (Button, landing page, toast hook)
  - Remove Vite boilerplate from `App.css`
  - Fix `require()` in `brands.local.ts`
  - Remove demo data as default state

---

### Phase 2: Stabilize What Exists (Weeks 2-3)

- [ ] **2.1 Migrate fully to Supabase**
  - Create the missing 9 database tables (`brand_assets`, `guideline_sections`, `exports`, etc.)
  - Wire the editor to use Supabase (not localStorage) for authenticated users
  - Upload logos to Supabase Storage instead of blob URLs

- [ ] **2.2 Complete partial features**
  - Build the font editor (Google Fonts integration)
  - Build the brand info editor (vision, mission, tone, values)
  - Fix Corporate/Creative/Modern guideline templates (they all fallback to Minimal)
  - Replace fake dashboard stats with real data
  - Add dark mode toggle UI

---

### Phase 3: Build THE Differentiator — AI (Weeks 4-5)

- [ ] **3.1 Set up AI service layer**
  - Install Anthropic SDK
  - Create centralized `aiService.ts` with prompt templates
  - Add rate limiting and usage tracking

- [ ] **3.2 Implement AI features (highest impact first)**
  - AI-generated brand vision/mission/values from onboarding data
  - AI color palette suggestions based on industry + personality
  - AI typography pairing recommendations
  - AI voice & tone guide generation
  - Per-section "Suggest with AI" button in the editor

---

### Phase 4: Make Output Tangible — Exports (Weeks 6-7)

- [ ] **4.1 Build PDF export**
  - Install `@react-pdf/renderer` or `jsPDF + html2canvas`
  - Generate multi-page PDF from guideline slides
  - Style per selected template

- [ ] **4.2 Build ZIP export**
  - Install `JSZip`
  - Bundle: logos, color palette JSON, font references, PDF guideline
  - Add export history tracking (log to `exports` table)

---

### Phase 5: WCAG Color Engine (Week 8)

- [ ] **5.1 Build the contrast checker**
  - Implement WCAG 2.1 AA contrast ratio formula
  - Real-time pass/fail indicators in color palette tool
  - Auto-suggest accessible alternatives when contrast fails
  - Color pair combination matrix

---

### MVP Checkpoint — Launch Beta

> At this point (~2 months in), you have:
> - Secure, stable platform
> - AI-powered brand creation (your moat)
> - PDF/ZIP export (tangible output)
> - WCAG color validation (professional credibility)
>
> **Start sharing with your designer/agency network for beta feedback.**

---

### Phase 6: Post-Launch Growth (Months 3-4)

- [ ] **6.1 Collaboration** — Team invites, 4 roles (Owner/Editor/Exporter/Viewer), RLS enforcement
- [ ] **6.2 Billing** — Stripe Checkout, plan gating, subscription management
- [ ] **6.3 Brand Applications** — Business cards, letterhead, social media kits
- [ ] **6.4 Public Showcase** — Shareable brand pages, custom domains for Agency plan
- [ ] **6.5 Expand Templates** — 8+ guideline styles, multiple business card & social layouts

---

### Execution Principles

| Rule | Why |
|---|---|
| **Ship Phase 1 (security) before writing ANY new feature** | A breach before launch kills the product |
| **AI first, templates second** | AI is your moat. Templates are commodity. Canva has 250M+ — you can't compete there |
| **Launch at ~60% of BRD, not 100%** | Perfect is the enemy of shipped. Get feedback early |
| **One service layer, one component per purpose** | Don't let architectural debt compound again |
| **Test on real brands continuously** | You validated 15+ already — keep doing that throughout development |
