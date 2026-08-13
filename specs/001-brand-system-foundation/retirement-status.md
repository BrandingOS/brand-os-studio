# Legacy retirement status (Phase 7 gate, T075)

**Assessed**: 2026-08-13, against the working tree at the end of Phase 6.

Every deletion criterion in `plan.md` §Legacy retirement, checked with a command
rather than assumed. **One is met.** The rest are recorded as unmet and their
legacy paths are left in place, per the standing rule: retire only where the
criterion is actually proven.

The headline reason so little can retire yet is simple and expected: **the
production ingest (T050) has not run.** Almost every criterion is downstream of
"the legacy data has actually moved", and it has not.

| # | Legacy path | Criterion | Status |
|---|---|---|---|
| T076 | Legacy scalar brand fields (`primaryColor`, `fonts`, `tone`, `logo`, …) | No reader resolves them ahead of the canonical record | **NOT MET** |
| T077 | `brand.assets[]` / `brand.brandAssets[]` | Zero non-empty arrays after ingest; no writer touches them | **NOT MET** |
| T078 | `assets.legacy_ref_id` | Zero rows populated, no reader uses the fallback | **NOT MET** (blocked by T077) |
| T079 | `brand.uiStyle` | Brand Board writes `visualStyle`; no reader of `uiStyle` remains | **NOT MET** |
| T080 | Duplicate service channels | Zero call sites | **PARTIALLY MET** |
| T081 | `brandos:seed-brand-overrides` | Seed brands no longer need a parallel write store | **NOT MET** |
| T082 | Dead types (`SavedDesign`) | Last consumer removed | **MET — DELETED** |
| T083 | `brand.guidelines.*` as writable truth | All voice/strategy/logo/color readers use Core | **NOT MET** |

---

## T076 — legacy scalar fields · NOT MET

`fromLegacy.ts` still runs 7 active resolvers (`resolveColors`, `resolveLogos`,
`resolveTypography`, `resolveStrategy`, `resolveVoice`, …). They are not
vestigial: a brand that has never been written by a canonical op has **no
identity blob**, so the scalars are its only source of truth. Deleting them
would blank those brands.

*Evidence*: `grep -c "resolveColors\|resolveTypography\|resolveVoice" src/domain/brand/fromLegacy.ts` → 7

**Unblocked by**: every brand having been through a canonical write at least
once. Not measurable until the ingest and a period of normal use.

## T077 — the inline asset arrays · NOT MET

**36 modules still read them**, and three still write them
(`mockBrandToPatch.ts`, `onboarding-v4/SetUpScreen.tsx`, and
`migrateSchema.ts`'s derivation). The Library projection deliberately keeps the
stored array as a compatibility input for assets that have not been ingested —
that is its documented purpose, not an oversight.

*Evidence*: `grep -rln "brand.brandAssets\|brand\.assets" src/ | grep -v test | wc -l` → 36

**Unblocked by**: T050 (production ingest) reporting `unIngestedCount === 0` for
every brand, then migrating the remaining writers.

## T078 — `legacy_ref_id` · NOT MET

Directly downstream of T077. The column exists precisely so unrewritten
`logoSystem` refs resolve during convergence; the convergence has not happened
in production.

## T079 — `brand.uiStyle` · NOT MET

Brand Board still writes `uiStyle` (`BrandBoardPage.tsx:92`) and its store still
carries it in two places. `fromLegacy` maps `uiStyle` → `visualStyle` on READ,
so the canonical value is correct today, but the legacy field remains the thing
Brand Board persists.

*Evidence*: `grep -rn "uiStyle:" src/ | grep -v "test\|types/brand.ts\|libraryProjection\|fromLegacy"` → 3 hits

**Unblocked by**: pointing Brand Board's save at `changeBrandVisualStyle`. Small,
but it is a behavior change to a live surface and was not in this feature's scope.

## T080 — duplicate service channels · PARTIALLY MET

- **Writes: zero.** The only textual match for `services.brands.update(` outside
  the registry is a comment in `useBrandUpdate.ts` warning against it. This is
  the half that mattered — no second write path to brand truth remains.
- **Reads: six.** `ColorPaletteTool`, `BrandInfoTool`, `FontTool`, `LogoTool`,
  and `useBrandBySlug` still read through the registry singleton.

The criterion is "zero call sites", so the singleton stays. Migrating six reads
is mechanical but is unrelated-area refactoring, which this phase excludes.

*Evidence*: writes → 0 real call sites; reads → 6.

## T081 — seed brand overrides · NOT MET

Three modules still depend on `seedBrandOverrides` (`brands.local.ts`,
`brands.supabase.ts`, and the override module itself). Seed brands are still
not real DB rows, so they still need a parallel write store.

**Unblocked by**: proper per-user demo-brand handling — a product decision, not
a cleanup.

## T082 — dead types · MET, DELETED ✅

`SavedDesign` had **zero** references anywhere in `src/` outside its own
declaration, including tests. Deleted from
`src/features/brandkit/types/index.ts`; typecheck unchanged at 321/321.

*Evidence*: `grep -rn "SavedDesign" src/` → only the declaration, now removed.

## T083 — `guidelines.*` as writable truth · NOT MET

`toLegacyBrandPatch` has never written `guidelines.*` (that predates this
feature), but the mirror is still **read** widely, and `splitCorePatch` still
routes `guidelines.strategy` as a Core write path because Setup sends strategy
that way. It is demoted in practice but not yet render-only.

---

## What this means for production

Nothing here blocks deployment. Legacy paths remaining in place is the
*designed* state at this point: they are read-compatible inputs, not competing
authorities, and every one of them has a named criterion and a named unblocker.

The single ordering constraint worth stating: **T077, T078 and T076 all wait on
T050 (production ingest)**, and T050 itself waits on T087/T088. That chain, not
any code, is what gates the rest of the retirement.
