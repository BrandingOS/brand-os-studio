# Epic 6+ QA Audit Report & Task List

> Full end-to-end audit of BrandOS after Epics 0-6 completion.
> Date: April 1, 2026

---

## Audit Summary

| Category | Count |
|---|---|
| Critical Bugs Found | 2 (both FIXED) |
| High Bugs Found | 2 (both FIXED) |
| Medium Bugs Found | 1 (FIXED) |
| Must-Have Remaining | 6 |
| Nice-to-Have | 9 |
| Pages Working Well | 10+ |

---

## Bugs Found & Fixed

| # | Bug | Severity | Fix |
|---|---|---|---|
| B1 | BrandEditor crashes: `createdAt.toLocaleDateString is not a function` | CRITICAL | Wrapped with `new Date()` |
| B2 | Design Editor shows "Brand ID Required" (route param mismatch) | CRITICAL | Changed `brandId` to `slug` in useParams |
| B3 | Guidelines page shows "Brand not found" | HIGH | Fixed to use `loadBySlug()` instead of `loadById()` |
| B4 | Canvas Editor fails to initialize | HIGH | Same root cause as B3, resolved |
| B5 | No Error Boundary — crashes show blank white screen | MEDIUM | Added ErrorBoundary component wrapping Routes |

---

## What Works Well

1. Landing page — polished, professional design with all sections
2. Dashboard — clean layout, real stats, brand listing, empty state CTA
3. Dark mode toggle — instant switch, looks good
4. Onboarding flow — smooth wizard with validation and progress tracking
5. Brand creation — works end-to-end, redirects to dashboard
6. Brand detail page — overview, guidelines list, assets, export tabs
7. Brand Kit page — all 6 modules listed
8. My Brands page — clean listing with action buttons
9. Sidebar — responsive with toggle, disabled items grayed out
10. Search bar with Cmd+K hint

---

## Epic 6+ Task List

### MUST-HAVE (P0) — Fix before any launch

| ID | Task | Details |
|---|---|---|
| 6P-1 | **Fix empty Tools section in sidebar** | Dashboard sidebar shows "Tools" label with nothing underneath. Either add tool links or hide the section. |
| 6P-2 | **Fix brand lookup consistency** | Some pages use slug, others use ID. Ensure all brand pages use slug-based routing consistently. Test: create brand, navigate all sub-pages. |
| 6P-3 | **Fix React Router v7 deprecation warnings** | Add `v7_startTransition` and `v7_relativeSplatPath` future flags to BrowserRouter to suppress warnings. |
| 6P-4 | **Add loading states to brand sub-pages** | Guidelines, Brand Kit module pages should show skeletons while brand loads, not "Brand not found" flash. |
| 6P-5 | **Connect Export tab buttons** | The export buttons in the brand detail page Export tab show "Coming Soon". Wire them to the existing `exportService.ts`. |
| 6P-6 | **Make onboarding "Complete Setup" navigate to brand page** | After completing onboarding, user should land on their new brand's page, not just the dashboard. |

### NICE-TO-HAVE (P1) — Polish before public beta

| ID | Task | Details |
|---|---|---|
| 6P-7 | **Add Team Panel to brand overview** | The TeamPanel component exists but isn't visible on the brand overview page in the current layout. Add it as a section or tab. |
| 6P-8 | **Fix dark mode sidebar contrast** | In dark mode, the sidebar "Home" label is barely visible. Adjust active state styling. |
| 6P-9 | **Add footer links** | All footer links (Overview, Guidelines, Blog, Help, API, About, Careers, Contact) point to "#". Either link or remove. |
| 6P-10 | **Add brand color swatch label** | Brand detail page has a lone color circle with no context. Add a "Brand Color" label. |
| 6P-11 | **Add placeholder pages for Activity, Templates** | These sidebar links go to minimal placeholder pages. Add proper "Coming Soon" empty states with descriptions. |
| 6P-12 | **Add onboarding steps 5-7** | Currently 4 steps (Company Basics, Target Audience, Style & Values, Logo Assets). BRD specifies 7 steps. Add: Brand Personality, Business Goals, Market Position. |
| 6P-13 | **Add Cmd+K search functionality** | Search bar shows Cmd+K hint but the shortcut doesn't work. Add command palette or at least focus-on-shortcut. |
| 6P-14 | **Add notification system** | Bell icon in navbar has a red dot but no dropdown or notification list. |
| 6P-15 | **Improve brand card actions** | "Open Editor" button opens in new tab which may confuse users. Consider same-tab navigation. |

### FUTURE (P2) — Post-launch improvements

| ID | Task | Details |
|---|---|---|
| 6P-16 | **Real-time brand preview** | Show live preview of brand changes (colors, fonts, logo) in a mini card while editing. |
| 6P-17 | **Undo/redo in editors** | Add undo/redo support for brand editing and guidelines editing. |
| 6P-18 | **Keyboard shortcuts** | Add keyboard shortcuts for common actions (save, export, navigate slides). |
| 6P-19 | **Auto-save indicator** | Show "Saved" / "Saving..." indicator when brand data is persisted. |
| 6P-20 | **Onboarding analytics** | Track which steps users skip, how long each step takes, drop-off rates. |

---

## Recommended Sprint Plan

### Sprint 5 — Bug Fixes & Polish (1 week)
- 6P-1 through 6P-6 (must-haves)
- 6P-8 (dark mode contrast fix)

### Sprint 6 — UX Completion (1 week)
- 6P-7 (Team Panel)
- 6P-9 through 6P-11 (footer, labels, placeholders)
- 6P-12 (onboarding steps)

### Sprint 7 — Epic 7 (Public Showcase) + Epic 8 (Billing)
- Public brand pages with shareable links
- Stripe integration for plan gating

---

*Generated from full E2E audit on April 1, 2026*
