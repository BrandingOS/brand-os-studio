# BrandingOS Redesign — 1-Page Brief

> Paste this entire file into v0.dev / Lovable / Bolt / Cursor / Figma AI as a
> single prompt. For more depth, point the generator at `REDESIGN-BRIEF.md`
> in this same folder.

## What

**BrandingOS** — a creative SaaS workspace where founders and designers build,
manage, and ship a brand identity (logo, colors, type, voice, guidelines,
deliverables). One brand or fifty. Premium and quiet.

**Tone:** Linear × Vercel × Things 3. **Not** Canva, Adobe Express, or any
"AI tool" cyberpunk. Restraint, generous whitespace, type-led hierarchy.

## Information architecture

3 scopes. Each has one sidebar, one shell, no exceptions.

- **Workspace** (`/`): Home · Brands · Templates · Learn · Settings
- **Brand** (`/b/:slug`): Overview · Identity · Assets · Guidelines · Share
- **Editor** (full-screen): icon rail · canvas · properties panel

Inside Brand:
- **Identity** is a tabbed page: Logo · Colors · Typography · Voice · Strategy
- **Assets** is a filterable hub: All · Print · Social · Screen · Utility
- **Share** is the outbox: public showcase · logo deck · brand book · exports

Brand switcher lives in the brand topbar. Section-preserving (switching brands
keeps the user in the same section).

## Visual rules — non-negotiable

| | |
|---|---|
| **Background** | `#FBFBFA` (warm white, NOT pure white) |
| **Text** | `#1A1A1A` (not pure black) on background; `#57534E` for secondary |
| **Primary accent** | `#1F2937` slate-800 — ONE accent, used precisely. We don't impose a brand color; we let the user's brand colors be loud. |
| **Category tints** | Identity violet-600 · Assets cyan-600 · Guidelines orange-700 · Share green-700 · Editor slate-800. Used as left borders / icon tints. **Never as card backgrounds.** |
| **Type** | Söhne or Inter Tight (display) + Söhne or Inter (body) + JetBrains Mono. Two weights max per page (600 + 400). Body copy max 65–70ch wide. |
| **Spacing scale** | 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80. Nothing else. |
| **Topbar** | h-14 (workspace + brand) or h-12 (editor). One height per scope. |
| **Cards** | 24px padding minimum. NO decorative gradients. Hover = bg shift + 1px rise + shadow ramp at 180ms. |
| **Icons** | Lucide only, stroke 1.75, sizes 14/16/20/24. Single tint, inherits from text. |
| **Motion** | 120/180/280/400ms tokens. Standard easing `cubic-bezier(0.22, 1, 0.36, 1)`. Motion explains what just happened — never decorates. |

## Page templates — exactly 4

1. **AppPage** — sidebar + topbar + padded content. 99% of screens.
2. **EditorPage** — icon rail + topbar + canvas + right panel.
3. **FocusPage** — centered max-w-3xl, sticky footer with one primary action. Onboarding/wizards.
4. **PublicPage** — minimal nav, long-form. Public showcase + auth.

Every AppPage uses the same `<PageHeader>` (title + subtitle + breadcrumb +
actions slot). No bespoke page headers.

## Top 10 screens to draw (in order)

1. **Workspace Home `/`** — `Hi, {firstName}.` + Continue card + 4 brand cards row + activity feed + 3 quick-start cards. Empty state for new users: one CTA.
2. **Brands `/brands`** — page header + filter row + grid of brand cards. Card = logo + name + tone + status pill + palette dots; hover reveals 3 quick actions.
3. **Brand Overview `/b/:slug`** — page header (logo eyebrow + brand name title + tone subtitle) + glance card + completeness chip row + recent edits feed + ONE contextual "what's next" suggestion. **No 10-card feature menu.**
4. **Identity `/b/:slug/identity?tab=logo`** — header + 5 tabs (Logo / Colors / Typography / Voice / Strategy). Each tab is a focused workspace.
5. **Assets `/b/:slug/assets?category=all`** — header + 5 category tabs + filterable grid of asset tiles. Tiles show preview thumbnails, not generic icons.
6. **Guidelines `/b/:slug/guidelines`** — header + scrollable brand-book preview + sticky table of contents on lg+. Open editor / Export PDF in actions slot.
7. **Share `/b/:slug/share`** — header + public showcase card (with copy link) + logo presentation deck + brand book export + recent exports.
8. **Public Showcase `/brand/:slug/showcase`** — **must be the best-looking screen**. Hero (logo + name + tone) + story + logo system + palette + typography + voice + examples gallery. PublicShell, no app chrome.
9. **Onboarding `/onboarding`** — 5 steps in FocusPage: name → industry → vibe (6 visual presets) → logo (pick / upload / open lab) → done. Lands user on `/b/:slug/identity`, NOT the overview.
10. **Editor (any) `/b/:slug/edit/:surface/:id`** — full screen. Top: `EditorChrome` (h-12, back · breadcrumb · title · save state · actions). Left: 56px icon rail. Center: edge-to-edge canvas. Right: collapsible properties panel.

## Microcopy voice

Calm, direct, slightly editorial. The product talks like a senior colleague,
not a chirpy assistant.

| Don't | Do |
|---|---|
| "Welcome back, User!" | "Hi, Maya." |
| "Awesome! 🎉 Logo saved!" | "Logo saved." |
| "Are you sure?" | "Delete this brand? You'll lose its assets and history." |
| "Loading..." | "Loading brands..." |
| "Click here to..." | (label the action with the verb) |

Sentence case for labels. No exclamation marks. No emoji in product UI.
Buttons name the action: "Create brand", not "Submit".

## What to avoid (real mistakes the current product makes)

- ❌ Sidebar items pointing to NotFound
- ❌ A tool with no destination for its output
- ❌ Decorative gradients on cards (mean nothing, add noise)
- ❌ Stat-tile dashboards with no actionable insight
- ❌ Generic shadcn-default look (`Card className="p-6"` everywhere)
- ❌ Multi-color icon decorations
- ❌ Multiple primary buttons on one screen
- ❌ "Welcome back, {name}!" headers
- ❌ Toast notifications for minor confirmations
- ❌ Onboarding that drops the user on a feature menu

## Sample data — use these brands in mockups

```yaml
- name: Raqm           tone: Editorial typography studio   primary: #1F2937
- name: Meridian       tone: Sustainable architecture      primary: #15803D
- name: Halcyon Coffee tone: Specialty roaster, third-wave primary: #7C2D12
- name: Pollen Labs    tone: Microbiology research startup primary: #1E40AF
```

Activity feed examples:
> "Daniel updated **Halcyon Coffee** color palette · 2h ago"
> "You exported **Meridian** brand book PDF · yesterday"

**No lorem ipsum. No placeholder names.**

## North star

> **BrandingOS should feel like a tool a senior designer would willingly show
> their clients — quietly confident, considered in every detail, and
> completely out of the user's way.**

If a screen doesn't pass that line, redraw it.
