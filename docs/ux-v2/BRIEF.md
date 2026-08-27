# Claude Design Brief

Paste the block below into the "Any other notes?" field in Claude Design. Attach the GitHub repo, fonts, logo, and screenshots alongside it.

---

## Company blurb (for the "Company name and blurb" field)

```
BrandingOS — an all-in-one brand operating system. Users set up a brand (logo, colors, typography, voice), get an auto-generated brand kit, editable brand guidelines, a design canvas for social/print/screen, and AI-assisted tools. Desktop-first SPA built in React + TypeScript + Tailwind + shadcn. Target users: solo founders and small teams who need a consistent brand without hiring an agency.
```

---

## Notes block (paste into "Any other notes?")

```
We're rebuilding the entire UI. Two pages already show the direction we want: /setup and /onboard-brand (live on x.brandingos.ai). Extend that exact look & feel across the whole app.

ABOUT THE ATTACHED REFERENCES:
Screenshots from competitors and tools we admire are idea references only — not visuals to reproduce literally. If a reference shows a full-height sidebar, white background, or anything that conflicts with our floating pattern or warm-cream / charcoal palette, keep the idea (layout, information density, interaction model) but execute it in our direction. Understand the concepts, not the pixels.

NAVIGATION MODEL (critical — biggest change):
- Kill the current dual-sidebar layout.
- Replace with a floating top-center pill nav: 5 tabs — Setup · Brand Kit · Guideline · Design · Tools.
- One floating left sidebar whose content changes per tab (checklist for Setup, modules for Brand Kit, outline for Guideline, projects for Design, categories for Tools). Hidden on Design canvas.
- Floating top-right utilities: brand switcher, Publish button, theme toggle.
- Floating bottom-right "Brand Assistant" pill (AI chat trigger, Cmd+J).
- Everything floats — sticky positioning, rounded panels, soft shadows. No hard edges, no full-width bars.

SCOPE:
- The 5 tabs are brand-scoped. URL: /b/:slug/{setup|brand-kit|guideline|design|tools}.
- Workspace-level pages (Home, Brands list, Learn, Settings, Templates) live in a simpler separate shell — no tabs, just a top header.
- Dev-only page /_dev/features: a flat inventory of every feature in the app, grouped by tab. Used for oversight only, never production.

FEATURE COVERAGE:
- No feature gets dropped in the rebuild. Every existing feature — Brand Board, Logo Maker, color/typography systems, slide-based guidelines, Fabric.js canvas, social-media editor, content calendar, asset library (DAM), exports, showcase, validation, AI Design — must land in one of the 5 tabs. The old → new mapping is in our FEATURES.md.

VISUAL LANGUAGE:
- Light: warm cream (#f7f5f3) + deep charcoal text.
- Dark: charcoal background (#141414) + warm-white text.
- Display: Instrument Serif. Body/UI: Inter.
- Motion: cubic-bezier(0.22, 1, 0.36, 1). Pill nav slides between tabs. Modals scale + fade with backdrop blur.
- Feel: editorial, calm, premium. Closer to Linear / Vercel / cosmos.so in tone — softer and warmer.

DELIVERABLES WE WANT (in order):
1. Design tokens — color, type, spacing, radius, shadow, motion.
2. Core components — button, input, pill nav, floating sidebar, floating top bar, brand switcher, card, modal, dropdown, segmented control, checklist item, status chip, assistant-trigger pill.
3. Page templates — one for each of the 5 brand tabs + the workspace shell (Home / Brands / Settings / Learn / Templates).
4. Dark-mode parity for everything.

NON-GOALS:
- No landing-page design (separate project under /landingpage).
- No mobile layouts for now — desktop-first.
- No new brand/style name for the UI. It's just "the new BrandingOS UI."
- Do not redesign the Fabric.js canvas internals — that's tagged stable. Redesign the chrome around it.

WHAT WORKS / WHAT DOESN'T:
- /setup and /onboard-brand are already in the new direction — use their polish level as the floor, not the ceiling.
- The old UI (AppRail + BrandSidebar + dual-sidebar layouts) is being deleted. Don't anchor anything to it.
```

---

## What to attach alongside the notes

| Field | What to provide |
| --- | --- |
| **Link code on GitHub** | `https://github.com/hamzaxezzat/brand-os-studio` — authorize via OAuth. Private repo; grant access when prompted. |
| **Link code from your computer** (fallback if OAuth fails) | Point at `src/features/setup/`, `src/features/onboarding-brand/`, `src/shared/layouts/CosmosWorkspaceShell.tsx`, `src/shared/styles/cosmos-workspace.css`. That's the direction to extend. |
| **Upload a .fig file** | Skip — none exists. |
| **Fonts** | Inter (Google Fonts) + Instrument Serif (Google Fonts) — upload `.woff2` files or provide Google Fonts links. |
| **Logo** | The BrandingOS "B" mark (top-left of `/setup`). Export PNG + SVG. |
| **Screenshots (Drag files here)** | (1) `/setup` from x.brandingos.ai, (2) `/onboard-brand` from x.brandingos.ai, (3) the old UI labeled "DO NOT follow — replace this", (4) any competitor references you want to send as *idea* inspiration (the notes block above tells Claude Design to interpret these loosely). |

---

## After Claude Design returns

1. Save the tokens / Figma / code output into `docs/ux-v2/artifacts/`.
2. Review with the team.
3. Update `docs/ux-v2/README.md` migration checklist.
4. Start wiring the system in — begin with tokens + `CosmosWorkspaceShell` (rename if desired), then the four unbuilt tabs in order: Brand Kit → Guideline → Design → Tools.
