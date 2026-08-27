# Audit: Reference Pages Deep-Dive (Phase 0, Agent C)

Generated 2026-04-23. Implementation-ready breakdown of `/setup` and `/onboard-brand` for the BrandShell generalization.

## /setup — data flow

- **Entry**: `src/features/setup/SetupPage.tsx:165` seeds `useState<MockBrand>(mockBrand)` from `src/features/setup/data/mockBrand.ts`
- **Brand shape**: `MockBrand` type at `mockBrand.ts:59-76` — `{ name, logos[], colors{core,accent,grey}, fonts[], icons[], photos[], websites[], voice{}, about[] }`
- **Section tracking**: `activeKey: SectionKey` + `sectionRefs` object for scroll-to-section navigation
- **Mutations**: 40+ handlers at `SetupPage.tsx:181-907` passed down as props to board sections
- **TODO markers** at `SetupPage.tsx:164, 288`: wire to backend store when auth/persistence lands. **This is exactly what Phase 1.2 (`useBrand` hook) replaces.**

## CosmosWorkspaceShell — current API

File: `src/shared/layouts/CosmosWorkspaceShell.tsx`

```tsx
<CosmosWorkspaceShell
  tabs?={WorkspaceTab[]}      // default DEFAULT_WORKSPACE_TABS (5 tabs)
  brandName?={string}          // default "BrandingOS" (top-left mark)
  rightActions?={ReactNode}    // top-right slot (Publish button, etc.)
>
  {children}
</CosmosWorkspaceShell>
```

**What it renders** (intentionally minimal):

1. Top bar (`.top-nav-wrap`, sticky z-110): brand mark (left) + segmented nav pill (center) + theme toggle + rightActions (right)
2. Segmented nav pill: single white chip slides between active tab, 340ms `cubic-bezier(0.22, 1, 0.36, 1)`
3. Module-level cache `lastPillStyle` (lines 15-17) persists pill position across shell remounts — so navigating between pages keeps the animation continuous
4. `children` rendered directly below header (no `.shell` wrapper — page decides its own grid)

**Key observation**: the shell owns the top nav only. The page owns the sidebar + board grid. That's already the separation we want.

## Sidebar pattern — reusable across tabs

File: `src/features/setup/components/SetupSidebar.tsx`

- Sticky panel at `top: 80px`, 232-256px wide, rounded card, soft shadow
- Header: brand name + progress bar (3px tall, CSS width transition 420ms ease)
- Checklist items sorted completed-first, then incomplete (line 81)
- Each item (`.panel-item`) = icon + meta + status chip, active state adds `--accent-muted` background
- Status chip is dual-layered: `.chip-default` (check) + `.chip-hover` (plus icon), CSS-swapped on hover

**For BrandKitSidebar / GuidelineSidebar / etc.**: reuse `.panel`, `.panel-item`, `.status-chip` classes verbatim. Only the item list content changes per tab.

## Board pattern — reusable across tabs

File: `src/features/setup/components/SetupBoard.tsx:283-370`

The `<Section>` wrapper:

```tsx
<Section
  title="Logo"
  spec="3 variants"           // small muted subtitle
  addSlot={<AddPopover />}    // trigger for + popover
  onExport={() => ...}        // optional download button
>
  {/* section content */}
</Section>
```

Renders: `h2.title + .spec + .section-actions` header, then `.section-body`.

Sections in order: Logo, Colors, Fonts, Icons, Photos, Website, Voice/About — each with its own grid/flex layout. The `sectionRefs` object is keyed by `SectionKey`, letting the sidebar jump-scroll.

## CSS tokens — the design system

File: `src/shared/styles/cosmos-workspace.css` (scope `[data-cosmos="workspace"]`)

**Light mode tokens (lines 21-68):**
- `--background` (paper cream), `--surface`, `--surface-elevated`, `--surface-hover`, `--surface-sunken`
- `--text-primary` (charcoal), `--text-secondary` (warm gray), `--text-muted`
- `--accent`, `--accent-hover`, `--accent-active`, `--accent-muted`, `--accent-ring`
- `--critical` (red), `--ok` (green), `--link` (blue)
- `--shadow-xs/sm/md/lg` (0 1px 2px → 0 24px 56px)
- `--ease: cubic-bezier(0.22, 1, 0.36, 1)`

**Dark mode tokens (lines 70-105)**: mirror set swapped to charcoal surfaces.

**Theme toggle**: reads/writes `localStorage[brandos-theme]`, emits `data-theme="light"|"dark"` on the `[data-cosmos]` root.

## Reusable primitives already in cosmos-workspace.css

| Class | Purpose | Tabs that will use it |
| --- | --- | --- |
| `.pill-btn`, `.pill-btn--primary`, `.pill-btn--ghost` | Action buttons (38px tall, 8px radius) | All 5 tabs |
| `.segmented-nav-pill` | Animated tab indicator | Shell-owned |
| `.panel`, `.panel-item`, `.panel-item.is-active` | Sticky sidebar + checklist items | All tabs with sidebars |
| `.status-chip`, `.is-added`, `.is-missing` | Dual-state status indicator | Setup + Brand Kit sidebars |
| `.shell` | `grid-template-columns: minmax(232px, 256px) 1fr; gap: 20px;` | All tabs with sidebars |
| `.section`, `.section-header`, `.section-actions`, `.section-body` | Content sections with title/actions/body | All tabs with structured content |
| `.board-wrap` | Right content column, max-width 1160px | All tabs |
| Theme toggle 38×38 button | `.theme-icon-sun` / `.theme-icon-moon` | Shell-owned |

## /onboard-brand — state machine

File: `src/features/onboarding-brand/OnboardingBrand.tsx`

**Stages**: `'prompt'` → `'reveal'` → `'remix'` (linear, no back)

| Stage | File | Behavior |
| --- | --- | --- |
| PromptStage | `stages/PromptStage.tsx` | MeshGradient bg + PromptInput; `onSubmit(prompt)` → `playWoosh()` → next |
| RevealStage | `stages/RevealStage.tsx` | 4-variation carousel, arrow-key/swipe navigation, shuffle button → `playShuffle()`, accept → `playWoosh()` → next |
| RemixStage | `stages/RemixStage.tsx` | Fine-tune colors/fonts/voice; space-key shuffles all; Create → `playChime()` + confetti + 1800ms delay → navigate |

**Hooks**:
- `useBrandGenerator()` line 27 → `{ variations, isGenerating, generate(prompt), shuffleOne(index) }`
- `useBrandCreator()` line 29 → `{ createBrand, goToBrand, isSaving }`

**Sound effects** (`services/soundEffects.ts`):
- `playWoosh()` — 220Hz sine + 380Hz triangle
- `playShuffle()` — two 60ms triangle bursts
- `playChime()` — C major triad (523, 659, 784Hz), 90ms stagger

**Confetti**: color array pulled from selected brand's palette

**Polish level**: high. `/onboard-brand` doesn't need Phase 4 work beyond a spec-compliance pass and ensuring return flow lands on `/b/:newSlug/setup`.

## Implementation guidance for Phase 1

**Generalize the shell minimally — it's already close:**

1. Rename/alias: keep `CosmosWorkspaceShell` file, add a `BrandShell` wrapper that:
   - Auto-resolves brand from URL slug via `useBrand()`
   - Renders a brand switcher pill in the top-left (where `brandName` is today)
   - Still exposes `children` for the page's own grid/sidebar/board
2. **Don't** touch `cosmos-workspace.css` tokens. They work.
3. **Don't** re-implement `.panel`, `.section`, `.status-chip` — reuse them.
4. For tabs without a sidebar (Design canvas fullscreen), the page just doesn't render a sidebar — the shell doesn't care.

**BrandKitSidebar / GuidelineSidebar / etc.** should be thin: a vertical list of `.panel-item`s, status chips computed from brand state, active state driven by URL sub-route (`?section=X` query param or nested route).

**BrandKitBoard / GuidelineBoard / etc.** should reuse `<Section>` wrapper — copy the pattern from `SetupBoard.tsx:283-370`.

Phase 1 is therefore mostly plumbing (routes, brand resolution, scaffolds), not visual work. The visual work is already done.
