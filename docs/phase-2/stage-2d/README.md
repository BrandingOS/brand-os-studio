# Stage 2D — Color System Migration (real cutover)

> Correction: an earlier version of this doc claimed 2D "complete" after only building the
> use-case + unit-test proof. That was **foundation**, not a migration — no live surface consumed
> it. This is the real cutover of an actual reachable color-editing surface.

## The migrated surface

**Settings dialog `ColorsTab`** (`src/shared/brand-settings/BrandSettingsDialog.tsx`), reached via
**Identity → Colors → "Edit"**. It is the dedicated, color-only, reachable editing surface that
*persists* — chosen over Setup (batches all identity fields) and the Brand Kit card editor
(toast-only, no persistence). It was also **buggy**: it wrote scalar-only, leaving `colorSystem`
stale for schema-v3 brands (every `colorSystem`-preferring consumer showed the old color).

## Before → after

**Before (legacy):**
```
ColorsTab → useBrandStore.update({ primaryColor })   // scalar-only
          → getBrandsService().update                // colorSystem NOT written → stale
reload    → migrateBrandToCurrent → buildColorSystem  // PREFERRED stale guidelines mirror (05/11)
```

**After (canonical):**
```
ColorsTab (reads canonical brand.colorSystem)
  → changeBrandColors(repo, id, {primary, secondary})   // one canonical operation
  → CanonicalBrand (validated)
  → BrandRepository (SERVICE_KEYS.BRAND_REPOSITORY, wired in real DI boot)
  → BrandServiceRepository → toLegacyBrandPatch → IBrandsService (Supabase authed / Local guest)
  → store sync: setCurrent(merged) + applyBrandTokens(merged)
reload → migrateBrandToCurrent → buildColorSystem       // now PREFERS the fresh scalar
```

## What was replaced / removed (not "zero deletions")

- **Deleted:** ColorsTab's scalar-only `updateBrand({primaryColor, secondaryColor})` write — replaced
  by the canonical `changeBrandColors` path.
- **Removed legacy authority:** `buildColorSystem`'s guidelines-mirror preference (the 05/11 root
  cause) — flipped to prefer the fresh scalar (matching the canonical `fromLegacyBrand`). A stale
  `guidelines.colorPalette` can no longer resurrect an edited color on reload.
- **One-way compatibility:** the write projects canonical → legacy scalar/`colorSystem` for
  un-migrated readers (Brand Board, PresentationStyleAdapter read the scalar). The `guidelines`
  mirror is never written, so it cannot become authoritative again. Legacy → canonical never happens.

## Proof (real chain, all green)

`src/application/brand/__tests__/colorSlice.integration.test.ts` drives the ACTUAL machinery
(BrandServiceRepository over a real `IBrandsService` + real `migrateBrandToCurrent` +
`buildBrandPalette`):
- **Guest-like:** edit → persist → reload keeps the new color; stale mirror cannot resurrect it.
- **Authed-like (Supabase whitelist drops `colorSystem`):** reload **re-derives** the NEW color from
  the fresh scalar — the exact 05/11 case, now fixed.
- **Downstream consumer:** `buildBrandPalette` receives the canonical value after reload.

Full suite: 1201 pass / 1 pre-existing fail (`recolorLogo`). Ratchet 324/324. Build green. No new cycles.

## Database reality (Step 8)

- **Guest:** production-complete today (localStorage stores the full brand incl. `colorSystem`).
- **Authed:** server-backed and working **today** — primary/secondary color round-trips via the
  existing `primary_color`/`secondary_color` columns + the `buildColorSystem` scalar-preference; the
  deployed frontend does **not** require the undeployed migration 013 column. Full-fidelity identity
  persistence (accent/neutrals via `brands.identity`) lands when 013 deploys — switch the authed
  `BRAND_REPOSITORY` to `SupabaseBrandRepository` then (backlog B14). **No state where deployed
  frontend needs an undeployed column.**

## Status
- **CODE CUTOVER: PASS** (ColorsTab reads+writes canonical through the DI repository; verified).
- **PRODUCTION CUTOVER: PASS for guest + primary/secondary authed color; PARTIAL** (accent/neutrals
  full fidelity blocked on 013 deploy).
- Remaining color surfaces (Setup, card editor) tracked in backlog B13 — they do not undermine
  ColorsTab's canonical authority (Setup writes a consistent representation; card editor is a no-op).
