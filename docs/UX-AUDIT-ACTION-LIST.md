# BrandingOS UI/UX Audit — Action List

> Senior UI/UX Designer Audit | April 1, 2026
> Verdict: Core guidelines generator is strong. Shell needs to match its quality.

---

## P0 — Launch Blockers (Fix immediately)

| # | Issue | Page | Fix |
|---|---|---|---|
| 1 | **5 broken sidebar links (404)** in brand workspace | `/dashboard/brand/:slug/*` | Remove dead links (info, editor, assets, templates, colors, settings) or add Coming Soon pages |
| 2 | **Pricing mismatch** between landing page and plans page | Landing vs `/settings/plans` | Unify: Pro $19/mo (5 brands) everywhere. Remove "Unlimited" from landing Pro |
| 3 | **Onboarding progress bar stuck at 14%** | `/onboarding` | Fix progress calculation — should increment per step (~14% each) |
| 4 | **404 page ignores dark mode** + no navigation back | Any invalid URL | Add theme support, dashboard header, link to `/dashboard` |

## P1 — Major UX Improvements

| # | Issue | Page | Fix |
|---|---|---|---|
| 5 | **Settings pages have no sidebar/navigation** | `/settings/*` | Wrap in dashboard layout with sidebar |
| 6 | **Brand cards lack visual identity** | Dashboard | Add brand color strip, color swatches, better hover state |
| 7 | **Brand Kit modules are empty shells** | `/dashboard/brand/:slug/brandkit` | Show preview mockups with brand colors, rename "Open Module" → "Generate" |
| 8 | **My Brands card layout too tall** | `/dashboard/brands` | Horizontal card with brand color preview, dropdown for secondary actions |
| 9 | **Landing hero mockup ≠ real product** | `/` | Replace hero mockup with real product screenshots |
| 10 | **Private showcase = dead end** | `/brand/:slug/showcase` | Show preview for owner with "Make Public" CTA, add navigation for visitors |
| 11 | **"Open Editor" naming confusion** | Multiple pages | Standardize: "Edit Brand" for the editor, "Guidelines" for guidelines, remove "Canvas Editor" |
| 12 | **Brand Editor shows wrong colors (#000000)** | `/dashboard/brand/:slug/edit` | Load actual stored brand colors, sync with guidelines data |

## P2 — Polish

| # | Issue | Page | Fix |
|---|---|---|---|
| 13 | **Onboarding steps don't show completion state** | `/onboarding` | Show filled/hollow circles for completed/skipped |
| 14 | **Templates page has no Apply/Preview flow** | `/dashboard/templates` | Add click-to-preview modal with "Apply to Brand" button |
| 15 | **Red dot on Templates is meaningless** | Sidebar | Use feature indicator system properly — clear after first visit |
| 16 | **Live Preview truncates "SECONDAR..."** | Brand edit page | Use full text "Secondary" |
| 17 | **Activity/Templates Coming Soon pages are bland** | Dashboard | Add expected date, progress indicator, notify-me option |
| 18 | **Footer links are dead (#)** | Landing page | Remove non-functional links or add Coming Soon |
| 19 | **Search bar does nothing** | Dashboard header | Implement client-side filtering or remove until functional |
| 20 | **No skeleton loaders** | All pages | Add loading skeletons before backend integration |

## What Works Well (Keep!)

1. **Guidelines page** — the standout feature. Three-mode view, live editor, professional sections
2. **Dark mode** — consistent across dashboard, onboarding, editor
3. **Landing page** — strong marketing design, good CTA flow
4. **Onboarding wizard** — thoughtful 7 steps, great color palette chooser, logo upload
5. **Information architecture** — logical sidebar nav, good breadcrumbs
6. **Typography** — Inter/Roboto pairing, proportional sizing

## Bottom Line

The guidelines generator alone could justify the price. But the surrounding product has:
- 5 broken links
- Pricing inconsistency
- Features promised but not built
- Multiple naming conventions for the same thing

**Fix the P0s → Fix the P1s → The product is launchable.**
