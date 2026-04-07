# Layouts

> The canonical page-shell primitives. **Read `docs/ux-redesign/ARCHITECTURE.md` first.**

## Rules

1. **There is one shell per scope.** Don't add a new layout file unless you can justify why
   none of the existing four can express your page.
2. **Layouts own page padding.** Pages must NOT redeclare `px-4 sm:px-6 lg:px-8` or `py-6/py-8`
   inside their content. They came from the layout.
3. **Pages override max-width via the layout's `maxWidth` prop**, never via inner
   `max-w-* mx-auto` wrappers.

## Inventory

| Shell | Scope | Use case |
|---|---|---|
| `DashboardLayout` (`src/features/dashboard/components/DashboardLayout.tsx`) | Workspace | All `/dashboard/*` pages outside of brand |
| `BrandLayout` (`src/features/brand/components/BrandLayout.tsx`) | Brand | All `/dashboard/brand/:slug/*` pages |
| `OnboardingShell` | Focus flows | Onboarding wizard, brand creation |
| `AppShell` | Primitive | Building block — don't import directly from a page |

## Topbar height — h-14

All sticky topbars (`DashboardNavbar`, `BrandNavbar`, `CanvaTopBar`) use `h-14`. Editor topbars
will use `h-12` once the editor shell unification lands. Don't introduce other heights.
